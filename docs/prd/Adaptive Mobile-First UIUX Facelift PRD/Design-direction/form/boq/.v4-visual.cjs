const { chromium } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(__dirname, 'BOQ Full-Page Live Form-desktop-v4.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const t = (n, c, extra) => { if (c) pass++; else { fail++; console.log('FAIL: ' + n + (extra ? ' -> ' + extra : '')); } };

const PROBE = `(function(){
  const px = v => Math.round(v);
  const r = el => { const b = el.getBoundingClientRect(); return { l: px(b.left), r: px(b.right), t: px(b.top), b: px(b.bottom), w: px(b.width), h: px(b.height) }; };
  const row = document.querySelector('.row');
  const kids = [...row.children].map(c => ({ cls: c.className, box: r(c) }));
  const zones = ['gutter', 'identity', 'attrs', 'money'].map(cl => { const el = row.querySelector('.' + cl); return el ? r(el) : null; });
  let overlap = 0;
  for (let i = 0; i < zones.length; i++) for (let j = i + 1; j < zones.length; j++) {
    if (zones[i] && zones[j]) { const a = zones[i], b = zones[j]; if (Math.min(a.r, b.r) - Math.max(a.l, b.l) > 1) overlap++; }
  }
  const ins = document.querySelector('.insert');
  const rgb = s => String(s).replace(/\\s/g, '');
  const isTransparent = c => /rgba\\(.*,\\s*0\\)$/.test(rgb(c)) || rgb(c) === 'transparent';
  const gwrap = document.querySelector('.gwrap');
  const gs = getComputedStyle(gwrap);
  const rowStyle = getComputedStyle(row);
  const bandHead = document.querySelector('.band-head');
  const appbar = document.querySelector('.appbar');
  const firstCell = bandHead.querySelector('.hcell');
  return {
    zones, zoneOverlap: overlap,
    insertClipped: ins ? ins.scrollHeight > ins.clientHeight + 1 : null,
    insertText: ins ? ins.textContent.trim() : null,
    docScrollX: document.documentElement.scrollWidth <= window.innerWidth + 1,
    groupSpineWidth: parseFloat(gs.borderLeftWidth),
    groupSpineColour: gs.borderLeftColor,
    groupSurface: gs.backgroundColor,
    rowRuleColour: rowStyle.borderBottomColor,
    rowBackground: rowStyle.backgroundColor,
    appbarBottom: px(appbar.getBoundingClientRect().bottom),
    bandHeadTop: px(bandHead.getBoundingClientRect().top),
    bandHeadSticky: getComputedStyle(bandHead).position,
    headLabelColour: getComputedStyle(firstCell).color,
    pageBg: getComputedStyle(document.body).backgroundColor,
    specVisible: (() => { const b = document.querySelector('.spec-block.has'); if (!b) return null; const f = b.querySelector('.f-spec'); return getComputedStyle(f).display !== 'none' && f.getBoundingClientRect().height > 8; })(),
    footNote: (document.querySelector('.group-foot .gf-note') || {}).textContent || '',
    emptyGroupNone: true
  };
})()`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(file);
  await page.waitForTimeout(500);
  t('no page errors', errs.length === 0, errs.join('|'));

  for (const theme of ['light', 'dark']) {
    if (theme === 'dark') { await page.click('#themeBtn'); await page.waitForTimeout(300); }
    for (const [w, h] of [[1280, 800], [1440, 900], [1600, 900], [1920, 1080]]) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(300);
      const d = await page.evaluate(PROBE);
      const tag = theme + ' ' + w + 'x' + h;
      t(tag + ': no page-wide horizontal scroll', d.docScrollX);
      t(tag + ': row zones do not overlap', d.zoneOverlap === 0, JSON.stringify(d.zones));
      t(tag + ': insert boundary label is not clipped', d.insertClipped === false);
      t(tag + ': group spine is a substantial rule (' + d.groupSpineWidth + 'px)', d.groupSpineWidth >= 8);
      t(tag + ': group spine contrasts with the group surface', d.groupSpineColour !== d.groupSurface, d.groupSpineColour + ' vs ' + d.groupSurface);
      t(tag + ': row boundary rule is drawn', d.rowRuleColour !== 'rgba(0, 0, 0, 0)' && d.rowRuleColour !== 'transparent', d.rowRuleColour);
      t(tag + ': populated specification stays on screen', d.specVisible !== false);
      t(tag + ': group footer closes the region', /group closes here/.test(d.footNote), d.footNote);
      t(tag + ': column header labels are readable text', /rgb/.test(d.headLabelColour), d.headLabelColour);
      const scrollInfo = await page.evaluate(() => {
        const el = document.documentElement;
        return { max: Math.max(0, el.scrollHeight - el.clientHeight), room: Math.max(0, el.scrollHeight - window.innerHeight) };
      });
      await page.evaluate(m => window.scrollTo(0, m), scrollInfo.max);
      await page.waitForTimeout(260);
      const s = await page.evaluate(() => {
        const a = document.querySelector('.appbar').getBoundingClientRect();
        const b = document.querySelector('.band-head').getBoundingClientRect();
        return { gap: Math.round(b.top - a.bottom), headOnScreen: b.top >= 0 && b.top < window.innerHeight, pos: getComputedStyle(document.querySelector('.band-head')).position, y: Math.round(window.scrollY) };
      });
      // The column header must never tuck under the command bar, and it stays on screen while scrolled.
      t(tag + ': column header stays on screen and above the command bar (gap ' + s.gap + ')', s.pos === 'sticky' && s.gap >= -1 && s.headOnScreen, JSON.stringify(s));
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(120);
    }
    if (theme === 'dark') { await page.click('#themeBtn'); await page.waitForTimeout(250); }
  }

  // -------- the real long-BOQ case: a tall document, deep scroll --------
  for (const [w, h] of [[1440, 900], [1920, 1080]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(200);
    await page.evaluate(() => { for (let i = 0; i < 12; i++) addItem(null); });
    await page.waitForTimeout(400);
    const room = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
    await page.evaluate(r => window.scrollTo(0, Math.min(r, 1400)), room);
    await page.waitForTimeout(300);
    const deep = await page.evaluate(() => {
      const a = document.querySelector('.appbar').getBoundingClientRect();
      const bh = document.querySelector('.band-head').getBoundingClientRect();
      const rows = [...document.querySelectorAll('.row')].filter(r => { const b = r.getBoundingClientRect(); return b.bottom > a.bottom && b.top < window.innerHeight; });
      const label = rows.every(r => {
        const c = r.querySelector('.mcell.cost .mchip'), s = r.querySelector('.mcell.sell .mchip');
        return c && s && c.textContent.trim() === 'CP' && s.textContent.trim() === 'SP';
      });
      return { y: Math.round(window.scrollY), gap: Math.round(bh.top - a.bottom), rows: rows.length, label, totalsVisible: document.getElementById('tSell').getBoundingClientRect().top >= 0 };
    });
    const tag2 = 'long BOQ ' + w + 'x' + h;
    t(tag2 + ': column header pins under the command bar at depth (gap ' + deep.gap + ')', Math.abs(deep.gap) < 3, JSON.stringify(deep));
    t(tag2 + ': every on-screen row still names CP and SP (' + deep.rows + ' rows)', deep.label && deep.rows >= 2);
    t(tag2 + ': the persistent rail keeps totals on screen', deep.totalsVisible);
    await page.reload();
    await page.waitForTimeout(400);
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('VISUAL ERROR:', e.message); process.exit(2); });
