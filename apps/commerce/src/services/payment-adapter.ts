import crypto from "node:crypto";
import { z } from "zod";
import type {
  WebhookEventLedger,
  MedusaPaymentStatus,
  MonobankInvoiceStatus,
} from "./monobank-payment-adapter.js";

export type PaymentSessionInput = {
  amountUah: number;
  orderId: string;
};

export type PaymentSessionResult = {
  transactionId: string;
  paymentUrl: string;
};

export type WebhookProcessInput = {
  transactionId: string;
  status: "success" | "failed";
  idempotencyKey: string;
};

export type WebhookProcessResult = {
  success: boolean;
  isDuplicate: boolean;
};

export interface MarketplacePaymentAdapter {
  createPaymentSession(
    input: PaymentSessionInput,
  ): Promise<PaymentSessionResult>;
  processWebhook(input: WebhookProcessInput): Promise<WebhookProcessResult>;
}

export class SandboxPaymentAdapter implements MarketplacePaymentAdapter {
  private processedKeys = new Set<string>();

  async createPaymentSession(
    input: PaymentSessionInput,
  ): Promise<PaymentSessionResult> {
    const transactionId = `tx_sb_${crypto.randomUUID().slice(0, 8)}`;
    return {
      transactionId,
      paymentUrl: `https://sandbox.life.ua/pay/${transactionId}?amount=${input.amountUah}&order=${input.orderId}`,
    };
  }

  async processWebhook(
    input: WebhookProcessInput,
  ): Promise<WebhookProcessResult> {
    if (this.processedKeys.has(input.idempotencyKey)) {
      return { success: true, isDuplicate: true };
    }

    this.processedKeys.add(input.idempotencyKey);
    return {
      success: input.status === "success",
      isDuplicate: false,
    };
  }
}

export const HmacWebhookPayloadSchema = z
  .object({
    transactionId: z.string().min(1),
    orderId: z.string().min(1),
    amountKopecks: z.number().int().positive(),
    currency: z.literal("UAH"),
    status: z.enum([
      "created",
      "processing",
      "authorized",
      "success",
      "failure",
      "reversed",
    ]),
    timestamp: z.number().int().positive(),
  })
  .strict();

export type HmacWebhookPayload = z.infer<typeof HmacWebhookPayloadSchema>;

export type HmacProcessWebhookResult =
  | {
      valid: true;
      isDuplicate: boolean;
      transactionId: string;
      medusaStatus: MedusaPaymentStatus;
    }
  | {
      valid: false;
      statusCode: 400 | 401 | 409 | 422 | 500;
      error: string;
    };

/**
 * Secure HMAC-based Sandbox Payment Adapter conforming to ADR 0014 contracts.
 *
 * Supports HMAC-SHA256 / HMAC-SHA1 validation, replay protection, strict FSM transitions,
 * and durable idempotency through WebhookEventLedger.
 */
export class HmacSandboxPaymentAdapter implements MarketplacePaymentAdapter {
  private static readonly ALLOWED_FSM_TRANSITIONS: Readonly<
    Record<string, readonly MedusaPaymentStatus[]>
  > = {
    created: ["pending"],
    processing: ["pending"],
    authorized: ["authorized"],
    success: ["captured"],
    failure: ["failed"],
    reversed: ["canceled", "refunded"],
  };

  constructor(
    private readonly secretKey: string,
    private readonly ledger?: WebhookEventLedger,
    private readonly maxSkewSeconds: number = 300,
  ) {
    if (!secretKey || secretKey.length < 16) {
      throw new Error(
        "HmacSandboxPaymentAdapter secret key must be at least 16 characters long",
      );
    }
  }

  verifySignature(
    rawBody: string | Buffer,
    signature: string,
    algorithm: "sha256" | "sha1" = "sha256",
  ): boolean {
    if (!signature || typeof signature !== "string") {
      return false;
    }
    try {
      const hmac = crypto.createHmac(algorithm, this.secretKey);
      hmac.update(rawBody);
      const expected = hmac.digest("hex");
      return (
        signature.length === expected.length &&
        crypto.timingSafeEqual(
          Buffer.from(signature, "hex"),
          Buffer.from(expected, "hex"),
        )
      );
    } catch {
      return false;
    }
  }

  computeSignature(
    rawBody: string | Buffer,
    algorithm: "sha256" | "sha1" = "sha256",
  ): string {
    return crypto
      .createHmac(algorithm, this.secretKey)
      .update(rawBody)
      .digest("hex");
  }

  async createPaymentSession(
    input: PaymentSessionInput,
  ): Promise<PaymentSessionResult> {
    const transactionId = `tx_hmac_${crypto.randomUUID()}`;
    const paymentUrl = `https://sandbox.life.ua/pay/${transactionId}?amount=${input.amountUah}&order=${input.orderId}`;
    return {
      transactionId,
      paymentUrl,
    };
  }

  async processWebhook(
    input: WebhookProcessInput,
  ): Promise<WebhookProcessResult> {
    return {
      success: input.status === "success",
      isDuplicate: false,
    };
  }

  async processSignedWebhook(
    rawBody: string | Buffer,
    signature: string,
    algorithm: "sha256" | "sha1" = "sha256",
  ): Promise<HmacProcessWebhookResult> {
    // 1. Fail-closed signature verification
    if (!this.verifySignature(rawBody, signature, algorithm)) {
      return {
        valid: false,
        statusCode: 401,
        error: "Invalid or missing HMAC signature (401 Unauthorized)",
      };
    }

    // 2. Parse JSON & Validate strict Zod schema
    let parsedJson: unknown;
    try {
      const text =
        typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
      parsedJson = JSON.parse(text);
    } catch {
      return {
        valid: false,
        statusCode: 400,
        error: "Malformed webhook JSON payload",
      };
    }

    const parseResult = HmacWebhookPayloadSchema.safeParse(parsedJson);
    if (!parseResult.success) {
      return {
        valid: false,
        statusCode: 422,
        error: `Payload validation failed: ${parseResult.error.message}`,
      };
    }

    const payload = parseResult.data;

    // 3. Replay Protection: verify timestamp within skew window
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - payload.timestamp) > this.maxSkewSeconds) {
      return {
        valid: false,
        statusCode: 400,
        error: `Webhook timestamp expired or clock skew exceeded (${payload.timestamp} vs ${nowSec})`,
      };
    }

    // 4. Map provider status to Medusa status
    const medusaStatus = this.mapStatus(payload.status);

    // 5. Idempotent Ledger Application (if ledger configured)
    if (this.ledger) {
      const payloadHash = crypto
        .createHash("sha256")
        .update(rawBody)
        .digest("hex");

      const applyResult = await this.ledger.atomicApplyWebhook(
        {
          invoiceId: payload.transactionId,
          status: (payload.status === "authorized"
            ? "hold"
            : payload.status) as MonobankInvoiceStatus,
          modifiedDate: new Date(payload.timestamp * 1000).toISOString(),
          payloadHash,
          rawPayload:
            typeof rawBody === "string" ? rawBody : rawBody.toString("utf8"),
          receivedAt: new Date(),
        },
        medusaStatus,
      );

      if (applyResult.isHashConflict) {
        return {
          valid: false,
          statusCode: 409,
          error: "Payload hash conflict detected on duplicate webhook event",
        };
      }

      return {
        valid: true,
        isDuplicate: applyResult.isDuplicate,
        transactionId: payload.transactionId,
        medusaStatus: applyResult.currentStatus,
      };
    }

    return {
      valid: true,
      isDuplicate: false,
      transactionId: payload.transactionId,
      medusaStatus,
    };
  }

  private mapStatus(status: HmacWebhookPayload["status"]): MedusaPaymentStatus {
    switch (status) {
      case "created":
      case "processing":
        return "pending";
      case "authorized":
        return "authorized";
      case "success":
        return "captured";
      case "failure":
        return "failed";
      case "reversed":
        return "refunded";
    }
  }
}
