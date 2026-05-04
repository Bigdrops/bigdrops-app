import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const themePresetsPath = path.resolve('src/lib/themePresets.ts')
const indexHtmlPath = path.resolve('index.html')

test('theme presets remove the sun and aqua mint and register weather stratus', () => {
  const source = fs.readFileSync(themePresetsPath, 'utf8')

  assert.doesNotMatch(source, /"the-sun"/)
  assert.doesNotMatch(source, /"aqua-mint"/)
  assert.match(source, /"weather-stratus"/)
  assert.match(source, /label:\s*"Weather Stratus"/)
  assert.match(source, /"bd-font-family":\s*"'Outfit', sans-serif"/)
})

test('font loading drops the removed preset fonts and adds outfit', () => {
  const source = fs.readFileSync(indexHtmlPath, 'utf8')

  assert.match(source, /family=Outfit/)
  assert.doesNotMatch(source, /family=Anton/)
  assert.doesNotMatch(source, /family=DM\+Sans/)
  assert.doesNotMatch(source, /family=DM\+Mono/)
})
