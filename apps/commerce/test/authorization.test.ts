import { describe, expect, it } from "vitest";
import {
  assertReviewerMayDecide,
  resolveAuthenticatedActorId,
  resolveVendorMembershipFromAuthContext,
} from "../src/modules/marketplace/authorization";
import { isActiveVendorMembershipUniqueViolation } from "../src/api/admin/marketplace/vendors/[vendor_id]/members/route";

describe("marketplace authorization identity namespaces", () => {
  it("uses actor_id for customer ownership and rejects auth identity fallback", () => {
    expect(
      resolveAuthenticatedActorId({
        actor_id: "cus_1",
        auth_identity_id: "auth_1",
      }),
    ).toBe("cus_1");
    expect(() =>
      resolveAuthenticatedActorId({ auth_identity_id: "auth_1" }),
    ).toThrow();
  });

  it("queries vendor membership by auth_identity_id, never actor_id", async () => {
    const queries: Record<string, unknown>[] = [];
    const container = {
      resolve: () => ({
        listVendorMembers: async (query: Record<string, unknown>) => {
          queries.push(query);
          return [
            {
              id: "member_1",
              vendor_id: "vendor_1",
              auth_identity_id: "auth_1",
              role: "owner",
              active: true,
            },
          ];
        },
      }),
    };

    await resolveVendorMembershipFromAuthContext(
      { actor_id: "user_1", auth_identity_id: "auth_1" },
      container,
    );

    expect(queries).toEqual([{ auth_identity_id: "auth_1", active: true }]);
  });

  it("recognizes only the active membership database conflict", () => {
    expect(
      isActiveVendorMembershipUniqueViolation({
        code: "23505",
        constraint: "UQ_vendor_member_active_auth_identity_id",
      }),
    ).toBe(true);
    expect(
      isActiveVendorMembershipUniqueViolation({
        cause: {
          code: "23505",
          constraint: "UQ_vendor_member_active_auth_identity_id",
        },
      }),
    ).toBe(true);
    expect(
      isActiveVendorMembershipUniqueViolation({
        code: "23505",
        constraint: "UQ_other_constraint",
      }),
    ).toBe(false);
  });

  it("fails closed when reviewer auth identity is unavailable", async () => {
    const container = {
      resolve: () => ({
        listVendorMembers: async () => [],
      }),
    };

    await expect(
      assertReviewerMayDecide(
        { actor_id: "staff_1" },
        { id: "listing_1", vendor_id: "vendor_1", state: "review" },
        container,
      ),
    ).rejects.toThrow();
  });
});
