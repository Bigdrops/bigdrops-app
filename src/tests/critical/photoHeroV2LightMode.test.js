import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve as pathResolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  PHOTO_HERO_FAMILIES,
  getPhotoHeroVars,
} from '../../components/onboarding/photo-hero-v2-theme.ts'

const root = pathResolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

const REQUIRED_KEYS = [
  '--bg',
  '--surface',
  '--ink',
  '--ink-2',
  '--primary',
  '--glass-bg',
  '--glass-line',
  '--glass-ink',
  '--scene-intro',
  '--scene-invoicing',
  '--scene-logi',
  '--scene-projects',
  '--field-a',
  '--field-b',
  '--cta-bg',
  '--cta-ink',
  '--eyebrow',
  '--copy',
  '--theme-name',
]

/** Extract lightness (0-100) from an `hsl(H S% L%)` value. */
function lightness(value) {
  const m = value.match(/hsl\(\s*[\d.]+\s+[\d.]+%\s+([\d.]+)%/)
  assert.ok(m, `expected hsl() triplet, got: ${value}`)
  return parseFloat(m[1])
}

test('all five theme families are selectable', () => {
  assert.deepEqual([...PHOTO_HERO_FAMILIES], [
    'slate-navy',
    'amber-terracotta',
    'ocean-teal',
    'rose-gold',
    'forest-green',
  ])
})

test('all ten family x appearance combinations resolve complete vars', () => {
  for (const family of PHOTO_HERO_FAMILIES) {
    for (const appearance of ['light', 'dark']) {
      const vars = getPhotoHeroVars(family, appearance)
      for (const key of REQUIRED_KEYS) {
        assert.ok(
          typeof vars[key] === 'string' && vars[key].length > 0,
          `${family}/${appearance} must define ${key}`,
        )
      }
    }
  }
})

test('light mode uses a white-primary canvas', () => {
  for (const family of PHOTO_HERO_FAMILIES) {
    const vars = getPhotoHeroVars(family, 'light')
    assert.ok(
      lightness(vars['--bg']) >= 88,
      `${family}/light canvas must be near-white, got ${vars['--bg']}`,
    )
  }
})

test('dark mode keeps a deep canvas baseline', () => {
  for (const family of PHOTO_HERO_FAMILIES) {
    const vars = getPhotoHeroVars(family, 'dark')
    assert.ok(
      lightness(vars['--bg']) <= 20,
      `${family}/dark canvas must stay deep, got ${vars['--bg']}`,
    )
  }
})

test('light glass pairs translucent fill with dark ink (never pale-on-pale)', () => {
  for (const family of PHOTO_HERO_FAMILIES) {
    const vars = getPhotoHeroVars(family, 'light')
    assert.ok(
      lightness(vars['--glass-ink']) <= 30,
      `${family}/light glass ink must be dark, got ${vars['--glass-ink']}`,
    )
    assert.match(vars['--glass-bg'], /rgba\(255,255,255/)
  }
})

test('light scenes stay theme-aware, not flat white', () => {
  for (const family of PHOTO_HERO_FAMILIES) {
    const vars = getPhotoHeroVars(family, 'light')
    assert.match(vars['--scene-intro'], /color-mix/)
    assert.notEqual(vars['--field-a'], '#ffffff')
  }
})

test('preview theme module stays isolated from global theme state', () => {
  const source = readFileSync(
    pathResolve(root, 'src/components/onboarding/photo-hero-v2-theme.ts'),
    'utf8',
  )
  for (const banned of ['document.', 'localStorage', 'useUserThemePreferences', 'AppThemeManager']) {
    assert.ok(!source.includes(banned), `theme module must not reference ${banned}`)
  }
})

test('preview component stays isolated: no iframe, no persisted theme, no auth', () => {
  const source = readFileSync(
    pathResolve(root, 'src/components/onboarding/PhotoHeroV2Preview.tsx'),
    'utf8',
  )
  for (const banned of [
    '<iframe',
    'srcDoc',
    '?raw',
    'localStorage',
    'useUserThemePreferences',
    'AppThemeManager',
    'supabase',
    'signIn',
    'signUp',
  ]) {
    assert.ok(!source.includes(banned), `preview component must not contain ${banned}`)
  }
  for (const family of PHOTO_HERO_FAMILIES) {
    assert.ok(source.includes(family), `preview must offer family ${family}`)
  }
  assert.ok(source.includes('Light') && source.includes('Dark'), 'preview must offer appearance')
  assert.ok(source.includes('KJA-459XY'), 'logistics tracking treatment must be preserved')
  assert.ok(source.includes('wheelSpin') || source.includes('oh2-wheelspin'), 'keke animation must be preserved')
})

test('route wrapper renders the native preview without the legacy iframe', () => {
  const source = readFileSync(pathResolve(root, 'src/pages/PhotoHeroPreview.tsx'), 'utf8')
  for (const banned of ['<iframe', 'srcDoc', '?raw', 'photoHeroHtml']) {
    assert.ok(!source.includes(banned), `wrapper must not contain ${banned}`)
  }
  assert.ok(source.includes('PhotoHeroV2Preview'), 'wrapper must render the native preview')
})

test('original HTML reference remains untouched', () => {
  const file = pathResolve(
    root,
    'docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/onboarding/BIGDROPS_Onboarding-PhotoHero-v2.html',
  )
  const hash = createHash('sha256').update(readFileSync(file)).digest('hex').toUpperCase()
  assert.equal(hash, 'BFC077497F90E16922C466B6A08E36F83E781607E6E00955E38ABCB84EF450CD')
})
