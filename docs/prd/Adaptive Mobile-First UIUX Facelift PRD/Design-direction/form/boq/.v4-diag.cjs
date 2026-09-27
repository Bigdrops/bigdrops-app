const { chromium } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(__dirname, 'BOQ Full-Page Live Form-desktop-v4.html').replace(/\\/g, '/');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(file);
  await page.waitForTimeout(500);
  for (const [w, h] of [[1280, 800], [1440, 900], [1600, 900], [1920, 1080]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(300);
    const d = await page.evaluate(() => {
      const H = sel => { const e = document.querySelector(sel); return e ? Math.round(e.getBoundingClientRect().height) : null; };
      const rows = [...document.querySelectorAll('.row')];
      const vh = window.innerHeight;
      return {
        appbar: H('.appbar'), strip: H('.strip'), regionHead: H('.region-head'), bandHead: H('.band-head'),
        gwrapHead: H('.group-head'), gwrapFoot: H('.group-foot'),
        docH: Math.round(document.querySelector('.workspace').getBoundingClientRect().height),
        visible: rows.filter(r => { const b = r.getBoundingClientRect(); return b.top >= 0 && b.bottom <= vh; }).length,
        heights: rows.map(r => Math.round(r.getBoundingClientRect().height))
      };
    });
    console.log(w + 'x' + h, JSON.stringify(d));
  }
  await browser.close();
})().catch(e => { console.error('DIAG ERROR', e); process.exit(2); });
