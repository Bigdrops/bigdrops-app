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

// Test 2: Theme button (cycle to dark)
try {
  await page.locator('#themeBtn').click();
  const theme = await page.$eval('html', el => el.getAttribute('data-theme'));
  results.push({ name: 'theme button (to dark)', ok: theme === 'dark', detail: theme });
  // Click again to toggle back to light
  await page.locator('#themeBtn').click();
  const theme2 = await page.$eval('html', el => el.getAttribute('data-theme'));
  results.push({ name: 'theme button (to light)', ok: theme2 === 'light', detail: theme2 });
} catch (e) { results.push({ name: 'theme button', ok: false, detail: e.message }); }

// Test 3: Qty input can be edited
try {
  const input = page.locator('input[placeholder="Qty *"]');
  await input.fill('10');
  const value = await input.inputValue();
  results.push({ name: 'qty input', ok: value === '10', detail: value });
} catch (e) { results.push({ name: 'qty input', ok: false, detail: e.message }); }

// Test 4: CP input can be edited
try {
  const input = page.locator('input[placeholder="CP (cost)"]');
  await input.fill('500');
  const value = await input.inputValue();
  results.push({ name: 'cp input', ok: value === '500', detail: value });
} catch (e) { results.push({ name: 'cp input', ok: false, detail: e.message }); }

// Test 5: SP input can be edited
try {
  const input = page.locator('input[placeholder="SP (sell)"]');
  await input.fill('600');
  const value = await input.inputValue();
  results.push({ name: 'sp input', ok: value === '600', detail: value });
} catch (e) { results.push({ name: 'sp input', ok: false, detail: e.message }); }

// Test 6: Make input (optional toggle on)
try {
  const input = page.locator('input[placeholder="Make"]');
  await input.fill('Dangote');
  const value = await input.inputValue();
  results.push({ name: 'make input', ok: value === 'Dangote', detail: value });
} catch (e) { results.push({ name: 'make input', ok: false, detail: e.message }); }

// Test 7: Unit input
try {
  const input = page.locator('input[placeholder="Unit"]');
  await input.fill('bags');
  const value = await input.inputValue();
  results.push({ name: 'unit input', ok: value === 'bags', detail: value });
} catch (e) { results.push({ name: 'unit input', ok: false, detail: e.message }); }

// Test 8: Save button
try {
  await page.getByRole('button', { name: 'Save Bill of Quantities' }).click();
  const toast = await page.textContent('#toast');
  results.push({ name: 'save button', ok: toast.includes('saved'), detail: toast });
} catch (e) { results.push({ name: 'save button', ok: false, detail: e.message }); }

// Test 9: Columns sheet toggle
try {
  await page.getByRole('button', { name: 'Columns' }).click();
  const sheetVisible = await page.$eval('#ovColumns', el => getComputedStyle(el).display);
  await page.getByRole('button', { name: 'Done' }).click();
  const sheetHidden = await page.$eval('#ovColumns', el => getComputedStyle(el).display);
  results.push({ name: 'columns sheet', ok: sheetVisible === 'flex' && sheetHidden === 'flex', detail: sheetVisible + ' -> ' + sheetHidden });
} catch (e) { results.push({ name: 'columns sheet', ok: false, detail: e.message }); }

// Test 10: Import sheet toggle
try {
  await page.getByRole('button', { name: 'Import' }).click();
  const sheetVisible = await page.$eval('#ovImport', el => getComputedStyle(el).display);
  await page.getByRole('button', { name: 'Cancel' }).click();
  const sheetHidden = await page.$eval('#ovImport', el => getComputedStyle(el).display);
  results.push({ name: 'import sheet', ok: sheetVisible === 'flex' && sheetHidden === 'flex', detail: sheetVisible + ' -> ' + sheetHidden });
} catch (e) { results.push({ name: 'import sheet', ok: false, detail: e.message }); }

// Test 11: Totals update on input
try {
  await page.locator('input[placeholder="Qty *"]').fill('2');
  const tCost = await page.textContent('#tCost');
  results.push({ name: 'totals update', ok: tCost.includes('₦'), detail: tCost });
} catch (e) { results.push({ name: 'totals update', ok: false, detail: e.message }); }

// Summary
console.log('=== CLICK TEST RESULTS ===');
let allOk = true;
for (const r of results) {
  console.log(r.ok ? 'PASS' : 'FAIL', r.name, r.detail);
  if (!r.ok) allOk = false;
}
console.log(allOk ? 'ALL PASSED' : 'SOME FAILED');
await browser.close();
