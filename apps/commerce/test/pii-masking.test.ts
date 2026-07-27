import { describe, it, expect } from "vitest";
import {
  maskEmail,
  maskPhone,
  maskName,
  sanitizeLogPayload,
} from "../src/utils/pii-masking";

describe("PII Masking & Log Sanitization", () => {
  it("masks customer email addresses correctly", () => {
    expect(maskEmail("taras.shevchenko@example.com")).toBe("t***o@example.com");
    expect(maskEmail("ab@cd.com")).toBe("a*@cd.com");
    expect(maskEmail("invalid-email")).toBe("***@***.***");
  });

  it("masks Ukrainian phone numbers correctly", () => {
    expect(maskPhone("+380501112233")).toBe("+38050***2233");
    expect(maskPhone("0501112233")).toBe("+38050***2233");
    expect(maskPhone("123")).toBe("+380********");
  });

  it("masks customer names correctly", () => {
    expect(maskName("Тарас Шевченко")).toBe("Т**** Ш****");
    expect(maskName("Олена")).toBe("О****");
  });

  it("recursively sanitizes PII payload for logging and test artifacts", () => {
    const rawPayload = {
      orderId: "ord_123",
      customer_email: "taras.shevchenko@example.com",
      recipient_phone: "+380501112233",
      recipient_name: "Тарас Шевченко",
      delivery_address: "вул. Хрещатик, 1",
      total_amount_uah: 1500,
    };

    const sanitized = sanitizeLogPayload(rawPayload);

    expect(sanitized.orderId).toBe("ord_123");
    expect(sanitized.customer_email).toBe("t***o@example.com");
    expect(sanitized.recipient_phone).toBe("+38050***2233");
    expect(sanitized.recipient_name).toBe("Т**** Ш****");
    expect(sanitized.delivery_address).toBe("[PROTECTED_ADDRESS]");
    expect(sanitized.total_amount_uah).toBe(1500);
  });
});
