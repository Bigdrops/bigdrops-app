/**
 * D2 evidence: rasterize via Chrome headless --screenshot but with the pdf.js
 * canvas + a LONG real virtual-time budget. Earlier blank captures used
 * virtual-time-budget with module scripts from CDN; virtual time races ahead
 * of network. Fix: inline ALL of pdf.js into the wrapper (no network), then
 * virtual-time-budget is safe.
 *
 * pdf.js needs a worker; we disable it with disableWorker via
 * GlobalWorkerOptions.workerPort = null and pdfjs using fake worker on main
 * thread (pdfjs falls back automatically when worker setup fails if
 * `isEvalSupported` and no CSP). Simplest robust offline path: use the
 * legacy UMD build inlined, set workerSrc to '' so it runs on main thread.
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { writeFileSync, readFileSync } from 'node:fs'

const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const outDir = path.join(process.cwd(), 'docs', 'reports', 'boq', 'artifacts')
const pdfPath = path.join(outDir, 'd2-boq-qa.pdf')
const outPng = path.join(outDir, 'd2-boq-qa-page1.png')

// Local pdfjs-dist copy (installed via bun from the jsdelivr tarball).
const pdfjsBuild = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.min.mjs')
const pdfjsCode = readFileSync(pdfjsBuild, 'utf8')

const pdfB64 = readFileSync(pdfPath).toString('base64')

// Inline pdf.js as a blob module to keep everything offline; main-thread
// fake worker via GlobalWorkerOptions.workerSrc = '' + isEvalSupported false.
const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}</style></head>
<body><canvas id="c"></canvas>
<script type="module">
  window.__STATUS = 'importing';
  const code = ${JSON.stringify(pdfjsCode)};
  const blob = new Blob([code], { type: 'text/javascript' });
  const pdfjs = await import(URL.createObjectURL(blob));
  window.__STATUS = 'rendering';
  pdfjs.GlobalWorkerOptions.workerSrc = '';
  const pdfData = atob("${pdfB64}");
  const doc = await pdfjs.getDocument({ data: pdfData, isEvalSupported: false, useWorkerFetch: false }).promise;
  const page = await doc.getPage(1);
  const vp = page.getViewport({ scale: 2 });
  const canvas = document.getElementById('c');
  canvas.width = vp.width; canvas.height = vp.height;
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
  window.__STATUS = 'rendered';
</script></body></html>`

const wrapperPath = path.join(outDir, '_pdfjs_inline_wrapper.html')
writeFileSync(wrapperPath, html)

const url = 'file:///' + wrapperPath.replace(/\\/g, '/')
const res = spawnSync(chrome, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--allow-file-access-from-files',
  '--virtual-time-budget=30000',
  `--screenshot=${outPng}`,
  '--window-size=1300,1850',
  '--hide-scrollbars',
  url,
], { stdio: 'pipe', timeout: 90000 })

console.log('chrome status:', res.status, res.error?.message || '')
console.log('stderr tail:', res.stderr?.toString().slice(-150))
