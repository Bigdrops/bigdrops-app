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
  const back = document.querySelector('.back');
  const theme = document.querySelector('.theme-btn');
  const badge = document.querySelector('.badge');
  const h1 = document.querySelector('h1');
  const topbar = document.querySelector('.topbar');
  const wrap = document.querySelector('.wrap');
  const tbar = topbar.getBoundingClientRect();
  const wrapRect = wrap.getBoundingClientRect();
  const res = {
    topbarRect: tbar,
    back: { x: back.getBoundingClientRect().x, y: back.getBoundingClientRect().y, w: back.getBoundingClientRect().width, h: back.getBoundingClientRect().height, tag: back.tagName, class: back.className, onclick: back.getAttribute('onclick'), style: back.getAttribute('style') },
    theme: { x: theme.getBoundingClientRect().x, y: theme.getBoundingClientRect().y, w: theme.getBoundingClientRect().width, h: theme.getBoundingClientRect().height, tag: theme.tagName, class: theme.className, onclick: theme.getAttribute('onclick'), style: theme.getAttribute('style') },
    badge: { x: badge.getBoundingClientRect().x, y: badge.getBoundingClientRect().y, w: badge.getBoundingClientRect().width, h: badge.getBoundingClientRect().height, tag: badge.tagName, class: badge.className },
    h1: { x: h1.getBoundingClientRect().x, y: h1.getBoundingClientRect().y, w: h1.getBoundingClientRect().width, h: h1.getBoundingClientRect().height, style: h1.getAttribute('style') },
    topbar: { x: tbar.x, y: tbar.y, w: tbar.width, h: tbar.height },
    // Check for pointer-events on parent
    wrapStyle: wrap.getAttribute('style'),
    // Check if back button is under something
    backZIndex: back.style.zIndex,
    themeZIndex: theme.style.zIndex,
    // Check computed styles
    computedBack: getComputedStyle(back).position,
    computedTheme: getComputedStyle(theme).position,
    computedThemeLeft: getComputedStyle(theme).left,
    computedThemeTop: getComputedStyle(theme).top,
    computedBackLeft: getComputedStyle(back).left,
    isThemeVisible: getComputedStyle(theme).display !== 'none',
    isBackVisible: getComputedStyle(back).display !== 'none',
  };
  return res;
});

console.log(JSON.stringify(info, null, 2));

await browser.close();
