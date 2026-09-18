/**
 * D2 evidence: extract structured text WITH COORDINATES from the rendered
 * PDF via mupdf. Coordinates are hard runtime evidence for:
 *  - column x-boundaries (compare against the 30/16/8/8/10/8/8/10 plan)
 *  - right-alignment of cp/sp/profit (text right edges should line up)
 *  - wrapping (long description/spec must split into multiple lines with
 *    increasing y, same x-start, not overflow into the next column)
 *  - truncation (no glyph may sit outside its column boundary)
 */
import path from 'node:path'
import { readFileSync } from 'node:fs'

const outDir = path.join(process.cwd(), 'docs', 'reports', 'boq', 'artifacts')
const pdfPath = path.join(outDir, 'd2-boq-qa.pdf')

const mupdf = await import('mupdf')
const data = readFileSync(pdfPath)
const doc = mupdf.Document.openDocument(data, 'application/pdf')
const page = doc.loadPage(0)

// structured text: JSON with blocks -> lines -> spans (bbox each)
const raw = page.toStructuredText().asJSON()
const st = JSON.parse(raw)

// Collect all spans: {x0,y0,x1,y1,text}
type Span = { x0: number, y0: number, x1: number, y1: number, text: string }
const spans: Span[] = []
for (const block of st.blocks) {
  if (!block.lines) continue
  for (const line of block.lines) {
    const bb = line.bbox
    const text = line.text || ''
    if (!text.trim()) continue
    const x0 = typeof bb.x === 'number' ? bb.x : bb[0]
    const y0 = typeof bb.y === 'number' ? bb.y : bb[1]
    const w0 = typeof bb.w === 'number' ? bb.w : bb[2] - bb[0]
    spans.push({ x0, y0, x1: x0 + w0, y1: y0 + (bb.h || 0), text })
  }
}

// table area: find header row y by locating 'Material Description'
const header = spans.filter((s) => s.text.includes('Material Description'))
if (!header.length) { console.log('header not found; spans:', spans.length); process.exit(0) }
const headerY = header[0].y0
console.log('header row at y =', headerY.toFixed(1))

// Body rows = everything below headerY
const body = spans.filter((s) => s.y0 > headerY + 2)

// Column plan (percent of 539pt content width, starting x=28):
const plan: Array<[string, number, number]> = [
  ['s_no', 28, 28 + 0.08 * 539],
  ['description', 28 + 0.08 * 539, 28 + 0.38 * 539],
  ['specification', 28 + 0.38 * 539, 28 + 0.54 * 539],
  ['quantity', 28 + 0.54 * 539, 28 + 0.62 * 539],
  ['unit', 28 + 0.62 * 539, 28 + 0.70 * 539],
  ['make_brand', 28 + 0.70 * 539, 28 + 0.80 * 539],
  ['cp', 28 + 0.80 * 539, 28 + 0.88 * 539],
  ['sp', 28 + 0.88 * 539, 28 + 0.96 * 539],
  ['profit', 28 + 0.96 * 539, 28 + 1.00 * 539 + 2],
]

// Assign body spans to columns by x-center
function colOf(s: Span) {
  const cx = (s.x0 + s.x1) / 2
  for (let i = 0; i < plan.length; i++) if (cx >= plan[i][1] && cx < plan[i][2]) return i
  return -1
}

// overflow check: span fully inside page content box?
const overflows = spans.filter((s) => s.x1 > 567.5 || s.x0 < 27)
console.log('spans overflowing content box:', overflows.length, overflows.slice(0, 5).map((s) => s.text.slice(0, 30)))

// wrapping evidence: the long description row (r3) — group body spans by row y
const rowBands: Array<{ y: number, spans: Span[] }> = []
for (const s of body) {
  const band = rowBands.find((b) => Math.abs(b.y - s.y0) < 3)
  if (band) band.spans.push(s)
  else rowBands.push({ y: s.y0, spans: [s] })
}
rowBands.sort((a, b) => a.y - b.y)

console.log('\nrow bands (y, span count):', rowBands.map((b) => `${b.y.toFixed(0)}:${b.spans.length}`).join('  '))

// The long-text row: rows with >8 spans indicate wrapped cells
console.log('\n--- long-text row detail (wrapped cells) ---')
for (const band of rowBands.filter((b) => b.spans.length > 8).slice(0, 4)) {
  const desc = band.spans.filter((s) => colOf(s) === 1).map((s) => s.text).join('')
  const spec = band.spans.filter((s) => colOf(s) === 2).map((s) => s.text).join('')
  console.log(`y=${band.y.toFixed(1)} desc: "${desc.slice(0, 60)}..." spec: "${spec.slice(0, 60)}..."`)
}

// right-alignment evidence: cp/sp/profit column right edges per row band
console.log('\n--- numeric column right edges (x1) per band ---')
console.log('band_y       cp_x1    sp_x1   profit_x1')
for (const band of rowBands) {
  const cp = band.spans.filter((s) => colOf(s) === 6)
  const sp = band.spans.filter((s) => colOf(s) === 7)
  const pf = band.spans.filter((s) => colOf(s) === 8)
  const cpX1 = cp.length ? Math.max(...cp.map((s) => s.x1)) : null
  const spX1 = sp.length ? Math.max(...sp.map((s) => s.x1)) : null
  const pfX1 = pf.length ? Math.max(...pf.map((s) => s.x1)) : null
  const fmt = (v: number | null) => v === null ? '  --  ' : v.toFixed(1).padStart(6)
  console.log(`${band.y.toFixed(0).padStart(6)}  ${fmt(cpX1)}  ${fmt(spX1)}  ${fmt(pfX1)}`)
}

// full text dump for the record
console.log('\n--- full text by row ---')
for (const band of rowBands.slice(0, 14)) {
  const cols = plan.map((_, i) => band.spans.filter((s) => colOf(s) === i).map((s) => s.text).join('').trim())
  console.log(`y=${band.y.toFixed(0).padStart(4)} | ` + cols.map((c) => (c || '·').slice(0, 22).padEnd(22)).join('| '))
}
