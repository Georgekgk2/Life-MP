import { describe, expect, it } from "vitest";
import { commerceCapabilitiesAwaitingDecisions } from "../src/index";

describe("commerceCapabilitiesAwaitingDecisions", () => {
  it("keeps transaction, fiscal, shipment, payout, and booking capabilities intentionally unimplemented pending decisions", () => {
    expect(commerceCapabilitiesAwaitingDecisions).toEqual({
      checkout: "intentionally-not-implemented-pending-decisions",
      payment: "intentionally-not-implemented-pending-decisions",
      fiscalization: "intentionally-not-implemented-pending-decisions",
      order_split: "intentionally-not-implemented-pending-decisions",
      shipment: "intentionally-not-implemented-pending-decisions",
      affiliate_payout: "intentionally-not-implemented-pending-decisions",
      booking: "intentionally-not-implemented-pending-decisions",
    });
  });
});
