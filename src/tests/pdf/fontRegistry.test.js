import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const fontkit = require('fontkit')

import { REGISTERED_SHARED_FONTS, REGISTERED_LOCKED_SHARED_FONTS, PDF_CURRENCY_FONT_FAMILY } from '@/lib/pdfSharedFonts'
import { REGISTERED_FILLABLE_FONTS } from '@/lib/pdfFillableFonts'
import { FORME_SUPPORTED_FAMILIES, ensureFormeFontFamily, resetFormeFontCache } from '@/components/pdf/forme/fonts'
import { resolvePdfFontFamily, resolvePdfWebFontFamily } from '@/lib/pdfDesignPreset'

const sharedFontsPath = path.resolve('src/lib/pdfSharedFonts.ts')
const fillableFontsPath = path.resolve('src/lib/pdfFillableFonts.ts')
const designPresetPath = path.resolve('src/lib/pdfDesignPreset.ts')
const formeFontsPath = path.resolve('src/components/pdf/forme/fonts.ts')

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

test('PDF production typography contains the approved families across registries', () => {
  // Shared fonts: Inter and Archivo Black
  const sharedFamilies = Object.keys(REGISTERED_SHARED_FONTS)
  assert.deepStrictEqual(sharedFamilies.sort(), ['Archivo Black', 'Inter'].sort())

  // Locked shared fonts: Noto Sans
  const lockedFamilies = Object.keys(REGISTERED_LOCKED_SHARED_FONTS)
  assert.deepStrictEqual(lockedFamilies, ['Noto Sans'])

  // Fillable fonts: Caveat
  const fillableFamilies = Object.keys(REGISTERED_FILLABLE_FONTS)
  assert.deepStrictEqual(fillableFamilies, ['Caveat'])

  // Forme supported families
  assert.deepStrictEqual([...FORME_SUPPORTED_FAMILIES].sort(), ['Archivo Black', 'Caveat', 'Figtree', 'Inter', 'Noto Sans', 'PT Serif', 'Plus Jakarta Sans', 'Public Sans', 'Work Sans'].sort())
})

test('Retired commercial and handwriting families are purged from production registries', () => {
  const sharedSource = fs.readFileSync(sharedFontsPath, 'utf8')
  const fillableSource = fs.readFileSync(fillableFontsPath, 'utf8')

  const retiredCommercial = [
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Poppins',
    'Raleway',
    'Orbitron',
    'Source Sans Pro',
    'Roboto Condensed',
    'Cormorant Garamond',
    'DejaVu Sans',
  ]

  for (const retired of retiredCommercial) {
    assert.doesNotMatch(sharedSource, new RegExp(`family:\\s*['"]${retired}['"]`))
  }

  const retiredHandwriting = [
    'Patrick Hand',
    'Handlee',
    'Kalam',
    'Reenie Beanie',
    'Sue Ellen Francisco',
  ]

  for (const retired of retiredHandwriting) {
    assert.doesNotMatch(fillableSource, new RegExp(`'${retired}'`))
  }

  const mainPath = path.resolve(process.cwd(), 'src/main.tsx')
  const mainSource = fs.readFileSync(mainPath, 'utf8')
  for (const retired of retiredCommercial) {
    const pkgName = retired.toLowerCase().replace(/\s+/g, '-')
    assert.doesNotMatch(mainSource, new RegExp(`@fontsource/${pkgName}`))
  }
})

test('React-PDF font registry includes Archivo Black as a registered display font', () => {
  assert.ok('Archivo Black' in REGISTERED_SHARED_FONTS)
  const config = REGISTERED_SHARED_FONTS['Archivo Black']
  assert.equal(config.family, 'Archivo Black')
  assert.ok(fs.existsSync(config.regularSrc))
})

test('Forme font registration authority registers approved families successfully with static TTF assets', async () => {
  resetFormeFontCache()

  for (const family of ['Inter', 'Archivo Black', 'Caveat', 'Noto Sans', 'Plus Jakarta Sans', 'Figtree', 'Work Sans', 'Public Sans', 'PT Serif']) {
    const resolved = await ensureFormeFontFamily(family)
    assert.equal(resolved, family, `Forme must register ${family} without falling back to Helvetica`)
  }
})

test('Static TTF font assets exist in public/fonts for approved families', () => {
  const requiredFiles = [
    'public/fonts/Inter-Regular.ttf',
    'public/fonts/Inter-Bold.ttf',
    'public/fonts/ArchivoBlack-Regular.ttf',
    'public/fonts/Caveat-Regular.ttf',
    'public/fonts/Caveat-Bold.ttf',
    'public/fonts/NotoSans-Regular.ttf',
    'public/fonts/NotoSans-Bold.ttf',
    'public/fonts/PlusJakartaSans-Regular.ttf',
    'public/fonts/PlusJakartaSans-Bold.ttf',
    'public/fonts/Figtree-Regular.ttf',
    'public/fonts/Figtree-Bold.ttf',
    'public/fonts/WorkSans-Regular.ttf',
    'public/fonts/WorkSans-Bold.ttf',
    'public/fonts/PublicSans-Regular.ttf',
    'public/fonts/PublicSans-Bold.ttf',
    'public/fonts/PTSerif-Regular.ttf',
    'public/fonts/PTSerif-Bold.ttf',
  ]

  for (const file of requiredFiles) {
    assert.ok(fs.existsSync(file), `Missing required static font binary: ${file}`)
    const stat = fs.statSync(file)
    assert.ok(stat.size > 10000, `Font binary is too small or corrupt: ${file} (${stat.size} bytes)`)
  }
})

test('Empirical Unicode glyph coverage across approved font binaries', () => {
  const interFont = fontkit.openSync('public/fonts/Inter-Regular.ttf')
  const archivoFont = fontkit.openSync('public/fonts/ArchivoBlack-Regular.ttf')
  const caveatFont = fontkit.openSync('public/fonts/Caveat-Regular.ttf')
  const notoFont = fontkit.openSync('public/fonts/NotoSans-Regular.ttf')

  // 1. Naira ₦ (U+20A6) — verified in Noto Sans currency font
  assert.ok(notoFont.hasGlyphForCodePoint(0x20a6), 'Noto Sans must contain Naira ₦ (U+20A6)')

  // 2. Ohm Ω (U+03A9) — verified in Archivo Black display font
  assert.ok(archivoFont.hasGlyphForCodePoint(0x03a9), 'Archivo Black must contain Ohm Ω (U+03A9)')

  // 3. Technical symbols in Inter, Archivo Black, Caveat
  for (const [char, cp] of [
    ['Micro µ', 0x00b5],
    ['Diameter Ø', 0x00d8],
    ['Degree °', 0x00b0],
    ['Prime ′', 0x2032],
    ['Double Prime ″', 0x2033],
    ['Square ²', 0x00b2],
    ['Cube ³', 0x00b3],
  ]) {
    assert.ok(interFont.hasGlyphForCodePoint(cp), `Inter must contain ${char}`)
    assert.ok(archivoFont.hasGlyphForCodePoint(cp), `Archivo Black must contain ${char}`)
    assert.ok(caveatFont.hasGlyphForCodePoint(cp), `Caveat must contain ${char}`)
  }

  // 4. Two-character sequence °C: ° is U+00B0 (present in Inter) and C is U+0043 (present in Inter)
  assert.ok(interFont.hasGlyphForCodePoint(0x00b0) && interFont.hasGlyphForCodePoint(0x0043), 'Inter must support °C sequence')

  // 5. Test ℃ (U+2103) separately — confirm it is a separate CJK compatibility ligature, not °C
  const hasSingleCelsius = interFont.hasGlyphForCodePoint(0x2103)
  assert.equal(hasSingleCelsius, false, 'U+2103 (℃) is separate from °C and not expected in standard Latin typography')
})

test('PDF design preset normalizes retired commercial and handwriting choices', () => {
  for (const retiredCommercial of [
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
    assert.equal(resolvePdfFontFamily(retiredCommercial), 'Inter', `${retiredCommercial} must normalize to Inter`)
    assert.match(resolvePdfWebFontFamily(retiredCommercial), /Inter/, `${retiredCommercial} web font must resolve to Inter`)
  }

  for (const retiredHandwriting of [
    'Patrick Hand',
    'Handlee',
    'Sue Ellen Francisco',
    'Kalam',
    'Reenie Beanie',
    'Biro Script',
    'Ballpoint Handwriting',
    'Ballpoint Rush',
  ]) {
    assert.equal(resolvePdfFontFamily(retiredHandwriting), 'Caveat', `${retiredHandwriting} must normalize to Caveat`)
    assert.match(resolvePdfWebFontFamily(retiredHandwriting), /Caveat/, `${retiredHandwriting} web font must resolve to Caveat`)
  }
})
