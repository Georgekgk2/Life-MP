import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { z } from "zod";
import {
  MARKETPLACE_MODULE,
  vendorMemberRoles,
} from "../../../../../../modules/marketplace/constants";
import { assertStaffRole } from "../../../../../../modules/marketplace/authorization";
import type {
  AuthenticatedReq,
  MarketplaceServiceType,
} from "../../../../../../types/service-types";

const createMemberSchema = z
  .object({
    auth_identity_id: z.string().min(1),
    role: z.enum(vendorMemberRoles).default("owner"),
  })
  .strict();

type DatabaseErrorLike = {
  code?: unknown;
  constraint?: unknown;
  cause?: unknown;
};

export function isActiveVendorMembershipUniqueViolation(
  error: unknown,
): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;

  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const candidate = current as DatabaseErrorLike;
    if (
      candidate.code === "23505" &&
      candidate.constraint === "UQ_vendor_member_active_auth_identity_id"
    ) {
      return true;
    }
    current = candidate.cause;
  }

  return false;
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const reqWithAuth = req as unknown as AuthenticatedReq;
  await assertStaffRole(reqWithAuth.auth_context, "platform_admin", req.scope);

  const vendorId = req.params["vendor_id"] as string;
  const parseResult = createMemberSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid vendor member input: ${parseResult.error.message}`,
    );
  }

  const marketplaceService = req.scope.resolve(
    MARKETPLACE_MODULE,
  ) as MarketplaceServiceType;
  const vendor = await marketplaceService.retrieveVendor(vendorId);
  if (!vendor) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Vendor ${vendorId} not found.`,
    );
  }

  const existingMembers = await marketplaceService.listVendorMembers({
    auth_identity_id: parseResult.data.auth_identity_id,
    active: true,
  });

  if (existingMembers.length > 0) {
    throw new MedusaError(
      MedusaError.Types.DUPLICATE_ERROR,
      `Identity ${parseResult.data.auth_identity_id} already has an active vendor membership.`,
    );
  }

  let member: Record<string, unknown>;
  try {
    member = (await marketplaceService.createVendorMembers({
      vendor_id: vendor["id"],
      auth_identity_id: parseResult.data.auth_identity_id,
      role: parseResult.data.role,
      active: true,
    })) as Record<string, unknown>;
  } catch (error) {
    if (isActiveVendorMembershipUniqueViolation(error)) {
      throw new MedusaError(
        MedusaError.Types.DUPLICATE_ERROR,
        `Identity ${parseResult.data.auth_identity_id} already has an active vendor membership.`,
      );
    }
    throw error;
  }

  await marketplaceService.createAuditEvents({
    actor_id:
      reqWithAuth.auth_context?.actor_id ||
      reqWithAuth.auth_context?.auth_identity_id,
    actor_type: "staff_user",
    action: "add_vendor_member",
    tenant_id: vendor["id"],
    payload: {
      member_id: member["id"],
      auth_identity_id: member["auth_identity_id"],
      role: member["role"],
    },
  });

  res.status(201).json({ member });
}
