import crypto from "node:crypto";
import { z } from "zod";

/**
 * ============================================================================
 * Monobank Acquiring Sandbox Payment Adapter (ADR 0014 Contract Core)
 * ============================================================================
 * Local sandbox contract layer for two-stage authorization hold orchestration:
 * - Fail-closed ECDSA webhook verification with forced public-key cache busting,
 *   24h TTL, and DoS amplification rate-limiting (60s cooldown);
 * - Strict Zod runtime payload and transport response schemas (.strict())
 *   with full official Monobank Acquiring API field definitions and nullable support;
 * - Durable idempotency model with payloadHash conflict rejection (409);
 * - Sanitized external error reporting (503 without internal leak);
 * - Atomic command execution with per-invoice mutex locking;
 * - No-retry policy on mutating POST requests;
 * - Safe response handling for empty body (e.g. 200 OK from /invoice/remove);
 * - Proper handling of asynchronous cancel: "processing" keeps local authorized state;
 * - Semantic differentiation: cancelHold (authorized hold) vs removeInvoice (unpaid pending);
 * - Status query & strict FSM-compliant reconciliation via GET /api/merchant/invoice/status;
 * - Strict Finite State Machine (FSM) status transitions: capture requires hold.
 *
 * NOTE: This is Slice 1 (local sandbox contract layer).
 * Slice 2 introduces PostgreSQL persistence (payment_webhook_events) and Redis mutex.
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

export class MonobankReconciliationError extends Error {
  constructor(
    public readonly invoiceId: string,
    public readonly targetStatus: MedusaPaymentStatus,
    message: string,
  ) {
    super(message);
    this.name = "MonobankReconciliationError";
  }
}

export type CreateInvoiceInput = Readonly<{
  orderId: string;
  amountKopecks: number;
  description: string;
  redirectUrl?: string;
  webhookUrl?: string;
  paymentType?: "hold"; // Fixed to hold-only in initial sandbox slice
}>;

export type CreateInvoiceResult = Readonly<{
  invoiceId: string;
  pageUrl: string;
}>;

const webhookDateRegex =
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/;

const webhookDateSchema = z
  .string()
  .refine(
    (val) =>
      webhookDateRegex.test(val) &&
      !Number.isNaN(Date.parse(val.replace(" ", "T"))),
    { message: "Must be a valid ISO 8601 or standard API datetime string" },
  );

export const MonobankWebhookPayloadSchema = z
  .object({
    invoiceId: z.string().min(1),
    status: z.enum([
      "created",
      "processing",
      "hold",
      "success",
      "failure",
      "reversed",
      "expired",
    ]),
    amount: z.number().int().positive(),
    ccy: z.literal(980),
    finalAmount: z.number().int().positive().nullable().optional(),
    createdDate: webhookDateSchema,
    modifiedDate: webhookDateSchema,
    reference: z.string().min(1),
    failureReason: z.string().nullable().optional(),
    errCode: z.string().nullable().optional(),
    cancelList: z.array(z.unknown()).nullable().optional(),
    walletData: z.record(z.unknown()).nullable().optional(),
  })
  .strict();

export type MonobankWebhookPayload = z.infer<
  typeof MonobankWebhookPayloadSchema
>;

export const MonobankPublicKeyResponseSchema = z
  .object({
    key: z.string().min(1),
  })
  .strict();

export const MonobankCreateInvoiceResponseSchema = z
  .object({
    invoiceId: z.string().min(1),
    pageUrl: z.string().url(),
  })
  .strict();

export const MonobankSuccessResponseSchema = z
  .object({
    status: z.literal("success"),
  })
  .strict();

export const MonobankCancelResponseSchema = z
  .object({
    status: z.enum(["success", "processing", "failure"]),
    createdDate: webhookDateSchema.nullable().optional(),
    modifiedDate: webhookDateSchema.nullable().optional(),
  })
  .strict();

export const MonobankRemoveInvoiceResponseSchema = z
  .object({
    status: z.string().optional(),
  })
  .passthrough();

export const MonobankInvoiceStatusResponseSchema = z
  .object({
    invoiceId: z.string().min(1),
    status: z.enum([
      "created",
      "processing",
      "hold",
      "success",
      "failure",
      "reversed",
      "expired",
    ]),
    amount: z.number().int().positive(),
    ccy: z.literal(980),
    finalAmount: z.number().int().positive().nullable().optional(),
    createdDate: webhookDateSchema.nullable().optional(),
    modifiedDate: webhookDateSchema.nullable().optional(),
    reference: z.string().nullable().optional(),
    destination: z.string().nullable().optional(),
    paymentInfo: z.record(z.unknown()).nullable().optional(),
    cancelList: z.array(z.unknown()).nullable().optional(),
    tipsInfo: z.record(z.unknown()).nullable().optional(),
    walletData: z.record(z.unknown()).nullable().optional(),
    failureReason: z.string().nullable().optional(),
    errCode: z.string().nullable().optional(),
  })
  .strict();

export type MonobankWebhookProcessResult =
  | Readonly<{
      valid: true;
      isDuplicate: boolean;
      invoiceId: string;
      providerStatus: MonobankInvoiceStatus;
      medusaStatus: MedusaPaymentStatus;
    }>
  | Readonly<{
      valid: false;
      statusCode: 400 | 401 | 409 | 422 | 500 | 503;
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
  paymentType: "hold";
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
  acquireLock(invoiceId: string): Promise<() => void>;
  atomicApplyWebhook(
    event: LedgerEventRecord,
    nextStatus: MedusaPaymentStatus,
  ): Promise<{
    applied: boolean;
    isDuplicate: boolean;
    isHashConflict?: boolean;
    currentStatus: MedusaPaymentStatus;
    error?: string;
  }>;
}

export type MonobankCreateInvoiceRequest = Readonly<{
  amount: number;
  ccy: 980;
  merchantPaymInfo: {
    reference: string;
    destination: string;
    basketOrder?: readonly unknown[];
  };
  redirectUrl?: string;
  webHookUrl?: string;
  validity?: number;
  paymentType: "hold";
}>;

export type MonobankCreateInvoiceResponse = Readonly<{
  invoiceId: string;
  pageUrl: string;
}>;

export type MonobankFinalizeHoldRequest = Readonly<{
  invoiceId: string;
  amount: number;
}>;

export type MonobankFinalizeHoldResponse = Readonly<{
  status: "success";
}>;

export type MonobankCancelHoldRequest = Readonly<{
  invoiceId: string;
  extRef?: string;
  amount?: number;
}>;

export type MonobankCancelHoldResponse = z.infer<
  typeof MonobankCancelResponseSchema
>;

export type MonobankRemoveInvoiceRequest = Readonly<{
  invoiceId: string;
}>;

export type MonobankInvoiceStatusResponse = z.infer<
  typeof MonobankInvoiceStatusResponseSchema
>;

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
  removeInvoice(
    request: MonobankRemoveInvoiceRequest,
  ): Promise<{ status?: string }>;
  getInvoiceStatus(invoiceId: string): Promise<MonobankInvoiceStatusResponse>;
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
 * In hold-only orchestration, capture REQUIRES prior authorization (hold).
 * Backward transitions or jumping from pending to captured are strictly prohibited.
 */
export const ALLOWED_STATUS_TRANSITIONS: Readonly<
  Record<MedusaPaymentStatus, readonly MedusaPaymentStatus[]>
> = Object.freeze({
  pending: Object.freeze<MedusaPaymentStatus[]>([
    "authorized",
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
 * In-memory test ledger implementation with per-invoice mutex locking.
 * STRICTLY for unit tests, offline drills, and local sandbox verification.
 * Production deployment requires persistent PostgreSQL table (payment_webhook_events)
 * and distributed Redis mutex.
 */
export class InMemoryTestWebhookLedger implements WebhookEventLedger {
  private invoices = new Map<string, LedgerInvoiceRecord>();
  private events = new Map<string, LedgerEventRecord>();
  private locks = new Map<string, Promise<void>>();

  async acquireLock(invoiceId: string): Promise<() => void> {
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
    isHashConflict?: boolean;
    currentStatus: MedusaPaymentStatus;
    error?: string;
  }> {
    const release = await this.acquireLock(event.invoiceId);
    try {
      const eventKey = `${event.invoiceId}:${event.status}:${event.modifiedDate}`;
      const existing = this.events.get(eventKey);

      if (existing) {
        if (existing.payloadHash !== event.payloadHash) {
          const inv = this.invoices.get(event.invoiceId);
          return {
            applied: false,
            isDuplicate: false,
            isHashConflict: true,
            currentStatus: inv?.status ?? nextStatus,
            error: `Payload hash conflict detected for event key ${eventKey}`,
          };
        }

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

export { InMemoryTestWebhookLedger as InMemoryWebhookLedger };

/**
 * Fake in-memory transport for unit tests and local offline development.
 */
export class FakeMonobankTransport implements MonobankTransport {
  private currentPublicKey: string;
  private invoices = new Map<string, MonobankInvoiceStatusResponse>();
  public shouldFailRequests = false;
  public failureErrorMessage = "Simulated Monobank network error";
  public cancelHoldStatusResult: "success" | "processing" | "failure" =
    "success";

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
      ccy: 980,
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

    if (this.cancelHoldStatusResult === "success") {
      this.invoices.set(request.invoiceId, {
        ...inv,
        status: "reversed",
        modifiedDate: new Date().toISOString(),
      });
    }

    return {
      status: this.cancelHoldStatusResult,
      createdDate: new Date().toISOString(),
      modifiedDate: new Date().toISOString(),
    };
  }

  async removeInvoice(
    request: MonobankRemoveInvoiceRequest,
  ): Promise<{ status?: string }> {
    if (this.shouldFailRequests) {
      throw new Error(this.failureErrorMessage);
    }
    const inv = this.invoices.get(request.invoiceId);
    if (!inv) {
      throw new Error(`Monobank: invoice ${request.invoiceId} not found`);
    }
    this.invoices.set(request.invoiceId, {
      ...inv,
      status: "expired",
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

export type StructuredLogEntry = Readonly<{
  timestamp: string;
  correlationId: string;
  method: string;
  path: string;
  durationMs: number;
  status?: number;
  error?: string;
}>;

/**
 * Real HTTP Transport for Monobank Acquiring API:
 * - Timeout-bounded;
 * - Idempotency-safe: retries ONLY idempotent GET requests (status/pubkey);
 * - POST requests (invoice creation, hold finalization, cancellation) are NEVER automatically retried;
 * - Safely handles 200 OK responses with empty bodies (e.g. /invoice/remove);
 * - Validates provider responses via strict Zod schemas.
 */
export class MonobankHttpTransport implements MonobankTransport {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  public logs: StructuredLogEntry[] = [];

  constructor(options: {
    token: string;
    baseUrl?: string;
    timeoutMs?: number;
    maxRetries?: number;
  }) {
    this.token = options.token;
    this.baseUrl = options.baseUrl ?? "https://api.monobank.ua";
    this.timeoutMs = options.timeoutMs ?? 15000;
    this.maxRetries = options.maxRetries ?? 2;
  }

  private async request<T>(
    path: string,
    options: {
      method: "GET" | "POST";
      body?: unknown;
      schema?: z.ZodType<T>;
    },
  ): Promise<T> {
    const correlationId = `req_${crypto.randomUUID().slice(0, 8)}`;
    // Only retry GET requests. Mutating POST requests must fail closed without blind retries.
    const maxAttempts = options.method === "GET" ? this.maxRetries + 1 : 1;
    let attempt = 0;

    while (attempt < maxAttempts) {
      attempt++;
      const startTime = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(`${this.baseUrl}${path}`, {
          method: options.method,
          headers: {
            "X-Token": this.token,
            "Content-Type": "application/json",
            "X-Correlation-Id": correlationId,
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });

        const durationMs = Date.now() - startTime;
        this.logs.push({
          timestamp: new Date().toISOString(),
          correlationId,
          method: options.method,
          path,
          durationMs,
          status: response.status,
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          if (
            options.method === "GET" &&
            response.status >= 500 &&
            attempt < maxAttempts
          ) {
            await new Promise((r) => setTimeout(r, 100 * attempt));
            continue;
          }
          throw new Error(
            `Monobank API error (${response.status}): ${errorText || response.statusText}`,
          );
        }

        // Safe JSON extraction handling valid 200 OK responses with empty bodies
        const text = await response.text();
        const rawJson: unknown =
          text && text.trim().length > 0 ? JSON.parse(text) : {};

        if (options.schema) {
          const parseResult = options.schema.safeParse(rawJson);
          if (!parseResult.success) {
            throw new Error(
              `Monobank response validation failed: ${parseResult.error.message}`,
            );
          }
          return parseResult.data;
        }

        return rawJson as T;
      } catch (err) {
        const durationMs = Date.now() - startTime;
        const errorMessage = err instanceof Error ? err.message : String(err);

        this.logs.push({
          timestamp: new Date().toISOString(),
          correlationId,
          method: options.method,
          path,
          durationMs,
          error: errorMessage,
        });

        if (options.method === "GET" && attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 100 * attempt));
          continue;
        }
        throw err;
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new Error(
      `Monobank ${options.method} ${path} failed after ${maxAttempts} attempts`,
    );
  }

  async getPublicKey(): Promise<string> {
    const res = await this.request<{ key: string }>("/api/merchant/pubkey", {
      method: "GET",
      schema: MonobankPublicKeyResponseSchema,
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
        schema: MonobankCreateInvoiceResponseSchema,
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
        schema: MonobankSuccessResponseSchema,
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
        schema: MonobankCancelResponseSchema,
      },
    );
  }

  async removeInvoice(
    request: MonobankRemoveInvoiceRequest,
  ): Promise<{ status?: string }> {
    return this.request<{ status?: string }>("/api/merchant/invoice/remove", {
      method: "POST",
      body: request,
      schema: MonobankRemoveInvoiceResponseSchema,
    });
  }

  async getInvoiceStatus(
    invoiceId: string,
  ): Promise<MonobankInvoiceStatusResponse> {
    return this.request<MonobankInvoiceStatusResponse>(
      `/api/merchant/invoice/status?invoiceId=${encodeURIComponent(invoiceId)}`,
      {
        method: "GET",
        schema: MonobankInvoiceStatusResponseSchema,
      },
    );
  }
}

export class MonobankSandboxPaymentAdapter {
  private readonly transport: MonobankTransport;
  private readonly ledger: WebhookEventLedger;
  private cachedKey: { key: string; expiresAtMs: number } | null = null;
  private readonly keyTtlMs = 24 * 60 * 60 * 1000; // 24 hours per ADR 0014
  private lastForceRefreshMs = 0;
  private readonly minForceRefreshIntervalMs = 60_000; // 60s cooldown to prevent amplification DoS

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
   * Creates a sandbox payment invoice with hold funds (up to 9 days per ADR 0014).
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
      paymentType: "hold",
    });

    // Save record to durable ledger
    await this.ledger.saveInvoice({
      invoiceId: response.invoiceId,
      orderId: input.orderId,
      amountKopecks: input.amountKopecks,
      currency: 980,
      paymentType: "hold",
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
   * Fetches public key with 24h TTL, forced cache-busting, and amplification cooldown.
   */
  async getPublicKey(forceRefresh = false): Promise<string> {
    const now = Date.now();
    const isTtlExpired = !this.cachedKey || now >= this.cachedKey.expiresAtMs;
    const canForceRefresh =
      forceRefresh &&
      now - this.lastForceRefreshMs >= this.minForceRefreshIntervalMs;

    if (isTtlExpired || canForceRefresh || !this.cachedKey) {
      if (canForceRefresh) {
        this.lastForceRefreshMs = now;
      }
      const key = await this.transport.getPublicKey(forceRefresh);
      this.cachedKey = {
        key,
        expiresAtMs: now + this.keyTtlMs,
      };
      return key;
    }
    return this.cachedKey.key;
  }

  /**
   * Syncs invoice status directly from Monobank via GET /api/merchant/invoice/status.
   * Strictly validates invoice existence, amount, currency, reference, and FSM transition
   * before applying any local status updates.
   */
  async syncInvoiceStatus(invoiceId: string): Promise<{
    status: MedusaPaymentStatus;
    providerStatus: MonobankInvoiceStatus;
  }> {
    const release = await this.ledger.acquireLock(invoiceId);
    try {
      const invoice = await this.ledger.getInvoice(invoiceId);
      if (!invoice) {
        throw new Error(`Invoice ${invoiceId} not found in ledger`);
      }

      const remote = await this.transport.getInvoiceStatus(invoiceId);

      // Validate business invariants against ledger record
      if (remote.invoiceId !== invoice.invoiceId) {
        throw new Error(
          `Invoice ID mismatch: expected ${invoice.invoiceId}, got ${remote.invoiceId}`,
        );
      }
      if (remote.amount !== invoice.amountKopecks) {
        throw new Error(
          `Amount mismatch: expected ${invoice.amountKopecks}, got ${remote.amount}`,
        );
      }
      if (remote.ccy !== 980) {
        throw new Error(`Currency mismatch: expected 980, got ${remote.ccy}`);
      }
      if (remote.reference && remote.reference !== invoice.orderId) {
        throw new Error(
          `Reference mismatch: expected ${invoice.orderId}, got ${remote.reference}`,
        );
      }

      const nextStatus = MONOBANK_TO_MEDUSA_STATUS[remote.status];
      if (!nextStatus) {
        throw new Error(`Unknown Monobank status: ${remote.status}`);
      }

      // FSM transition check: cannot make illegal state transitions
      if (!isValidStatusTransition(invoice.status, nextStatus)) {
        throw new Error(
          `Invalid status transition from ${invoice.status} to ${nextStatus} during status sync`,
        );
      }

      // Hold-only constraint: cannot transition pending -> captured directly
      if (invoice.status === "pending" && nextStatus === "captured") {
        throw new Error(
          `Invalid status transition from pending to captured: invoice must be in authorized (hold) state before capture`,
        );
      }

      if (invoice.status !== nextStatus) {
        await this.ledger.updateInvoiceStatus(invoiceId, nextStatus);
      }

      return { status: nextStatus, providerStatus: remote.status };
    } finally {
      release();
    }
  }

  /**
   * Processes Monobank Webhook according to ADR 0014:
   * 1. Cryptographic ECDSA signature verification with forced refresh on failure (amplification-protected);
   * 2. Strict Zod runtime schema validation directly on rawBody (.strict());
   * 3. Business invariant checks against ledger record (currency 980, amount, reference);
   * 4. Durable idempotency via atomic ledger with payloadHash conflict rejection (409);
   * 5. FSM forward-only transition enforcement;
   * 6. Sanitized internal error handling returning 503 on system/ledger exceptions.
   */
  async processWebhook(options: {
    rawBody: string | Buffer;
    signatureHeader?: string | undefined;
  }): Promise<MonobankWebhookProcessResult> {
    const { rawBody, signatureHeader } = options;

    // 1. Fail-closed signature presence check
    if (!signatureHeader) {
      return {
        valid: false,
        statusCode: 401,
        error: "Missing X-Sign signature header",
      };
    }

    try {
      let pubKey = await this.getPublicKey(false);
      let isSigValid = verifyEcdsaSignature(rawBody, signatureHeader, pubKey);

      // Forced cache-busting on initial failure (with cooldown protection)
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
    } catch {
      return {
        valid: false,
        statusCode: 503,
        error: "Temporary public key resolution failure. Please retry later.",
      };
    }

    // 2. Parse payload directly from verified rawBody
    const rawString =
      typeof rawBody === "string" ? rawBody : rawBody.toString("utf-8");
    let unvalidatedJson: unknown;
    try {
      unvalidatedJson = JSON.parse(rawString);
    } catch {
      return {
        valid: false,
        statusCode: 400,
        error: "Malformed JSON payload in raw body",
      };
    }

    // 3. Strict Zod schema validation (.strict())
    const parsed = MonobankWebhookPayloadSchema.safeParse(unvalidatedJson);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return {
        valid: false,
        statusCode: 400,
        error: `Payload validation failed: ${issue.path.join(".") || "payload"} - ${issue.message}`,
      };
    }
    const payload = parsed.data;

    try {
      const mappedMedusaStatus = MONOBANK_TO_MEDUSA_STATUS[payload.status];
      if (!mappedMedusaStatus) {
        return {
          valid: false,
          statusCode: 400,
          error: `Unknown Monobank status: ${payload.status}`,
        };
      }

      // 4. Look up invoice in ledger to validate amount, reference, and hold type
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
      const payloadHash = crypto
        .createHash("sha256")
        .update(rawString)
        .digest("hex");

      const eventRecord: LedgerEventRecord = {
        invoiceId: payload.invoiceId,
        status: payload.status,
        modifiedDate: payload.modifiedDate,
        payloadHash,
        rawPayload: rawString,
        receivedAt: new Date(),
      };

      // 6. Atomic application with mutex/lock in ledger
      const applyResult = await this.ledger.atomicApplyWebhook(
        eventRecord,
        mappedMedusaStatus,
      );

      if (applyResult.isHashConflict) {
        return {
          valid: false,
          statusCode: 409,
          error:
            applyResult.error ?? "Payload hash conflict for existing event key",
        };
      }

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
    } catch {
      // Return sanitized 503 to avoid internal infrastructure leakage
      return {
        valid: false,
        statusCode: 503,
        error: "Temporary infrastructure failure. Please retry later.",
      };
    }
  }

  /**
   * Finalizes hold funds (capture) after artisan confirms fulfillment.
   * Race-free via per-invoice mutex lock.
   * STRICT FSM: invoice MUST be in authorized (hold) status. Capturing from pending is strictly prohibited.
   * Prohibits partial finalization in the initial sandbox slice.
   * Throws MonobankReconciliationError if provider succeeds but local ledger update fails.
   */
  async finalizeHold(
    invoiceId: string,
    amountKopecks: number,
  ): Promise<{ success: boolean; invoiceId: string }> {
    if (!Number.isSafeInteger(amountKopecks) || amountKopecks <= 0) {
      throw new Error("Finalize amount must be a positive safe integer");
    }

    const release = await this.ledger.acquireLock(invoiceId);
    try {
      const invoice = await this.ledger.getInvoice(invoiceId);
      if (!invoice) {
        throw new Error(`Invoice ${invoiceId} not found in ledger`);
      }

      if (invoice.status === "captured") {
        return { success: true, invoiceId }; // Idempotent success
      }

      if (invoice.paymentType !== "hold") {
        throw new Error(
          `Cannot finalize non-hold invoice (type: ${invoice.paymentType})`,
        );
      }

      if (amountKopecks !== invoice.amountKopecks) {
        throw new Error(
          `Partial hold finalization is not supported in the initial sandbox slice. Exactly full amount (${invoice.amountKopecks}) must be finalized.`,
        );
      }

      // FSM Enforcement: invoice must be in authorized (hold) state before capture
      if (invoice.status !== "authorized") {
        throw new Error(
          `Cannot finalize invoice in status ${invoice.status}. Invoice must be in authorized (hold) status before capture.`,
        );
      }

      // Call provider transport first (if provider fails, local state remains unmutated)
      await this.transport.finalizeHold({
        invoiceId,
        amount: amountKopecks,
      });

      // Update local ledger status only after provider succeeds.
      // If ledger update throws, signal explicit reconciliation error.
      try {
        await this.ledger.updateInvoiceStatus(invoiceId, "captured");
      } catch (ledgerErr) {
        throw new MonobankReconciliationError(
          invoiceId,
          "captured",
          `Monobank finalized invoice ${invoiceId} successfully, but local ledger update failed: ${ledgerErr instanceof Error ? ledgerErr.message : String(ledgerErr)}. Status must be reconciled from provider.`,
        );
      }

      return { success: true, invoiceId };
    } finally {
      release();
    }
  }

  /**
   * Cancels (voids) authorization hold if artisan declines or order is canceled.
   * Race-free via per-invoice mutex lock.
   * Allows ONLY authorized holds (funds held on card).
   * For unpaid pending invoices, use removeInvoice().
   * Prohibits cancel on pending, failed, captured, or refunded.
   * Handles asynchronous processing: if status === "processing", local state remains authorized!
   * Fails closed without local status mutation if transport fails.
   */
  async cancelHold(invoiceId: string): Promise<{
    success: boolean;
    invoiceId: string;
    providerStatus: "success" | "processing";
  }> {
    const release = await this.ledger.acquireLock(invoiceId);
    try {
      const invoice = await this.ledger.getInvoice(invoiceId);
      if (!invoice) {
        throw new Error(`Invoice ${invoiceId} not found in ledger`);
      }

      if (invoice.status === "canceled") {
        return { success: true, invoiceId, providerStatus: "success" }; // Idempotent
      }

      if (invoice.status === "pending") {
        throw new Error(
          `Cannot cancel hold for pending invoice. Use removeInvoice() to void unpaid invoices.`,
        );
      }

      if (invoice.status !== "authorized") {
        throw new Error(
          `Cannot cancel invoice in status ${invoice.status}. Only authorized holds can be canceled.`,
        );
      }

      // Call provider transport first
      const cancelRes = await this.transport.cancelHold({ invoiceId });

      if (cancelRes.status === "failure") {
        throw new Error(
          `Monobank cancel failed for invoice ${invoiceId}. Status remains authorized.`,
        );
      }

      if (cancelRes.status === "processing") {
        // Asynchronous cancellation in progress: do NOT prematurely mutate local state to canceled!
        // Local state remains authorized pending webhook or status reconciliation.
        return { success: true, invoiceId, providerStatus: "processing" };
      }

      // Provider returned success: update local ledger status
      try {
        await this.ledger.updateInvoiceStatus(invoiceId, "canceled");
      } catch (ledgerErr) {
        throw new MonobankReconciliationError(
          invoiceId,
          "canceled",
          `Monobank canceled invoice ${invoiceId} successfully, but local ledger update failed: ${ledgerErr instanceof Error ? ledgerErr.message : String(ledgerErr)}. Status must be reconciled from provider.`,
        );
      }

      return { success: true, invoiceId, providerStatus: "success" };
    } finally {
      release();
    }
  }

  /**
   * Voids an unpaid pending invoice before customer completes payment.
   * Calls /invoice/remove on provider (mandatory, fail-closed).
   * Updates local status to canceled only after provider succeeds.
   */
  async removeInvoice(
    invoiceId: string,
  ): Promise<{ success: boolean; invoiceId: string }> {
    const release = await this.ledger.acquireLock(invoiceId);
    try {
      const invoice = await this.ledger.getInvoice(invoiceId);
      if (!invoice) {
        throw new Error(`Invoice ${invoiceId} not found in ledger`);
      }

      if (invoice.status === "canceled") {
        return { success: true, invoiceId }; // Idempotent
      }

      if (invoice.status !== "pending") {
        throw new Error(
          `Cannot remove invoice in status ${invoice.status}. Only pending invoices can be removed.`,
        );
      }

      // Transport call is mandatory
      await this.transport.removeInvoice({ invoiceId });

      try {
        await this.ledger.updateInvoiceStatus(invoiceId, "canceled");
      } catch (ledgerErr) {
        throw new MonobankReconciliationError(
          invoiceId,
          "canceled",
          `Monobank removed invoice ${invoiceId} successfully, but local ledger update failed: ${ledgerErr instanceof Error ? ledgerErr.message : String(ledgerErr)}. Status must be reconciled from provider.`,
        );
      }

      return { success: true, invoiceId };
    } finally {
      release();
    }
  }
}
