/**
 * Dump complete page text with coordinates for the record.
 */
import path from 'node:path'
import { readFileSync } from 'node:fs'

const pdfPath = path.join(process.cwd(), 'docs', 'reports', 'boq', 'artifacts', 'd2-boq-qa.pdf')
const mupdf = await import('mupdf')
const doc = mupdf.Document.openDocument(readFileSync(pdfPath), 'application/pdf')
const page = doc.loadPage(0)
const st = JSON.parse(page.toStructuredText().asJSON())

const items: Array<{ x: number, y: number, x1: number, text: string, font: string }> = []
for (const block of st.blocks) {
  if (!block.lines) continue
  for (const line of block.lines) {
    if (!line.text || !line.text.trim()) continue
    items.push({ x: line.x, y: line.y, x1: line.x + (line.w || 0), text: line.text, font: line.font?.name || '?' })
  }
}
items.sort((a, b) => a.y - b.y || a.x - b.x)

console.log('total lines:', items.length)
console.log('--- all lines y>=280 (long-text row r3 + totals area) ---')
for (const it of items.filter((i) => i.y >= 280)) {
  console.log(`y=${it.y.toFixed(0).padStart(4)} x=${it.x.toFixed(0).padStart(4)}..${it.x1.toFixed(0).padStart(4)} [${it.font}] ${it.text}`)
}
