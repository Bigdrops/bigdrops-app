/**
 * D2 debug: dump per-column ink counts to see the real table geometry.
 */
import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import path from 'node:path'

const pngPath = path.join(process.cwd(), 'docs', 'reports', 'boq', 'artifacts', 'd2-boq-qa-page1.png')
const buf = readFileSync(pngPath)

function readChunk(off: number) {
  const len = buf.readUInt32BE(off)
  const type = buf.toString('ascii', off + 4, off + 8)
  return { type, data: buf.subarray(off + 8, off + 8 + len), next: off + 12 + len }
}
let off = 8
let w = 0, h = 0, colorType = 0
const idat: Buffer[] = []
while (off < buf.length) {
  const { type, data, next } = readChunk(off)
  if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); colorType = data[9] }
  if (type === 'IDAT') idat.push(data)
  if (type === 'IEND') break
  off = next
}
const channels = colorType === 6 ? 4 : 3
const raw = inflateSync(Buffer.concat(idat))
const stride = w * channels
const px = Buffer.alloc(h * stride)
let pos = 0
for (let y = 0; y < h; y++) {
  const f = raw[pos++]
  for (let x = 0; x < stride; x++) {
    const a = x >= channels ? px[y * stride + x - channels] : 0
    const b = y > 0 ? px[(y - 1) * stride + x] : 0
    const c = y > 0 && x >= channels ? px[(y - 1) * stride + x - channels] : 0
    const v = raw[pos++]
    let o: number
    if (f === 0) o = v
    else if (f === 1) o = v + a
    else if (f === 2) o = v + b
    else if (f === 3) o = v + ((a + b) >> 1)
    else { const p = a + b - c; const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); o = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c) }
    px[y * stride + x] = o & 0xff
  }
}
const dark = (x: number, y: number) => px[y * stride + x * channels] < 160

// column ink histogram in 20px buckets over full height
const buckets = new Array(Math.ceil(w / 20)).fill(0)
for (let x = 0; x < w; x++) {
  let cnt = 0
  for (let y = 0; y < h; y += 2) if (dark(x, y)) cnt++
  buckets[Math.floor(x / 20)] = cnt
}
console.log('column ink histogram (20px buckets, x-start: count):')
console.log(buckets.map((c, i) => i % 8 === 0 ? `\n${String(i * 20).padStart(4)}:${String(c).padStart(5)}` : String(c).padStart(5)).join(''))

// vertical-run length profile: longest dark run per x in the table area only (y 200..1100)
const runs: number[] = new Array(w).fill(0)
for (let x = 0; x < w; x++) {
  let best = 0, cur = 0
  for (let y = 200; y < 1100; y++) {
    if (dark(x, y)) { cur++; if (cur > best) best = cur } else cur = 0
  }
  runs[x] = best
}
console.log('\nvertical runs > 40px in table band:')
let prev = -10
for (let x = 0; x < w; x++) {
  if (runs[x] > 40) {
    if (x - prev > 3) process.stdout.write(`\nx=${x}(len ${runs[x]}) `)
    prev = x
  }
}
console.log('')
