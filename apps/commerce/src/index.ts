export const commerceCapabilitiesAwaitingDecisions = {
  checkout: "intentionally-not-implemented-pending-decisions",
  payment: "intentionally-not-implemented-pending-decisions",
  shipping: "intentionally-not-implemented-pending-decisions",
} as const;

export type CommerceImplementationBoundary =
  typeof commerceCapabilitiesAwaitingDecisions;
