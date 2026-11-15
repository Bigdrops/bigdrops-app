// Captures the real BOURXE invoice template (product output) for the result shot.
// Run from the repo root: node video-json-tutorial/capture/capture.mjs
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const REPO = process.cwd();
const SOURCE = path.join(REPO, 'docs/templates/html-temps/invoice-templates/commercial-modern-minimal.html');
const OUT_DIR = path.join(REPO, 'video-json-tutorial/public/textures');
fs.mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1240, height: 1754 },
  deviceScaleFactor: 2,
});

await page.goto('file://' + SOURCE.replace(/\\/g, '/'), { waitUntil: 'networkidle', timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1200);
await page.screenshot({ path: path.join(OUT_DIR, 'invoice-page.png'), fullPage: true });

// A tighter crop of the document body for the 2.5D push.
const pageHeight = await page.evaluate(() => document.body.scrollHeight);
console.log('captured invoice-page.png at 1240x' + pageHeight + ' @2x');
await browser.close();
