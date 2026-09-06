import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const sharedFontsPath = path.resolve('src/lib/pdfSharedFonts.ts')
const designPresetPath = path.resolve('src/lib/pdfDesignPreset.ts')

test('PDF shared font registry uses a static Inter source instead of the broken variable package', () => {
  const source = fs.readFileSync(sharedFontsPath, 'utf8')

  assert.match(source, /@fontsource\/inter/)
  assert.doesNotMatch(source, /@fontsource-variable\/inter/)
  assert.doesNotMatch(source, /\.woff2/)
})

test('PDF shared font registry includes a dedicated Noto Sans entry for locked currency rendering', () => {
  const source = fs.readFileSync(sharedFontsPath, 'utf8')

  assert.match(source, /@fontsource\/noto-sans/)
  assert.match(source, /Noto Sans/)
})

test('PDF design preset continues exposing the expected shared font choices for header and body selection', () => {
  const source = fs.readFileSync(designPresetPath, 'utf8')

  for (const fontName of [
    'Inter',
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Poppins',
    'Raleway',
    'Orbitron',
    'Source Sans Pro',
    'Roboto Condensed',
  ]) {
    assert.match(source, new RegExp(`'${fontName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`))
  }
})
