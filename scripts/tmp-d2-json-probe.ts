/**
 * Probe mupdf structured-text JSON shape.
 */
import path from 'node:path'
import { readFileSync } from 'node:fs'

const pdfPath = path.join(process.cwd(), 'docs', 'reports', 'boq', 'artifacts', 'd2-boq-qa.pdf')
const mupdf = await import('mupdf')
const data = readFileSync(pdfPath)
const doc = mupdf.Document.openDocument(data, 'application/pdf')
const page = doc.loadPage(0)
const st = page.toStructuredText()
const json = st.asJSON()
console.log('json length:', json.length)
console.log('first 600 chars:', json.slice(0, 600))
