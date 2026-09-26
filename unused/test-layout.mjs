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
  const items = document.querySelectorAll('.item');
  const results = [];
  items.forEach((item, i) => {
    const gf2 = item.querySelector('.g2');
    if (gf2) {
      const cells = gf2.children;
      const cellInfo = Array.from(cells).map(cell => {
        const r = cell.getBoundingClientRect();
        return {
          tag: cell.tagName,
          className: cell.className,
          width: r.width,
          height: r.height,
          x: r.x,
          count: cell.children.length,
        };
      });
      results.push({
        itemIndex: i,
        cellCount: cells.length,
        cells: cellInfo,
        ufldsRect: gf2.getBoundingClientRect(),
      });
    }
  });
  return results;
});

console.log(JSON.stringify(info, null, 2));

await browser.close();
