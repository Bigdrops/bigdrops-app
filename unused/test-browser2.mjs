import { chromium } from 'playwright';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dir = dirname(fileURLToPath(import.meta.url));
const root = join(__dir, '..');
const url = 'file://' + join(root, 'docs', 'prd', 'Adaptive Mobile-First UIUX Facelift PRD', 'Design-direction', 'form', 'boq', 'BOQ Full-Page Live Form-v9.html');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'load' });

const info = await page.evaluate(() => {
  const topbar = document.querySelector('.topbar');
  const wrap = document.querySelector('.wrap');
  const res = {
    wrapRect: wrap.getBoundingClientRect(),
    topbarRect: topbar.getBoundingClientRect(),
    children: Array.from(topbar.children).map(el => {
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        className: el.className,
        text: el.textContent.trim().slice(0, 20),
        x: r.x, y: r.y, width: r.width, height: r.height,
        right: r.right, bottom: r.bottom,
      };
    }),
  };
  return res;
});

console.log(JSON.stringify(info, null, 2));

await browser.close();
