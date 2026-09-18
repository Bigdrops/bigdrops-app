/**
 * D2 evidence analysis: extract pixel facts from the rasterized PDF page
 * so the report can state concretely what was rendered.
 *
 * Decodes the PNG with zlib inflate and counts non-white pixels per band,
 * verifying the page is actually painted (not a blank capture).
 */
import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import path from 'node:path'

const pngPath = path.join(process.cwd(), 'docs', 'reports', 'boq', 'artifacts', 'd2-boq-qa-page1.png')
const buf = readFileSync(pngPath)

// --- minimal PNG decode (8-bit RGB/RGBA, non-interlaced) ---
function readChunk(off: number) {
  const len = buf.readUInt32BE(off)
  const type = buf.toString('ascii', off + 4, off + 8)
  const data = buf.subarray(off + 8, off + 8 + len)
  return { type, data, next: off + 12 + len }
}

let off = 8
let ihdr: any = null
const idat: Buffer[] = []
while (off < buf.length) {
  const { type, data, next } = readChunk(off)
  if (type === 'IHDR') ihdr = { w: data.readUInt32BE(0), h: data.readUInt32BE(4), bitDepth: data[8], colorType: data[9], interlace: data[12] }
  if (type === 'IDAT') idat.push(data)
  if (type === 'IEND') break
  off = next
}

if (!ihdr || ihir_check(ihdr)) throw new Error('unsupported PNG: ' + JSON.stringify(ihdr))
function ihir_check(i: any) { return i.bitDepth !== 8 || (i.colorType !== 2 && i.colorType !== 6) || i.interlace !== 0 }

const channels = ihdr.colorType === 6 ? 4 : 3
const raw = inflateSync(Buffer.concat(idat))
const stride = ihdr.w * channels
const pixels = Buffer.alloc(ihdr.h * stride)

// un-filter
let pos = 0
for (let y = 0; y < ihdr.h; y++) {
  const filter = raw[pos++]
  for (let x = 0; x < stride; x++) {
    const a = x >= channels ? pixels[y * stride + x - channels] : 0
    const b = y > 0 ? pixels[(y - 1) * stride + x] : 0
    const c = y > 0 && x >= channels ? pixels[(y - 1) * stride + x - channels] : 0
    const val = raw[pos++]
    let out: number
    switch (filter) {
      case 0: out = val; break
      case 1: out = val + a; break
      case 2: out = val + b; break
      case 3: out = val + Math.floor((a + b) / 2); break
      case 4: {
        const p = a + b - c
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
        out = val + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)
        break
      }
      default: throw new Error('bad filter ' + filter)
    }
    pixels[y * stride + x] = out & 0xff
  }
}

// --- analysis ---
function isWhite(i: number) {
  return pixels[i] > 245 && pixels[i + 1] > 245 && pixels[i + 2] > 245
}

let inkTotal = 0
const h = ihdr.h, w = ihdr.w
const bandH = Math.floor(h / 20)
const bands: number[] = []
for (let band = 0; band < 20; band++) {
  let ink = 0
  const y0 = band * bandH
  for (let y = y0; y < y0 + bandH; y += 2) {
    for (let x = 0; x < w; x += 2) {
      if (!isWhite((y * stride) + x * channels)) ink++
    }
  }
  bands.push(ink)
  inkTotal += ink
}

console.log('png:', w + 'x' + h, 'colorType:', ihdr.colorType)
console.log('ink samples (per 5% vertical band):')
console.log(bands.map((b, i) => `band${String(i).padStart(2, '0')} ${String(b).padStart(6)}`).join('\n'))
console.log('total ink samples:', inkTotal)
console.log(inkTotal > 5000 ? 'PAGE PAINTED (not blank) — PASS' : 'PAGE LOOKS BLANK — FAIL')
