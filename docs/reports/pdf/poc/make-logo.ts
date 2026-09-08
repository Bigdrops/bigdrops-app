/**
 * POC LOGO GENERATOR — deterministic synthetic raster logo.
 * Writes a 240x96 RGB PNG with a dark-green monogram band and wordmark bars.
 * Pure TypeScript, node:zlib only, no image dependencies.
 * The logo stands in for a production company logo upload (no raster logo
 * asset ships with the repository; only SVGs exist under src/assets).
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const WIDTH = 240;
const HEIGHT = 96;

function crcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
}

const CRC_TABLE = crcTable();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(typeBytes, 4);
  out.set(data, 8);
  const crcInput = new Uint8Array(typeBytes.length + data.length);
  crcInput.set(typeBytes, 0);
  crcInput.set(data, typeBytes.length);
  view.setUint32(8 + data.length, crc32(crcInput));
  return out;
}

function rect(
  px: Uint8Array,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number,
  g: number,
  b: number,
): void {
  for (let y = Math.max(0, y0); y < Math.min(HEIGHT, y1); y += 1) {
    for (let x = Math.max(0, x0); x < Math.min(WIDTH, x1); x += 1) {
      const i = (y * WIDTH + x) * 3;
      px[i] = r;
      px[i + 1] = g;
      px[i + 2] = b;
    }
  }
}

export function writePocLogo(outPath: string): string {
  const px = new Uint8Array(WIDTH * HEIGHT * 3).fill(255);
  // Dark-green monogram band on the left.
  rect(px, 0, 0, 72, HEIGHT, 20, 83, 45);
  // White inner panel inside the band.
  rect(px, 10, 18, 62, 78, 255, 255, 255);
  // Monogram bars (stylized "BD").
  rect(px, 18, 28, 28, 68, 20, 83, 45);
  rect(px, 34, 28, 54, 38, 20, 83, 45);
  rect(px, 34, 48, 54, 58, 20, 83, 45);
  // Wordmark bars on the right.
  rect(px, 86, 22, 226, 34, 24, 24, 27);
  rect(px, 86, 42, 196, 52, 113, 113, 122);
  rect(px, 86, 60, 216, 70, 113, 113, 122);

  const raw = new Uint8Array((WIDTH * 3 + 1) * HEIGHT);
  for (let y = 0; y < HEIGHT; y += 1) {
    raw[y * (WIDTH * 3 + 1)] = 0;
    raw.set(px.subarray(y * WIDTH * 3, (y + 1) * WIDTH * 3), y * (WIDTH * 3 + 1) + 1);
  }

  const ihdr = new Uint8Array(13);
  const iv = new DataView(ihdr.buffer);
  iv.setUint32(0, WIDTH);
  iv.setUint32(4, HEIGHT);
  ihdr[8] = 8;
  ihdr[9] = 2;

  const parts = [
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", new Uint8Array(0)),
  ];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const png = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    png.set(p, offset);
    offset += p.length;
  }

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, png);
  return outPath;
}

const here = dirname(fileURLToPath(import.meta.url));
if (import.meta.main) {
  const out = join(here, "assets", "poc-logo.png");
  writePocLogo(out);
  console.log(`logo written: ${out}`);
}
