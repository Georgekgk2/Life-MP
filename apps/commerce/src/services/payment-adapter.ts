import crypto from "node:crypto";

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
