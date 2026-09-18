/**
 * D2 runtime evidence part 2 (final): rasterize the rendered BOQ PDF page 1
 * with pdf.js inside headless Chrome. This captures the actual PDF page
 * pixels, not the viewer chrome.
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { writeFileSync, readFileSync } from 'node:fs'

const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const outDir = path.join(process.cwd(), 'docs', 'reports', 'boq', 'artifacts')
const pdfPath = path.join(outDir, 'd2-boq-qa.pdf')
const outPng = path.join(outDir, 'd2-boq-qa-page1.png')

const pdfB64 = readFileSync(pdfPath).toString('base64')

const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}</style></head>
<body><canvas id="c"></canvas>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script>
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const pdfData = atob("${pdfB64}");
(async () => {
  const doc = await pdfjsLib.getDocument({ data: pdfData }).promise;
  const page = await doc.getPage(1);
  const vp = page.getViewport({ scale: 2 });
  const canvas = document.getElementById('c');
  canvas.width = vp.width; canvas.height = vp.height;
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
  document.title = 'RENDER_DONE';
})();
</script></body></html>`

const wrapperPath = path.join(outDir, '_pdfjs_wrapper.html')
writeFileSync(wrapperPath, html)

const url = 'file:///' + wrapperPath.replace(/\\/g, '/')
const res = spawnSync(chrome, [
  '--headless=new',
  '--disable-gpu',
  '--allow-file-access-from-files',
  '--virtual-time-budget=15000',
  `--screenshot=${outPng}`,
  `--window-size=1240,1754`,
  url,
], { stdio: 'pipe', timeout: 60000 })

console.log('status:', res.status, res.error?.message || '')
console.log('stderr:', res.stderr?.toString().slice(-200))
