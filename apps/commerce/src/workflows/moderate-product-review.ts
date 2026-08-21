import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { MARKETPLACE_MODULE } from "../modules/marketplace/constants.js";
import type {
  MarketplaceServiceType,
  ProductReviewModerationInput,
  ProductReviewModerationResult,
} from "../types/service-types.js";

export const moderateProductReviewStep = createStep(
  "moderate-product-review-step",
  async (input: ProductReviewModerationInput, { container, context }) => {
    const marketplaceService = container.resolve(
      MARKETPLACE_MODULE,
    ) as MarketplaceServiceType;
    const result = await marketplaceService.moderateProductReview(
      input,
      context,
    );

    return new StepResponse<ProductReviewModerationResult>(result);
  },
);

export const moderateProductReviewWorkflow = createWorkflow(
  "moderate-product-review-workflow",
  (input: ProductReviewModerationInput) => {
    const result = moderateProductReviewStep(input);
    return new WorkflowResponse(result);
  },
);
