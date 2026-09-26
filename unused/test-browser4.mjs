import { chromium } from 'playwright';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
const url = 'file://' + join(root, 'docs', 'prd', 'Adaptive Mobile-First UIUX Facelift PRD', 'Design-direction', 'form', 'boq', 'BOQ Full-Page Live Form-v9.html');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 860, height: 900 } });
await page.goto(url, { waitUntil: 'load' });

// 1. Check toast shows when back button is actually clicked
const back = page.locator('.back');
try {
  await back.click();
  const toastText = await page.textContent('#toast');
  console.log('BACK TOAST:', JSON.stringify(toastText));
} catch (e) {
  console.log('BACK CLICK ERROR:', e.message);
}

// 2. Check theme button actual click
const theme = page.locator('#themeBtn');
try {
  await theme.click();
  const themeAttr = await page.$eval('html', el => el.getAttribute('data-theme'));
  const themeBtnText = await page.textContent('#themeBtn');
  console.log('THEME AFTER CLICK:', themeAttr, '| button text:', JSON.stringify(themeBtnText));
} catch (e) {
  console.log('THEME CLICK ERROR:', e.message);
}

// 3. Check theme button is actually visible and not covered
const themeBox = await theme.boundingBox();
const backBox = await page.locator('.back').boundingBox();
const badgeBox = await page.locator('.badge').boundingBox();
console.log('THEME BTN box:', JSON.stringify(themeBox));
console.log('BACK box:', JSON.stringify(backBox));
console.log('BADGE box:', JSON.stringify(badgeBox));

// 4. Check hit area: does the back button have a visible hit area?
const backIsVisible = await page.locator('.back').isVisible();
const themeIsVisible = await page.locator('#themeBtn').isVisible();
console.log('BACK visible:', backIsVisible);
console.log('THEME visible:', themeIsVisible);

// 5. Check if theme button has a clickable hit area (not just 0-size)
const themeInner = await page.locator('#themeBtn').innerHTML();
console.log('THEME INNER has svg:', themeInner.includes('<svg'));

// 6. Check if theme button has proper display
const themeDisplay = await page.locator('#themeBtn').evaluate(el => {
  const cs = getComputedStyle(el);
  return { display: cs.display, backgroundColor: cs.backgroundColor, border: cs.border };
});
console.log('THEME computed:', JSON.stringify(themeDisplay));

await browser.close();
