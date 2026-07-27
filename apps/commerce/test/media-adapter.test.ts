import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { LocalDiskMediaAdapter } from "../src/services/media-adapter";

describe("LocalDiskMediaAdapter", () => {
  let tmpDir: string;
  let adapter: LocalDiskMediaAdapter;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "media-test-"));
    adapter = new LocalDiskMediaAdapter(tmpDir);
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("successfully uploads allowed image file", async () => {
    const file = {
      buffer: Buffer.from("fake-png-data"),
      originalName: "test.png",
      mimeType: "image/png",
      size: 13,
    };

    const result = await adapter.upload(file);
    expect(result.fileUrl).toContain("/uploads/");
    expect(fs.existsSync(path.join(tmpDir, result.key))).toBe(true);
  });

  it("rejects forbidden MIME types", async () => {
    const file = {
      buffer: Buffer.from("executable-script"),
      originalName: "malicious.sh",
      mimeType: "application/x-sh",
      size: 17,
    };

    await expect(adapter.upload(file)).rejects.toThrow("Forbidden file type");
  });

  it("rejects files exceeding size limit", async () => {
    const file = {
      buffer: Buffer.alloc(11 * 1024 * 1024), // 11MB
      originalName: "large.pdf",
      mimeType: "application/pdf",
      size: 11 * 1024 * 1024,
    };

    await expect(adapter.upload(file)).rejects.toThrow("exceeds maximum limit");
  });
});
