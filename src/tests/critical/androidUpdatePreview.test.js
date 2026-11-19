import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  PREVIEW_PHASES,
  PREVIEW_RELEASE,
  PREVIEW_RELEASE_NOTES,
  PREVIEW_RELEASE_SUMMARY,
  canDismiss,
  computePercentage,
  computeTransferBytesPerSecond,
  describeCountdown,
  formatTransferProgress,
  formatTransferSpeed,
  primaryActionLabel,
} from '../../components/design-lab/android-update/preview-domain.ts'
import { parseReleaseNotes } from '../../domain/appUpdate/changelog.ts'
import { DESIGN_LAB_PREVIEWS } from '../../lib/designLabPreviews.ts'

const previewSource = readFileSync(
  resolve('src/components/design-lab/android-update/android-update-preview.tsx'),
  'utf8',
)
const domainSource = readFileSync(
  resolve('src/components/design-lab/android-update/preview-domain.ts'),
  'utf8',
)
const cssSource = readFileSync(
  resolve('src/components/design-lab/android-update/android-update-preview.css'),
  'utf8',
)
const appShellSource = readFileSync(resolve('src/components/app/AppShell.tsx'), 'utf8')

/** Import specifiers only, so doc comments cannot satisfy or trip a check. */
function importSpecifiers(source) {
  return [...source.matchAll(/^\s*import\s[\s\S]*?from\s+['"]([^'"]+)['"]/gm)].map((m) => m[1])
}

const ROUTE = '/design-lab/android-update'

test('prototype is registered in Design Lab and routed in the app shell', () => {
  const entry = DESIGN_LAB_PREVIEWS.find((preview) => preview.id === 'android-update')
  assert.ok(entry, 'registry must list the Android update prototype')
  assert.equal(entry.name, 'Android Update Experience')
  assert.equal(entry.eyebrow, 'Android')
  assert.equal(entry.route, ROUTE)
  assert.ok(entry.description.length > 0)
  assert.ok(entry.capabilities.length > 0)
  assert.ok(
    appShellSource.includes(`<Route path="${ROUTE}"`),
    'AppShell must register the prototype route',
  )
})

test('every registry route stays registered after the addition', () => {
  for (const preview of DESIGN_LAB_PREVIEWS) {
    assert.ok(
      appShellSource.includes(`<Route path="${preview.route}"`),
      `AppShell must register ${preview.route}`,
    )
  }
})

test('countdown ticks in seconds and reports expiry honestly', () => {
  const now = 1_000_000
  const running = describeCountdown(now + ((2 * 24 + 23) * 60 + 59) * 60_000 + 47_000, now)
  assert.equal(running.expired, false)
  assert.equal(running.days, 2)
  assert.equal(running.hours, 23)
  assert.equal(running.minutes, 59)
  assert.equal(running.seconds, 47)
  assert.equal(running.label, '2d 23h 59m 47s')

  const expired = describeCountdown(now - 1, now)
  assert.equal(expired.expired, true)
  assert.equal(expired.label, 'Expired')
})

test('countdown seconds advance while minutes stay floored', () => {
  const now = 5_000_000
  const deadline = now + 61_000
  const first = describeCountdown(deadline, now)
  const later = describeCountdown(deadline, now + 1_000)
  assert.equal(first.minutes, 1)
  assert.equal(first.seconds, 1)
  assert.equal(later.minutes, 1)
  assert.equal(later.seconds, 0)
})

test('transfer speed needs a valid sample pair and never invents a number', () => {
  assert.equal(computeTransferBytesPerSecond(null, { bytes: 1024, atMs: 1000 }), null)
  assert.equal(
    computeTransferBytesPerSecond({ bytes: 1024, atMs: 1000 }, { bytes: 1024, atMs: 2000 }),
    null,
    'a non-advancing sample yields no speed',
  )
  assert.equal(
    computeTransferBytesPerSecond({ bytes: 2048, atMs: 2000 }, { bytes: 1024, atMs: 1000 }),
    null,
    'a backwards sample yields no speed',
  )
  const speed = computeTransferBytesPerSecond(
    { bytes: 0, atMs: 0 },
    { bytes: 1_048_576, atMs: 1000 },
  )
  assert.equal(speed, 1_048_576)
})

test('speed and progress readouts format from sampled bytes', () => {
  assert.equal(formatTransferSpeed(null), 'Calculating…')
  assert.equal(formatTransferSpeed(0), 'Calculating…')
  assert.equal(formatTransferSpeed(1.2 * 1024 * 1024), '≈ 1.2 MB/s')
  assert.equal(formatTransferSpeed(512 * 1024), '≈ 512 KB/s')
  assert.equal(formatTransferProgress(11.6 * 1024 * 1024, 30.2 * 1024 * 1024), '11.6 MB of 30.2 MB')
})

test('percentage is clamped and safe on zero totals', () => {
  assert.equal(computePercentage(0, 100), 0)
  assert.equal(computePercentage(50, 100), 50)
  assert.equal(computePercentage(200, 100), 100)
  assert.equal(computePercentage(-5, 100), 0)
  assert.equal(computePercentage(10, 0), 0)
})

test('dismissal is unavailable once the grace period ends', () => {
  const now = 9_000_000
  assert.equal(canDismiss(now + 1, now), true)
  assert.equal(canDismiss(now, now), false)
  assert.equal(canDismiss(now - 1, now), false)
})

test('primary action label follows the phase', () => {
  assert.equal(primaryActionLabel('idle', 'v1.0.29'), 'Download & install v1.0.29')
  assert.equal(primaryActionLabel('downloading', 'v1.0.29'), 'Cancel download')
  assert.equal(primaryActionLabel('downloaded', 'v1.0.29'), 'Open & Install Update')
  assert.equal(primaryActionLabel('installing', 'v1.0.29'), 'Installing…')
  for (const phase of PREVIEW_PHASES) {
    assert.ok(primaryActionLabel(phase.id, 'v1.0.29').length > 0)
  }
})

test('sample release notes parse into real production entries', () => {
  const { entries } = parseReleaseNotes(PREVIEW_RELEASE_NOTES)
  assert.ok(entries.length >= 4, 'sample notes must produce several entries')
  for (const entry of entries) {
    assert.ok(entry.title.length > 0, 'every entry needs a title')
  }
  assert.ok(PREVIEW_RELEASE_SUMMARY.length > 0)
  assert.equal(PREVIEW_RELEASE.versionLabel, 'v1.0.29')
})

test('prototype cannot reach production update, download or acknowledgement code', () => {
  const specifiers = importSpecifiers(previewSource)
  const bannedModules = [
    'useAppUpdate',
    'apkUpdate',
    'releaseAcknowledgement',
    'releaseNotificationStorage',
    'supabase',
  ]
  for (const banned of bannedModules) {
    assert.ok(
      !specifiers.some((specifier) => specifier.includes(banned)),
      `prototype must not import ${banned}`,
    )
  }

  // No side-effecting calls either: the preview must stay inert.
  for (const banned of [
    'startInAppDownload',
    'installDownloadedApk',
    'acknowledgeCurrent',
    'dismissCurrent',
    'localStorage',
    'sessionStorage',
    'fetch(',
  ]) {
    assert.ok(!previewSource.includes(banned), `prototype must not reference ${banned}`)
  }
})

test('prototype reuses the production changelog presentation read-only', () => {
  assert.match(previewSource, /from '@\/components\/app\/update\/ChangelogTimeline'/)
  assert.match(previewSource, /variant="compact"/)
  assert.match(previewSource, /parseReleaseNotes/)
})

test('every required interactive state is reachable from the console', () => {
  for (const label of ['Available', 'Downloading', 'Complete', 'Installing']) {
    assert.ok(domainSource.includes(`label: '${label}'`), `phase control ${label} missing`)
  }
  for (const label of ['Running', 'Expiring', 'Expired']) {
    assert.ok(previewSource.includes(`label: '${label}'`), `countdown control ${label} missing`)
  }
  assert.match(previewSource, /Notes open/)
  assert.match(previewSource, /Notes closed/)
  assert.match(previewSource, /aria-expanded=\{notesOpen\}/)
  // The console must actually render the phase and countdown controls.
  assert.match(previewSource, /PREVIEW_PHASES\.map/)
  assert.match(previewSource, /COUNTDOWN_MODES\.map/)
})

test('brand spelling is BOUXRE in all user-facing preview copy', () => {
  assert.ok(!previewSource.includes('BOURXE'), 'prototype must not use the BOURXE misspelling')
  assert.match(previewSource, /BOUXRE release/)
  assert.ok(!previewSource.includes('BIGDROPS'))
})

test('layout responds to the simulated viewport, not the host window', () => {
  assert.match(previewSource, /ViewportStage/)
  assert.match(previewSource, /useDesignLabViewport/)
  assert.match(cssSource, /container:aup \/ inline-size/)
  assert.match(cssSource, /@container aup \(min-width:600px\)/)
  assert.match(cssSource, /@container aup \(min-width:768px\)/)
  assert.match(cssSource, /@container aup \(min-width:1024px\)/)
})

test('corner wave is two layered liquid paths animated by composited transforms', () => {
  assert.match(previewSource, /aup-wave-body-layer/)
  assert.match(previewSource, /aup-wave-crest-layer/)
  // Both layers animate with GPU-composited transform, not layout properties.
  assert.match(cssSource, /@keyframes aup-slosh-body\{[\s\S]*?transform:translateX/)
  assert.match(cssSource, /@keyframes aup-slosh-crest\{[\s\S]*?transform:translateX/)
  assert.match(cssSource, /animation:aup-slosh-body/)
  assert.match(cssSource, /animation:aup-slosh-crest/)
  // The height cap must survive the animation work.
  assert.match(cssSource, /\.aup-wave\{[\s\S]*?max-height:132px/)
})

test('liquid animation pauses under reduced motion', () => {
  const block = cssSource.match(/@media \(prefers-reduced-motion:reduce\)\{[\s\S]*?\n\}/)
  assert.ok(block, 'reduced-motion block must exist')
  assert.match(block[0], /aup-wave-body-layer/)
  assert.match(block[0], /aup-wave-crest-layer/)
  assert.match(block[0], /animation:none/)
})

test('dismiss control stays above the animated wave', () => {
  assert.match(cssSource, /\.aup-card > \.aup-head\{[\s\S]*?z-index:2\}/)
  assert.match(cssSource, /\.aup-close\{[\s\S]*?width:44px;height:44px/)
})

test('shared Design Lab theme family and appearance switcher is wired', () => {
  // Reuses the exact shared hooks/metadata as sibling experiments, no duplicate control.
  assert.match(previewSource, /PHOTO_HERO_FAMILY_META/)
  assert.match(previewSource, /useExperimentThemeStyle\(family, appearance\)/)
  assert.match(previewSource, /resolveAppearance\(preference\.themeMode\)/)
  assert.match(previewSource, /role="group" aria-label="Theme family"/)
  assert.match(previewSource, /role="group" aria-label="Appearance"/)
  assert.match(previewSource, /aria-label="Use light appearance"/)
  assert.match(previewSource, /aria-label="Use dark appearance"/)
  // Viewport switching remains available alongside theme switching.
  assert.match(previewSource, /<ViewportSwitcher viewportId=\{viewportId\} onSelect=\{setViewportId\} \/>/)
})
