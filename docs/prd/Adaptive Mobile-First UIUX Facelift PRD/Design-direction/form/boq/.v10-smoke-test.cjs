// Temporary static/browser smoke test for BOQ Full-Page Live Form-v10.html.
// Created for this verification run only and removed afterwards.
const { chromium } = require('playwright');
const path = require('path');

const file = 'file://' + path.resolve(__dirname, 'BOQ Full-Page Live Form-v10.html').replace(/\\/g, '/');
let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; } else { fail++; console.log('FAIL: ' + n); } };
const OK = (n) => console.log('  ok: ' + n);

(async () => {
  let browser;
  try { browser = await chromium.launch(); }
  catch (e) { browser = await chromium.launch({ channel: 'chrome' }); }
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(file);
  await page.waitForTimeout(400);

  // ---------- integrity ----------
  t('no page errors', errs.length === 0);
  if (errs.length) console.log(errs);

  // ---------- global enumeration & counts ----------
  t('count label truthful', (await page.textContent('#countLabel')) === '5 items \u00B7 2 groups');
  const nums = await page.$$eval('.idx', els => els.map(e => e.textContent));
  t('global enumeration 01..05 in DOM order', JSON.stringify(nums) === JSON.stringify(['01', '02', '03', '04', '05']));
  t('group headers consume no item number', (await page.$$('.gcount')).length === 2);

  // ---------- rail participates in full item height ----------
  const rail = await page.$$eval('.item', els => els.map(el => {
    const r = el.querySelector('.rail').getBoundingClientRect();
    const s = el.querySelector('.stack').getBoundingClientRect();
    const dup = el.querySelector('.rail .rbtn:last-child').getBoundingClientRect();
    return { h: r.height, sh: s.height, gap: s.bottom - dup.bottom };
  }));
  t('rail spans the full item height', rail.every(x => x.h >= x.sh - 2));
  t('no unused gutter below rail controls (<20px)', rail.every(x => x.gap < 20));

  // ---------- hanging delete ----------
  const ear = await page.$eval('.item .ear', el => { const b = el.getBoundingClientRect(); return { r: b.right, bottom: b.bottom }; });
  const desc = await page.$eval('.item .desc', el => { const b = el.getBoundingClientRect(); return { r: b.right, t: b.top, w: b.width }; });
  t('delete hangs past the content edge', ear.r > desc.r + 4);
  t('delete does not consume content width', desc.w > 240);
  t('delete sits above the field text area', ear.bottom <= desc.t + 3);
  t('delete touch area >= 44px', await page.$eval('.item .ear', el => {
    const s = getComputedStyle(el, '::after');
    return parseFloat(s.width) >= 44 && parseFloat(s.height) >= 44;
  }));
  t('row controls touch area >= 40px', await page.$eval('.rbtn', el => {
    const s = getComputedStyle(el, '::after');
    return parseFloat(s.width) >= 40 && parseFloat(s.height) >= 40;
  }));

  // ---------- compact separators ----------
  const insH = await page.$$eval('.ins', els => els.map(e => e.getBoundingClientRect().height));
  t('insert-below band compact (<=22px)', insH.every(h => h <= 22));

  // ---------- CP / SP semantics ----------
  const cpLab = await page.$eval('.cfield.cost .cf-lab', el => getComputedStyle(el).color);
  const spLab = await page.$eval('.cfield.sell .cf-lab', el => getComputedStyle(el).color);
  t('CP and SP labels differ in colour', cpLab !== spLab);
  const cpB = await page.$eval('.cfield.cost .fld', el => getComputedStyle(el).borderLeftColor);
  const spB = await page.$eval('.cfield.sell .fld', el => getComputedStyle(el).borderLeftColor);
  t('CP and SP accents differ', cpB !== spB);
  t('both CP and SP remain locally identifiable', (await page.$$('.cfield')).length === 5 * 2);

  // ---------- phone composition ----------
  t('phone: stack is a flex column', (await page.$eval('.stack', el => getComputedStyle(el).display)) === 'flex');
  t('phone: metadata is a 2-column grid', (await page.$eval('.meta-grid', el => getComputedStyle(el).gridTemplateColumns.split(' ').length)) === 2);
  const subTog = await page.$('.item .subtog.has');
  t('phone: existing spec is discoverable', !!subTog && (await page.$eval('.item .subprev', el => el.textContent.length)) > 10);
  t('phone: spec field is disclosed only when opened', (await page.$eval('.subrow .subfield', el => getComputedStyle(el).display)) === 'none');
  await subTog.click();
  await page.waitForTimeout(150);
  t('phone: spec toggle opens the field', (await page.$eval('.subrow .subfield', el => getComputedStyle(el).display)) !== 'none');
  t('phone: item anatomy is rail + content (2 tracks)', (await page.$eval('.item', el => getComputedStyle(el).gridTemplateColumns.split(' ').length)) === 2);

  // ---------- groups ----------
  t('expanded group has header + body + footer', (await page.$$('.gwrap:not(.collapsed) .ghdr')).length === 2 && (await page.$$('.gwrap:not(.collapsed) .gbody')).length === 2 && (await page.$$('.gwrap:not(.collapsed) .gfoot')).length === 2);
  t('group containment spine >= 8px', (await page.$eval('.gwrap', el => parseFloat(getComputedStyle(el).borderLeftWidth))) >= 8);
  t('group footer visibly closes the container', (await page.$eval('.gfoot', el => parseFloat(getComputedStyle(el).borderTopWidth))) >= 2);
  t('group footer carries add-item action', (await page.$$('.gfoot .gadd')).length === 2);
  const member = await page.$eval('.gwrap .item', el => el.querySelector('.rail') && el.querySelector('.cfield.cost') && el.querySelector('.ear') ? 'full' : 'reduced');
  t('grouped item uses the same item anatomy', member === 'full');
  await page.click('.gwrap .gchev');
  await page.waitForTimeout(150);
  t('collapsed group hides body + footer', (await page.$eval('.gwrap.collapsed .gbody', el => getComputedStyle(el).display)) === 'none' && (await page.$eval('.gwrap.collapsed .gfoot', el => getComputedStyle(el).display)) === 'none');
  t('collapsed group header is self-contained', (await page.$eval('.gwrap.collapsed .ghdr', el => parseFloat(getComputedStyle(el).borderLeftWidth))) >= 6);
  t('collapsed group leaves no orphan wrapper border', (await page.$eval('.gwrap.collapsed', el => parseFloat(getComputedStyle(el).borderTopWidth))) === 0);
  await page.click('.gwrap .gchev');
  await page.waitForTimeout(150);

  // ---------- empty group ----------
  await page.click('.createpair .cbtn.ghost');
  await page.waitForTimeout(200);
  t('empty group keeps containment + empty state + footer', (await page.$$('.gwrap:last-child .gempty')).length === 1 && (await page.$$('.gwrap:last-child .gfoot')).length === 1);
  t('count updates after adding a group', (await page.textContent('#countLabel')) === '5 items \u00B7 3 groups');

  // ---------- creation pair ----------
  t('creation pair sits after the final content', await page.evaluate(() => {
    const i = document.querySelector('#items'), c = document.querySelector('.createpair');
    return !!(i.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING);
  }));
  t('creation pair exposes both sibling actions', (await page.$$('.createpair .cbtn')).length === 2);
  t('topbar text has no group action', !/group/i.test(await page.$eval('.topbar', el => el.textContent)));

  // ---------- row operations ----------
  await page.click('.createpair .cbtn.primary');
  await page.waitForTimeout(200);
  t('global add line item works', (await page.textContent('#countLabel')) === '6 items \u00B7 3 groups');
  await page.$$eval('.gfoot .gadd', els => els[els.length - 1].click());
  await page.waitForTimeout(200);
  t('add item to group works', (await page.textContent('#countLabel')) === '7 items \u00B7 3 groups');
  const before = await page.$$eval('.item', e => e.length);
  await page.click('.item:first-of-type .rail .rbtn:last-child');
  await page.waitForTimeout(200);
  t('duplicate works', (await page.$$eval('.item', e => e.length)) === before + 1);
  const delBefore = await page.$$eval('.item', e => e.length);
  await page.click('.item:first-of-type .ear');
  await page.waitForTimeout(200);
  t('hanging delete removes the row', (await page.$$eval('.item', e => e.length)) === delBefore - 1);
  const mvBefore = await page.$$eval('.idx', e => e.map(x => x.textContent).join(','));
  await page.$$eval('.gwrap .item:nth-of-type(1) .rail .rbtn', els => els[1].click());
  await page.waitForTimeout(200);
  t('row movement renumbers globally', (await page.$$eval('.idx', e => e.map(x => x.textContent).join(','))) !== mvBefore);

  // ---------- totals ----------
  const totals = await page.evaluate(() => ({
    c: document.getElementById('tCost').textContent,
    s: document.getElementById('tSell').textContent,
    p: document.getElementById('tProfit').textContent,
    m: document.getElementById('tMargin').textContent,
    w: document.getElementById('tWords').textContent
  }));
  t('totals render naira values, margin and words', /^\u20A6/.test(totals.c) && /^\u20A6/.test(totals.s) && /%$/.test(totals.m) && /NAIRA/.test(totals.w));
  t('profit = selling - cost', await page.evaluate(() => {
    const n = s => Number(s.replace(/[^0-9.-]/g, ''));
    return Math.abs(n(document.getElementById('tProfit').textContent) - (n(document.getElementById('tSell').textContent) - n(document.getElementById('tCost').textContent))) < 0.01;
  }));

  // ---------- fold recomposition ----------
  await page.setViewportSize({ width: 800, height: 900 });
  await page.waitForTimeout(300);
  t('fold: stack recomposes into two columns', (await page.$eval('.stack', el => getComputedStyle(el).display)) === 'grid' && (await page.$eval('.stack', el => getComputedStyle(el).gridTemplateColumns.split(' ').length)) === 2);
  t('fold: wrapper uses the fold width', parseFloat(await page.$eval('.wrap', el => getComputedStyle(el).maxWidth)) >= 800);
  t('fold: data column sits beside the identity column', await page.$eval('.item', el => {
    const a = el.querySelector('.z-id').getBoundingClientRect();
    const b = el.querySelector('.z-data').getBoundingClientRect();
    return b.left >= a.right - 2;
  }));
  t('fold: vertical stacking is reduced to two rows', await page.$eval('.item', el => {
    const a = el.querySelector('.z-id').getBoundingClientRect();
    const b = el.querySelector('.z-data').getBoundingClientRect();
    return Math.abs(b.top - a.top) < 4;
  }));
  t('fold: existing spec is exposed without a toggle', (await page.$$('.subtog')).length === 0 || (await page.$$eval('.subfield', els => els.filter(e => getComputedStyle(e).display !== 'none').length)) > 0);
  t('fold: layout chip reports Fold', (await page.textContent('#layoutChip')) === 'Fold');
  await page.setViewportSize({ width: 320, height: 720 });
  await page.waitForTimeout(300);
  t('narrow phone: chip reports Phone', (await page.textContent('#layoutChip')) === 'Phone');
  t('narrow phone: no horizontal page overflow', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await page.setViewportSize({ width: 500, height: 900 });
  await page.waitForTimeout(300);
  t('large phone: chip reports Large phone', (await page.textContent('#layoutChip')) === 'Large phone');
  t('large phone: keeps the 2-track item anatomy', (await page.$eval('.item', el => getComputedStyle(el).gridTemplateColumns.split(' ').length)) === 2);

  // ---------- dark mode ----------
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.click('#themeBtn');
  await page.waitForTimeout(250);
  const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  t('dark mode switches the theme', lightBg !== darkBg);
  t('dark: data-theme attribute set', (await page.evaluate(() => document.documentElement.getAttribute('data-theme'))) === 'dark');
  t('dark: sheets use a theme surface', await page.evaluate(() => getComputedStyle(document.querySelector('.sheet')).backgroundColor !== 'rgb(255, 255, 255)'));
  t('dark: group spine token re-declared', await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--group-spine').trim().length > 0));
  t('dark: FAB stays legible against the page', await page.evaluate(() => getComputedStyle(document.querySelector('.fab')).backgroundColor !== getComputedStyle(document.body).backgroundColor));
  t('dark: rail and line tokens re-declared', await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement);
    return s.getPropertyValue('--rail').trim().length > 0 && s.getPropertyValue('--line').trim().length > 0;
  }));
  await page.click('#themeBtn');
  await page.waitForTimeout(150);

  // ---------- FAB standard ----------
  const fab = await page.$eval('.fab', el => {
    const s = getComputedStyle(el), b = el.getBoundingClientRect();
    return { w: b.width, h: b.height, r: s.borderRadius, p: s.position, right: Math.round(window.innerWidth - b.right), shadow: s.boxShadow, paths: el.querySelectorAll('svg path').length };
  });
  t('FAB 50x50', fab.w === 50 && fab.h === 50);
  t('FAB radius 18px', fab.r.startsWith('18px'));
  t('FAB fixed, 16px from the right edge', fab.p === 'fixed' && fab.right === 16);
  t('FAB carries a shadow', fab.shadow !== 'none');
  t('FAB icon is SaveAll (4 paths)', fab.paths === 4);

  // ---------- import ----------
  await page.click('.topbar button[aria-label="BOQ tools"]');
  await page.waitForTimeout(200);
  await page.getByText('Import JSON').click();
  await page.waitForTimeout(250);
  await page.fill('#impTa', '{ nope }');
  await page.getByText('Import & replace').click();
  await page.waitForTimeout(200);
  t('import: invalid JSON reports an error', await page.$eval('#impErr', el => el.classList.contains('show')));
  t('import: invalid JSON does not replace rows', (await page.textContent('#countLabel')) !== '2 items \u00B7 1 groups');
  await page.fill('#impTa', JSON.stringify({
    items: [
      { id: 1, description: 'A', quantity: 2, unit_price: 10, cost_price: 5 },
      { id: 2, description: 'B', sub_description: 'spec', quantity: 1, unit_price: 20, cost_price: 8 }
    ],
    groups: [{ id: 'g1', name: 'Imported group', itemIds: [2] }],
    title: 'Imported BOQ'
  }));
  await page.getByText('Import & replace').click();
  await page.waitForTimeout(300);
  t('import: replaces rows', (await page.textContent('#countLabel')) === '2 items \u00B7 1 groups');
  t('import: group membership applied', (await page.$$('.gwrap .item')).length === 1);
  t('import: enumeration stays global across the group', JSON.stringify(await page.$$eval('.idx', e => e.map(x => x.textContent))) === JSON.stringify(['01', '02']));
  t('import: title applied', (await page.inputValue('#fTitle')) === 'Imported BOQ');
  t('import: sub_description imported and discoverable', (await page.$eval('.gwrap .subprev', el => el.textContent)) === 'spec');

  // ---------- group delete keeps items ----------
  await page.click('.gwrap .gbtn.danger');
  await page.waitForTimeout(250);
  t('group delete keeps its items', (await page.textContent('#countLabel')) === '2 items \u00B7 0 groups');

  // ---------- columns ----------
  await page.click('.topbar button[aria-label="BOQ tools"]');
  await page.waitForTimeout(200);
  await page.getByText('Row columns').click();
  await page.waitForTimeout(250);
  t('columns: locked fields are always shown', (await page.$$('.sw[disabled]')).length === 2);
  await page.click('.colrow:first-child .sw');
  await page.waitForTimeout(250);
  t('columns: hidden field collapses to a slot without breaking the grid', (await page.$$('.slot-off')).length > 0);
  await page.click('.colrow:first-child .sw');
  await page.waitForTimeout(200);
  t('columns: re-enabling restores the field', (await page.$$('.slot-off')).length === 0);
  await page.getByText('Done').click();
  await page.waitForTimeout(150);

  // ---------- clear all ----------
  await page.click('.topbar button[aria-label="BOQ tools"]');
  await page.waitForTimeout(200);
  await page.getByText('Clear all line items').click();
  await page.waitForTimeout(250);
  await page.click('.dbtn.danger');
  await page.waitForTimeout(300);
  t('clear all empties the document', (await page.textContent('#countLabel')) === '0 items \u00B7 0 groups');
  t('empty document still offers both creation actions', (await page.$$('.createpair .cbtn')).length === 2);
  t('empty document still shows the tools entry point', (await page.$$('.topbar button[aria-label="BOQ tools"]')).length === 1);

  // ---------- save behaviour ----------
  await page.click('.fab');
  await page.waitForTimeout(250);
  t('save marks the document Saved', (await page.textContent('#modeBadge')) === 'Saved');
  await page.click('.createpair .cbtn.primary');
  await page.waitForTimeout(200);
  await page.click('.fab');
  await page.waitForTimeout(300);
  t('save is blocked when an item has no description/qty/SP', (await page.$eval('.item', el => el.classList.contains('err'))));
  t('blocked save reports a toast', (await page.$eval('#toast', el => el.classList.contains('show') && el.textContent.includes('Save blocked'))));

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e.message); process.exit(2); });
