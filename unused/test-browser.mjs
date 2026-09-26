import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');

const filePath = join(root, 'docs', 'prd', 'Adaptive Mobile-First UIUX Facelift PRD', 'Design-direction', 'form', 'boq', 'BOQ Full-Page Live Form-v9.html');
const url = 'file://' + join(root, 'docs', 'prd', 'Adaptive Mobile-First UIUX Facelift PRD', 'Design-direction', 'form', 'boq', 'BOQ Full-Page Live Form-v9.html');

console.log('FILE PATH:', url);

const browser = await chromium.launch();
const page = await browser.newPage();
try {
  await page.goto(url, { waitUntil: 'load' });
  const title = await page.title();
  console.log('TITLE:', title);

  const theme = await page.$eval('html', el => el.getAttribute('data-theme'));
  console.log('THEME attr:', theme);

  const btn = await page.$eval('#themeBtn', el => {
    const r = el.getBoundingClientRect();
    return {
      text: el.textContent,
      html: el.innerHTML.slice(0, 40),
      x: r.x, y: r.y, width: r.width, height: r.height,
      kids: el.children.length,
      rect: r,
    };
  });
  console.log('THEMEBTN:', JSON.stringify(btn));

  // Can we actually click theme button?
  const clickRes = await page.evaluate(async (sel) => {
    const el = document.querySelector(sel);
    const r = el.getBoundingClientRect();
    const evt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window, button: 0 });
    const before = document.documentElement.getAttribute('data-theme');
    el.dispatchEvent(evt);
    const after = document.documentElement.getAttribute('data-theme');
    return {
      before,
      after,
      iconChanged: el.querySelector('svg') !== null,
      hasSvg: el.querySelector('svg') !== null,
    };
  }, '#themeBtn');
  console.log('THEME CLICK:', JSON.stringify(clickRes));

  // Back button click test
  const backRes = await page.evaluate(() => {
    const back = document.querySelector('.back');
    const r = back.getBoundingClientRect();
    const evt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window, button: 0 });
    back.dispatchEvent(evt);
    return {
      toast: document.getElementById('toast').textContent,
      backRect: { x: r.x, y: r.y, w: r.width, h: r.height },
    };
  });
  console.log('BACK CLICK:', JSON.stringify(backRes));

  // Qty input test
  const qtyRes = await page.evaluate(() => {
    const qty = document.querySelector('input[placeholder="Qty *"]');
    const r = qty.getBoundingClientRect();
    const evt = new Event('input', { bubbles: true, cancelable: true });
    qty.dispatchEvent(evt);
    return {
      rect: { x: r.x, y: r.y, w: r.width, h: r.height },
      value: qty.value,
    };
  });
  console.log('QTY INPUT:', JSON.stringify(qtyRes));

  // Check overlap: back vs theme-btn
  const overlap = await page.evaluate(() => {
    const back = document.querySelector('.back').getBoundingClientRect();
    const theme = document.querySelector('.theme-btn').getBoundingClientRect();
    return {
      backRect: { x: back.x, y: back.y, w: back.width, h: back.height },
      themeRect: { x: theme.x, y: theme.y, w: theme.width, h: theme.height },
      // axis-aligned rectangle overlap test
      overlap: back.x < theme.x + theme.width && back.x + back.width > theme.x &&
               back.y < theme.y + theme.height && back.y + back.height > theme.y,
      backLeft: back.x, backRight: back.x + back.width,
      themeLeft: theme.x, themeRight: theme.x + theme.width,
    };
  });
  console.log('OVERLAP CHECK:', JSON.stringify(overlap));

} catch (e) {
  console.error('ERROR:', e.message);
} finally {
  await browser.close();
}
