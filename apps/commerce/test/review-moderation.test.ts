import { describe, expect, it, vi } from "vitest";
import MarketplaceModuleService from "../src/modules/marketplace/service";
import type {
  ProductReviewModerationInput,
  ProductReviewModerationResult,
} from "../src/types/service-types";

type TransactionManager = {
  execute: ReturnType<typeof vi.fn>;
  nativeUpdate: ReturnType<typeof vi.fn>;
};

type TestService = MarketplaceModuleService & {
  baseRepository_: {
    getFreshManager: () => TransactionManager;
    transaction: (
      callback: (manager: TransactionManager) => Promise<unknown>,
    ) => Promise<unknown>;
  };
  createReviewModerationDecisions: ReturnType<typeof vi.fn>;
  createAuditEvents: ReturnType<typeof vi.fn>;
};

const input: ProductReviewModerationInput = {
  reviewId: "review_1",
  reviewerId: "staff_1",
  targetStatus: "approved",
  rationale: "Перевірено модератором",
  correlationId: "corr_1",
};

function buildService(manager: TransactionManager) {
  let committed = false;
  let rolledBack = false;
  const service = Object.create(
    MarketplaceModuleService.prototype,
  ) as TestService;
  service.baseRepository_ = {
    getFreshManager: () => manager,
    transaction: async (callback) => {
      try {
        const result = await callback(manager);
        committed = true;
        return result;
      } catch (error) {
        rolledBack = true;
        throw error;
      }
    },
  };
  service.createReviewModerationDecisions = vi
    .fn()
    .mockResolvedValue({ id: "decision_1" });
  service.createAuditEvents = vi.fn().mockResolvedValue({ id: "audit_1" });

  return {
    service,
    wasCommitted: () => committed,
    wasRolledBack: () => rolledBack,
  };
}

describe("product review moderation transaction", () => {
  it("returns a conflict without writes when the locked review is no longer pending", async () => {
    const manager: TransactionManager = {
      execute: vi
        .fn()
        .mockResolvedValue([{ id: input.reviewId, status: "approved" }]),
      nativeUpdate: vi.fn(),
    };
    const { service } = buildService(manager);

    const result = (await service.moderateProductReview(
      input,
    )) as ProductReviewModerationResult;

    expect(result).toEqual({ conflict: true });
    expect(manager.nativeUpdate).not.toHaveBeenCalled();
    expect(service.createReviewModerationDecisions).not.toHaveBeenCalled();
    expect(service.createAuditEvents).not.toHaveBeenCalled();
  });

  it("commits one decision and one audit event for a pending review", async () => {
    const manager: TransactionManager = {
      execute: vi
        .fn()
        .mockResolvedValueOnce([
          { id: input.reviewId, status: "pending", vendor_id: "vendor_1" },
        ])
        .mockResolvedValueOnce([]),
      nativeUpdate: vi.fn().mockResolvedValue(1),
    };
    const { service, wasCommitted } = buildService(manager);

    const result = (await service.moderateProductReview(
      input,
    )) as ProductReviewModerationResult;

    expect(result).toMatchObject({
      review: { id: input.reviewId, status: "approved" },
      decision: { id: "decision_1" },
    });
    expect(manager.nativeUpdate).toHaveBeenCalledTimes(1);
    expect(service.createReviewModerationDecisions).toHaveBeenCalledTimes(1);
    expect(service.createAuditEvents).toHaveBeenCalledTimes(1);
    expect(wasCommitted()).toBe(true);
  });

  it("rolls back the transaction when audit creation fails", async () => {
    const manager: TransactionManager = {
      execute: vi
        .fn()
        .mockResolvedValueOnce([
          { id: input.reviewId, status: "pending", vendor_id: "vendor_1" },
        ])
        .mockResolvedValueOnce([]),
      nativeUpdate: vi.fn().mockResolvedValue(1),
    };
    const { service, wasCommitted, wasRolledBack } = buildService(manager);
    service.createAuditEvents.mockRejectedValue(new Error("audit failed"));

    await expect(service.moderateProductReview(input)).rejects.toThrow(
      "audit failed",
    );

    expect(manager.nativeUpdate).toHaveBeenCalledTimes(1);
    expect(service.createReviewModerationDecisions).toHaveBeenCalledTimes(1);
    expect(wasCommitted()).toBe(false);
    expect(wasRolledBack()).toBe(true);
  });
});
