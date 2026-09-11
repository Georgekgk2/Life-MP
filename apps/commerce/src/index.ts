export const commerceCapabilitiesAwaitingDecisions = {
  checkout: "intentionally-not-implemented-pending-decisions",
  payment: "intentionally-not-implemented-pending-decisions",
  fiscalization: "intentionally-not-implemented-pending-decisions",
  order_split: "intentionally-not-implemented-pending-decisions",
  shipment: "intentionally-not-implemented-pending-decisions",
  affiliate_payout: "intentionally-not-implemented-pending-decisions",
  booking: "intentionally-not-implemented-pending-decisions",
} as const;

export type CommerceImplementationBoundary =
  typeof commerceCapabilitiesAwaitingDecisions;

export * from "./services/monobank-payment-adapter";
