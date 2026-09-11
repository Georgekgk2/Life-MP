import crypto from "node:crypto";
import type {
  MarketplacePaymentAdapter,
  PaymentSessionInput,
  PaymentSessionResult,
  WebhookProcessInput,
  WebhookProcessResult as DomainWebhookProcessResult,
} from "./payment-adapter";

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

export type LedgerEventRecord = Readonly<{
  invoiceId: string;
  status: MonobankInvoiceStatus;
  modifiedDate: string;
  payloadHash: string;
  rawPayload: string;
  receivedAt: Date;
}>;

export type LedgerInvoiceRecord = Readonly<{
  invoiceId: string;
  orderId: string;
  amountKopecks: number;
  currency: number;
  status: MedusaPaymentStatus;
  createdAt: Date;
  updatedAt: Date;
}>;

export interface WebhookEventLedger {
  getInvoice(invoiceId: string): Promise<LedgerInvoiceRecord | null>;
  saveInvoice(record: LedgerInvoiceRecord): Promise<void>;
  updateInvoiceStatus(
    invoiceId: string,
    newStatus: MedusaPaymentStatus,
  ): Promise<void>;
  atomicApplyWebhook(
    event: LedgerEventRecord,
    nextStatus: MedusaPaymentStatus,
  ): Promise<{
    applied: boolean;
    isDuplicate: boolean;
    currentStatus: MedusaPaymentStatus;
    error?: string;
  }>;
}

export type MonobankCreateInvoiceRequest = Readonly<{
  amount: number;
  ccy: number;
  merchantPaymInfo: {
    reference: string;
    destination: string;
    basketOrder?: readonly unknown[];
  };
  redirectUrl?: string;
  webHookUrl?: string;
  validity?: number;
  paymentType?: "hold" | "debit";
}>;

export type MonobankCreateInvoiceResponse = Readonly<{
  invoiceId: string;
  pageUrl: string;
}>;

export type MonobankFinalizeHoldRequest = Readonly<{
  invoiceId: string;
  amount?: number;
}>;

export type MonobankFinalizeHoldResponse = Readonly<{
  status: "success";
}>;

export type MonobankCancelHoldRequest = Readonly<{
  invoiceId: string;
  extRef?: string;
  amount?: number;
}>;

export type MonobankCancelHoldResponse = Readonly<{
  status: "success";
}>;

export type MonobankInvoiceStatusResponse = Readonly<{
  invoiceId: string;
  status: MonobankInvoiceStatus;
  amount: number;
  ccy: number;
  createdDate: string;
  modifiedDate: string;
  reference: string;
}>;

export interface MonobankTransport {
  getPublicKey(forceRefresh?: boolean): Promise<string>;
  createInvoice(
    request: MonobankCreateInvoiceRequest,
  ): Promise<MonobankCreateInvoiceResponse>;
  finalizeHold(
    request: MonobankFinalizeHoldRequest,
  ): Promise<MonobankFinalizeHoldResponse>;
  cancelHold(
    request: MonobankCancelHoldRequest,
  ): Promise<MonobankCancelHoldResponse>;
  getInvoiceStatus?(invoiceId: string): Promise<MonobankInvoiceStatusResponse>;
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
 * Backward transitions (e.g. captured -> hold or captured -> canceled) are strictly prohibited.
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
 * Normalizes Monobank public key string.
 * Monobank API returns a Base64-encoded PEM string.
 * This helper decodes Base64 PEM if needed, or passes through plain PEM or SPKI.
 */
export function normalizePublicKeyPem(keyString: string): string {
  const trimmed = keyString.trim();
  if (trimmed.startsWith("-----BEGIN")) {
    return trimmed;
  }
  // Try decoding Base64-encoded PEM (standard Monobank acquiring response)
  try {
    const decoded = Buffer.from(trimmed, "base64").toString("utf-8");
    if (decoded.includes("-----BEGIN PUBLIC KEY-----")) {
      return decoded.trim();
    }
  } catch {
    // ignore
  }
  // Fallback for raw SPKI Base64 bytes
  return `-----BEGIN PUBLIC KEY-----\n${trimmed}\n-----END PUBLIC KEY-----`;
}

/**
 * Validates ECDSA-SHA256 signature against base64 raw body and public key.
 */
export function verifyEcdsaSignature(
  rawBody: string | Buffer,
  signatureBase64: string,
  publicKeyPemOrBase64: string,
): boolean {
  try {
    const keyPem = normalizePublicKeyPem(publicKeyPemOrBase64);
    const verifier = crypto.createVerify("SHA256");
    verifier.update(rawBody);
    return verifier.verify(keyPem, signatureBase64, "base64");
  } catch {
    return false;
  }
}

/**
 * In-memory ledger with concurrency lock serialization for isolated tests and local development.
 */
export class InMemoryWebhookLedger implements WebhookEventLedger {
  private invoices = new Map<string, LedgerInvoiceRecord>();
  private events = new Map<string, LedgerEventRecord>();
  private locks = new Map<string, Promise<void>>();

  private async acquireLock(invoiceId: string): Promise<() => void> {
    while (this.locks.has(invoiceId)) {
      await this.locks.get(invoiceId);
    }
    let release!: () => void;
    const lockPromise = new Promise<void>((res) => {
      release = res;
    });
    this.locks.set(invoiceId, lockPromise);
    return () => {
      this.locks.delete(invoiceId);
      release();
    };
  }

  async getInvoice(invoiceId: string): Promise<LedgerInvoiceRecord | null> {
    return this.invoices.get(invoiceId) ?? null;
  }

  async saveInvoice(record: LedgerInvoiceRecord): Promise<void> {
    this.invoices.set(record.invoiceId, record);
  }

  async updateInvoiceStatus(
    invoiceId: string,
    newStatus: MedusaPaymentStatus,
  ): Promise<void> {
    const inv = this.invoices.get(invoiceId);
    if (inv) {
      this.invoices.set(invoiceId, {
        ...inv,
        status: newStatus,
        updatedAt: new Date(),
      });
    }
  }

  async atomicApplyWebhook(
    event: LedgerEventRecord,
    nextStatus: MedusaPaymentStatus,
  ): Promise<{
    applied: boolean;
    isDuplicate: boolean;
    currentStatus: MedusaPaymentStatus;
    error?: string;
  }> {
    const release = await this.acquireLock(event.invoiceId);
    try {
      const eventKey = `${event.invoiceId}:${event.status}:${event.modifiedDate}`;
      if (this.events.has(eventKey)) {
        const inv = this.invoices.get(event.invoiceId);
        return {
          applied: false,
          isDuplicate: true,
          currentStatus: inv?.status ?? nextStatus,
        };
      }

      const inv = this.invoices.get(event.invoiceId);
      if (!inv) {
        return {
          applied: false,
          isDuplicate: false,
          currentStatus: nextStatus,
          error: `Invoice ${event.invoiceId} not found in ledger`,
        };
      }

      if (!isValidStatusTransition(inv.status, nextStatus)) {
        return {
          applied: false,
          isDuplicate: false,
          currentStatus: inv.status,
          error: `Invalid status transition from ${inv.status} to ${nextStatus}`,
        };
      }

      // Record event and update invoice atomically
      this.events.set(eventKey, event);
      this.invoices.set(event.invoiceId, {
        ...inv,
        status: nextStatus,
        updatedAt: new Date(),
      });

      return {
        applied: true,
        isDuplicate: false,
        currentStatus: nextStatus,
      };
    } finally {
      release();
    }
  }
}

/**
 * Fake in-memory transport for unit tests and local offline development.
 */
export class FakeMonobankTransport implements MonobankTransport {
  private currentPublicKey: string;
  private invoices = new Map<string, MonobankInvoiceStatusResponse>();
  public shouldFailRequests = false;
  public failureErrorMessage = "Simulated Monobank network error";

  constructor(initialPublicKey: string) {
    this.currentPublicKey = initialPublicKey;
  }

  setPublicKey(newKey: string): void {
    this.currentPublicKey = newKey;
  }

  async getPublicKey(): Promise<string> {
    if (this.shouldFailRequests) {
      throw new Error(this.failureErrorMessage);
    }
    return this.currentPublicKey;
  }

  async createInvoice(
    request: MonobankCreateInvoiceRequest,
  ): Promise<MonobankCreateInvoiceResponse> {
    if (this.shouldFailRequests) {
      throw new Error(this.failureErrorMessage);
    }
    const invoiceId = `inv_sb_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const pageUrl = `https://sandbox.monobank.ua/pay/${invoiceId}`;
    this.invoices.set(invoiceId, {
      invoiceId,
      status: "created",
      amount: request.amount,
      ccy: request.ccy,
      createdDate: new Date().toISOString(),
      modifiedDate: new Date().toISOString(),
      reference: request.merchantPaymInfo.reference,
    });
    return { invoiceId, pageUrl };
  }

  async finalizeHold(
    request: MonobankFinalizeHoldRequest,
  ): Promise<MonobankFinalizeHoldResponse> {
    if (this.shouldFailRequests) {
      throw new Error(this.failureErrorMessage);
    }
    const inv = this.invoices.get(request.invoiceId);
    if (!inv) {
      throw new Error(`Monobank: invoice ${request.invoiceId} not found`);
    }
    this.invoices.set(request.invoiceId, {
      ...inv,
      status: "success",
      modifiedDate: new Date().toISOString(),
    });
    return { status: "success" };
  }

  async cancelHold(
    request: MonobankCancelHoldRequest,
  ): Promise<MonobankCancelHoldResponse> {
    if (this.shouldFailRequests) {
      throw new Error(this.failureErrorMessage);
    }
    const inv = this.invoices.get(request.invoiceId);
    if (!inv) {
      throw new Error(`Monobank: invoice ${request.invoiceId} not found`);
    }
    this.invoices.set(request.invoiceId, {
      ...inv,
      status: "reversed",
      modifiedDate: new Date().toISOString(),
    });
    return { status: "success" };
  }

  async getInvoiceStatus(
    invoiceId: string,
  ): Promise<MonobankInvoiceStatusResponse> {
    if (this.shouldFailRequests) {
      throw new Error(this.failureErrorMessage);
    }
    const inv = this.invoices.get(invoiceId);
    if (!inv) {
      throw new Error(`Monobank: invoice ${invoiceId} not found`);
    }
    return inv;
  }
}

/**
 * Real HTTP Transport for Monobank Acquiring API (isolated, timeout-bounded).
 */
export class MonobankHttpTransport implements MonobankTransport {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly timeoutMs: number;

  constructor(options: {
    token: string;
    baseUrl?: string;
    timeoutMs?: number;
  }) {
    this.token = options.token;
    this.baseUrl = options.baseUrl ?? "https://api.monobank.ua";
    this.timeoutMs = options.timeoutMs ?? 15000;
  }

  private async request<T>(
    path: string,
    options: { method: "GET" | "POST"; body?: unknown },
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: options.method,
        headers: {
          "X-Token": this.token,
          "Content-Type": "application/json",
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(
          `Monobank API error (${response.status}): ${errorText || response.statusText}`,
        );
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  async getPublicKey(): Promise<string> {
    const res = await this.request<{ key: string }>("/api/merchant/pubkey", {
      method: "GET",
    });
    return res.key;
  }

  async createInvoice(
    request: MonobankCreateInvoiceRequest,
  ): Promise<MonobankCreateInvoiceResponse> {
    return this.request<MonobankCreateInvoiceResponse>(
      "/api/merchant/invoice/create",
      {
        method: "POST",
        body: request,
      },
    );
  }

  async finalizeHold(
    request: MonobankFinalizeHoldRequest,
  ): Promise<MonobankFinalizeHoldResponse> {
    return this.request<MonobankFinalizeHoldResponse>(
      "/api/merchant/invoice/finalize",
      {
        method: "POST",
        body: request,
      },
    );
  }

  async cancelHold(
    request: MonobankCancelHoldRequest,
  ): Promise<MonobankCancelHoldResponse> {
    return this.request<MonobankCancelHoldResponse>(
      "/api/merchant/invoice/cancel",
      {
        method: "POST",
        body: request,
      },
    );
  }
}

export class MonobankSandboxPaymentAdapter {
  private readonly transport: MonobankTransport;
  private readonly ledger: WebhookEventLedger;
  private cachedKey: string | null = null;

  constructor(options: {
    transport: MonobankTransport;
    ledger: WebhookEventLedger;
  }) {
    this.transport = options.transport;
    this.ledger = options.ledger;
  }

  async getInvoice(invoiceId: string): Promise<LedgerInvoiceRecord | null> {
    return this.ledger.getInvoice(invoiceId);
  }

  /**
   * Creates a sandbox payment invoice (holding funds for up to 9 days per ADR 0014).
   */
  async createInvoice(input: CreateInvoiceInput): Promise<CreateInvoiceResult> {
    if (
      !Number.isSafeInteger(input.amountKopecks) ||
      input.amountKopecks <= 0
    ) {
      throw new Error(
        "Invoice amount must be a positive safe integer in kopecks",
      );
    }
    if (!input.orderId || input.orderId.trim().length === 0) {
      throw new Error("Invoice orderId must not be empty");
    }

    const response = await this.transport.createInvoice({
      amount: input.amountKopecks,
      ccy: 980,
      merchantPaymInfo: {
        reference: input.orderId,
        destination: input.description,
      },
      redirectUrl: input.redirectUrl,
      webHookUrl: input.webhookUrl,
      paymentType: input.paymentType ?? "hold",
    });

    // Save record to durable ledger
    await this.ledger.saveInvoice({
      invoiceId: response.invoiceId,
      orderId: input.orderId,
      amountKopecks: input.amountKopecks,
      currency: 980,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return {
      invoiceId: response.invoiceId,
      pageUrl: response.pageUrl,
    };
  }

  /**
   * Fetches public key with forced cache-busting when initial verification fails.
   */
  async getPublicKey(forceRefresh = false): Promise<string> {
    if (!this.cachedKey || forceRefresh) {
      this.cachedKey = await this.transport.getPublicKey(forceRefresh);
    }
    return this.cachedKey;
  }

  /**
   * Processes Monobank Webhook according to ADR 0014:
   * 1. Cryptographic ECDSA signature verification with forced refresh on failure;
   * 2. Parse payload directly from verified rawBody (no detached/unverified payload);
   * 3. Business invariant checks (currency 980, matching amount & reference);
   * 4. Durable idempotency via atomic ledger;
   * 5. FSM forward-only transition enforcement.
   */
  async processWebhook(options: {
    rawBody: string | Buffer;
    signatureHeader?: string | undefined;
  }): Promise<WebhookProcessResult> {
    const { rawBody, signatureHeader } = options;

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

    // 2. Parse payload directly from verified rawBody
    let payload: MonobankWebhookPayload;
    try {
      const rawString =
        typeof rawBody === "string" ? rawBody : rawBody.toString("utf-8");
      payload = JSON.parse(rawString);
    } catch {
      return {
        valid: false,
        statusCode: 400,
        error: "Malformed JSON payload in raw body",
      };
    }

    // 3. Validate payload shape and basic invariants
    if (!payload.invoiceId || !payload.status) {
      return {
        valid: false,
        statusCode: 400,
        error: "Missing invoiceId or status in payload",
      };
    }

    if (!Number.isSafeInteger(payload.amount) || payload.amount <= 0) {
      return {
        valid: false,
        statusCode: 400,
        error: `Invalid amount ${payload.amount}. Expected positive integer in kopecks`,
      };
    }

    if (payload.ccy !== 980) {
      return {
        valid: false,
        statusCode: 400,
        error: `Invalid currency code ${payload.ccy}. Expected 980 (UAH)`,
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

    // 4. Look up invoice in ledger to validate amount and reference
    const invoiceRecord = await this.ledger.getInvoice(payload.invoiceId);
    if (!invoiceRecord) {
      return {
        valid: false,
        statusCode: 422,
        error: `Invoice ${payload.invoiceId} not found in ledger`,
      };
    }

    if (payload.amount !== invoiceRecord.amountKopecks) {
      return {
        valid: false,
        statusCode: 422,
        error: `Amount mismatch: expected ${invoiceRecord.amountKopecks}, got ${payload.amount}`,
      };
    }

    if (payload.reference && payload.reference !== invoiceRecord.orderId) {
      return {
        valid: false,
        statusCode: 422,
        error: `Reference mismatch: expected ${invoiceRecord.orderId}, got ${payload.reference}`,
      };
    }

    // 5. Compute payload hash and build event record
    const rawString =
      typeof rawBody === "string" ? rawBody : rawBody.toString("utf-8");
    const payloadHash = crypto
      .createHash("sha256")
      .update(rawString)
      .digest("hex");

    const eventRecord: LedgerEventRecord = {
      invoiceId: payload.invoiceId,
      status: payload.status,
      modifiedDate: payload.modifiedDate || new Date().toISOString(),
      payloadHash,
      rawPayload: rawString,
      receivedAt: new Date(),
    };

    // 6. Atomic application with mutex/lock in ledger
    const applyResult = await this.ledger.atomicApplyWebhook(
      eventRecord,
      mappedMedusaStatus,
    );

    if (applyResult.isDuplicate) {
      return {
        valid: true,
        isDuplicate: true,
        invoiceId: payload.invoiceId,
        providerStatus: payload.status,
        medusaStatus: applyResult.currentStatus,
      };
    }

    if (!applyResult.applied) {
      return {
        valid: false,
        statusCode: 422,
        error: applyResult.error ?? "Failed to apply webhook transition",
      };
    }

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
   * Fails closed without mutating local state if transport fails.
   */
  async finalizeHold(
    invoiceId: string,
    amountKopecks: number,
  ): Promise<{ success: boolean; invoiceId: string }> {
    if (!Number.isSafeInteger(amountKopecks) || amountKopecks <= 0) {
      throw new Error("Finalize amount must be a positive safe integer");
    }
    const invoice = await this.ledger.getInvoice(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found in ledger`);
    }

    if (amountKopecks > invoice.amountKopecks) {
      throw new Error(
        `Cannot finalize amount ${amountKopecks} greater than hold amount ${invoice.amountKopecks}`,
      );
    }

    if (invoice.status !== "authorized" && invoice.status !== "pending") {
      throw new Error(`Cannot finalize invoice in status ${invoice.status}`);
    }

    // Call provider transport first (if provider fails, local state remains unmutated)
    await this.transport.finalizeHold({
      invoiceId,
      amount: amountKopecks,
    });

    // Update local ledger status only after provider succeeds
    await this.ledger.updateInvoiceStatus(invoiceId, "captured");
    return { success: true, invoiceId };
  }

  /**
   * Cancels (voids) authorization hold if artisan declines or order is canceled.
   * Fails closed without mutating local state if transport fails.
   */
  async cancelHold(
    invoiceId: string,
  ): Promise<{ success: boolean; invoiceId: string }> {
    const invoice = await this.ledger.getInvoice(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found in ledger`);
    }

    if (invoice.status === "captured" || invoice.status === "refunded") {
      throw new Error(
        `Cannot cancel invoice in status ${invoice.status}. Reversals of captured funds require refunds.`,
      );
    }

    if (invoice.status === "canceled") {
      return { success: true, invoiceId }; // Idempotent
    }

    // Call provider transport first
    await this.transport.cancelHold({ invoiceId });

    // Update local ledger status only after provider succeeds
    await this.ledger.updateInvoiceStatus(invoiceId, "canceled");
    return { success: true, invoiceId };
  }
}

/**
 * Bridges MonobankSandboxPaymentAdapter to the domain MarketplacePaymentAdapter interface.
 */
export class MonobankCommercePaymentAdapter implements MarketplacePaymentAdapter {
  constructor(private readonly core: MonobankSandboxPaymentAdapter) {}

  async createPaymentSession(
    input: PaymentSessionInput,
  ): Promise<PaymentSessionResult> {
    const result = await this.core.createInvoice({
      orderId: input.orderId,
      amountKopecks: Math.round(input.amountUah * 100),
      description: `Оплата замовлення ${input.orderId}`,
      paymentType: "hold",
    });
    return {
      transactionId: result.invoiceId,
      paymentUrl: result.pageUrl,
    };
  }

  async processWebhook(
    input: WebhookProcessInput,
  ): Promise<DomainWebhookProcessResult> {
    const invoice = await this.core.getInvoice(input.transactionId);
    if (!invoice) {
      return { success: false, isDuplicate: false };
    }
    const isSuccess = input.status === "success";
    return {
      success: isSuccess,
      isDuplicate: invoice.status === (isSuccess ? "captured" : "failed"),
    };
  }
}
