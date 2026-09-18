/**
 * D2 evidence analysis: measure real geometry from the rasterized PDF page.
 *
 * Extracts:
 *  1. Vertical table border x-positions (long dark vertical runs) - these are
 *     the actual rendered column boundaries.
 *  2. Rightmost ink x-position - detects overflow past the right margin.
 *  3. Per-column text ink centroid - detects left vs right alignment of the
 *     numeric columns (cp/sp/profit).
 *
 * Page geometry: A4 595pt wide, padding 28pt each side, so the content box
 * spans x=28..567pt. PNG is 2x scale (1191px wide): margin ~56px, content
 * 56..1134px.
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

// 1. vertical border lines: columns where a long vertical dark run exists
const runs: Array<{ x: number, len: number }> = []
for (let x = 0; x < w; x++) {
  let best = 0, cur = 0
  for (let y = 0; y < h; y++) {
    if (dark(x, y)) { cur++; if (cur > best) best = cur } else cur = 0
  }
  if (best > 60) runs.push({ x, len: best })
}
// cluster adjacent x into single lines
const lines: number[] = []
for (const r of runs) {
  const last = lines[lines.length - 1]
  if (last === undefined || r.x - last > 3) lines.push(r.x)
  else lines[lines.length - 1] = r.x // keep rightmost of cluster
}
console.log('vertical border lines at x(px):', lines.join(', '))
console.log('border gaps(px):', lines.slice(1).map((v, i) => v - lines[i]).join(', '))
const contentW = 1134 - 56
console.log('column % of content box:', lines.slice(1).map((v, i) => ((v - lines[i]) / contentW * 100).toFixed(1)).join(', '))

// 2. rightmost ink anywhere
let rightmost = 0
for (let x = w - 1; x >= 0 && rightmost === 0; x--) {
  for (let y = 0; y < h; y += 2) if (dark(x, y)) { rightmost = x; break }
}
console.log('rightmost ink x(px):', rightmost, '=> pt:', (rightmost / 2).toFixed(1), '(page right edge = 595pt, right margin starts 567pt = x1134px)')

// 3. per-column ink centroid inside the table body (first data row band)
if (lines.length >= 2) {
  const tableTop = 0
  // find first horizontal line below header (long horizontal dark run)
  const hlines: number[] = []
  for (let y = 0; y < h; y++) {
    let cnt = 0
    for (let x = lines[0]; x < lines[lines.length - 1]; x += 3) if (dark(x, y)) cnt++
    if (cnt > (lines[lines.length - 1] - lines[0]) / 3 * 0.8) hlines.push(y)
  }
  console.log('horizontal lines at y(px):', hlines.slice(0, 12).join(', '))
  // use first row band below the header row (header is band 0..hline1)
  const bandY: number[] = []
  for (let y = hlines[1] + 2; y < (hlines[2] || hlines[1] + 40) - 2; y++) bandY.push(y)
  for (let c = 0; c < lines.length - 1; c++) {
    const x0 = lines[c] + 3, x1 = lines[c + 1] - 3
    let sum = 0, n = 0
    for (const y of bandY) for (let x = x0; x <= x1; x++) if (dark(x, y)) { sum += x; n++ }
    if (n > 0) {
      const centroid = (sum / n - lines[c]) / (lines[c + 1] - lines[c])
      console.log(`col${c} [x ${lines[c]}..${lines[c + 1]}] ink=${n} centroid=${centroid.toFixed(2)} (${centroid > 0.55 ? 'RIGHT-leaning' : centroid < 0.45 ? 'LEFT-leaning' : 'centered'})`)
    } else {
      console.log(`col${c} [x ${lines[c]}..${lines[c + 1]}] ink=0 (empty)`)
    }
  }
}
