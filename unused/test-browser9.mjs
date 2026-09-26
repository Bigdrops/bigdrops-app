import { chromium } from 'playwright';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
const url = 'file://' + join(root, 'docs', 'prd', 'Adaptive Mobile-First UIUX Facelift PRD', 'Design-direction', 'form', 'boq', 'BOQ Full-Page Live Form-v9.html');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 860, height: 900 } });
await page.goto(url, { waitUntil: 'load' });

// Columns sheet
try {
  await page.click('.tbn:has-text("Columns")');
  const vis = await page.evaluate(() => getComputedStyle(document.getElementById('ovColumns')).display);
  console.log('COLUMNS SHEET VISIBLE:', vis);
  const done = await page.$eval('#ovColumns .cta', el => el.textContent);
  console.log('COLUMNS DONE BTN:', done);
  await page.click('#ovColumns .cta');
  const vis2 = await page.evaluate(() => getComputedStyle(document.getElementById('ovColumns')).display);
  console.log('COLUMNS SHEET AFTER DONE:', vis2);
} catch (e) { console.log('COLUMNS ERROR:', e.message); }

// Import
try {
  await page.click('.tbn:has-text("Import")');
  const vis = await page.evaluate(() => getComputedStyle(document.getElementById('ovImport')).display);
  console.log('IMPORT SHEET VISIBLE:', vis);
  await page.click('#ovImport .tbn');
  const vis2 = await page.evaluate(() => getComputedStyle(document.getElementById('ovImport')).display);
  console.log('IMPORT SHEET HIDDEN:', vis2);
} catch (e) { console.log('IMPORT ERROR:', e.message); }

await browser.close();
