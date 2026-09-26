import { chromium } from 'playwright';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
const url = 'file://' + join(root, 'docs', 'prd', 'Adaptive Mobile-First UIUX Facelift PRD', 'Design-direction', 'form', 'boq', 'BOQ Full-Page Live Form-v9.html');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 860, height: 900 } });
await page.goto(url, { waitUntil: 'load' });

const results = [];

// Test columns sheet toggle
try {
  const btn = await page.waitForSelector('.tbn:has-text("Columns")');
  await btn.click();
  // Sheet should now be visible
  const sheetVisible = await page.$eval('#ovColumns', el => getComputedStyle(el).display);
  // Find the Done button inside the sheet
  const doneBtn = await page.$eval('#ovColumns', el => el.querySelector('.cta'));
  const doneVisible = doneBtn !== null;
  // Click Done to close
  if (doneBtn) await doneBtn.click();
  const sheetHidden = await page.$eval('#ovColumns', el => getComputedStyle(el).display);
  results.push({ name: 'columns sheet', ok: sheetVisible === 'flex' && sheetHidden === 'flex', detail: sheetVisible + ' -> ' + sheetHidden + ', done visible: ' + doneVisible });
} catch (e) { results.push({ name: 'columns sheet', ok: false, detail: e.message }); }

// Test import sheet toggle
try {
  const btn = await page.waitForSelector('.tbn:has-text("Import")');
  await btn.click();
  const sheetVisible = await page.$eval('#ovImport', el => getComputedStyle(el).display);
  const cancelBtn = await page.$eval('#ovImport', el => el.querySelector('.tbn'));
  const cancelVisible = cancelBtn !== null;
  if (cancelBtn) await cancelBtn.click();
  const sheetHidden = await page.$eval('#ovImport', el => getComputedStyle(el).display);
  results.push({ name: 'import sheet', ok: sheetVisible === 'flex' && sheetHidden === 'flex', detail: sheetVisible + ' -> ' + sheetHidden + ', cancel visible: ' + cancelVisible });
} catch (e) { results.push({ name: 'import sheet', ok: false, detail: e.message }); }

// Test clear confirm sheet
try {
  await page.getByRole('button', { name: 'Clear All' }).click();
  const sheetVisible = await page.$eval('#ovClear', el => getComputedStyle(el).display);
  const cancelBtn = await page.$eval('#ovClear', el => el.querySelector('.tbn'));
  if (cancelBtn) { await cancelBtn.click(); }
  const sheetHidden = await page.$eval('#ovClear', el => getComputedStyle(el).display);
  results.push({ name: 'clear sheet', ok: sheetVisible === 'flex' && sheetHidden === 'flex', detail: sheetVisible + ' -> ' + sheetHidden });
} catch (e) { results.push({ name: 'clear sheet', ok: false, detail: e.message }); }

console.log('=== SHEET TEST RESULTS ===');
let allOk = true;
for (const r of results) {
  console.log(r.ok ? 'PASS' : 'FAIL', r.name, r.detail);
  if (!r.ok) allOk = false;
}
console.log(allOk ? 'ALL PASSED' : 'SOME FAILED');
await browser.close();
