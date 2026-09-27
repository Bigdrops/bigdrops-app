const { chromium } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(__dirname, 'BOQ Full-Page Live Form-desktop-v4.html').split(path.sep).join('/');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(file); await p.waitForTimeout(400);
  const info = await p.evaluate(() => {
    const bh = document.querySelector('.band-head');
    const anc = [];
    let n = bh.parentElement;
    while (n && n.nodeType === 1) { const cs = getComputedStyle(n); anc.push({ cls: String(n.className || n.tagName), overflow: cs.overflow, pos: cs.position }); n = n.parentElement; }
    return { topVar: getComputedStyle(document.documentElement).getPropertyValue('--appbar-h'), top: getComputedStyle(bh).top, pos: getComputedStyle(bh).position, anc, docH: document.documentElement.scrollHeight, vh: window.innerHeight };
  });
  console.log(JSON.stringify(info, null, 1));
  await p.evaluate(() => window.scrollTo(0, 99999)); await p.waitForTimeout(300);
  const s = await p.evaluate(() => {
    const a = document.querySelector('.appbar').getBoundingClientRect();
    const bh = document.querySelector('.band-head').getBoundingClientRect();
    return { y: Math.round(window.scrollY), appbarBottom: Math.round(a.bottom), bhTop: Math.round(bh.top), bandTop: Math.round(document.querySelector('.band').getBoundingClientRect().top) };
  });
  console.log('scrolled', JSON.stringify(s));
  await b.close();
})().catch(e => { console.error(e); process.exit(2); });
