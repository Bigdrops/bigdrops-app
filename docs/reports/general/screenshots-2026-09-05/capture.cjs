/* Visual proof capture — accounting header fix (2026-09-05).
 * Read-only against a locally running dev server. Takes screenshots only. */
/* eslint-disable */
const puppeteer = require('puppeteer')
const path = require('path')

const BASE = process.env.BASE_URL || 'http://localhost:5173'
const OUT = __dirname

const PAGES = [
  ['accounting-section-list', '/accounting'],
  ['chart-of-accounts', '/accounting/accounts'],
  ['accounting-periods', '/accounting/periods'],
  ['journal', '/accounting/journal'],
  ['create-journal-entry', '/accounting/journal/new'],
]

;(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })

  for (const [name, route] of PAGES) {
    try {
      await page.goto(BASE + route, { waitUntil: 'networkidle2', timeout: 45000 })
    } catch (e) {
      console.error('[goto-timeout] ' + route + ': ' + e.message)
    }
    await new Promise((r) => setTimeout(r, 3500)) // allow lazy route + data fetch settle
    const info = await page.evaluate(() => ({
      url: location.href,
      pw: window.innerWidth,
      hasLogin: !!document.querySelector('input[type=password]'),
      bodyChars: document.body ? document.body.innerText.length : 0,
      h1s: Array.from(document.querySelectorAll('h1')).map((h) => h.textContent.trim()),
      headerBlocks: Array.from(
        document.querySelectorAll('[data-bd-shell="main"] > div > div > div, [data-bd-shell="main"] header')
      ).length,
    }))
    console.log(JSON.stringify({ name, route, ...info }))
    await page.screenshot({ path: path.join(OUT, name + '.png') })
  }

  await browser.close()
  console.log('done')
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
