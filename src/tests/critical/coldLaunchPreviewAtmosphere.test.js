import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve as pathResolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  PHOTO_HERO_FAMILIES,
  getPhotoHeroVars,
} from '../../components/onboarding/photo-hero-v2-theme.ts'

const root = pathResolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const presentationSource = readFileSync(
  pathResolve(root, 'src/components/cold-launch/ColdLaunchTenantTreePresentation.tsx'),
  'utf8',
)

test('cold launch reuses Onboarding V2 theme families and appearances', () => {
  assert.match(presentationSource, /getPhotoHeroVars/)
  assert.match(presentationSource, /PhotoHeroAppearance/)
  assert.match(presentationSource, /data-appearance=\{resolvedAppearance\}/)

  for (const family of PHOTO_HERO_FAMILIES) {
    for (const appearance of ['light', 'dark']) {
      const vars = getPhotoHeroVars(family, appearance)
      assert.ok(vars['--scene-intro'], `${family}/${appearance} resolves scene atmosphere`)
      assert.ok(vars['--glass-bg'], `${family}/${appearance} resolves glass material`)
      assert.ok(vars['--cta-bg'], `${family}/${appearance} resolves control fill`)
    }
  }
})

test('cold launch owns scoped preview materials instead of host theme overrides', () => {
  for (const banned of [
    '--bd-app-bg',
    '--bd-surface',
    '--bd-brand',
    '--background',
    '--foreground',
    'useUserThemePreferences',
    'AppThemeManager',
    'localStorage',
  ]) {
    assert.ok(!presentationSource.includes(banned), `Cold Launch presentation must not depend on ${banned}`)
  }

  for (const required of [
    '--clp-glass:var(--glass-bg)',
    '--clp-glass-line:var(--glass-line)',
    '--clp-node-surface',
    '--clp-control-active:var(--cta-bg)',
    '--clp-lower-bg',
  ]) {
    assert.ok(presentationSource.includes(required), `Cold Launch presentation must define ${required}`)
  }
})

test('cold launch Slate Navy atmosphere is scoped and grounded in Onboarding V2 materials', () => {
  assert.match(presentationSource, /data-family=\{family\}/)
  assert.match(
    presentationSource,
    /\.clp\[data-family="slate-navy"\]\[data-appearance="dark"\]::before/,
  )
  assert.match(
    presentationSource,
    /linear-gradient\(165deg,#16283f 0%,#1e3a5f 44%,#3b5c82 78%,#7d97b4 100%\)/,
  )
  assert.match(presentationSource, /rgba\(96,165,250,\.30\)/)
  assert.match(presentationSource, /rgba\(147,197,253,\.22\)/)
  assert.doesNotMatch(presentationSource, /\.clp\[data-appearance="dark"\]::before/)
})

test('cold launch Slate Navy removes decorative background grid without removing tree edges', () => {
  const darkAfter = presentationSource.match(
    /\.clp\[data-family="slate-navy"\]\[data-appearance="dark"\]::after\{(?<body>[\s\S]*?)\n        \}/,
  )?.groups?.body
  const lightAfter = presentationSource.match(
    /\.clp\[data-family="slate-navy"\]\[data-appearance="light"\]::after\{(?<body>[\s\S]*?)\n        \}/,
  )?.groups?.body

  assert.ok(darkAfter, 'Slate Navy dark overlay must be present')
  assert.ok(lightAfter, 'Slate Navy light overlay must be present')

  for (const [name, block] of [
    ['dark', darkAfter],
    ['light', lightAfter],
  ]) {
    assert.ok(!block.includes(' 1px,transparent 1px'), `Slate Navy ${name} overlay must not draw 1px grid lines`)
    assert.ok(!block.includes('34px 34px'), `Slate Navy ${name} overlay must not tile a grid`)
    assert.match(block, /background-size:auto;/, `Slate Navy ${name} overlay must stay untiled`)
  }

  assert.match(presentationSource, /\.clp \.clp-edge\{[^}]*stroke-linecap:round/)
  assert.match(presentationSource, /\.clp-run \.clp-edge\{stroke-dasharray:1;stroke-dashoffset:1;animation:clp-draw/)
  assert.match(presentationSource, /\.clp \.clp-edge-primary\{stroke:/)
})

test('cold launch keeps production presentation behavior without preview route controls', () => {
  for (const required of [
    'Retry connection',
    'useLoadingTip',
    'PreviewTree',
  ]) {
    assert.ok(presentationSource.includes(required), `Cold Launch presentation must preserve ${required}`)
  }

  assert.doesNotMatch(presentationSource, /Tree Original|Tree \+ Beams|Replay preview animation/)
})

test('cold launch preview page is retired while V1 production presentation remains', () => {
  for (const banned of [
    'ColdLaunchPaperDeliveryPreview',
    'cold-launch-v2-theme',
    'V1 - Tenant Tree',
    'V2 - Paper & Delivery',
    'Slate × Amber',
    'SLATE_AMBER_FUSION',
  ]) {
    assert.ok(!presentationSource.includes(banned), `Cold Launch presentation must not include ${banned}`)
  }

  assert.match(presentationSource, /ColdLaunchTenantTreePresentation/)
  assert.match(presentationSource, /BOURXE/)
})
