import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { DESIGN_LAB_PREVIEWS } from '../../lib/designLabPreviews.ts'
import {
  DESIGN_LAB_VIEWPORTS,
  getDesignLabViewport,
} from '../../lib/designLabViewports.ts'
import {
  PHOTO_HERO_FAMILIES,
  getPhotoHeroVars,
} from '../../components/onboarding/photo-hero-v2-theme.ts'

const read = (path) => readFileSync(resolve(path), 'utf8')

const previewSource = read('src/components/csr-theme/csr-theme-preview.tsx')
const dataSource = read('src/components/csr-theme/preview-csr-data.ts')
const pageSource = read('src/pages/CsrThemeExperiment.tsx')
const appShellSource = read('src/components/app/AppShell.tsx')
const registrySource = read('src/lib/designLabPreviews.ts')
const designLabSource = read('src/pages/DesignLab.tsx')

const CSR_ID = 'csr-theme'
const CSR_ROUTE = '/design-lab/csr-theme'

// Every token the experiment stylesheet consumes must resolve for every
// family × appearance, or a theme change leaves holes in the form.
const TRIPLET_TOKENS = ['--ink', '--ink-2', '--ink-3', '--surface', '--primary']
const RAW_TOKENS = [
  '--scene-intro',
  '--glass-bg',
  '--glass-line',
  '--glass-ink',
  '--glass-shadow',
  '--chrome-ink',
  '--copy',
  '--eyebrow',
  '--cta-bg',
  '--cta-ink',
  '--hero-accent',
  '--field-a',
  '--field-b',
  '--line',
  '--line-strong',
  '--success',
  '--warning',
  '--danger',
  '--panel',
  '--primary-ink',
  '--shadow-float',
]

// ── Registry + route ──

test('CSR appears in the Design Lab listing with its own route', () => {
  const entry = DESIGN_LAB_PREVIEWS.find((preview) => preview.id === CSR_ID)
  assert.ok(entry, 'registry must contain the CSR experiment')
  assert.equal(entry.name, 'Customer Service Report')
  assert.equal(entry.route, CSR_ROUTE)
  assert.match(entry.description, /CSR form with Design Lab themes/)
  assert.ok(entry.capabilities.length >= 3, 'entry needs capability metadata')
  assert.ok(
    appShellSource.includes(`<Route path="${CSR_ROUTE}"`),
    `AppShell must register ${CSR_ROUTE}`,
  )
  assert.match(appShellSource, /const CsrThemeExperiment = lazy/)
  assert.match(pageSource, /from '@\/components\/csr-theme\/csr-theme-preview'/)
  assert.match(pageSource, /<CsrThemePreview \/>/)
})

test('existing experiences keep their entries and routes', () => {
  for (const [id, route] of [
    ['onboarding-v2', '/photohero-preview'],
    ['dashboard-theme', '/design-lab/dashboard-theme'],
    ['invoice-theme', '/design-lab/invoice-theme'],
  ]) {
    const entry = DESIGN_LAB_PREVIEWS.find((preview) => preview.id === id)
    assert.ok(entry, `${id} must stay registered`)
    assert.equal(entry.route, route)
    assert.ok(appShellSource.includes(`<Route path="${route}"`))
  }
})

// ── Theme authority ──

test('the preview consumes the real Design Lab theme layer, not a copy', () => {
  assert.match(previewSource, /useExperimentThemeStyle\(family, appearance\)/)
  assert.match(previewSource, /import \{\s*\n?\s*resolveAppearance,\s*\n?\s*useExperimentThemeStyle,?\s*\n?\} from '@\/components\/design-lab\/design-lab-theme'/)
  assert.match(previewSource, /style=\{rootStyle\}/)
  // Family and appearance are preview-local: the saved preference is read
  // once as a seed and never written back.
  assert.match(previewSource, /useThemePreferenceContext/)
  assert.match(previewSource, /isPhotoHeroFamilyId\(preference\.themePresetId\)/)
  assert.ok(!previewSource.includes('setPreference'), 'the preview must not write the saved preference')
})

test('every consumed token resolves for all families and appearances', () => {
  for (const family of PHOTO_HERO_FAMILIES) {
    for (const appearance of ['light', 'dark']) {
      const vars = getPhotoHeroVars(family, appearance)
      for (const key of [...TRIPLET_TOKENS, ...RAW_TOKENS]) {
        assert.ok(
          typeof vars[key] === 'string' && vars[key].length > 0,
          `${family}/${appearance} must define ${key}`,
        )
      }
    }
  }
})

test('the stylesheet references only lab tokens, never production classes', () => {
  const css = previewSource.slice(previewSource.indexOf('const PREVIEW_CSS'))
  for (const banned of ['bg-bd-', 'text-bd-', 'border-bd-']) {
    assert.ok(!css.includes(banned), `experiment CSS must not contain ${banned}`)
  }
  assert.ok(!/\n\s*(html|body|:root)\s*\{/.test(css), 'no rule may target html, body, or :root')
  assert.ok(!css.includes('<h1') && !/[^a-zA-Z]h1\s*\{/.test(css), 'no h1 rule for the global production heading to catch')
})

test('no h1 element exists for the production heading rule to override', () => {
  assert.ok(!previewSource.includes('<h1'), 'the preview must not render an h1 element')
})

// ── Sections ──

test('all ten CSR sections are represented', () => {
  for (const label of [
    'Document Details',
    'Item Controls',
    'Service Parameters',
    'Equipment Specifications',
    'Problem & Service Details',
    'Execution Timeline & Status',
    'Operational Readings',
    'Materials Used',
    'Technician Endorsement',
    'Customer Acknowledgement',
  ]) {
    assert.ok(previewSource.includes(label), `missing section ${label}`)
  }
})

test('representative fields and options mirror the production form', () => {
  for (const term of [
    'client_id',
    'csr_number',
    'call_type',
    'service_basis',
    'system_down',
    'equipment_type',
    'problem_reported',
    'service_rendered',
    'voltage',
    'acknowledgement_name',
    'technicianName',
  ]) {
    assert.ok(previewSource.includes(term) || dataSource.includes(term), `missing field ${term}`)
  }
  assert.match(dataSource, /Breakdown/)
  assert.match(dataSource, /Preventive Maintenance/)
  assert.match(dataSource, /Pending for spares/)
  assert.match(dataSource, /Working solution provided/)
})

// ── Isolation ──

test('no production CSR module, data layer, or backend import exists', () => {
  // Import statements only: the isolation doc comment names the avoided
  // modules, so a bare substring check would false-positive on prose.
  const imports = [...previewSource.matchAll(/^import .*$/gm)].map((match) => match[0])
  for (const banned of [
    'csr/CsrFormScreen',
    'csr/CsrFormPresentations',
    'pages/CsrFormPage',
    '@/supabase',
    'tenant/contexts',
    'domain/csr',
    'layout/MobileFab',
    'components/ClientSelector',
  ]) {
    assert.ok(
      !imports.some((line) => line.includes(banned)),
      `the preview must not import ${banned}`,
    )
  }
  for (const banned of ['supabase', 'tenantClient', 'createCsr', 'updateCsr']) {
    assert.ok(!dataSource.includes(banned), `mock data must not reference ${banned}`)
  }
})

test('save paths are preview-only and say so', () => {
  assert.match(previewSource, /No production CSR was created/)
  assert.match(previewSource, /Preview only — no items were imported/)
  assert.match(previewSource, /signature upload is disabled/)
  assert.ok(!previewSource.includes('localStorage'), 'the preview must not persist anything')
})

// ── Viewport ──

test('the viewport switcher lives inside the CSR sample only', () => {
  assert.match(previewSource, /<ViewportSwitcher viewportId=\{viewportId\} onSelect=\{setViewportId\} \/>/)
  assert.match(previewSource, /<ViewportStage viewport=\{viewport\}>/)
  assert.match(previewSource, /const \{ viewportId, viewport, setViewportId \} = useDesignLabViewport\(\)/)
  assert.ok(!designLabSource.includes('ViewportSwitcher'), 'the listing page must not gain a switcher')
  assert.ok(!designLabSource.includes('ViewportStage'), 'the listing page must not gain a stage')
  assert.ok(!designLabSource.includes('designLabViewports'), 'the listing page must not import viewport infra')
})

test('presentation follows the simulated tier, never a CSS scale', () => {
  assert.match(previewSource, /viewport\.tier === 'phone'/)
  // No scaling-based fake responsiveness: the only scale in the file is the
  // unitless press-feedback transform shared with production buttons.
  assert.ok(!previewSource.match(/scale\([0-9]/), 'no miniature scaling may exist')
  assert.match(previewSource, /@container dlv \(/)
  assert.match(previewSource, /data-dlv-sim/)
  for (const preset of DESIGN_LAB_VIEWPORTS) {
    const resolved = getDesignLabViewport(preset.id)
    assert.equal(resolved.id, preset.id)
    assert.ok(resolved.width === null || typeof resolved.width === 'number')
  }
})

test('compact header and decorative motifs are preserved', () => {
  assert.match(previewSource, /Customer Service Report/)
  assert.match(previewSource, /cte-motif-clip/)
  assert.match(previewSource, /cte-motif-ring/)
  assert.match(previewSource, /aria-hidden="true"/)
})

// ── Actions and dialogs ──

test('preview actions mirror the production hierarchy without persisting', () => {
  assert.match(previewSource, /Save &amp; Exit/)
  assert.match(previewSource, /Keep Editing/)
  assert.match(previewSource, /Discard &amp; Exit/)
  assert.match(previewSource, /aria-label="Save CSR \(preview\)"/, 'the FAB is represented')
  assert.match(previewSource, /aria-label="CSR form actions"/, 'the bottom action bar is represented')
  const discardAt = previewSource.indexOf('.cte-danger-btn{')
  const discardRule = previewSource.slice(discardAt, discardAt + 400)
  assert.ok(discardRule.includes('transparent'), 'discard stays restrained')
  assert.ok(!discardRule.includes('destructive'), 'discard must not use the solid destructive treatment')
})
