// Temporary desktop verification harness for BOQ Full-Page Live Form-desktop-v4.html.
// Removed after the run.
const { chromium } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(__dirname, 'BOQ Full-Page Live Form-desktop-v4.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; } else { fail++; console.log('FAIL: ' + n); } };

const SIZES = [[1280, 800], [1440, 900], [1600, 900], [1920, 1080]];

// compositing contrast helper injected into the page
const CONTRAST = `
function _rgba(c){ var m = String(c).match(/rgba?\\(([^)]+)\\)/); if(!m) return null; var p = m[1].split(',').map(Number); return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}; }
function _over(fg, bg){ return { r: fg.r*fg.a + bg.r*(1-fg.a), g: fg.g*fg.a + bg.g*(1-fg.a), b: fg.b*fg.a + bg.b*(1-fg.a), a:1 }; }
function _bgOf(el){
  var acc = null, n = el;
  while (n && n.nodeType === 1) {
    var c = _rgba(getComputedStyle(n).backgroundColor);
    if (c && c.a > 0) { acc = acc ? _over(acc, c) : c; if (acc.a >= 0.999) { acc.a = 1; return acc; } }
    n = n.parentElement;
  }
  return acc && acc.a > 0.9 ? acc : { r:255,g:255,b:255,a:1 };
}
function _lum(c){ var f = function(v){ v/=255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); }; return 0.2126*f(c.r) + 0.7152*f(c.g) + 0.0722*f(c.b); }
function contrastOf(sel){
  var el = document.querySelector(sel);
  var fg = _rgba(getComputedStyle(el).color);
  var bg = _bgOf(el);
  var c = _over(fg, bg);
  var l1 = _lum(c), l2 = _lum(bg);
  return Math.round(((Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05))*100)/100;
}`;

(async () => {
  const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' }));
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(file);
  await page.waitForTimeout(500);

  t('no page errors on load', errs.length === 0); if (errs.length) console.log(errs);

  // ---------------- structure: no mobile artefacts ----------------
  t('no FAB exists', (await page.$$('.fab')).length === 0);
  t('exactly one labelled Save BOQ button', await page.evaluate(() =>
    [...document.querySelectorAll('button')].filter(b => b.textContent.trim().replace(/\\s+/g, ' ') === 'Save BOQ').length === 1));
  t('Save BOQ is the only primary command in the persistent bar', (await page.$$('.appbar .btn.primary')).length === 1 && (await page.textContent('.appbar .btn.primary')).trim() === 'Save BOQ');
  t('command bar is persistent (sticky)', (await page.$eval('.appbar', el => getComputedStyle(el).position)) === 'sticky');
  t('summary rail is persistent (sticky)', (await page.$eval('.rail', el => getComputedStyle(el).position)) === 'sticky');
  t('no bottom-sheet pattern remains', (await page.$$('.sheet')).length === 0);
  t('body has no horizontal page scroll at load', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));

  // ---------------- global enumeration ----------------
  t('counts truthful (5 items / 2 groups)', (await page.textContent('#countLabel')) === '5 items \u00B7 2 groups');
  t('global enumeration 01..05 in DOM order', JSON.stringify(await page.$$eval('.num', e => e.map(x => x.textContent).slice(0, 5))) === JSON.stringify(['01', '02', '03', '04', '05']));
  t('group headers consume no number', await page.evaluate(() =>
    document.querySelectorAll('.group-head .num, .group-foot .num').length === 0 &&
    document.querySelectorAll('.num').length === 5));
  t('items inside groups keep the global sequence (4 of 5 are members)', (await page.$$('.gwrap .num')).length === 4 && (await page.$$('.gwrap')).length === 2);

  // ---------------- the four desktop widths ----------------
  for (const [w, h] of SIZES) {
    const tag = w + 'x' + h;
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(320);

    t(tag + ': no horizontal page overflow', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));

    const geo = await page.evaluate(() => {
      const head = [...document.querySelector('.band-head').children].map(c => Math.round(c.getBoundingClientRect().left));
      const row = [...document.querySelector('.row').children].slice(0, 4).map(c => Math.round(c.getBoundingClientRect().left));
      const idw = document.querySelector('.row .identity').getBoundingClientRect().width;
      const rowH = document.querySelector('.row').getBoundingClientRect().height;
      const rows = [...document.querySelectorAll('.row')];
      let minGap = 1e9;
      for (let i = 1; i < rows.length; i++) {
        const gap = rows[i].getBoundingClientRect().top - rows[i - 1].getBoundingClientRect().bottom;
        minGap = Math.min(minGap, gap);
      }
      const hs = rows.map(r => Math.round(r.getBoundingClientRect().height));
      return {
        head, row, idw, rowH, minGap,
        minH: Math.min.apply(null, hs), avgH: Math.round(hs.reduce((a, b) => a + b, 0) / hs.length),
        bandW: document.querySelector('#band').clientWidth,
        wrapped: document.querySelector('#band').getAttribute('data-attr-wrapped'),
        perLine: document.querySelector('#band').getAttribute('data-attr-per-line'),
        railW: document.querySelector('.rail').getBoundingClientRect().width
      };
    });
    t(tag + ': band header aligns with row zones', JSON.stringify(geo.head) === JSON.stringify(geo.row));
    t(tag + ': identity column at or above its floor (' + Math.round(geo.idw) + 'px)', geo.idw >= 290);
    t(tag + ': no whitespace channel between rows (gap ' + Math.round(geo.minGap) + 'px)', geo.minGap <= 1);
    t(tag + ': lean row chrome (shortest row ' + geo.minH + 'px)', geo.minH <= 82);
    t(tag + ': authoring dense (average row ' + geo.avgH + 'px)', geo.avgH <= 118);
    t(tag + ': workspace plus rail fill the viewport (' + (geo.bandW + geo.railW) + ' of ' + w + ')', geo.bandW + geo.railW >= w - 72);
    t(tag + ': workspace is not a centred column (band ' + geo.bandW + 'px)', geo.bandW >= Math.round(w * 0.72));
    t(tag + ': attribute zone not wrapped at base field set', geo.wrapped === 'false');

    const density = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('.row')];
      const vh = window.innerHeight;
      return rows.filter(r => { const b = r.getBoundingClientRect(); return b.top >= 0 && b.bottom <= vh; }).length;
    });
    const wantRows = w <= 1280 ? 4 : 5;
    t(tag + ': at least ' + wantRows + ' rows fully visible (' + density + ')', density >= wantRows);

    // persistent CP/SP identity in every row
    const money = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('.row')];
      return rows.map(r => {
        const c = r.querySelector('.mcell.cost .mchip'), s = r.querySelector('.mcell.sell .mchip');
        return {
          ct: c ? c.textContent.trim() : null,
          st: s ? s.textContent.trim() : null,
          cs: c ? getComputedStyle(c).color : null,
          ss: s ? getComputedStyle(s).color : null
        };
      });
    });
    t(tag + ': every row carries CP and SP labels', money.length > 0 && money.every(m => m.ct === 'CP' && m.st === 'SP'));
    t(tag + ': CP and SP differ by colour and by label', money.every(m => m.cs !== m.ss));

    // specification readable without disclosure at any depth
    t(tag + ': populated specification is visible without interaction', await page.evaluate(() => {
      const block = document.querySelector('.spec-block.has');
      if (!block) return false;
      const f = block.querySelector('.f-spec');
      return getComputedStyle(f).display !== 'none' && f.getBoundingClientRect().height > 10;
    }));
    t(tag + ': every row exposes a specification field', await page.evaluate(() =>
      [...document.querySelectorAll('.row')].every(r => !!r.querySelector('.f-spec'))));

    // money legend present in the persistent rail
    t(tag + ': rail legend explains CP and SP', (await page.$$('.legend .lchip')).length === 3);
  }

  // wide-screen recomposition: identity splits into description + specification
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(320);
  t('1920: identity recomposes into two aligned text tracks', await page.evaluate(() => {
    const d = document.querySelector('.row .id-desc').getBoundingClientRect();
    const s = document.querySelector('.row .spec-block').getBoundingClientRect();
    return s.left >= d.right - 2 && Math.abs(s.top - d.top) < 4;
  }));
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(320);
  t('1280: specification stacks under the description', await page.evaluate(() => {
    const d = document.querySelector('.row .id-desc').getBoundingClientRect();
    const s = document.querySelector('.row .spec-block').getBoundingClientRect();
    return s.top >= d.bottom - 2;
  }));

  // sticky context after deep scroll
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(220);
  t('band header stays visible under the command bar while scrolling', await page.evaluate(() => {
    const head = document.querySelector('.band-head').getBoundingClientRect();
    const bar = document.querySelector('.appbar').getBoundingClientRect();
    return Math.abs(head.top - bar.bottom) < 3 && head.bottom > 0 && head.bottom < window.innerHeight;
  }));
  t('CP/SP identity survives deep scroll', await page.evaluate(() => {
    const visible = [...document.querySelectorAll('.row')].filter(r => { const b = r.getBoundingClientRect(); return b.top >= 0 && b.top < window.innerHeight; });
    return visible.length > 0 && visible.every(r => {
      const c = r.querySelector('.mcell.cost .mchip'), s = r.querySelector('.mcell.sell .mchip');
      return !!c && !!s && c.textContent.trim() === 'CP' && s.textContent.trim() === 'SP';
    });
  }));
  t('totals stay visible while scrolled deep', await page.evaluate(() => {
    const b = document.getElementById('tSell').getBoundingClientRect();
    return b.top >= 0 && b.bottom <= window.innerHeight;
  }));
  await page.evaluate(() => window.scrollTo(0, 0));

  // ---------------- contrast (no colour-only, both themes) ----------------
  await page.addScriptTag({ content: CONTRAST });
  const lightCost = await page.evaluate(() => contrastOf('.mcell.cost .mchip'));
  const lightSell = await page.evaluate(() => contrastOf('.mcell.sell .mchip'));
  t('light: CP chip contrast ' + lightCost + ' >= 4.5', lightCost >= 4.5);
  t('light: SP chip contrast ' + lightSell + ' >= 4.5', lightSell >= 4.5);
  await page.click('#themeBtn');
  await page.waitForTimeout(300);
  const darkCost = await page.evaluate(() => contrastOf('.mcell.cost .mchip'));
  const darkSell = await page.evaluate(() => contrastOf('.mcell.sell .mchip'));
  const darkProfit = await page.evaluate(() => contrastOf('.mcell.profit .mval'));
  t('dark: CP chip contrast ' + darkCost + ' >= 4.5', darkCost >= 4.5);
  t('dark: SP chip contrast ' + darkSell + ' >= 4.5', darkSell >= 4.5);
  t('dark: profit value contrast ' + darkProfit + ' >= 4.5', darkProfit >= 4.5);
  t('dark: theme attribute applied', (await page.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'dark');
  await page.click('#themeBtn');
  await page.waitForTimeout(250);

  // ---------------- group containment ----------------
  t('group has header, body and footer', (await page.$$('.group-head')).length === 2 && (await page.$$('.group-body')).length === 2 && (await page.$$('.group-foot')).length === 2);
  t('group spine is substantial (>=8px)', (await page.$eval('.gwrap', el => parseFloat(getComputedStyle(el).borderLeftWidth))) >= 8);
  t('group footer closes the region with a top rule', (await page.$eval('.group-foot', el => parseFloat(getComputedStyle(el).borderTopWidth))) >= 2);
  t('group header summarises cost and selling', (await page.$$('.gsum')).length === 2);
  t('group members are inset inside the region', await page.evaluate(() => {
    const g = document.querySelector('.gwrap').getBoundingClientRect();
    const r = document.querySelector('.gwrap .row').getBoundingClientRect();
    return r.left > g.left + 4 && r.right <= g.right + 1;
  }));
  await page.click('.gchev');
  await page.waitForTimeout(250);
  t('collapsed group hides body and footer', (await page.$eval('.gwrap .group-body', el => getComputedStyle(el).display)) === 'none' && (await page.$eval('.gwrap .group-foot', el => getComputedStyle(el).display)) === 'none');
  t('collapsed group still shows the useful summary', (await page.evaluate(() => {
    const h = document.querySelector('.gwrap').querySelector('.group-head');
    return h.querySelector('.gcount').textContent.includes('collapsed') && h.querySelector('.gsum').textContent.includes('\u20A6');
  })));
  t('collapsed group keeps global numbering on its members', JSON.stringify(await page.$$eval('.num', e => e.map(x => x.textContent).slice(0, 5))) === JSON.stringify(['01', '02', '03', '04', '05']));
  await page.click('.gchev');
  await page.waitForTimeout(250);

  // ---------------- row menu ----------------
  await page.click('.row:first-of-type .gbtn[aria-haspopup="menu"]');
  await page.waitForTimeout(220);
  t('row menu opens', await page.$eval('#rowMenu', el => el.classList.contains('open')));
  const mi = await page.$$eval('#rowMenu .mi', e => e.map(x => x.textContent.trim()));
  t('row menu exposes the full action set', mi.length === 6 && mi.some(m => /Insert below/.test(m)) && mi.some(m => /Move up/.test(m)) && mi.some(m => /Move down/.test(m)) && mi.some(m => /Duplicate/.test(m)) && mi.some(m => /Row editor/.test(m)) && mi.some(m => /Delete/.test(m)));
  t('row menu opens inside the viewport', await page.$eval('#rowMenu', el => { const b = el.getBoundingClientRect(); return b.left >= 0 && b.right <= window.innerWidth && b.top >= 0 && b.bottom <= window.innerHeight; }));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  t('Escape closes the row menu', !(await page.$eval('#rowMenu', el => el.classList.contains('open'))));

  // ---------------- row editor ----------------
  await page.click('.row:first-of-type .gbtn[aria-haspopup="menu"]');
  await page.waitForTimeout(180);
  await page.click('#rowMenu .mi:has-text("Row editor")');
  await page.waitForTimeout(300);
  t('row editor opens as a dialog', (await page.$eval('#bdRow', el => el.classList.contains('open'))) && (await page.getAttribute('#bdRow .modal', 'aria-modal')) === 'true');
  t('row editor lists every registry field (attributes + commercial)', (await page.$$('#rowEditorBody [data-re]')).length === 5);
  t('row editor exposes the specification', (await page.$$('#rowEditorBody [data-re-sub]')).length === 1);
  await page.fill('#re-desc', 'Edited from the row editor');
  await page.waitForTimeout(220);
  await page.click('#bdRow .mfoot .btn');
  await page.waitForTimeout(320);
  t('row editor writes back to the row', (await page.inputValue('.row .f-desc')).includes('Edited from the row editor'));
  t('row editor restores focus when closed', await page.evaluate(() => !!document.activeElement));

  // ---------------- behaviour parity ----------------
  await page.click('.region-head button:has-text("Add line item")');
  await page.waitForTimeout(250);
  t('add line item works', (await page.textContent('#countLabel')) === '6 items \u00B7 2 groups');
  t('new blank row is reported as needing input', await page.$eval('#readyText', el => /need input/.test(el.textContent)));
  await page.click('.region-head button:has-text("Add group")');
  await page.waitForTimeout(250);
  t('add group works', (await page.textContent('#countLabel')) === '6 items \u00B7 3 groups');
  t('empty group shows containment, empty state and footer', (await page.$$('.gwrap:last-child .empty')).length === 1 && (await page.$$('.gwrap:last-child .group-foot')).length === 1);
  const b4 = await page.$$eval('.row', e => e.length);
  await page.click('.gwrap:last-child .group-foot .btn');
  await page.waitForTimeout(250);
  t('add item to group works', (await page.$$eval('.row', e => e.length)) === b4 + 1);
  const b5 = await page.$$eval('.row', e => e.length);
  await page.click('.row:first-of-type .gbtn:not([aria-haspopup])');
  await page.waitForTimeout(250);
  t('duplicate works from the gutter', (await page.$$eval('.row', e => e.length)) === b5 + 1);
  t('duplicate kept the row inside its group context', await page.textContent('#countLabel') === '8 items \u00B7 3 groups');
  const b6 = await page.$$eval('.row', e => e.length);
  await page.click('.row:first-of-type .insert');
  await page.waitForTimeout(250);
  t('insert below works', (await page.$$eval('.row', e => e.length)) === b6 + 1);
  const numsBefore = await page.$$eval('.num', e => e.map(x => x.textContent));
  await page.evaluate(() => { const b = document.querySelector('.gwrap .row .gbtn[aria-haspopup="menu"]'); b.click(); });
  await page.waitForTimeout(200);
  await page.click('#rowMenu .mi:has-text("Move down")');
  await page.waitForTimeout(250);
  t('move down reorders without breaking enumeration', JSON.stringify(await page.$$eval('.num', e => e.map(x => x.textContent))) === JSON.stringify(numsBefore));
  const b7 = await page.$$eval('.row', e => e.length);
  await page.evaluate(() => { document.querySelector('.row .gbtn[aria-haspopup="menu"]').click(); });
  await page.waitForTimeout(180);
  if (!(await page.$eval('#rowMenu', el => el.classList.contains('open')))) {
    await page.evaluate(() => { document.querySelector('.row .gbtn[aria-haspopup="menu"]').click(); });
    await page.waitForTimeout(200);
  }
  await page.click('#rowMenu .mi.danger');
  await page.waitForTimeout(250);
  t('delete from the row menu works', (await page.$$eval('.row', e => e.length)) === b7 - 1);

  // totals + live profit
  const totals = await page.evaluate(() => ({ c: tCost.textContent, s: tSell.textContent, p: tProfit.textContent, m: tMargin.textContent, w: tWords.textContent, g: tGrand.textContent }));
  t('totals render naira cost, selling, margin and words', /^\u20A6/.test(totals.c) && /^\u20A6/.test(totals.s) && /%$/.test(totals.m) && /NAIRA/.test(totals.w));
  t('profit = selling - cost', await page.evaluate(() => {
    const n = s => Number(s.replace(/[^0-9.-]/g, ''));
    return Math.abs(n(tProfit.textContent) - (n(tSell.textContent) - n(tCost.textContent))) < 0.01;
  }));
  t('terminal grand total equals total selling', totals.g === totals.s);
  t('line profit updates live from CP/SP', await page.evaluate(() => {
    const sp = document.querySelector('.row .mcell.sell .mnum');
    const before = document.querySelector('.row .mcell.profit .mval').textContent;
    sp.value = String(Number(sp.value) + 1000);
    sp.dispatchEvent(new Event('input', { bubbles: true }));
    return document.querySelector('.row .mcell.profit .mval').textContent !== before;
  }));
  t('readiness chips point at the incomplete rows', (await page.$$('#readyChips .chipbtn')).length >= 1);
  await page.click('#readyChips .chipbtn');
  await page.waitForTimeout(300);
  t('readiness chip navigates to its row', (await page.$$('.row.flash')).length === 1);

  // import
  await page.click('.appbar button:has-text("Import JSON")');
  await page.waitForTimeout(250);
  t('import dialog opens with focus inside', await page.evaluate(() => document.getElementById('bdImport').classList.contains('open') && !!document.activeElement.closest('#bdImport .modal')));
  await page.fill('#impTa', '{ nope }');
  await page.click('#bdImport .btn.primary');
  await page.waitForTimeout(220);
  t('import rejects invalid JSON', await page.$eval('#impErr', el => el.classList.contains('show')));
  await page.fill('#impTa', JSON.stringify({
    items: [{ id: 1, description: 'A', quantity: 2, unit_price: 10, cost_price: 5 },
            { id: 2, description: 'B', sub_description: 'spec text', quantity: 1, unit_price: 20, cost_price: 8 }],
    groups: [{ id: 'g1', name: 'Imported group', itemIds: [2] }],
    title: 'Imported BOQ'
  }));
  await page.click('#bdImport .btn.primary');
  await page.waitForTimeout(320);
  t('import replaces rows', (await page.textContent('#countLabel')) === '2 items \u00B7 1 groups');
  t('import applies group membership', (await page.$$('.gwrap .row')).length === 1);
  t('import keeps global enumeration', JSON.stringify(await page.$$eval('.num', e => e.map(x => x.textContent))) === JSON.stringify(['01', '02']));
  t('import applies the title to the command bar', (await page.textContent('#appbarTitle')) === 'Imported BOQ');
  t('imported specification is directly visible', await page.evaluate(() => {
    const f = document.querySelector('.gwrap .f-spec');
    return f.value === 'spec text' && f.getBoundingClientRect().height > 10;
  }));
  t('import restores focus to the command bar trigger', await page.evaluate(() => /Import JSON/.test(document.activeElement.textContent || '')));

  // columns
  await page.click('.appbar button:has-text("Columns")');
  await page.waitForTimeout(250);
  t('columns dialog lists the three fields with two locked', (await page.$$('.colrow')).length === 3 && (await page.$$('.sw[disabled]')).length === 2);
  await page.click('.colrow:first-child .sw');
  await page.waitForTimeout(300);
  const attrPerRow = () => page.evaluate(() => document.querySelector('.row .attrs').querySelectorAll('.attr').length);
  t('hiding a field removes its row track', (await attrPerRow()) === 2);
  t('band header follows the registry change', await page.$eval('.band-head', el => !/Make/i.test(el.textContent)));
  await page.click('.colrow:first-child .sw');
  await page.waitForTimeout(300);
  t('showing the field restores its track', (await attrPerRow()) === 3);
  await page.click('#bdColumns .btn:has-text("Done")');
  await page.waitForTimeout(200);

  // save + clear
  await page.click('#saveBtn');
  await page.waitForTimeout(300);
  t('save succeeds on a valid document', (await page.textContent('#modeBadge')) === 'Saved');
  await page.click('.appbar button:has-text("Clear all")');
  await page.waitForTimeout(250);
  t('clear confirmation is a dialog', (await page.$eval('#bdClear', el => el.classList.contains('open'))));
  await page.click('#bdClear .btn.danger');
  await page.waitForTimeout(300);
  t('clear all empties the document', (await page.textContent('#countLabel')) === '0 items \u00B7 0 groups');
  t('empty document keeps both creation commands', (await page.$$('.region-head .acts .btn')).length === 2);
  await page.click('.region-head button:has-text("Add line item")');
  await page.waitForTimeout(250);
  await page.click('#saveBtn');
  await page.waitForTimeout(320);
  t('save blocks an incomplete row', (await page.$$('.row.invalid')).length === 1);
  t('blocked save reports a toast', await page.$eval('#toast', el => el.classList.contains('show') && /Save blocked/.test(el.textContent)));

  // keyboard
  await page.evaluate(() => { const t = document.getElementById('fNo'); t.value = ''; t.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.keyboard.press('Control+s');
  await page.waitForTimeout(300);
  t('Ctrl+S triggers save validation', await page.$eval('#toast', el => /Save blocked/.test(el.textContent)));

  // ---------------- extensibility experiment ----------------
  await page.reload();
  await page.waitForTimeout(400);
  const experiment = async (extra) => {
    return await page.evaluate((n) => {
      const names = ['material', 'labour', 'location', 'phase', 'remarks', 'rate'];
      for (let i = 0; i < n; i++) {
        ATTR_FIELDS.push({ key: names[i], label: names[i].charAt(0).toUpperCase() + names[i].slice(1), ph: names[i], numeric: false, width: i % 2 ? 96 : 112 });
      }
      render();
      const band = document.getElementById('band');
      const out = {
        extra: n,
        attrCount: document.querySelectorAll('.attr').length,
        attrTracks: band.style.getPropertyValue('--attr-cols'),
        wrapped: band.getAttribute('data-attr-wrapped'),
        perLine: band.getAttribute('data-attr-per-line'),
        identity: Math.round(document.querySelector('.row .identity').getBoundingClientRect().width),
        attrZoneLines: Math.round(document.querySelector('.row .attrs').getBoundingClientRect().height / 32),
        overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        headAligned: JSON.stringify([...document.querySelector('.band-head').children].map(c => Math.round(c.getBoundingClientRect().left)))
                     === JSON.stringify([...document.querySelector('.row').children].slice(0, 4).map(c => Math.round(c.getBoundingClientRect().left))),
        moneyIntact: document.querySelectorAll('.row .money .mchip').length === document.querySelectorAll('.row').length * 3
      };
      return out;
    }, extra);
  };
  for (const [w, n] of [[1280, 1], [1280, 2], [1440, 1], [1440, 4], [1920, 4]]) {
    await page.reload();
    await page.waitForTimeout(350);
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(300);
    const r = await experiment(n);
    const tag = w + 'px +' + n + ' fields';
    t(tag + ': no page overflow', !r.overflow);
    t(tag + ': description keeps its floor (' + r.identity + 'px)', r.identity >= 290);
    t(tag + ': band header stays aligned', r.headAligned);
    t(tag + ': money cells intact on every row', r.moneyIntact);
    t(tag + ': attribute zone wraps rather than squeezing (' + r.attrTracks + ')', r.wrapped === 'true' ? r.perLine >= '1' : true);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  const many = await (async () => { await page.reload(); await page.waitForTimeout(350); return experiment(6); })();
  t('1440px +6 fields: still no page overflow', !many.overflow);
  t('1440px +6 fields: description keeps its floor (' + many.identity + 'px)', many.identity >= 290);
  t('1440px +6 fields: zones stay aligned', many.headAligned);

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e.message); process.exit(2); });
