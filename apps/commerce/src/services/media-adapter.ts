import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { MedusaError } from "@medusajs/framework/utils";

export type UploadFileInput = {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
};

export type UploadFileResult = {
  fileUrl: string;
  key: string;
};

export interface MediaStorageAdapter {
  upload(file: UploadFileInput): Promise<UploadFileResult>;
}

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit

export class LocalDiskMediaAdapter implements MediaStorageAdapter {
  private uploadsDir: string;

  constructor(uploadsDir?: string) {
    this.uploadsDir = uploadsDir || path.resolve(process.cwd(), "uploads");
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async upload(file: UploadFileInput): Promise<UploadFileResult> {
    // 1. Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(file.mimeType)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Forbidden file type '${file.mimeType}'. Allowed types: PDF, JPEG, PNG, WEBP.`,
      );
    }

    // 2. Validate File Size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `File size ${file.size} bytes exceeds maximum limit of 10MB.`,
      );
    }

    // 3. Generate secure random filename
    const ext = path.extname(file.originalName) || ".bin";
    const secureKey = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(this.uploadsDir, secureKey);

    await fs.promises.writeFile(filePath, file.buffer);

    return {
      fileUrl: `/uploads/${secureKey}`,
      key: secureKey,
    };
  }
}
