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
const previewSource = readFileSync(pathResolve(root, 'src/pages/ColdLaunchPreview.tsx'), 'utf8')
const presentationSource = readFileSync(
  pathResolve(root, 'src/components/cold-launch/ColdLaunchTenantTreePresentation.tsx'),
  'utf8',
)
const source = `${previewSource}\n${presentationSource}`

test('cold launch reuses Onboarding V2 theme families and appearances', () => {
  assert.match(source, /getPhotoHeroVars/)
  assert.match(source, /PHOTO_HERO_FAMILY_META/)
  assert.match(source, /PhotoHeroAppearance/)
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
    assert.ok(!source.includes(banned), `Cold Launch preview must not depend on ${banned}`)
  }

  for (const required of [
    '--clp-glass:var(--glass-bg)',
    '--clp-glass-line:var(--glass-line)',
    '--clp-node-surface',
    '--clp-control-active:var(--cta-bg)',
    '--clp-lower-bg',
  ]) {
    assert.ok(source.includes(required), `Cold Launch preview must define ${required}`)
  }
})

test('cold launch keeps existing preview behavior controls', () => {
  for (const required of [
    'Tree Original',
    'Tree + Beams',
    'Normal',
    'Connection Error',
    'Retry connection',
    'Replay preview animation',
    'useLoadingTip',
    'PreviewTree',
  ]) {
    assert.ok(source.includes(required), `Cold Launch preview must preserve ${required}`)
  }
})

test('cold launch preview is V1-only after rejected V2 retirement', () => {
  for (const banned of [
    'ColdLaunchPaperDeliveryPreview',
    'cold-launch-v2-theme',
    'V1 - Tenant Tree',
    'V2 - Paper & Delivery',
    'Slate × Amber',
    'SLATE_AMBER_FUSION',
  ]) {
    assert.ok(!previewSource.includes(banned), `Cold Launch preview must not include ${banned}`)
  }

  assert.match(previewSource, /ColdLaunchTenantTreePresentation/)
  assert.match(presentationSource, /BOURXE/)
})
