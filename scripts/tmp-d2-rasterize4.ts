/**
 * D2 evidence: rasterize via pdf.js using virtual time + network wait through
 * Chrome headless. The CDN import needs real time, so we dump the rendered
 * canvas to PNG bytes via a fetch to a local sink server.
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { writeFileSync, readFileSync, statSync } from 'node:fs'
import http from 'node:http'

const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const outDir = path.join(process.cwd(), 'docs', 'reports', 'boq', 'artifacts')
const pdfPath = path.join(outDir, 'd2-boq-qa.pdf')
const outPng = path.join(outDir, 'd2-boq-qa-page1.png')

const pdfB64 = readFileSync(pdfPath).toString('base64')

const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}</style></head>
<body><canvas id="c"></canvas>
<script type="module">
import * as pdfjs from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.min.mjs';
pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.worker.min.mjs';
const pdfData = atob("${pdfB64}");
const doc = await pdfjs.getDocument({ data: pdfData }).promise;
const page = await doc.getPage(1);
const vp = page.getViewport({ scale: 2 });
const canvas = document.getElementById('c');
canvas.width = vp.width; canvas.height = vp.height;
await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
// Post PNG bytes to the local sink.
canvas.toBlob(async (blob) => {
  const buf = await blob.arrayBuffer();
  await fetch('http://127.0.0.1:46711/sink', { method: 'POST', body: buf });
  document.title = 'DONE';
}, 'image/png');
</script></body></html>`

const wrapperPath = path.join(outDir, '_pdfjs_wrapper.html')
writeFileSync(wrapperPath, html)

// local sink server collects the POSTed PNG
const server = http.createServer((req, res) => {
  if (req.url === '/sink' && req.method === 'POST') {
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      writeFileSync(outPng, Buffer.concat(chunks))
      res.writeHead(204).end()
      console.log('PNG received:', Buffer.concat(chunks).length, 'bytes')
    })
  } else {
    res.writeHead(404).end()
  }
})
server.listen(46711, '127.0.0.1')

const url = 'file:///' + wrapperPath.replace(/\\/g, '/')
const res = spawnSync(chrome, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--allow-file-access-from-files',
  '--virtual-time-budget=20000',
  '--window-size=1280,1800',
  url,
], { stdio: 'pipe', timeout: 70000 })

console.log('chrome status:', res.status, res.error?.message || '')
server.close()
try { console.log('png size:', statSync(outPng).size) } catch { console.log('png missing') }
