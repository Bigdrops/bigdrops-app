import { chromium } from 'playwright';

const path = process.argv[2];
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + path, { waitUntil: 'load' });
  const theme = await page.$eval('html', el => el.getAttribute('data-theme'));
  const themeBtn = await page.$eval('#themeBtn', el => {
    return {
      text: el.textContent,
      html: el.innerHTML.slice(0, 50),
      rect: el.getBoundingClientRect(),
      children: el.children.length,
    };
  });
  console.log('TITLE:', await page.title());
  console.log('THEME:', theme);
  console.log('THEMEBTN text:', themeBtn.text);
  console.log('THEMEBTN html:', themeBtn.html);
  console.log('THEMEBTN rect:', JSON.stringify(themeBtn.rect));
  console.log('THEMEBTN children:', themeBtn.children);

  // Click test: can we actually click the theme button?
  const clickResult = await page.evaluate(async (el) => {
    const r = el.getBoundingClientRect();
    const evt = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
      button: 0,
    });
    el.dispatchEvent(evt);
    return {
      clicked: true,
      themeAfter: document.documentElement.getAttribute('data-theme'),
      themeIconChanged: el.querySelector('svg') !== null,
      iconCount: el.querySelectorAll('svg').length,
    };
  }, document.querySelector('#themeBtn'));
  console.log('CLICK TEST:', JSON.stringify(clickResult));

  // Click the "back" button
  const backResult = await page.evaluate(async () => {
    const back = document.querySelector('.back');
    const r = back.getBoundingClientRect();
    const evt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window, button: 0 });
    back.dispatchEvent(evt);
    return {
      clicked: true,
      toastText: document.getElementById('toast').textContent,
    };
  });
  console.log('BACK CLICK TEST:', JSON.stringify(backResult));

  // Test a clickable item field (Qty input)
  const qtyResult = await page.evaluate(async () => {
    const qtyIn = document.querySelector('input[placeholder="Qty *"]');
    const r = qtyIn.getBoundingClientRect();
    const evt = new Event('input', { bubbles: true, cancelable: true });
    qtyIn.dispatchEvent(evt);
    return {
      qtyRect: { x: r.x, y: r.y, w: r.width, h: r.height },
      qtyValue: qtyIn.value,
    };
  });
  console.log('QTY INPUT TEST:', JSON.stringify(qtyResult));

  await browser.close();
})();
