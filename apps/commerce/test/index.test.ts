import { describe, expect, it } from "vitest";

import { commerceCapabilitiesAwaitingDecisions } from "../src/index";

describe("commerceCapabilitiesAwaitingDecisions", () => {
  it("keeps checkout, payment, and shipping out of the foundation", () => {
    expect(commerceCapabilitiesAwaitingDecisions).toEqual({
      checkout: "intentionally-not-implemented-pending-decisions",
      payment: "intentionally-not-implemented-pending-decisions",
      shipping: "intentionally-not-implemented-pending-decisions",
    });
  });
});
