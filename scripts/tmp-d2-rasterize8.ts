/**
 * D2 evidence: rasterize the BOQ PDF using mupdf.js (WASM) — pure Node, no
 * browser. mupdf-js renders a page to a PNG buffer directly.
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { writeFileSync, readFileSync, statSync } from 'node:fs'

console.log('checking mupdf availability')

// try mupdf-js
try {
  const { open } = await import('mupdf-js')
  const pdfPath = path.join(process.cwd(), 'docs', 'reports', 'boq', 'artifacts', 'd2-boq-qa.pdf')
  const outPng = path.join(process.cwd(), 'docs', 'reports', 'boq', 'artifacts', 'd2-boq-qa-page1.png')
  const data = readFileSync(pdfPath)
  const doc = open(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength))
  const png = doc.renderPageAsImage(0, { scale: 2 })
  writeFileSync(outPng, png)
  console.log('mupdf wrote', outPng, statSync(outPng).size, 'bytes')
} catch (e) {
  console.log('mupdf-js path failed:', e && e.message)
  spawnSync('bun', ['add', 'mupdf-js'], { stdio: 'inherit', timeout: 120000 })
  process.exit(1)
}
