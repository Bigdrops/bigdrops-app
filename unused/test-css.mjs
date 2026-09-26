import { chromium } from 'playwright';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
const url = 'file://' + join(root, 'docs', 'prd', 'Adaptive Mobile-First UIUX Facelift PRD', 'Design-direction', 'form', 'boq', 'BOQ Full-Page Live Form-v9.html');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 860, height: 900 } });
await page.goto(url, { waitUntil: 'load' });

// Check CSS variables via :root
const cssVars = await page.evaluate(() => {
  const root = document.querySelector(':root');
  const cs = getComputedStyle(root);
  return {
    cost: cs.getPropertyValue('--cost'),
    sell: cs.getPropertyValue('--sell'),
    loss: cs.getPropertyValue('--loss'),
    fabBg: cs.getPropertyValue('--bg-bd-button-primary-bg'),
    fabBgDark: cs.getPropertyValue('--bd-button-primary-bg-dark'),
  };
});
console.log('CSS VARS from :root:', JSON.stringify(cssVars, null, 2));

// Check fab raw CSS
const fabRaw = await page.evaluate(() => {
  const el = document.querySelector('.fab');
  const cs = getComputedStyle(el);
  return {
    width: cs.width,
    height: cs.height,
    borderRadius: cs.borderRadius,
    right: cs.right,
    bottom: cs.bottom,
    backgroundColor: cs.backgroundColor,
  };
});
console.log('FAB computed:', JSON.stringify(fabRaw));

// Check theme toggle
const html = await page.$eval('html', el => el.getAttribute('data-theme') || 'light');
console.log('INITIAL THEME:', html);

await browser.close();
