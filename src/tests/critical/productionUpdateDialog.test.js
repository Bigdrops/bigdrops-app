import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  computePercentage,
  describeCountdown,
  formatTransferSpeed,
  primaryActionLabel,
  releaseNotesSummary,
  sampleTransferSpeed,
  SPEED_SAMPLE_MIN_MS,
} from '../../components/app/update/updateDialogModel.ts'
import { parseReleaseNotes } from '../../domain/appUpdate/changelog.ts'

const cardSource = readFileSync(
  resolve('src/components/app/update/UpdateDialogCard.tsx'),
  'utf8',
)
const modelSource = readFileSync(
  resolve('src/components/app/update/updateDialogModel.ts'),
  'utf8',
)
const cssSource = readFileSync(
  resolve('src/components/app/update/update-dialog-card.css'),
  'utf8',
)
const modalSource = readFileSync(resolve('src/components/app/UpdateModal.tsx'), 'utf8')
const gateSource = readFileSync(resolve('src/components/app/UpdateGate.tsx'), 'utf8')

test('production copy spells BOUXRE and never the legacy brand', () => {
  for (const source of [cardSource, modalSource, gateSource]) {
    assert.ok(!source.includes('BOURXE'), 'production UI must not use the BOURXE misspelling')
    assert.ok(!source.includes('BigDrops'), 'production UI must not use the legacy brand')
  }
  assert.match(cardSource, /alt="BOUXRE"/)
  assert.match(cardSource, /BOUXRE release \{versionLabel\}/)
  assert.match(cardSource, /Ready to install BOUXRE \{versionLabel\}/)
  assert.match(cardSource, /Update required to keep using BOUXRE/)
})

test('authentic brand asset is rendered in a framed, object-contain tile', () => {
  assert.match(cardSource, /src="\/favicon\.svg"/)
  assert.match(cardSource, /className="udl-badge-img"/)
  assert.match(cssSource, /\.udl-badge\{[\s\S]*?width:clamp\(48px,6vw,56px\)/)
  assert.match(cssSource, /\.udl-badge-img\{[\s\S]*?object-fit:contain/)
})

test('two-layer liquid wave keeps the composited keyframes and height cap', () => {
  assert.match(cardSource, /udl-wave-body-layer/)
  assert.match(cardSource, /udl-wave-crest-layer/)
  assert.match(cssSource, /animation:udl-slosh-body 4\.4s/)
  assert.match(cssSource, /animation:udl-slosh-crest 3\.4s/)
  assert.match(cssSource, /@keyframes udl-slosh-body\{[\s\S]*?transform:translateX/)
  assert.match(cssSource, /@keyframes udl-slosh-crest\{[\s\S]*?transform:translateX/)
  assert.match(cssSource, /\.udl-wave\{[\s\S]*?max-height:132px/)
  assert.match(cssSource, /\.udl-card > \.udl-head\{position:relative;z-index:2\}/)
  assert.match(cssSource, /\.udl-close\{[\s\S]*?width:44px;height:44px/)
  const reduced = cssSource.match(/@media \(prefers-reduced-motion:reduce\)\{[\s\S]*?\n\}/)
  assert.ok(reduced, 'reduced-motion block must exist')
  assert.match(reduced[0], /animation:none/)
})

test('countdown uses the real deadline and ticks in seconds', () => {
  const now = 1_000_000
  const running = describeCountdown(now + 61_000, now)
  assert.equal(running.expired, false)
  assert.equal(running.label, '0d 0h 1m 1s')
  const later = describeCountdown(now + 61_000, now + 1000)
  assert.equal(later.seconds, 0)
  const expired = describeCountdown(now - 1, now)
  assert.equal(expired.expired, true)
  assert.equal(expired.label, 'Grace period ended')
  assert.match(cardSource, /setInterval\(\(\) => setNowMs\(Date\.now\(\)\), 1000\)/)
  assert.match(cardSource, /describeCountdown\(deadlineMs, nowMs\)/)
})

test('speed needs two valid samples at least 300ms apart', () => {
  assert.equal(SPEED_SAMPLE_MIN_MS, 300)
  assert.equal(sampleTransferSpeed(null, { bytes: 1024, atMs: 1000 }), null)
  assert.equal(
    sampleTransferSpeed({ bytes: 0, atMs: 0 }, { bytes: 1024, atMs: 299 }),
    null,
    'a sample inside the minimum window yields no speed',
  )
  assert.equal(
    sampleTransferSpeed({ bytes: 1024, atMs: 1000 }, { bytes: 1024, atMs: 2000 }),
    null,
    'a non-advancing sample yields no speed',
  )
  assert.equal(
    sampleTransferSpeed({ bytes: 0, atMs: 0 }, { bytes: 1024 * 1024, atMs: 1000 }),
    1024 * 1024,
  )
  assert.equal(formatTransferSpeed(null), 'Calculating…')
  assert.equal(formatTransferSpeed(1.2 * 1024 * 1024), '≈ 1.2 MB/s')
})

test('percentage hides when the total is unknown and clamps when known', () => {
  assert.equal(computePercentage(1024, null), null)
  assert.equal(computePercentage(1024, 0), null)
  assert.equal(computePercentage(50, 100), 50)
  assert.equal(computePercentage(200, 100), 100)
  assert.match(cardSource, /\{percentage !== null \? \(/)
})

test('primary action labels follow the real download phase', () => {
  assert.equal(primaryActionLabel({ kind: 'idle' }, 'v1.0.29'), 'Download & install v1.0.29')
  assert.equal(primaryActionLabel({ kind: 'failed', message: 'x' }, 'v1.0.29'), 'Download & install v1.0.29')
  assert.equal(
    primaryActionLabel({ kind: 'downloading', downloadedBytes: 0, totalBytes: null }, 'v1.0.29'),
    'Cancel download',
  )
  assert.equal(
    primaryActionLabel({ kind: 'downloaded', fileName: 'a.apk', uri: 'file://a' }, 'v1.0.29'),
    'Open & Install Update',
  )
  assert.equal(primaryActionLabel({ kind: 'installing' }, 'v1.0.29'), 'Installing…')
})

test('release notes collapse to the first real entry with an honest empty state', () => {
  assert.equal(releaseNotesSummary([]), 'No release notes published for this build.')
  const { entries } = parseReleaseNotes('- Faster invoices\n- New waybill layout')
  assert.equal(releaseNotesSummary(entries), 'Faster invoices')
  assert.match(cardSource, /variant="compact"/)
  assert.match(cardSource, /aria-expanded=\{notesOpen\}/)
})

test('no fabricated size or speed constants leak into production UI', () => {
  for (const source of [cardSource, modelSource]) {
    assert.ok(!source.includes('30.2'), 'no sample 30.2 MB size in production')
    assert.ok(!source.includes('PREVIEW_RELEASE'), 'no Design Lab preview data in production')
  }
  assert.match(cardSource, /formatMegabytes\(assetSizeBytes\)/)
  assert.match(cardSource, /formatTransferSpeed\(speed\)/)
})

test('web action is conditional and dismissal never cancels the download', () => {
  assert.match(cardSource, /policy\?\.webReleaseUrl \?\? release\?\.webUrl \?\? null/)
  assert.match(cardSource, /\{webUrl \? \(/)
  assert.match(cardSource, /onClick=\{onDismiss\}/)
  // The dismiss handler is passed in by the host; the card never couples it
  // to the native cancel action.
  assert.match(modalSource, /onDismiss=\{\(\) => onOpenChange\(false\)\}/)
  assert.ok(!modalSource.includes('cancelInAppDownload'))
  assert.match(gateSource, /variant="gate"/)
  assert.ok(!gateSource.includes('onDismiss'))
})

test('production surfaces are responsive across all four viewport classes', () => {
  // Tiers key off the viewport: the dialog is deliberately narrow, so a
  // container query against it would never reach the wider tiers.
  assert.match(cssSource, /@media \(min-width:600px\)/)
  assert.match(cssSource, /@media \(min-width:768px\)/)
  assert.match(cssSource, /@media \(min-width:1024px\)/)
  assert.match(cssSource, /\.udl-gate-page\{[\s\S]*?overflow-x:hidden/)
  assert.match(cssSource, /\.udl-btn\{[\s\S]*?min-height:50px/)
  assert.ok(!cssSource.includes('100vw'), 'no forced viewport-width overflow')
})
