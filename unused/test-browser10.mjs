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
  const topbar = document.querySelector('.topbar');
  const tbar = topbar.getBoundingClientRect();
  const children = Array.from(topbar.children).map(el => {
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName,
      className: el.className,
      text: el.textContent.trim().slice(0, 15),
      x: r.x, y: r.y, width: r.width, height: r.height,
      right: r.right,
    };
  });
  return {
    topbarRect: { x: tbar.x, y: tbar.y, w: tbar.width, h: tbar.height },
    children,
  };
});

// Check for overlaps between topbar children
const children = info.children;
let overlapFound = false;
for (let i = 0; i < children.length; i++) {
  for (let j = i + 1; j < children.length; j++) {
    const a = children[i], b = children[j];
    const overlap = a.x < b.x + b.width && a.x + a.width > b.x &&
                    a.y < b.y + b.height && a.y + a.height > b.y;
    if (overlap) {
      console.log('OVERLAP:', a.tag, a.className, 'at (' + a.x + ',' + a.y + ')',
                  'vs', b.tag, b.className, 'at (' + b.x + ',' + b.y + ')');
      overlapFound = true;
    }
  }
}

console.log('Topbar children (left to right):');
for (const c of children) {
  console.log(`  ${c.tag} ${c.className || ''} @ x=${c.x}, w=${c.width}, y=${c.y}, h=${c.height}`);
}
console.log('OVERLAP FOUND:', overlapFound);

// Check theme button z-index and clickability
const theme = await page.$eval('#themeBtn', el => {
  const cs = getComputedStyle(el);
  return { zIndex: cs.zIndex, display: cs.display, pointerEvents: cs.pointerEvents };
});
const back = await page.$eval('.back', el => {
  const cs = getComputedStyle(el);
  return { zIndex: cs.zIndex, display: cs.display, pointerEvents: cs.pointerEvents };
});
console.log('THEME z-index:', theme.zIndex, 'display:', theme.display, 'pointer-events:', theme.pointerEvents);
console.log('BACK z-index:', back.zIndex, 'display:', back.display, 'pointer-events:', back.pointerEvents);

// Click test on theme button (real click)
await page.click('#themeBtn');
const themeAfter = await page.$eval('html', el => el.getAttribute('data-theme'));
console.log('THEME AFTER CLICK:', themeAfter);

await browser.close();
