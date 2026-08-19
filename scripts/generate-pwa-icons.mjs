import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

function createPng(width, height, getPixel) {
  const signature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth 8
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(4 + 4 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, "ascii");
    data.copy(buf, 8);
    let crc = 0xffffffff;
    for (let i = 4; i < 8 + len; i++) {
      let byte = buf[i];
      for (let j = 0; j < 8; j++) {
        let bit = (crc ^ byte) & 1;
        crc = (crc >>> 1) ^ (bit ? 0xedb88320 : 0);
        byte >>>= 1;
      }
    }
    buf.writeInt32BE((crc ^ 0xffffffff) | 0, 8 + len);
    return buf;
  }

  const ihdrChunk = makeChunk("IHDR", ihdr);

  const scanlineLength = width * 4 + 1;
  const rawData = Buffer.alloc(scanlineLength * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk("IDAT", compressedData);
  const iendChunk = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function getBrandPixel(x, y, w, h, isMaskable = false) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = x - cx;
  const dy = y - cy;
  const r = Math.sqrt(dx * dx + dy * dy);

  if (!isMaskable) {
    const cornerR = w * 0.22;
    const qx = Math.abs(x - cx) - (cx - cornerR);
    const qy = Math.abs(y - cy) - (cy - cornerR);
    if (qx > 0 && qy > 0 && Math.sqrt(qx * qx + qy * qy) > cornerR) {
      return [0, 0, 0, 0];
    }
  }

  const grad = 1 - (y / h) * 0.2;
  const bgR = Math.round(26 * grad);
  const bgG = Math.round(48 * grad);
  const bgB = Math.round(38 * grad);

  const ringInner = w * 0.28;
  const ringOuter = w * 0.33;
  if (r >= ringInner && r <= ringOuter) {
    return [196, 139, 63, 255]; // Gold
  }

  const normX = dx / (w * 0.15);
  const normY = dy / (h * 0.25);
  if (normX * normX + normY * normY <= 1) {
    return [226, 170, 88, 255]; // Light gold leaf
  }

  const dotDy = y - (cy - h * 0.28);
  if (Math.sqrt(dx * dx + dotDy * dotDy) <= w * 0.035) {
    return [250, 247, 242, 255]; // Sand dot
  }

  return [bgR, bgG, bgB, 255];
}

const iconsDir = path.resolve("apps/storefront/public/icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate icon-192.png
fs.writeFileSync(
  path.join(iconsDir, "icon-192.png"),
  createPng(192, 192, (x, y, w, h) => getBrandPixel(x, y, w, h, false)),
);

// Generate icon-512.png
fs.writeFileSync(
  path.join(iconsDir, "icon-512.png"),
  createPng(512, 512, (x, y, w, h) => getBrandPixel(x, y, w, h, false)),
);

// Generate icon-maskable-192.png
fs.writeFileSync(
  path.join(iconsDir, "icon-maskable-192.png"),
  createPng(192, 192, (x, y, w, h) => getBrandPixel(x, y, w, h, true)),
);

// Generate icon-maskable-512.png
fs.writeFileSync(
  path.join(iconsDir, "icon-maskable-512.png"),
  createPng(512, 512, (x, y, w, h) => getBrandPixel(x, y, w, h, true)),
);

// Generate apple-touch-icon.png (180x180)
fs.writeFileSync(
  path.join(iconsDir, "apple-touch-icon.png"),
  createPng(180, 180, (x, y, w, h) => getBrandPixel(x, y, w, h, false)),
);

// Also copy or write to public/apple-touch-icon.png and public/favicon.ico / public/icon.png
fs.writeFileSync(
  path.resolve("apps/storefront/public/apple-touch-icon.png"),
  createPng(180, 180, (x, y, w, h) => getBrandPixel(x, y, w, h, false)),
);

console.log("PWA binary icons generated successfully.");
