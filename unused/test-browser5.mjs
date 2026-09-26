import { chromium } from 'playwright';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
const url = 'file://' + join(root, 'docs', 'prd', 'Adaptive Mobile-First UIUX Facelift PRD', 'Design-direction', 'form', 'boq', 'BOQ Full-Page Live Form-v9.html');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 860, height: 900 } });
page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
page.on('requestfailed', req => console.log('REQ FAILED:', req.url(), req.failure()?.errorText));

await page.goto(url, { waitUntil: 'load' });

// Check for JS errors
const errors = await page.evaluate(() => {
  const errs = [];
  window.addEventListener('error', e => errs.push(e.message));
  return errs;
});
console.log('INIT JS ERRORS:', errors);

// Try clicking back button
try {
  await page.locator('.back').click();
  const toast = await page.textContent('#toast');
  console.log('BACK TOAST:', JSON.stringify(toast));
} catch (e) {
  console.log('BACK CLICK ERROR:', e.message);
}

// Try clicking theme button
try {
  await page.locator('#themeBtn').click();
  const theme = await page.$eval('html', el => el.getAttribute('data-theme'));
  console.log('THEME AFTER CLICK:', theme);
} catch (e) {
  console.log('THEME CLICK ERROR:', e.message);
}

await browser.close();
