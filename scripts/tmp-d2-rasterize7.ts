/**
 * D2 evidence: rasterize via pdf.js canvas + Chrome headless screenshot with
 * a REAL sleep (no virtual time). --screenshot fires after load event; module
 * scripts continue after. Use --timeout flag (headless supports it) to keep
 * Chrome alive N ms before shooting: --timeout=ms is a real headless switch.
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { writeFileSync, readFileSync } from 'node:fs'

const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const outDir = path.join(process.cwd(), 'docs', 'reports', 'boq', 'artifacts')
const pdfPath = path.join(outDir, 'd2-boq-qa.pdf')
const outPng = path.join(outDir, 'd2-boq-qa-page1.png')

const pdfjsCode = readFileSync(path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.min.mjs'), 'utf8')
const pdfB64 = readFileSync(pdfPath).toString('base64')

// Set the canvas size to the window size and paint a gray background FIRST
// so we can tell screenshot-from-load from screenshot-after-render.
const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#eee}</style></head>
<body><canvas id="c" width="1300" height="1850" style="background:#fff"></canvas>
<script type="module">
  window.__STATUS = 'importing';
  try {
    const blob = new Blob([${JSON.stringify(pdfjsCode)}], { type: 'text/javascript' });
    const pdfjs = await import(URL.createObjectURL(blob));
    window.__STATUS = 'rendering';
    pdfjs.GlobalWorkerOptions.workerSrc = '';
    const doc = await pdfjs.getDocument({ data: atob("${pdfB64}"), isEvalSupported: false }).promise;
    const page = await doc.getPage(1);
    const vp = page.getViewport({ scale: 1.9 });
    const canvas = document.getElementById('c');
    canvas.width = Math.round(vp.width); canvas.height = Math.round(vp.height);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    window.__STATUS = 'rendered ' + canvas.width + 'x' + canvas.height;
    document.title = window.__STATUS;
  } catch (e) { window.__STATUS = 'ERROR: ' + (e && e.message); document.title = window.__STATUS; }
</script></body></html>`

const wrapperPath = path.join(outDir, '_pdfjs_sleep_wrapper.html')
writeFileSync(wrapperPath, html)

const url = 'file:///' + wrapperPath.replace(/\\/g, '/')
const res = spawnSync(chrome, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--allow-file-access-from-files',
  '--timeout=12000',
  `--screenshot=${outPng}`,
  '--window-size=1300,1850',
  '--hide-scrollbars',
  url,
], { stdio: 'pipe', timeout: 90000 })

console.log('chrome status:', res.status, res.error?.message || '')
console.log('stderr tail:', res.stderr?.toString().slice(-120))
