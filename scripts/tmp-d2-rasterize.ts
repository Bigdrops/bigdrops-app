/**
 * D2 runtime evidence part 2: rasterize the rendered BOQ PDF page 1
 * so the report can carry a real visual artifact.
 */
import { chromium } from 'playwright'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { statSync } from 'node:fs'

const pdfPath = path.join(process.cwd(), 'docs', 'reports', 'boq', 'artifacts', 'd2-boq-qa.pdf')
const pngPath = path.join(process.cwd(), 'docs', 'reports', 'boq', 'artifacts', 'd2-boq-qa-page1.png')

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1000, height: 1400 } })
await page.goto(pathToFileURL(pdfPath).href)
// Let the built-in PDF viewer paint before rasterizing.
await page.waitForTimeout(4000)
// Chromium PDF viewer renders inside an <embed>; fall back to full-page shot.
const embed = page.locator('embed[type="application/pdf"]')
const count = await embed.count()
console.log('embed count:', count)
if (count > 0) {
  await embed.screenshot({ path: pngPath })
} else {
  await page.screenshot({ path: pngPath, fullPage: false })
}
await browser.close()
console.log('wrote', pngPath, statSync(pngPath).size, 'bytes')
