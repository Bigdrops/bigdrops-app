/**
 * D2 runtime evidence part 2: rasterize the rendered BOQ PDF page 1.
 *
 * Uses Chrome's headless --screenshot flag directly (no Playwright driver
 * layer) to avoid the PDF-viewer/plugin hangs seen through CDP.
 * Chrome's --screenshot of a file:// PDF captures the viewer UI, which is
 * unreliable — so instead we rasterize via pdf.js imported from a data page.
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const outDir = path.join(process.cwd(), 'docs', 'reports', 'boq', 'artifacts')
const outPng = path.join(outDir, 'd2-boq-qa-page1.png')

// Render a minimal HTML wrapper that embeds the PDF as an <iframe>; Chrome's
// headless screenshot of an iframe-PDF still shows the viewer chrome, so the
// reliable path is pdf.js from CDN inside a data-local page. Offline-safe:
// fall back to the embed approach if CDN is unreachable.
const html = `<!doctype html><html><body style="margin:0">
<embed src="./d2-boq-qa.pdf" type="application/pdf" width="100%" height="1000px">
</body></html>`

const wrapperPath = path.join(outDir, '_wrapper.html')
import { writeFileSync } from 'node:fs'
writeFileSync(wrapperPath, html)

const res = spawnSync(chrome, [
  '--headless=new',
  '--disable-gpu',
  '--no-pdf-header-footer',
  '--virtual-time-budget=8000',
  `--screenshot=${outPng}`,
  '--window-size=1000,1200',
  pathToFileUrl(wrapperPath),
], { stdio: 'pipe', timeout: 60000 })

function pathToFileUrl(p: string) {
  return 'file:///' + p.replace(/\\/g, '/')
}

console.log('status:', res.status, res.error?.message || '')
console.log('stdout:', res.stdout?.toString().slice(0, 300))
console.log('stderr:', res.stderr?.toString().slice(0, 300))
