import { chromium } from 'playwright';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
const url = 'file://' + join(root, 'docs', 'prd', 'Adaptive Mobile-First UIUX Facelift PRD', 'Design-direction', 'form', 'boq', 'BOQ Full-Page Live Form-v9.html');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 860, height: 900 } });
await page.goto(url, { waitUntil: 'load' });

const info = await page.evaluate(() => {
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
console.log('CSS VARS:', JSON.stringify(info));

const fabEl = await page.$eval('.fab', el => {
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return {
    width: r.width,
    height: r.height,
    borderRadius: cs.borderRadius,
    right: cs.right,
    bottom: cs.bottom,
    bg: cs.backgroundColor,
  };
});
console.log('FAB:', JSON.stringify(fabEl));

await browser.close();
