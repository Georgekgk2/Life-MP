import {
  InjectManager,
  InjectTransactionManager,
  MedusaContext,
  MedusaService,
} from "@medusajs/framework/utils";
import type { Context } from "@medusajs/framework/types";
import type { EntityManager } from "@medusajs/framework/mikro-orm/knex";
import type {
  ProductReviewModerationInput,
  ProductReviewModerationResult,
} from "../../types/service-types.js";
import { createSyntheticOrder as writeSyntheticOrder } from "./customer-orders.js";
import type {
  SyntheticOrderCreateInput,
  SyntheticOrderCreateResult,
} from "./customer-orders.js";
import {
  Vendor,
  VendorMember,
  VendorProfile,
  VendorVerification,
  ComplianceDocument,
  CatalogListing,
  ProductClaim,
  ModerationDecision,
  StaffRoleAssignment,
  AuditEvent,
  ParentOrder,
  VendorChildOrder,
  VendorPayable,
  SettlementBatch,
  ArtisanApplication,
  OrderLine,
  Shipment,
  TrackingEvent,
  ProductReview,
  ReviewModerationDecision,
} from "./models/index.js";

class MarketplaceModuleService extends MedusaService({
  Vendor,
  VendorMember,
  VendorProfile,
  VendorVerification,
  ComplianceDocument,
  CatalogListing,
  ProductClaim,
  ModerationDecision,
  StaffRoleAssignment,
  AuditEvent,
  ParentOrder,
  VendorChildOrder,
  VendorPayable,
  SettlementBatch,
  ArtisanApplication,
  OrderLine,
  Shipment,
  TrackingEvent,
  ProductReview,
  ReviewModerationDecision,
}) {
  @InjectManager()
  async createSyntheticOrder(
    input: SyntheticOrderCreateInput,
    @MedusaContext() sharedContext?: Context<EntityManager>,
  ): Promise<SyntheticOrderCreateResult> {
    return await this.createSyntheticOrder_(input, sharedContext);
  }

  @InjectTransactionManager()
  protected async createSyntheticOrder_(
    input: SyntheticOrderCreateInput,
    @MedusaContext() sharedContext?: Context<EntityManager>,
  ): Promise<SyntheticOrderCreateResult> {
    if (!sharedContext?.transactionManager) {
      throw new Error(
        "Створення синтетичного замовлення потребує транзакційного менеджера сутностей.",
      );
    }

    return await writeSyntheticOrder(
      this as unknown as Parameters<typeof writeSyntheticOrder>[0],
      input,
      sharedContext,
    );
  }

  @InjectManager()
  async moderateProductReview(
    input: ProductReviewModerationInput,
    @MedusaContext() sharedContext?: Context<EntityManager>,
  ): Promise<ProductReviewModerationResult> {
    return await this.moderateProductReview_(input, sharedContext);
  }

  @InjectTransactionManager()
  protected async moderateProductReview_(
    input: ProductReviewModerationInput,
    @MedusaContext() sharedContext?: Context<EntityManager>,
  ): Promise<ProductReviewModerationResult> {
    const transactionManager = sharedContext?.transactionManager;
    if (!transactionManager) {
      throw new Error(
        "Модерація відгуку потребує транзакційного менеджера сутностей.",
      );
    }

    const lockedReviews = await transactionManager.execute(
      'SELECT * FROM "product_review" WHERE "id" = ? AND "deleted_at" IS NULL FOR UPDATE',
      [input.reviewId],
    );
    const review = lockedReviews[0] as Record<string, unknown> | undefined;
    if (!review || review["status"] !== "pending") {
      return { conflict: true };
    }

    const existingDecisions = await transactionManager.execute(
      'SELECT "id" FROM "review_moderation_decision" WHERE "review_id" = ?',
      [input.reviewId],
    );
    if (existingDecisions.length > 0) {
      return { conflict: true };
    }

    const updatedRows = await transactionManager.nativeUpdate(
      "product_review",
      {
        id: input.reviewId,
        status: "pending",
        deleted_at: null,
      },
      {
        status: input.targetStatus,
        moderator_id: input.reviewerId,
        moderation_rationale: input.rationale,
        reviewed_at: new Date(),
      },
    );
    if (updatedRows !== 1) {
      return { conflict: true };
    }

    const decision = await this.createReviewModerationDecisions(
      {
        review_id: input.reviewId,
        reviewer_id: input.reviewerId,
        target_status: input.targetStatus,
        rationale: input.rationale,
      },
      sharedContext,
    );
    const vendorId =
      typeof review["vendor_id"] === "string" ? review["vendor_id"] : null;
    await this.createAuditEvents(
      {
        actor_id: input.reviewerId,
        actor_type: "staff",
        action: `review.${input.targetStatus}`,
        tenant_id: vendorId,
        listing_id: null,
        correlation_id: input.correlationId ?? null,
        payload: {
          review_id: input.reviewId,
          rationale: input.rationale,
        },
      },
      sharedContext,
    );

    return {
      review: {
        ...review,
        status: input.targetStatus,
        moderator_id: input.reviewerId,
        moderation_rationale: input.rationale,
        reviewed_at: new Date(),
      },
      decision,
    };
  }
}

export default MarketplaceModuleService;
