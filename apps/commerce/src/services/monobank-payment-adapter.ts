import crypto from "node:crypto";

/**
 * ============================================================================
 * Monobank Acquiring Sandbox Payment Adapter (ADR 0014)
 * ============================================================================
 * Implements two-stage authorization hold orchestration, fail-closed ECDSA
 * webhook verification with forced public-key cache busting, durable
 * idempotency, and strict Finite State Machine (FSM) status transitions.
 * ============================================================================
 */

export type MonobankInvoiceStatus =
  | "created"
  | "processing"
  | "hold"
  | "success"
  | "failure"
  | "reversed"
  | "expired";

export type MedusaPaymentStatus =
  "pending" | "authorized" | "captured" | "failed" | "canceled" | "refunded";

export type CreateInvoiceInput = Readonly<{
  orderId: string;
  amountKopecks: number;
  description: string;
  redirectUrl?: string;
  webhookUrl?: string;
  paymentType?: "hold" | "debit";
}>;

export type CreateInvoiceResult = Readonly<{
  invoiceId: string;
  pageUrl: string;
}>;

export type MonobankWebhookPayload = Readonly<{
  invoiceId: string;
  status: MonobankInvoiceStatus;
  amount: number;
  ccy: number;
  finalAmount?: number;
  createdDate: string;
  modifiedDate: string;
  reference: string;
  failureReason?: string;
}>;

export type WebhookProcessResult =
  | Readonly<{
      valid: true;
      isDuplicate: boolean;
      invoiceId: string;
      providerStatus: MonobankInvoiceStatus;
      medusaStatus: MedusaPaymentStatus;
    }>
  | Readonly<{
      valid: false;
      statusCode: 400 | 401 | 422;
      error: string;
    }>;

export interface PublicKeyProvider {
  getPublicKey(forceRefresh?: boolean): Promise<string>;
}

export interface WebhookEventLedger {
  hasEvent(
    invoiceId: string,
    status: string,
    modifiedDate: string,
  ): Promise<boolean>;
  recordEvent(
    invoiceId: string,
    status: string,
    modifiedDate: string,
    payloadHash: string,
  ): Promise<void>;
  getCurrentPaymentStatus(
    invoiceId: string,
  ): Promise<MedusaPaymentStatus | null>;
  updatePaymentStatus(
    invoiceId: string,
    newStatus: MedusaPaymentStatus,
  ): Promise<void>;
}

export const MONOBANK_TO_MEDUSA_STATUS: Readonly<
  Record<MonobankInvoiceStatus, MedusaPaymentStatus>
> = Object.freeze({
  created: "pending",
  processing: "pending",
  hold: "authorized",
  success: "captured",
  failure: "failed",
  reversed: "canceled",
  expired: "canceled",
});

/**
 * Strict forward-only Finite State Machine (FSM).
 * Backward transitions (e.g. captured -> hold) are strictly prohibited.
 */
export const ALLOWED_STATUS_TRANSITIONS: Readonly<
  Record<MedusaPaymentStatus, readonly MedusaPaymentStatus[]>
> = Object.freeze({
  pending: Object.freeze<MedusaPaymentStatus[]>([
    "authorized",
    "captured",
    "failed",
    "canceled",
  ]),
  authorized: Object.freeze<MedusaPaymentStatus[]>([
    "captured",
    "canceled",
    "refunded",
  ]),
  captured: Object.freeze<MedusaPaymentStatus[]>(["refunded"]),
  failed: Object.freeze<MedusaPaymentStatus[]>([]),
  canceled: Object.freeze<MedusaPaymentStatus[]>([]),
  refunded: Object.freeze<MedusaPaymentStatus[]>([]),
});

export function isValidStatusTransition(
  current: MedusaPaymentStatus | null,
  next: MedusaPaymentStatus,
): boolean {
  if (!current) return true;
  if (current === next) return true; // Idempotent same-state replay
  return ALLOWED_STATUS_TRANSITIONS[current]?.includes(next) ?? false;
}

/**
 * Validates ECDSA-SHA256 signature against base64 raw body and public key (PEM or Base64 SPKI).
 */
export function verifyEcdsaSignature(
  rawBody: string | Buffer,
  signatureBase64: string,
  publicKeyPemOrBase64: string,
): boolean {
  try {
    let key = publicKeyPemOrBase64.trim();
    if (!key.startsWith("-----BEGIN")) {
      key = `-----BEGIN PUBLIC KEY-----\n${key}\n-----END PUBLIC KEY-----`;
    }
    const verifier = crypto.createVerify("SHA256");
    verifier.update(rawBody);
    return verifier.verify(key, signatureBase64, "base64");
  } catch {
    return false;
  }
}

/**
 * In-memory fallback ledger for isolated testing and local sandbox verification.
 */
export class InMemoryWebhookLedger implements WebhookEventLedger {
  private events = new Set<string>();
  private statuses = new Map<string, MedusaPaymentStatus>();

  async hasEvent(
    invoiceId: string,
    status: string,
    modifiedDate: string,
  ): Promise<boolean> {
    const key = `${invoiceId}:${status}:${modifiedDate}`;
    return this.events.has(key);
  }

  async recordEvent(
    invoiceId: string,
    status: string,
    modifiedDate: string,
  ): Promise<void> {
    const key = `${invoiceId}:${status}:${modifiedDate}`;
    this.events.add(key);
  }

  async getCurrentPaymentStatus(
    invoiceId: string,
  ): Promise<MedusaPaymentStatus | null> {
    return this.statuses.get(invoiceId) ?? null;
  }

  async updatePaymentStatus(
    invoiceId: string,
    newStatus: MedusaPaymentStatus,
  ): Promise<void> {
    this.statuses.set(invoiceId, newStatus);
  }
}

export class MonobankSandboxPaymentAdapter {
  private readonly publicKeyProvider: PublicKeyProvider;
  private readonly ledger: WebhookEventLedger;
  private cachedKey: string | null = null;

  constructor(options: {
    publicKeyProvider: PublicKeyProvider;
    ledger?: WebhookEventLedger;
  }) {
    this.publicKeyProvider = options.publicKeyProvider;
    this.ledger = options.ledger ?? new InMemoryWebhookLedger();
  }

  /**
   * Creates a sandbox payment invoice (holding funds for up to 9 days per ADR 0014).
   */
  async createInvoice(input: CreateInvoiceInput): Promise<CreateInvoiceResult> {
    if (input.amountKopecks <= 0) {
      throw new Error("Invoice amount must be positive");
    }
    const invoiceId = `inv_sb_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const pageUrl = `https://sandbox.monobank.ua/pay/${invoiceId}`;

    await this.ledger.updatePaymentStatus(invoiceId, "pending");

    return {
      invoiceId,
      pageUrl,
    };
  }

  /**
   * Fetches public key with forced cache-busting when initial verification fails.
   */
  async getPublicKey(forceRefresh = false): Promise<string> {
    if (!this.cachedKey || forceRefresh) {
      this.cachedKey = await this.publicKeyProvider.getPublicKey(forceRefresh);
    }
    return this.cachedKey;
  }

  /**
   * Processes Monobank Webhook according to ADR 0014:
   * 1. Cryptographic ECDSA signature verification with forced refresh on failure;
   * 2. Business invariant checks (currency 980, matching amount & reference);
   * 3. Durable idempotency via ledger;
   * 4. FSM forward-only transition enforcement.
   */
  async processWebhook(options: {
    rawBody: string | Buffer;
    signatureHeader?: string | undefined;
    payload: MonobankWebhookPayload;
    expectedAmountKopecks?: number | undefined;
    expectedReference?: string | undefined;
  }): Promise<WebhookProcessResult> {
    const {
      rawBody,
      signatureHeader,
      payload,
      expectedAmountKopecks,
      expectedReference,
    } = options;

    // 1. Fail-closed signature validation
    if (!signatureHeader) {
      return {
        valid: false,
        statusCode: 401,
        error: "Missing X-Sign signature header",
      };
    }

    let pubKey = await this.getPublicKey(false);
    let isSigValid = verifyEcdsaSignature(rawBody, signatureHeader, pubKey);

    // Forced cache-busting on initial failure
    if (!isSigValid) {
      pubKey = await this.getPublicKey(true);
      isSigValid = verifyEcdsaSignature(rawBody, signatureHeader, pubKey);
    }

    if (!isSigValid) {
      return {
        valid: false,
        statusCode: 401,
        error: "Invalid ECDSA signature",
      };
    }

    // 2. Business Invariants Validation
    if (payload.ccy !== 980) {
      return {
        valid: false,
        statusCode: 400,
        error: `Invalid currency code ${payload.ccy}. Expected 980 (UAH)`,
      };
    }

    if (
      expectedAmountKopecks !== undefined &&
      payload.amount !== expectedAmountKopecks
    ) {
      return {
        valid: false,
        statusCode: 422,
        error: `Amount mismatch: expected ${expectedAmountKopecks}, got ${payload.amount}`,
      };
    }

    if (
      expectedReference !== undefined &&
      payload.reference !== expectedReference
    ) {
      return {
        valid: false,
        statusCode: 422,
        error: `Reference mismatch: expected ${expectedReference}, got ${payload.reference}`,
      };
    }

    const mappedMedusaStatus = MONOBANK_TO_MEDUSA_STATUS[payload.status];
    if (!mappedMedusaStatus) {
      return {
        valid: false,
        statusCode: 400,
        error: `Unknown Monobank status: ${payload.status}`,
      };
    }

    // 3. Durable Idempotency Check
    const isDuplicate = await this.ledger.hasEvent(
      payload.invoiceId,
      payload.status,
      payload.modifiedDate,
    );

    if (isDuplicate) {
      return {
        valid: true,
        isDuplicate: true,
        invoiceId: payload.invoiceId,
        providerStatus: payload.status,
        medusaStatus: mappedMedusaStatus,
      };
    }

    // 4. Finite State Machine Transition Validation
    const currentStatus = await this.ledger.getCurrentPaymentStatus(
      payload.invoiceId,
    );
    if (!isValidStatusTransition(currentStatus, mappedMedusaStatus)) {
      return {
        valid: false,
        statusCode: 422,
        error: `Invalid status transition from ${currentStatus} to ${mappedMedusaStatus}`,
      };
    }

    // 5. Update State & Record Event
    const payloadHash = crypto
      .createHash("sha256")
      .update(rawBody)
      .digest("hex");
    await this.ledger.updatePaymentStatus(
      payload.invoiceId,
      mappedMedusaStatus,
    );
    await this.ledger.recordEvent(
      payload.invoiceId,
      payload.status,
      payload.modifiedDate,
      payloadHash,
    );

    return {
      valid: true,
      isDuplicate: false,
      invoiceId: payload.invoiceId,
      providerStatus: payload.status,
      medusaStatus: mappedMedusaStatus,
    };
  }

  /**
   * Finalizes hold funds (capture) after artisan confirms fulfillment.
   */
  async finalizeHold(
    invoiceId: string,
    amountKopecks: number,
  ): Promise<{ success: boolean; invoiceId: string }> {
    if (amountKopecks <= 0) {
      throw new Error("Finalize amount must be positive");
    }
    const currentStatus = await this.ledger.getCurrentPaymentStatus(invoiceId);
    if (currentStatus !== "authorized" && currentStatus !== "pending") {
      throw new Error(
        `Cannot finalize invoice in status ${currentStatus ?? "unknown"}`,
      );
    }
    await this.ledger.updatePaymentStatus(invoiceId, "captured");
    return { success: true, invoiceId };
  }

  /**
   * Cancels (voids) authorization hold if artisan declines or order is canceled.
   */
  async cancelHold(
    invoiceId: string,
  ): Promise<{ success: boolean; invoiceId: string }> {
    await this.ledger.updatePaymentStatus(invoiceId, "canceled");
    return { success: true, invoiceId };
  }
}
