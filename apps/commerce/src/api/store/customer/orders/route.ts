import { randomUUID } from "node:crypto";

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils";
import { z } from "zod";
import { MARKETPLACE_MODULE } from "../../../../modules/marketplace/constants.js";
import {
  assertMarketplaceCoreLocalMode,
  resolveAuthenticatedActorId,
} from "../../../../modules/marketplace/authorization.js";
import {
  isSyntheticDataAllowed,
  readCustomerOrders,
} from "../../../../modules/marketplace/customer-orders.js";
import type {
  CustomerOrderReaderService,
  SyntheticOrderCreateInput,
} from "../../../../modules/marketplace/customer-orders.js";
import type { AuthenticatedReq } from "../../../../types/service-types.js";

type MarketplaceRecord = Record<string, unknown>;

type SyntheticOrderService = CustomerOrderReaderService & {
  listCatalogListings: (
    query: Record<string, unknown>,
  ) => Promise<MarketplaceRecord[]>;
  createSyntheticOrder: (input: SyntheticOrderCreateInput) => Promise<unknown>;
};

const SyntheticOrderRequest = z
  .object({
    items: z
      .array(
        z
          .object({
            catalog_listing_id: z.string().min(1).max(128),
            quantity: z.number().int().min(1).max(100),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict()
  .superRefine((value, context) => {
    const listingIds = value.items.map((item) => item.catalog_listing_id);
    if (new Set(listingIds).size !== listingIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["items"],
        message: "Позиції замовлення не можуть повторюватися.",
      });
    }
  });

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asRecord(value: unknown): MarketplaceRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as MarketplaceRecord)
    : null;
}

export function resolveUnitPriceUah(listing: MarketplaceRecord): number | null {
  const listingPrice = listing["price_uah"];
  if (
    typeof listingPrice === "number" &&
    Number.isSafeInteger(listingPrice) &&
    listingPrice >= 0
  ) {
    return listingPrice;
  }

  const product = asRecord(listing["product"]);
  const variants = Array.isArray(product?.["variants"])
    ? product["variants"]
    : [];
  for (const variant of variants) {
    const prices = Array.isArray(asRecord(variant)?.["prices"])
      ? (asRecord(variant)?.["prices"] as unknown[])
      : [];
    for (const price of prices) {
      const priceRecord = asRecord(price);
      const amount = priceRecord?.["amount"];
      const currency = priceRecord?.["currency_code"];
      if (
        typeof amount === "number" &&
        Number.isSafeInteger(amount) &&
        amount >= 0 &&
        typeof currency === "string" &&
        currency.toLowerCase() === "uah" &&
        amount % 100 === 0
      ) {
        return amount / 100;
      }
    }
  }

  return null;
}

export function isPublicSyntheticListing(listing: MarketplaceRecord): boolean {
  const state = listing["state"];
  const visibility = listing["visibility"];
  return (
    state === "published" &&
    (visibility === "synthetic" || visibility === "local_demo")
  );
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  assertMarketplaceCoreLocalMode();

  if (!isSyntheticDataAllowed()) {
    return res.status(503).json({
      type: "capability_unavailable",
      message: "Історія замовлень недоступна в цьому режимі.",
    });
  }

  const authContext = (req as unknown as AuthenticatedReq).auth_context;
  const customerId = resolveAuthenticatedActorId(authContext);
  const service = req.scope.resolve(
    MARKETPLACE_MODULE,
  ) as unknown as CustomerOrderReaderService;
  const result = await readCustomerOrders(service, customerId);

  return res.status(200).json({
    orders: result.orders,
    next_cursor: result.nextCursor,
  });
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  assertMarketplaceCoreLocalMode();

  if (!isSyntheticDataAllowed()) {
    return res.status(503).json({
      type: "capability_unavailable",
      message: "Створення замовлень недоступне в цьому режимі.",
    });
  }

  const authContext = (req as unknown as AuthenticatedReq).auth_context;
  const customerId = resolveAuthenticatedActorId(authContext);
  const parsed = SyntheticOrderRequest.safeParse(req.body);
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Замовлення має містити унікальні позиції синтетичного каталогу.",
    );
  }

  const service = req.scope.resolve(
    MARKETPLACE_MODULE,
  ) as unknown as SyntheticOrderService;
  const items: SyntheticOrderCreateInput["items"] = [];

  for (const requestedItem of parsed.data.items) {
    const listings = await service.listCatalogListings({
      id: requestedItem.catalog_listing_id,
    });
    const listing = listings[0];
    if (!listing || !isPublicSyntheticListing(listing)) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Позиція каталогу недоступна для синтетичного замовлення.",
      );
    }
    // MedusaService list methods do not hydrate cross-module links. Resolve the
    // native Product through the registered Remote Query link and fail closed
    // if the listing has no linked product snapshot.
    const remoteQuery = req.scope.resolve(
      ContainerRegistrationKeys.REMOTE_QUERY,
    ) as unknown as (query: {
      entryPoint: string;
      fields: string[];
      variables: Record<string, unknown>;
    }) => Promise<MarketplaceRecord[]>;
    const linkedListings = await remoteQuery({
      entryPoint: "catalog_listing",
      fields: [
        "id",
        "product.id",
        "product.title",
        "product.variants.id",
        "product.variants.prices.amount",
        "product.variants.prices.currency_code",
      ],
      variables: { id: requestedItem.catalog_listing_id },
    });
    const linkedProduct = asRecord(linkedListings[0]?.["product"]);
    const product = linkedProduct || asRecord(listing["product"]);
    const productId =
      asString(product?.["id"]) || asString(listing["product_id"]);
    const vendorId = asString(listing["vendor_id"]);
    const vendor = vendorId ? await service.retrieveVendor(vendorId) : null;
    if (!vendor || vendor["status"] !== "active") {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Виробник позиції каталогу більше не активний.",
      );
    }
    const productName =
      asString(listing["title"]) || asString(product?.["title"]);
    // Use the remote product snapshot for variant-price fallback; the
    // marketplace service list does not hydrate cross-module links.
    const unitPriceUah = resolveUnitPriceUah(
      product ? { ...listing, product } : listing,
    );
    if (!productId || !vendorId || !productName || unitPriceUah === null) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Позиція каталогу не має повного серверного знімка замовлення.",
      );
    }

    items.push({
      catalogListingId: requestedItem.catalog_listing_id,
      productId,
      vendorId,
      productName,
      unitPriceUah,
      quantity: requestedItem.quantity,
    });
  }

  const orderNumber = `SYN-${Date.now()}-${randomUUID().slice(0, 8)}`;
  await service.createSyntheticOrder({
    customerId,
    orderNumber,
    items,
  });

  const result = await readCustomerOrders(service, customerId);
  const order = result.orders.find(
    (candidate) => candidate.orderNumber === orderNumber,
  );
  if (!order) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Синтетичне замовлення створено, але його знімок недоступний.",
    );
  }

  return res.status(201).json({ order });
}
