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

// Test 1: Back button
try {
  await page.locator('.back').click();
  const toast = await page.textContent('#toast');
  results.push({ name: 'back button', ok: toast === 'Back to BOQs', detail: toast });
} catch (e) { results.push({ name: 'back button', ok: false, detail: e.message }); }

// Test 2: Theme button (cycle to dark, then light)
try {
  await page.locator('#themeBtn').click();
  const theme = await page.$eval('html', el => el.getAttribute('data-theme'));
  results.push({ name: 'theme to dark', ok: theme === 'dark', detail: theme });
  await page.locator('#themeBtn').click();
  const theme2 = await page.$eval('html', el => el.getAttribute('data-theme'));
  results.push({ name: 'theme to light', ok: theme2 === 'light', detail: theme2 });
} catch (e) { results.push({ name: 'theme button', ok: false, detail: e.message }); }

// Test 3: Save button
try {
  await page.getByRole('button', { name: 'Save Bill of Quantities' }).click();
  const toast = await page.textContent('#toast');
  results.push({ name: 'save button', ok: toast.includes('saved'), detail: toast });
} catch (e) { results.push({ name: 'save button', ok: false, detail: e.message }); }

// Test 4: Columns sheet toggle
try {
  const btn = page.getByRole('button', { name: 'Columns' });
  await btn.click();
  const sheetVisible = await page.$eval('#ovColumns', el => getComputedStyle(el).display);
  await page.getByRole('button', { name: 'Done' }).click();
  const sheetHidden = await page.$eval('#ovColumns', el => getComputedStyle(el).display);
  results.push({ name: 'columns sheet', ok: sheetVisible === 'flex' && sheetHidden === 'flex', detail: sheetVisible + ' -> ' + sheetHidden });
} catch (e) { results.push({ name: 'columns sheet', ok: false, detail: e.message }); }

// Test 5: Import sheet toggle
try {
  await page.getByRole('button', { name: 'Import' }).click();
  const sheetVisible = await page.$eval('#ovImport', el => getComputedStyle(el).display);
  await page.getByRole('button', { name: 'Cancel' }).click();
  const sheetHidden = await page.$eval('#ovImport', el => getComputedStyle(el).display);
  results.push({ name: 'import sheet', ok: sheetVisible === 'flex' && sheetHidden === 'flex', detail: sheetVisible + ' -> ' + sheetHidden });
} catch (e) { results.push({ name: 'import sheet', ok: false, detail: e.message }); }

// Test 6: Item field edits (first item)
const firstItem = page.locator('div.item').first();
try {
  await firstItem.locator('input[placeholder="Qty *"]').fill('10');
  const value = await firstItem.locator('input[placeholder="Qty *"]').inputValue();
  results.push({ name: 'qty first item', ok: value === '10', detail: value });
} catch (e) { results.push({ name: 'qty first item', ok: false, detail: e.message }); }

try {
  await firstItem.locator('input[placeholder="Unit"]').fill('bags');
  const value = await firstItem.locator('input[placeholder="Unit"]').inputValue();
  results.push({ name: 'unit first item', ok: value === 'bags', detail: value });
} catch (e) { results.push({ name: 'unit first item', ok: false, detail: e.message }); }

try {
  await firstItem.locator('input[placeholder="Make"]').fill('Dangote 3X');
  const value = await firstItem.locator('input[placeholder="Make"]').inputValue();
  results.push({ name: 'make first item', ok: value === 'Dangote 3X', detail: value });
} catch (e) { results.push({ name: 'make first item', ok: false, detail: e.message }); }

try {
  await firstItem.locator('input[placeholder="CP (cost)"]').fill('5000');
  const value = await firstItem.locator('input[placeholder="CP (cost)"]').inputValue();
  results.push({ name: 'cp first item', ok: value === '5000', detail: value });
} catch (e) { results.push({ name: 'cp first item', ok: false, detail: e.message }); }

try {
  await firstItem.locator('input[placeholder="SP (sell)"]').fill('6000');
  const value = await firstItem.locator('input[placeholder="SP (sell)"]').inputValue();
  results.push({ name: 'sp first item', ok: value === '6000', detail: value });
} catch (e) { results.push({ name: 'sp first item', ok: false, detail: e.message }); }

// Summary
console.log('=== CLICK TEST RESULTS ===');
let allOk = true;
for (const r of results) {
  console.log(r.ok ? 'PASS' : 'FAIL', r.name, r.detail);
  if (!r.ok) allOk = false;
}
console.log(allOk ? 'ALL PASSED' : 'SOME FAILED');
await browser.close();
