/**
 * D2 evidence: rasterize via pdf.js in Playwright Chromium. Waits on a real
 * page signal (not virtual time). The earlier hang was the PDF viewer plugin;
 * here we never navigate to a PDF - we render pdf.js canvas only.
 */
import { chromium } from 'playwright'
import path from 'node:path'
import { writeFileSync, readFileSync } from 'node:fs'

const outDir = path.join(process.cwd(), 'docs', 'reports', 'boq', 'artifacts')
const pdfPath = path.join(outDir, 'd2-boq-qa.pdf')
const outPng = path.join(outDir, 'd2-boq-qa-page1.png')

const pdfB64 = readFileSync(pdfPath).toString('base64')

const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}</style></head>
<body><canvas id="c"></canvas>
<script type="module">
import * as pdfjs from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.min.mjs';
pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.worker.min.mjs';
window.__STATUS = 'loading';
try {
  const pdfData = atob("${pdfB64}");
  const doc = await pdfjs.getDocument({ data: pdfData }).promise;
  const page = await doc.getPage(1);
  const vp = page.getViewport({ scale: 2 });
  const canvas = document.getElementById('c');
  canvas.width = vp.width; canvas.height = vp.height;
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
  window.__STATUS = 'rendered';
} catch (e) {
  window.__STATUS = 'error: ' + e.message;
  console.error(e);
}
</script></body></html>`

const wrapperPath = path.join(outDir, '_pdfjs_wrapper.html')
writeFileSync(wrapperPath, html)

const browser = await chromium.launch({ timeout: 30000 })
try {
  const page = await browser.newPage({ viewport: { width: 1300, height: 1850 } })
  page.on('console', (m) => { if (m.type() === 'error') console.log('page console error:', m.text().slice(0, 200)) })
  await page.goto('file:///' + wrapperPath.replace(/\\/g, '/'), { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForFunction('window.__STATUS && window.__STATUS !== "loading"', null, { timeout: 45000 })
  console.log('status:', await page.evaluate('window.__STATUS'))
  const canvas = page.locator('#c')
  await canvas.screenshot({ path: outPng, timeout: 15000 })
  console.log('saved:', outPng)
} finally {
  await browser.close()
}
