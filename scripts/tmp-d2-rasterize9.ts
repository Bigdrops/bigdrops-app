/**
 * D2 evidence: rasterize the BOQ PDF with the official mupdf wasm package.
 * Pure Node/Bun, no browser, no CDN.
 */
import path from 'node:path'
import { writeFileSync, readFileSync, statSync } from 'node:fs'

const outDir = path.join(process.cwd(), 'docs', 'reports', 'boq', 'artifacts')
const pdfPath = path.join(outDir, 'd2-boq-qa.pdf')
const outPng = path.join(outDir, 'd2-boq-qa-page1.png')

const mupdf = await import('mupdf')
const data = readFileSync(pdfPath)
const doc = mupdf.Document.openDocument(data, 'application/pdf')
console.log('pages:', doc.countPages())

const page = doc.loadPage(0)
// A4 at 2x zoom: 595x842 * 2
const pixmap = page.toPixmap(mupdf.Matrix.scale(2, 2), mupdf.ColorSpace.DeviceRGB, false, true)
const png = pixmap.asPNG()
writeFileSync(outPng, png)
console.log('wrote', outPng, statSync(outPng).size, 'bytes', pixmap.getWidth() + 'x' + pixmap.getHeight())
