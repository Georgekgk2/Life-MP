import type { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { assertSyntheticSeedAllowed } from "./seed-guard";
import { MARKETPLACE_MODULE } from "../modules/marketplace/constants";
import type { SyntheticOrderCreateInput } from "../modules/marketplace/customer-orders";
import type {
  MarketplaceServiceType,
  ProductServiceType,
  RemoteLinkType,
} from "../types/service-types";

type CategoryRecord = {
  id: string;
  handle: string;
  name: string;
};

type ApiKeyServiceType = {
  listApiKeys(
    filters: Record<string, unknown>,
  ): Promise<Array<{ id: string; token: string }>>;
  createApiKeys(
    data: Record<string, unknown>,
  ): Promise<{ id: string; token: string }>;
};

type CustomerServiceType = {
  listCustomers(
    filters: Record<string, unknown>,
  ): Promise<Array<Record<string, unknown>>>;
  createCustomers(
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
};

export default async function seedCatalogProviderCore({ container }: ExecArgs) {
  assertSyntheticSeedAllowed({
    nodeEnv: process.env.NODE_ENV,
    allowSyntheticCatalog: process.env.ALLOW_SYNTHETIC_CATALOG,
  });

  const marketplaceService = container.resolve(
    MARKETPLACE_MODULE,
  ) as unknown as MarketplaceServiceType;
  const productService = container.resolve(
    Modules.PRODUCT,
  ) as unknown as ProductServiceType;
  const remoteLink = container.resolve(
    "remoteLink",
  ) as unknown as RemoteLinkType;

  // 0. Seed Default Publishable API Key if needed for Store API validation
  try {
    const apiKeyService = container.resolve(
      Modules.API_KEY,
    ) as unknown as ApiKeyServiceType;
    const existingKeys = await apiKeyService.listApiKeys({
      type: "publishable",
    });
    if (existingKeys.length === 0) {
      await apiKeyService.createApiKeys({
        title: "Synthetic Catalog Key",
        type: "publishable",
        created_by: "system",
      });
    }
  } catch (err) {
    console.warn(
      "[seed-catalog-provider-core] Publishable key seed warning:",
      err,
    );
  }

  // 1. Staff Role Assignments
  const existingStaff = await marketplaceService.listStaffRoleAssignments({});
  if (existingStaff.length === 0) {
    await marketplaceService.createStaffRoleAssignments({
      user_id: "user_platform_admin_fixture",
      role: "platform_admin",
    });
    await marketplaceService.createStaffRoleAssignments({
      user_id: "user_compliance_reviewer_fixture",
      role: "compliance_reviewer",
    });
  }

  // 2. Vendors
  let [vendorA] = (await marketplaceService.listVendors({
    handle: "etno-studio",
  })) as Record<string, unknown>[];

  if (!vendorA) {
    vendorA = (await marketplaceService.createVendors({
      handle: "etno-studio",
      name: "Етно Студія",
      status: "active",
    })) as Record<string, unknown>;

    await marketplaceService.createVendorProfiles({
      vendor_id: vendorA["id"] as string,
      display_name: "Етно Студія",
      summary: "Автентичні вироби ручної роботи з традиційною вишивкою.",
      location: "Львів, Україна",
    });
  }

  let [vendorB] = (await marketplaceService.listVendors({
    handle: "polissia-craft",
  })) as Record<string, unknown>[];

  if (!vendorB) {
    vendorB = (await marketplaceService.createVendors({
      handle: "polissia-craft",
      name: "Полісся Крафт",
      status: "active",
    })) as Record<string, unknown>;

    await marketplaceService.createVendorProfiles({
      vendor_id: vendorB["id"] as string,
      display_name: "Полісся Крафт",
      summary: "Крафтові чаї, мед та вироби з деревообробки з серця Полісся.",
      location: "Житомир, Україна",
    });
  }

  // 3. Vendor Memberships
  const existingMembersA = await marketplaceService.listVendorMembers({
    vendor_id: vendorA["id"] as string,
  });
  if (existingMembersA.length === 0) {
    await marketplaceService.createVendorMembers({
      vendor_id: vendorA["id"] as string,
      auth_identity_id: "auth_identity_vendor_a_owner",
      role: "owner",
      is_active: true,
    });
  }

  const existingMembersB = await marketplaceService.listVendorMembers({
    vendor_id: vendorB["id"] as string,
  });
  if (existingMembersB.length === 0) {
    await marketplaceService.createVendorMembers({
      vendor_id: vendorB["id"] as string,
      auth_identity_id: "auth_identity_vendor_b_owner",
      role: "owner",
      is_active: true,
    });
  }

  // 4. Categories
  const categoriesData = [
    {
      id: "category-odiah",
      slug: "odiah",
      name: "Одяг та аксесуари",
    },
    {
      id: "category-shoperi",
      slug: "shoperi",
      name: "Шопери та сумки",
    },
    {
      id: "category-podarunky",
      slug: "podarunky",
      name: "Подарунки",
    },
    {
      id: "category-maisterni",
      slug: "maisterni",
      name: "Майстерні",
    },
  ];

  const categoryMap = new Map<string, CategoryRecord>();
  for (const cat of categoriesData) {
    const [existingCat] = await productService.listProductCategories({
      handle: cat.slug,
    });
    if (existingCat) {
      categoryMap.set(cat.slug, existingCat as CategoryRecord);
    } else {
      const created = await productService.createProductCategories({
        handle: cat.slug,
        name: cat.name,
        is_active: true,
      });
      categoryMap.set(cat.slug, created as CategoryRecord);
    }
  }

  // 5. Published Synthetic Fixture Products (12 items)
  const fixtureProducts = [
    {
      title: "Футболка Світло",
      slug: "podarunkova-futbolka-svitlo",
      categorySlug: "podarunky",
      vendorId: vendorA["id"] as string,
      price: 990,
      description: "Демо-товар для перегляду структури каталогу.",
    },
    {
      title: "Одежа Етно",
      slug: "odiah-1",
      categorySlug: "odiah",
      vendorId: vendorA["id"] as string,
      price: 1200,
      description: "Демо-товар для перегляду структури каталогу.",
    },
    {
      title: "Футболка Світло V2",
      slug: "podarunkova-futbolka-svitlo-v2",
      categorySlug: "podarunky",
      vendorId: vendorA["id"] as string,
      price: 1050,
      description: "Демо-товар для перегляду структури каталогу.",
    },
    {
      title: "Чашка Ранок",
      slug: "chashka-ranok",
      categorySlug: "podarunky",
      vendorId: vendorB["id"] as string,
      price: 380,
      description: "Демо-товар для перегляду структури каталогу.",
    },
    {
      title: "Свічка Вечір",
      slug: "svichka-vechir",
      categorySlug: "podarunky",
      vendorId: vendorB["id"] as string,
      price: 320,
      description: "Демо-товар для перегляду структури каталогу.",
    },
    {
      title: "Нотатник Мрії",
      slug: "notatnyk-mrii",
      categorySlug: "podarunky",
      vendorId: vendorA["id"] as string,
      price: 450,
      description: "Демо-товар для перегляду структури каталогу.",
    },
    {
      title: "Сумка Полісся",
      slug: "shoper-prowye",
      categorySlug: "shoperi",
      vendorId: vendorB["id"] as string,
      price: 650,
      description: "Демо-товар для перегляду структури каталогу.",
    },
    {
      title: "Шопер Разом",
      slug: "shoper-razom",
      categorySlug: "shoperi",
      vendorId: vendorA["id"] as string,
      price: 580,
      description: "Демо-товар для перегляду структури каталогу.",
    },
    {
      title: "Чай Лісовий",
      slug: "chai-lisovyi",
      categorySlug: "maisterni",
      vendorId: vendorB["id"] as string,
      price: 240,
      description: "Демо-товар для перегляду структури каталогу.",
    },
    {
      title: "Мед Травневий",
      slug: "med-travnevyi",
      categorySlug: "maisterni",
      vendorId: vendorB["id"] as string,
      price: 310,
      description: "Демо-товар для перегляду структури каталогу.",
    },
    {
      title: "Набір Кераміки",
      slug: "nabir-keramiky",
      categorySlug: "maisterni",
      vendorId: vendorA["id"] as string,
      price: 1850,
      description: "Демо-товар для перегляду структури каталогу.",
    },
    {
      title: "Плед Затишок",
      slug: "pled-zatyshok",
      categorySlug: "maisterni",
      vendorId: vendorA["id"] as string,
      price: 2100,
      description: "Демо-товар для перегляду структури каталогу.",
    },
  ];

  const syntheticOrderItems: SyntheticOrderCreateInput["items"] = [];

  for (const item of fixtureProducts) {
    const category = categoryMap.get(item.categorySlug);
    const [existingProduct] = await productService.listProducts({
      handle: item.slug,
    });

    let productId = existingProduct?.id as string | undefined;
    if (!existingProduct) {
      const product = await productService.createProducts({
        title: item.title,
        handle: item.slug,
        description: item.description,
        status: "published",
        category_ids: category ? [category.id] : [],
      });
      productId = product.id as string;
    }

    const existingListings = await marketplaceService.listCatalogListings({
      vendor_id: item.vendorId,
      title: item.title,
    });

    let listingId = existingListings[0]?.id as string | undefined;
    if (!listingId) {
      const listing = await marketplaceService.createCatalogListings({
        vendor_id: item.vendorId,
        title: item.title,
        description: item.description,
        state: "published",
        visibility: "local_demo",
        synthetic: true,
        price_uah: item.price,
        submitted_at: new Date(),
        published_at: new Date(),
      });
      listingId = listing.id as string;

      await remoteLink.create({
        [MARKETPLACE_MODULE]: { catalog_listing_id: listingId },
        [Modules.PRODUCT]: { product_id: productId! },
      });
    } else {
      await marketplaceService.updateCatalogListings({
        id: listingId,
        state: "published",
        visibility: "local_demo",
        synthetic: true,
        price_uah: item.price,
        published_at: new Date(),
      });
    }

    syntheticOrderItems.push({
      catalogListingId: listingId,
      productId: productId!,
      vendorId: item.vendorId,
      productName: item.title,
      unitPriceUah: item.price,
      quantity: 1,
    });
  }

  if (process.env.ALLOW_SYNTHETIC_ORDERS === "true") {
    const customerService = container.resolve(
      Modules.CUSTOMER,
    ) as unknown as CustomerServiceType;
    const fixtureEmail = "customer.fixture@life.ua";
    const existingCustomers = await customerService.listCustomers({
      email: fixtureEmail,
    });
    const customer =
      existingCustomers[0] ||
      (await customerService.createCustomers({
        first_name: "Олена",
        last_name: "Мельник",
        email: fixtureEmail,
        phone: "+380678901234",
        has_account: true,
        metadata: { synthetic_fixture: true },
      }));
    const customerId =
      typeof customer["id"] === "string" ? customer["id"] : null;
    if (!customerId) {
      throw new Error(
        "[seed-catalog-provider-core] Не вдалося створити customer fixture для synthetic order.",
      );
    }

    const orderNumber = "SYN-CUSTOMER-FIXTURE-DELIVERED-1";
    const existingSyntheticOrders = await marketplaceService.listParentOrders({
      order_number: orderNumber,
    });
    if (
      existingSyntheticOrders.length === 0 &&
      syntheticOrderItems.length > 0
    ) {
      const firstVendorId = syntheticOrderItems[0]?.vendorId;
      const fixtureOrderItems = syntheticOrderItems
        .filter((item) => item.vendorId === firstVendorId)
        .slice(0, 2);
      const secondVendorItem = syntheticOrderItems.find(
        (item) => item.vendorId !== firstVendorId,
      );
      if (secondVendorItem) {
        fixtureOrderItems.push(secondVendorItem);
      }
      if (new Set(fixtureOrderItems.map((item) => item.vendorId)).size < 2) {
        throw new Error(
          "[seed-catalog-provider-core] Multi-vendor synthetic order fixture requires at least two active vendors.",
        );
      }
      await marketplaceService.createSyntheticOrder({
        customerId,
        orderNumber,
        initialFulfillmentStatus: "delivered",
        items: fixtureOrderItems,
      });
    }
  }

  // 6. Unreferenced Probe Listings (5 items) for State Filtering Verification
  const probeData = [
    {
      title: "Чернетка Етно",
      state: "draft",
      visibility: "internal",
      vendorId: vendorA["id"] as string,
    },
    {
      title: "На Модерації Полісся",
      state: "submitted",
      visibility: "internal",
      vendorId: vendorB["id"] as string,
    },
    {
      title: "Відхилено Студія",
      state: "rejected",
      visibility: "internal",
      vendorId: vendorA["id"] as string,
    },
    {
      title: "Приховано Крафт",
      state: "archived",
      visibility: "internal",
      vendorId: vendorB["id"] as string,
    },
    {
      title: "Призупинено Етно",
      state: "archived",
      visibility: "internal",
      vendorId: vendorA["id"] as string,
    },
  ];

  for (const probe of probeData) {
    const existing = await marketplaceService.listCatalogListings({
      vendor_id: probe.vendorId,
      title: probe.title,
    });
    if (existing.length === 0) {
      await marketplaceService.createCatalogListings({
        vendor_id: probe.vendorId,
        title: probe.title,
        description: "Probe record for moderation state filtering validation.",
        state: probe.state as "draft" | "submitted" | "rejected" | "archived",
        visibility: probe.visibility as "internal" | "synthetic" | "local_demo",
      });
    }
  }

  console.log(
    "[seed-catalog-provider-core] Successfully seeded synthetic catalog core data.",
  );
}
