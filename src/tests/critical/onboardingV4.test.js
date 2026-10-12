import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { DESIGN_LAB_PREVIEWS } from '../../lib/designLabPreviews.ts'
import {
  DESIGN_LAB_DEFAULT_VIEWPORT_ID,
  DESIGN_LAB_VIEWPORTS,
  getDesignLabViewport,
} from '../../lib/designLabViewports.ts'

const read = (path) => readFileSync(resolve(path), 'utf8')

const V4_ID = 'onboarding-v4-source'
const V4_ROUTE = '/design-lab/onboarding-v4'
const SOURCE_PATH =
  'docs/prd/Adaptive Mobile-First UIUX Facelift PRD/Design-direction/onboarding/outsourced-samples/BOURXE_Ultimate_Onboarding.html'

const previewSource = read('src/components/onboarding-v4/onboarding-v4-preview.tsx')
const pageSource = read('src/pages/OnboardingV4Preview.tsx')
const appShellSource = read('src/components/app/AppShell.tsx')
const sourceHtml = read(SOURCE_PATH)

test('V4 is registered as a separate Design Lab experiment and route', () => {
  const entry = DESIGN_LAB_PREVIEWS.find((preview) => preview.id === V4_ID)
  assert.ok(entry, 'the registry must contain the V4 source-led experiment')
  assert.equal(entry.route, V4_ROUTE)
  assert.equal(entry.eyebrow, 'Onboarding')
  assert.match(entry.name, /V4/)
  assert.match(entry.description, /Source-led/)
  assert.ok(
    appShellSource.includes(`<Route path="${V4_ROUTE}"`),
    `AppShell must register ${V4_ROUTE}`,
  )
  assert.match(appShellSource, /const OnboardingV4Preview = lazy/)
  assert.match(pageSource, /from '@\/components\/onboarding-v4\/onboarding-v4-preview'/)
  assert.match(pageSource, /<OnboardingV4Preview \/>/)
})

test('V4 keeps the original source HTML as its authority', () => {
  assert.ok(existsSync(resolve(SOURCE_PATH)), 'the required reference HTML must exist')
  assert.match(previewSource, /BOURXE_Ultimate_Onboarding\.html\?raw/)
  assert.match(previewSource, /SOURCE_REFERENCE =\s*\n?\s*'docs\/prd\/Adaptive Mobile-First UIUX Facelift PRD\/Design-direction\/onboarding\/outsourced-samples\/BOURXE_Ultimate_Onboarding\.html'/)
  assert.match(previewSource, /data-ob4-source=\{SOURCE_REFERENCE\}/)
  assert.ok(!previewSource.includes("from '@/supabase'"), 'the preview must not import Supabase')
  assert.ok(!previewSource.includes('signInWithOAuth'), 'the preview must not call Google OAuth')
})

test('the complete source scene sequence and motion vocabulary are preserved', () => {
  for (const id of ['welcome', 'intro-1', 'intro-2', 'intro-3', 'intro-4', 'intro-5', 'signin', 'signup']) {
    assert.match(sourceHtml, new RegExp(`id="${id}"`), `source is missing ${id}`)
  }

  for (const label of [
    'Independent business workspaces',
    'Sales procurement and cash flow',
    'Finance and tax visibility',
    'Logistics and waybills',
    'Projects field service and teamwork',
    'Sign in to BOURXE',
    'Create your BOURXE account',
  ]) {
    assert.ok(sourceHtml.includes(label), `source must retain ${label}`)
  }

  for (const motion of [
    '@keyframes cityScan',
    '@keyframes tramMove',
    '@keyframes drawBranch',
    '@keyframes leafGrow',
    '@keyframes paperFeed',
    '@keyframes flowWire',
    '@keyframes driveJourney',
    '@keyframes drawCheck',
    '@keyframes chapterWipe',
  ]) {
    assert.ok(sourceHtml.includes(motion), `source must retain ${motion}`)
  }
})

test('external customisation uses the Dashboard-style compact panel and shared viewport stage', () => {
  assert.match(previewSource, /useThemePreferenceContext/)
  assert.match(previewSource, /useExperimentThemeStyle\(family, appearance\)/)
  assert.match(previewSource, /PHOTO_HERO_FAMILY_META\.map/)
  assert.match(previewSource, /className="ob4-dock"/)
  assert.match(previewSource, /className="ob4-pop"/)
  assert.match(
    previewSource,
    /<ViewportSwitcher viewportId=\{viewportId\} onSelect=\{setViewportId\} \/>/,
  )

  const stageOpen = previewSource.indexOf('<ViewportStage viewport={viewport}')
  const stageClose = previewSource.indexOf('</ViewportStage>')
  const dock = previewSource.indexOf('className="ob4-dock"')
  const pop = previewSource.indexOf('className="ob4-pop"')
  assert.ok(stageOpen !== -1 && stageClose !== -1)
  assert.ok(dock > stageClose, 'the dock must sit outside the simulated frame')
  assert.ok(pop > stageClose, 'the popover must sit outside the simulated frame')

  assert.equal(DESIGN_LAB_DEFAULT_VIEWPORT_ID, 'actual')
  for (const preset of DESIGN_LAB_VIEWPORTS) {
    const resolved = getDesignLabViewport(preset.id)
    assert.equal(resolved.id, preset.id)
    assert.ok(resolved.width === null || typeof resolved.width === 'number')
  }
})

test('V4 never passes a bare viewport id or reads undefined viewport width', () => {
  const stages = previewSource.match(/<ViewportStage\b[^>]*>/g) || []
  assert.equal(stages.length, 1)
  assert.match(stages[0], /viewport=\{viewport\}/)
  assert.ok(!/viewportId=/.test(stages[0]))
  assert.match(
    previewSource,
    /const \{ viewportId, viewport, setViewportId \} = useDesignLabViewport\(\)/,
  )
  assert.ok(!previewSource.includes('viewport.width'), 'V4 must not read viewport.width directly')
})

test('theme injection is controlled by React, not the source internal palette', () => {
  assert.match(previewSource, /FAMILY_TO_SOURCE_THEME/)
  assert.match(previewSource, /buildSourceDocument\(sourceTheme, appearance\)/)
  assert.match(previewSource, /applyTheme\('\$\{theme\}'\);applyMode\('\$\{appearance\}'\);/)
  assert.match(previewSource, /\.theme-trigger,[\s\S]*?#themePanel \{[\s\S]*?display: none !important/)
  assert.match(previewSource, /replace\(\u002f—\u002fg, '-'\)/)
})

test('auth screens stay separate, preview-only, and both include Google', () => {
  assert.match(sourceHtml, /<section class="screen auth" id="signin"/)
  assert.match(sourceHtml, /<section class="screen auth signup" id="signup"/)
  assert.equal((sourceHtml.match(/Continue with Google/g) || []).length, 2)
  assert.match(sourceHtml, /document\.getElementById\('signinForm'\)\.addEventListener\('submit',e=>\{e\.preventDefault\(\)/)
  assert.match(sourceHtml, /document\.getElementById\('signupForm'\)\.addEventListener\('submit',e=>\{e\.preventDefault\(\)/)
  assert.match(sourceHtml, /No external connection is enabled\./)
  assert.match(sourceHtml, /No account will be created and no credentials are sent\./)
  assert.match(previewSource, /sandbox="allow-scripts allow-forms"/)
  assert.ok(!previewSource.includes('allow-top-navigation'))
})

test('source reduced motion and responsive contracts remain present', () => {
  assert.match(sourceHtml, /@media\(prefers-reduced-motion:reduce\)/)
  assert.match(sourceHtml, /env\(safe-area-inset-top,0px\)/)
  assert.match(sourceHtml, /env\(safe-area-inset-bottom,0px\)/)
  assert.match(sourceHtml, /@media\(max-width:850px\)/)
  assert.match(sourceHtml, /@media\(max-height:680px\) and \(max-width:850px\)/)
  assert.match(sourceHtml, /@media\(max-height:560px\) and \(orientation:landscape\)/)
  assert.match(previewSource, /@media \(prefers-reduced-motion:reduce\)/)
})
