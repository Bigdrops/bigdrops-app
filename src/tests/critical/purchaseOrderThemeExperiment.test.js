import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { DESIGN_LAB_PREVIEWS } from '../../lib/designLabPreviews.ts'
import {
  PHOTO_HERO_FAMILIES,
  getPhotoHeroVars,
} from '../../components/onboarding/photo-hero-v2-theme.ts'
import {
  DATASET_1_PO,
  DATASET_2_PO,
  PREVIEW_COMPANY,
  PREVIEW_SUPPLIER_SCHNEIDER,
  PREVIEW_SUPPLIER_TOTAL,
} from '../../components/purchase-order-theme/preview-po-data.ts'

const previewSource = readFileSync(
  resolve('src/components/purchase-order-theme/purchase-order-theme-preview.tsx'),
  'utf8',
)
const previewData = readFileSync(
  resolve('src/components/purchase-order-theme/preview-po-data.ts'),
  'utf8',
)
const pageSource = readFileSync(resolve('src/pages/PoThemeExperiment.tsx'), 'utf8')
const appShellSource = readFileSync(resolve('src/components/app/AppShell.tsx'), 'utf8')
const registrySource = readFileSync(resolve('src/lib/designLabPreviews.ts'), 'utf8')
const cssSource = readFileSync(
  resolve('src/components/purchase-order-theme/po-theme.css'),
  'utf8',
)

test('PO View experiment is registered in Design Lab previews catalog', () => {
  const entry = DESIGN_LAB_PREVIEWS.find((p) => p.id === 'po-view')
  assert.ok(entry, 'po-view must be registered in DESIGN_LAB_PREVIEWS')
  assert.equal(entry.name, 'Purchase Order View Redesign')
  assert.equal(entry.route, '/design-lab/po-view')
  assert.equal(entry.eyebrow, 'Purchase Order')
  assert.ok(entry.capabilities.includes('6 viewports'), 'must advertise 6 viewports')
  assert.ok(entry.capabilities.includes('5 themes'), 'must advertise 5 themes')
  assert.ok(entry.capabilities.includes('Lifecycle simulation'), 'must advertise lifecycle simulation')
})

test('PO View experiment route is bound in AppShell', () => {
  assert.match(appShellSource, /PoThemeExperiment/)
  assert.match(appShellSource, /<Route path="\/design-lab\/po-view" element=\{withBoundary\(<PoThemeExperiment \/>\)\} \/>/)
})

test('PO View experiment is isolated from live database and tenant side effects', () => {
  for (const banned of [
    'supabase.from',
    'tenantClient.from',
    'useEntity',
    'useAuthorization',
    'getPurchaseOrder',
    'transitionPurchaseOrderStatus',
    'archivePurchaseOrder',
    'restorePurchaseOrder',
  ]) {
    assert.ok(
      !previewSource.includes(banned),
      `preview component must not invoke production data mutation: ${banned}`,
    )
  }
})

test('PO View preserves PO-specific business semantics and data contracts', () => {
  // Outgoing procurement commitment semantics
  assert.match(previewSource, /Issuer · Outgoing Procurement/)
  assert.match(previewSource, /Frozen Snapshot/)
  assert.match(previewSource, /unit_cost/)
  assert.match(previewSource, /line_total/)
  assert.match(previewSource, /po_number/)
  assert.match(previewSource, /po_date/)

  // No client assumptions in PO context
  assert.ok(!previewData.includes('client_id'), 'PO data must not reference client_id')
  assert.ok(!previewData.includes('unit_price'), 'PO data must use unit_cost instead of unit_price')

  // Verified calculations on representative datasets
  assert.equal(DATASET_1_PO.subtotal, 6388000)
  assert.equal(DATASET_1_PO.discount, 319400)
  assert.equal(DATASET_1_PO.vat, 466395)
  assert.equal(DATASET_1_PO.total, 6684995)

  assert.equal(DATASET_2_PO.subtotal, 4580000)
  assert.equal(DATASET_2_PO.discount, 100000)
  assert.equal(DATASET_2_PO.total, 4901000)
})

test('PO View includes full Onboarding V5 theme engine controls', () => {
  assert.match(previewSource, /useExperimentThemeStyle/)
  assert.match(previewSource, /PHOTO_HERO_FAMILY_META/)
  assert.match(previewSource, /ViewportSwitcher/)
  assert.match(previewSource, /ViewportStage/)

  // 5 theme families
  for (const fam of PHOTO_HERO_FAMILIES) {
    assert.ok(cssSource.includes('--hero-accent') || cssSource.includes('--lab-glass'))
  }

  // Appearance toggle
  assert.match(previewSource, /appearance === 'light'/)
  assert.match(previewSource, /appearance === 'dark'/)
})

test('PO View provides responsive implementations for all 6 required viewports', () => {
  // Mobile portrait (430px)
  assert.match(previewSource, /po-mobile-items/)
  assert.match(previewSource, /po-mobile-item-card/)

  // Wide viewports (Table layout for desktop, tablet, fold-open, mobile-landscape)
  assert.match(previewSource, /po-table/)
  assert.match(previewSource, /po-table-wrap/)

  // Mobile orientation simulator exists and handles landscape
  assert.match(previewSource, /orientation === 'landscape'/)
  assert.match(previewSource, /width: 844/)

  // Container query breakpoints in CSS
  assert.match(cssSource, /@container dlv \(max-width: 680px\)/)
  assert.match(cssSource, /@container dlv \(max-width: 640px\)/)
  assert.match(cssSource, /@container dlv \(max-width: 720px\)/)
})

test('Component provenance from Water-melon, Kinetics, BigDrops Free, CPS and Invoice', () => {
  // Water-melon primitives: Table, Badge, Item list cards
  assert.match(previewSource, /po-table/)
  assert.match(previewSource, /po-status-badge/)
  assert.match(previewSource, /po-mobile-items/)

  // Kinetics primitives: spring curves, parameter telemetry readouts, tactile copy
  assert.match(cssSource, /cubic-bezier\(0\.34, 1\.56, 0\.64, 1\)/)
  assert.match(cssSource, /transform 0\.15s ease-out/)
  assert.match(previewSource, /po-telemetry-strip/)
  assert.match(previewSource, /po-telemetry-chip/)
  assert.match(previewSource, /handleCopy/)

  // BigDrops Free: device stage, separator lines
  assert.match(previewSource, /ViewportStage/)
  assert.match(cssSource, /border-bottom: 1px solid var\(--line/)

  // CPS & Invoice: Dossier/masthead, Closeout summary, Status lifecycle transitions
  assert.match(previewSource, /po-masthead/)
  assert.match(previewSource, /po-summary-grid/)
  assert.match(previewSource, /po-totals-card/)
  assert.match(previewSource, /ConfirmActionDialog/)
})
