import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { DESIGN_LAB_PREVIEWS } from '../../lib/designLabPreviews.ts'
import {
  DESIGN_LAB_DEFAULT_VIEWPORT_ID,
  DESIGN_LAB_VIEWPORTS,
  getDesignLabViewport,
} from '../../lib/designLabViewports.ts'

const read = (path) => readFileSync(resolve(path), 'utf8')

const V5_ID = 'onboarding-v5-cinematic'
const V5_ROUTE = '/design-lab/onboarding-v5'

const previewSource = read('src/components/onboarding-v5/onboarding-v5-preview.tsx')
const sceneSource = read('src/components/onboarding-v5/onboarding-v5-scenes.tsx')
const sceneStyles = read('src/components/onboarding-v5/onboarding-v5-scenes.css')
const pageSource = read('src/pages/OnboardingV5Preview.tsx')
const appShellSource = read('src/components/app/AppShell.tsx')
const registrySource = read('src/lib/designLabPreviews.ts')

test('V5 is registered as a separate Design Lab experiment and route', () => {
  const entry = DESIGN_LAB_PREVIEWS.find((preview) => preview.id === V5_ID)
  assert.ok(entry, 'the registry must contain the V5 cinematic experiment')
  assert.equal(entry.route, V5_ROUTE)
  assert.equal(entry.eyebrow, 'Onboarding')
  assert.match(entry.name, /V5/)
  assert.match(entry.description, /Cinematic/)
  assert.ok(appShellSource.includes(`<Route path="${V5_ROUTE}"`), `AppShell must register ${V5_ROUTE}`)
  assert.match(appShellSource, /const OnboardingV5Preview = lazy/)
  assert.match(pageSource, /from '@\/components\/onboarding-v5\/onboarding-v5-preview'/)
  assert.match(pageSource, /<OnboardingV5Preview \/>/)
})

test('V5 is independent from V4 and does not embed source HTML', () => {
  assert.ok(registrySource.includes('onboarding-v4-source'), 'V4 registry entry must remain')
  assert.ok(appShellSource.includes('<Route path="/design-lab/onboarding-v4"'), 'V4 route must remain')
  assert.ok(appShellSource.includes('<Route path="/photohero-preview"'), 'PhotoHero V1 route must remain')
  for (const banned of [
    'BOURXE_Ultimate_Onboarding.html?raw',
    '<iframe',
    'srcDoc',
    "from '@/supabase'",
    'signInWithOAuth',
    'supabase.auth',
    'window.location',
  ]) {
    assert.ok(!previewSource.includes(banned), `V5 must not contain ${banned}`)
  }
})

test('all eight references are recorded as inspected inputs', () => {
  for (const file of [
    'BOURXE_Ultimate_Onboarding.html',
    'claude-v2.html',
    'deepseek.html',
    'cta-index.tsx',
    'error1.tsx',
    'hero-index38.tsx',
    'auth1.tsx',
    'cta-demo.tsx',
  ]) {
    assert.ok(previewSource.includes(file), `V5 must record ${file}`)
  }
})

test('story flow starts deliberately and reaches signup only at conversion', () => {
  assert.match(previewSource, /type ScreenId = 'arrival' \| 'chapter' \| 'conversion' \| 'signin' \| 'signup'/)
  assert.match(previewSource, /Explore BOURXE/)
  assert.match(previewSource, /const beginStory = \(\) => \{/)
  assert.match(previewSource, /setChapterIndex\(0\)[\s\S]*?setScreen\('chapter'\)/)
  assert.match(previewSource, /const skipStory = \(\) => \{[\s\S]*?setScreen\('conversion'\)/)
  assert.match(previewSource, /onSignup=\{\(\) => setScreen\('signup'\)\}/)
  assert.ok(
    previewSource.indexOf('Explore BOURXE') < previewSource.indexOf('Get Started'),
    'Get Started must belong to the later conversion screen',
  )
})

test('each chapter has a distinct environment and an operational transition', () => {
  for (const id of ['workspaces', 'commercial', 'finance', 'logistics', 'field']) {
    assert.match(previewSource, new RegExp(`id: '${id}'`), `chapter ${id} must exist`)
  }
  for (const component of [
    'function WorkspacesLayer',
    'function CommercialLayer',
    'function FinanceLayer',
    'function LogisticsLayer',
    'function FieldLayer',
    'function ConversionLayer',
    'function BusinessWorld',
  ]) {
    assert.ok(sceneSource.includes(component), `${component} must be implemented`)
  }
  for (const motion of [
    '@keyframes ob5-tenant-reveal',
    '@keyframes ob5-document-enter',
    '@keyframes ob5-tax-route',
    '@keyframes ob5-truck-arrive',
    '@keyframes ob5-inspect',
    '@keyframes ob5-brand-resolve',
  ]) {
    assert.ok(sceneStyles.includes(motion), `${motion} must be present`)
  }
  assert.match(previewSource, /<BusinessWorld stage=\{chapter\.id\} \/>/)
  assert.match(sceneSource, /key=\{stage\}/)
})

test('workspaces show three independent illustrative businesses', () => {
  for (const business of ['Activa Electrical', 'Northline Fleet', 'Marketline Supply']) {
    assert.ok(sceneSource.includes(business), `${business} must be visible`)
  }
  for (const record of ['Service orders', 'Dispatch records', 'Sales and stock']) {
    assert.ok(sceneSource.includes(record), `${record} must remain tenant specific`)
  }
  assert.match(sceneSource, /Separate workspace/)
  assert.match(sceneSource, /Records stay with their business/)
  assert.match(sceneStyles, /\.ob5-tenant\{[^}]*border-right:3px solid/)
})

test('finance includes a tax workflow without statutory claims', () => {
  for (const concept of ['Tax command centre', 'Taxable transaction', 'VAT amount reviewed', 'WHT amount reviewed', 'RECONCILIATION', 'Filing period', 'Tax documents', 'OBLIGATIONS']) {
    assert.ok(sceneSource.includes(concept), `${concept} must be visible`)
  }
  assert.match(sceneSource, /No rates or filing dates shown/)
  assert.doesNotMatch(sceneSource, /automatically files|filed with FIRS|\b\d+(?:\.\d+)?%\b/i)
})

test('navigation supports back, next, chapter revisit and explicit skip', () => {
  assert.match(previewSource, /const goPrevious = \(\) => \{/)
  assert.match(previewSource, /const goNext = \(\) => \{/)
  assert.match(previewSource, /const selectChapter = \(index: number\) => \{/)
  assert.match(previewSource, /role="tablist" aria-label="Story chapters"/)
  assert.match(previewSource, /Previous/)
  assert.match(previewSource, /Next chapter/)
  assert.match(previewSource, /Skip story/)
  assert.match(previewSource, /Finish story/)
})

test('separate auth screens include Google and remain preview safe', () => {
  assert.match(previewSource, /id=\{isSignup \? 'ob5-signup' : 'ob5-signin'\}/)
  assert.match(previewSource, /mode=\{screen\}/)
  assert.equal((previewSource.match(/Continue with Google/g) || []).length, 1)
  assert.match(previewSource, /screen === 'signin' \|\| screen === 'signup'/)
  assert.match(previewSource, /data-auth-isolation="local-only"/)
  assert.match(previewSource, /No request was sent\. Your details stay on this screen\./)
  assert.match(previewSource, /Google connection is not started from this screen\./)
  assert.match(previewSource, /Password recovery is not started from this screen\./)
})

test('auth uses approved password components and readable field contracts', () => {
  assert.match(previewSource, /PasswordStrength/)
  assert.match(previewSource, /PasswordField/)
  assert.match(previewSource, /Confirm password/)
  assert.match(previewSource, /Forgot password\?/)
  assert.match(previewSource, /Terms and Privacy Policy/)
  assert.match(previewSource, /border:1px solid var\(--ob5-line\)/)
  assert.match(previewSource, /input:focus/)
})

test('Design Lab theme and viewport systems are integrated safely', () => {
  assert.match(previewSource, /useThemePreferenceContext/)
  assert.match(previewSource, /useExperimentThemeStyle\(family, appearance\)/)
  assert.match(previewSource, /PHOTO_HERO_FAMILY_META\.map/)
  assert.match(previewSource, /<ViewportStage viewport=\{viewport\} className="ob5-stage">/)
  assert.match(previewSource, /<ViewportSwitcher viewportId=\{viewportId\} onSelect=\{setViewportId\} \/>/)
  assert.match(previewSource, /@container dlv \(max-width: 900px\)/)
  assert.equal(DESIGN_LAB_DEFAULT_VIEWPORT_ID, 'actual')
  for (const preset of DESIGN_LAB_VIEWPORTS) {
    assert.equal(getDesignLabViewport(preset.id).id, preset.id)
  }
  assert.ok(!previewSource.includes('viewport.width'), 'V5 must not read viewport.width directly')
})

test('reduced motion, safe areas and copy constraints are present', () => {
  assert.match(previewSource, /@media \(prefers-reduced-motion:reduce\)/)
  assert.match(sceneStyles, /@media\(prefers-reduced-motion:reduce\)/)
  assert.match(sceneStyles, /@container dlv \(max-width:520px\)/)
  assert.match(previewSource, /env\(safe-area-inset-top,0px\)/)
  assert.match(previewSource, /env\(safe-area-inset-bottom,0px\)/)
  assert.ok(!previewSource.includes('—'), 'V5 source must avoid em dash characters')
  assert.ok(!sceneSource.includes('—'), 'scene copy must avoid em dash characters')
  for (const banned of ['beaming dots', 'orbiting particles', 'decorative node', 'generic card']) {
    assert.ok(!previewSource.includes(banned), `V5 copy must not contain ${banned}`)
  }
})
