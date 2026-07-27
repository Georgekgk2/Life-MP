export type CalculateShippingInput = {
  vendorId: string;
  recipientCity: string;
  weightKg: number;
};

export type CalculateShippingResult = {
  feeUah: number;
};

export type GenerateTTNInput = {
  childOrderId: string;
  senderVendorId: string;
  recipientName: string;
  recipientPhone: string;
  recipientCity: string;
  recipientAddress: string;
};

export type GenerateTTNResult = {
  ttnNumber: string;
};

export interface ShippingProviderAdapter {
  calculateShippingFee(
    input: CalculateShippingInput,
  ): Promise<CalculateShippingResult>;
  generateTTN(input: GenerateTTNInput): Promise<GenerateTTNResult>;
}

export class MockNovaPoshtaAdapter implements ShippingProviderAdapter {
  async calculateShippingFee(
    input: CalculateShippingInput,
  ): Promise<CalculateShippingResult> {
    // Base fee 80 UAH + 10 UAH per kg
    const feeUah = 80 + Math.ceil(input.weightKg) * 10;
    return { feeUah };
  }

  async generateTTN(input: GenerateTTNInput): Promise<GenerateTTNResult> {
    // Deterministic TTN seed based on child order ID
    const seed = input.childOrderId ? input.childOrderId.slice(-6) : "123456";
    const ttnNumber = `204500${Math.floor(1000 + Math.random() * 9000)}${seed}`;
    return { ttnNumber };
  }
}
