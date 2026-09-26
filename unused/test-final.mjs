import { chromium } from 'playwright';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
const url = 'file://' + join(root, 'docs', 'prd', 'Adaptive Mobile-First UIUX Facelift PRD', 'Design-direction', 'form', 'boq', 'BOQ Full-Page Live Form-v9.html');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 860, height: 900 } });
await page.goto(url, { waitUntil: 'load' });

// Check JS errors
const errors = await page.evaluate(() => {
  const errs = [];
  window.addEventListener('error', e => errs.push(e.message));
  return errs;
});
console.log('JS ERRORS:', errors.length ? errors : 'none');

// Check itemHTML structure
const structure = await page.evaluate(() => {
  const item = document.querySelector('.item');
  if (!item) return 'no items';
  const uflds = item.querySelector('.uflds');
  const utop = item.querySelector('.utop');
  const fwrap = item.querySelector('.fwrap');
  const g2s = item.querySelectorAll('.g2');
  const f2s = item.querySelectorAll('.fwrap');
  return {
    utopExists: !!utop,
    ufldsExists: !!uflds,
    fwrapExists: !!fwrap,
    totalG2: g2s.length,
    totalFwrap: f2s.length,
    ufldsAfterUt: !uflds.closest('.utop'),
    hasEar: !!item.querySelector('.ear'),
    hasProfit: !!item.querySelector('.profit'),
    hasInsertBelow: !!item.querySelector('.ins'),
  };
});
console.log('STRUCTURE:', JSON.stringify(structure, null, 2));

// Check CSS variables exist
const vars = await page.evaluate(() => {
  const root = document.documentElement.style;
  return {
    cost: root.getPropertyValue('--cost'),
    sell: root.getPropertyValue('--sell'),
    loss: root.getPropertyValue('--loss'),
    fabBg: root.getPropertyValue('--bg-bd-button-primary-bg'),
    fabBgDark: root.getPropertyValue('--bd-button-primary-bg-dark'),
  };
});
console.log('CSS VARS:', JSON.stringify(vars, null, 2));

// Check fab
const fab = await page.evaluate(() => {
  const el = document.querySelector('.fab');
  const r = el.getBoundingClientRect();
  return {
    right: getComputedStyle(el).right,
    bottom: getComputedStyle(el).bottom,
    width: r.width,
    height: r.height,
    borderRadius: getComputedStyle(el).borderRadius,
    children: el.children.length,
  };
});
console.log('FAB:', JSON.stringify(fab));

// Check dark mode variables
const darkVars = await page.evaluate(() => {
  const root = document.documentElement.style;
  return {
    cost: root.getPropertyValue('--cost'),
    sell: root.getPropertyValue('--sell'),
    loss: root.getPropertyValue('--loss'),
  };
});
console.log('DARK VARS:', JSON.stringify(darkVars, null, 2));

// Click back buttons
try {
  await page.click('.back');
  const toast = await page.textContent('#toast');
  console.log('BACK TOAST:', JSON.stringify(toast));
} catch (e) { console.log('BACK CLICK ERROR:', e.message); }

// Click theme button
try {
  await page.click('#themeBtn');
  const theme = await page.$eval('html', el => el.getAttribute('data-theme'));
  console.log('THEME AFTER CLICK:', theme);
} catch (e) { console.log('THEME CLICK ERROR:', e.message); }

await browser.close();
