import crypto from "node:crypto";

export type IssueReceiptItem = {
  title: string;
  priceUah: number;
  quantity: number;
};

export type IssueReceiptInput = {
  parentOrderId: string;
  amountUah: number;
  items: IssueReceiptItem[];
};

export type IssueReceiptResult = {
  receiptId: string;
  fiscalCode: string;
  pdfUrl: string;
};

export interface FiscalReceiptAdapter {
  issueReceipt(input: IssueReceiptInput): Promise<IssueReceiptResult>;
}

export class MockFiscalAdapter implements FiscalReceiptAdapter {
  async issueReceipt(input: IssueReceiptInput): Promise<IssueReceiptResult> {
    const receiptId = `rcpt_mock_${crypto.randomUUID().slice(0, 8)}`;
    const fiscalCode = `FISC-${Math.floor(100000 + Math.random() * 900000)}`;

    return {
      receiptId,
      fiscalCode,
      pdfUrl: `https://sandbox.life.ua/receipts/${receiptId}.pdf?order=${input.parentOrderId}`,
    };
  }
}
