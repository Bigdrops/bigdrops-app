import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { DESIGN_LAB_PREVIEWS } from '../../lib/designLabPreviews.ts'
import { PHOTO_HERO_FAMILIES, getPhotoHeroVars } from '../../components/onboarding/photo-hero-v2-theme.ts'
import { DESIGN_LAB_SIMULATED_VIEWPORTS } from '../../lib/designLabViewports.ts'
import {
  getDarkVariantBundle,
  getDarkVariantSemanticTokens,
  getThemePreset,
} from '../../lib/themePresets.ts'

const read = (path) => readFileSync(resolve(path), 'utf8')

const previewSource = read('src/components/invoice-theme/invoice-theme-preview.tsx')
const previewDataSource = read('src/components/invoice-theme/preview-invoice-data.ts')
const entityContextSource = read('src/components/invoice-theme/preview-entity-context.tsx')
const tenantClientSource = read('src/components/invoice-theme/preview-tenant-client.ts')
const entityContextModuleSource = read('src/lib/tenant/entityContext.ts')
const pageSource = read('src/pages/InvoiceThemeExperiment.tsx')
const dashboardPreviewSource = read('src/components/dashboard-theme/dashboard-theme-preview.tsx')

const ROUTE = '/design-lab/invoice-theme'
const HSL_TRIPLET = /^\s*\d{1,3}(\.\d+)?\s+\d{1,3}(\.\d+)?%\s+\d{1,3}(\.\d+)?%(\s*\/\s*[\d.]+)?\s*$/

/** Resolve one surface token the way the shared theme layer does. */
function resolveToken(family, appearance, token) {
  const preset = getThemePreset(family)
  const bundle =
    appearance === 'dark' ? getDarkVariantBundle(family) ?? preset?.bundle ?? {} : preset?.bundle ?? {}
  const semantic =
    appearance === 'dark'
      ? getDarkVariantSemanticTokens(family) ?? preset?.semanticTokens ?? {}
      : preset?.semanticTokens ?? {}
  const key = token.startsWith('--') ? token.slice(2) : token
  return bundle[key] ?? semantic[token] ?? null
}

test('registry exposes the invoice experiment and keeps the earlier previews', () => {
  const ids = DESIGN_LAB_PREVIEWS.map((preview) => preview.id)
  // Other previews may be added beside these; this experiment must not remove
  // or rename an existing one, and must not duplicate one.
  for (const id of ['onboarding-v2', 'dashboard-theme', 'invoice-theme']) {
    assert.ok(ids.includes(id), `the registry must keep ${id}`)
  }
  assert.ok(!ids.includes('onboarding-v2-independent'), 'rejected independent V2 must stay deleted')
  assert.ok(!ids.includes('onboarding-v3'), 'rejected V3 must stay deleted')
  assert.equal(new Set(ids).size, ids.length, 'preview ids must stay unique')
  assert.ok(
    ids.indexOf('invoice-theme') > ids.indexOf('dashboard-theme'),
    'the invoice experiment follows the dashboard experiment',
  )

  const entry = DESIGN_LAB_PREVIEWS.find((preview) => preview.id === 'invoice-theme')
  assert.equal(entry.name, 'Invoice Form Theme Experiment')
  assert.equal(entry.route, ROUTE)
  assert.match(entry.description, /invoice form/i)
  assert.ok(entry.capabilities.includes('5 themes'))
  assert.ok(entry.capabilities.includes('5 viewports'))
})

test('the app shell registers the invoice route without touching production routes', () => {
  const appShell = read('src/components/app/AppShell.tsx')
  assert.match(appShell, /lazy\(\(\) => import\('@\/pages\/InvoiceThemeExperiment'\)\)/)
  assert.match(appShell, new RegExp(`<Route path="${ROUTE}"`))
  // Production invoice routes keep their own pages.
  assert.match(appShell, /<Route path="\/invoices\/new" element=\{withBoundary\(<NewInvoice \/>\)\} \/>/)
  assert.match(appShell, /<Route path="\/invoices\/edit\/:id" element=\{withBoundary\(<EditInvoice \/>\)\} \/>/)
})

test('the page mounts the experiment and nothing else', () => {
  assert.match(pageSource, /InvoiceThemePreview/)
  assert.match(pageSource, /from '@\/components\/invoice-theme\/invoice-theme-preview'/)
  assert.ok(!pageSource.includes('SharedDocumentForm'), 'the page must not build the form itself')
})

test('the experiment mounts the real invoice form presentation', () => {
  assert.match(previewSource, /import SharedDocumentForm from '@\/components\/document\/SharedDocumentForm'/)
  assert.match(previewSource, /<SharedDocumentForm/)
  assert.match(previewSource, /mode="create"/)
  // The editing state is the production hook, not a re-implementation.
  assert.match(previewSource, /useInvoiceEditableState\(\{/)
  assert.match(previewSource, /useInvoiceColumns\(\)/)
  assert.match(previewSource, /computeDocument\(\{/)
  assert.match(previewSource, /numberToWords\(documentTotals\.totalPayable\)/)
  // The preview must not rebuild the form from scratch.
  for (const banned of ['FormLineItems', 'FormHeader', 'FormCommercialTerms', 'FormTotals', 'FormNotesTerms']) {
    assert.ok(!previewSource.includes(banned), `the preview must not re-mount ${banned} directly`)
  }
})

test('the mounted form carries every document section', () => {
  const props = [
    'invoice=',
    'updateInvoice=',
    'items=',
    'groups=',
    'customFields=',
    'additionalFields=',
    'extraCharges=',
    'chargeLabels=',
    'notesTitle=',
    'termsTitle=',
    'attachments=',
    'signatories=',
    'columns=',
    'computedItems=',
    'computedGroups=',
    'rawSubtotal=',
    'vatAmount=',
    'discountAmount=',
    'whtAmount=',
    'totalPayable=',
    'amountInWords=',
    'discountType=',
    'discountTiming=',
    'whtType=',
    'onSaveSent=',
    'onSaveDraft=',
    'onCancel=',
    'onAddItem=',
    'onAddGroup=',
    'onUpdateItem=',
    'onRemoveItem=',
    'onMoveItem=',
    'onAddExtraCharge=',
    'onUpdateExtraCharge=',
    'onRemoveExtraCharge=',
    'onAddAdditionalField=',
    'onUpdateAdditionalField=',
    'onRemoveAdditionalField=',
    'onAddHeaderField=',
    'onUpdateHeaderField=',
    'onRemoveHeaderField=',
  ]
  for (const prop of props) {
    assert.ok(previewSource.includes(prop), `the form must receive ${prop}`)
  }
})

test('representative data exercises the form without a tenant read', () => {
  // Document details, dates, pricing, tax, charges, and terms are present.
  for (const field of [
    'invoice_number',
    'client_name',
    'po_number',
    'issue_date',
    'due_date',
    'payment_terms',
    'notes',
    'terms',
    'vat',
    'discount',
    'workmanship',
    'transportation',
  ]) {
    assert.ok(previewDataSource.includes(field), `preview data must include ${field}`)
  }
  // Line items use the production factories, so no shape is invented.
  assert.match(previewDataSource, /makeEmptyItem\(\)/)
  assert.match(previewDataSource, /makeExtraCharge\(/)
  assert.match(previewDataSource, /makeFieldEntry\(/)
  assert.match(previewDataSource, /row_type: 'group_header'/)
  assert.match(previewDataSource, /unit_price:/)
  assert.match(previewDataSource, /quantity:/)
})

test('preview interactions can never touch a production record', () => {
  for (const banned of [
    'useInvoiceSave',
    'useInvoiceHydration',
    "from '@/supabase'",
    'tenantClient.from(',
    '.insert(',
    '.update(',
    '.delete(',
    'localStorage',
    'sessionStorage',
    'document.documentElement',
    'setProperty(',
  ]) {
    assert.ok(!previewSource.includes(banned), `the preview must not contain ${banned}`)
  }
  // Save, draft, cancel, and import resolve to a preview-only notice.
  assert.match(previewSource, /Preview only — no invoice was created\./)
  assert.match(previewSource, /Preview only — no draft was saved\./)
  assert.match(previewSource, /the form was not closed\./)
  assert.match(previewSource, /Preview only — no items were imported\./)
  // The only navigation leaves the experiment.
  const calls = previewSource.match(/navigate\(\s*(['"`])([^'"`]+)\1\s*\)/g) || []
  assert.ok(calls.length >= 1)
  for (const call of calls) {
    assert.match(call, /navigate\('\/design-lab'\)/, `unexpected navigation: ${call}`)
  }
})

test('the inert tenant value cannot reach the network', () => {
  assert.match(tenantClientSource, /export const previewTenantClient: TenantClient/)
  assert.match(tenantClientSource, /new Proxy\(builder, \{/)
  assert.match(tenantClientSource, /Promise\.resolve\(EMPTY_LIST_RESULT\)/)
  for (const banned of [
    "from '@/supabase'",
    'createClient',
    'fetch(',
    'localStorage',
    'new WebSocket',
  ]) {
    assert.ok(!tenantClientSource.includes(banned), `the inert client must not contain ${banned}`)
  }

  // The provider reads only the context module, so the production entity
  // provider (and the Supabase client it imports) stays out of the experiment
  // module graph.
  assert.match(entityContextSource, /export function PreviewEntityProvider\(/)
  assert.match(entityContextSource, /import \{ EntityContext \} from '@\/lib\/tenant\/entityContext'/)
  assert.ok(
    !entityContextSource.includes("from '@/lib/tenant/contexts'"),
    'the preview provider must not import the production entity provider module',
  )
  assert.ok(
    !entityContextModuleSource.includes("from '@/supabase'"),
    'the shared context module must stay free of the data layer',
  )
  assert.match(previewSource, /<PreviewEntityProvider>/)
  assert.ok(
    !previewSource.includes("from '@/lib/tenant/contexts'"),
    'the preview must not import the production entity provider module',
  )
})

test('the experiment owns its viewport selection and offers five modes', () => {
  assert.match(previewSource, /const \{ viewportId, viewport, setViewportId \} = useDesignLabViewport\(\)/)
  assert.match(previewSource, /<ViewportSwitcher viewportId=\{viewportId\} onSelect=\{setViewportId\} \/>/)
  assert.match(previewSource, /<ViewportStage viewport=\{viewport\}>/)
  assert.equal(DESIGN_LAB_SIMULATED_VIEWPORTS.length, 5)
  // Independent state: each experiment calls the hook for itself.
  assert.match(dashboardPreviewSource, /const \{ viewportId, viewport, setViewportId \} = useDesignLabViewport\(\)/)
  assert.ok(
    !/from '@\/components\/dashboard-theme/.test(previewSource),
    'the invoice experiment must not read dashboard experiment state',
  )
  assert.ok(
    !/from '@\/components\/invoice-theme/.test(dashboardPreviewSource),
    'the dashboard experiment must not read invoice experiment state',
  )
})

test('the Design Lab theme drives the form itself', () => {
  assert.match(previewSource, /useExperimentThemeStyle\(family, appearance\)/)
  assert.match(previewSource, /style=\{rootStyle\}/)
  assert.match(previewSource, /PHOTO_HERO_FAMILY_META\.map/)
  assert.match(previewSource, /aria-pressed=\{appearance === 'light'\}/)
  assert.match(previewSource, /aria-pressed=\{appearance === 'dark'\}/)
  // The atmospheric canvas replaces the flat form background inside the scope.
  assert.match(previewSource, /\.ite-root \.dlv-stage\{background-color:transparent;background-image:var\(--scene-intro\)/)
  assert.match(previewSource, /\.ite-root \.bd-document-form\{background-color:transparent/)
  // The production theme toggle would write the saved preference, so the
  // experiment removes it from its own form.
  assert.match(
    previewSource,
    /\.ite-root \.cps-form-topbar button\[aria-label\^="Switch to light mode"\]/,
  )
  for (const banned of ['amber-terracotta', '#f59e0b']) {
    assert.ok(!previewSource.includes(banned), `no family may be hardcoded: ${banned}`)
  }
})

test('theme coverage: five families x light and dark resolve for form surfaces', () => {
  assert.equal(PHOTO_HERO_FAMILIES.length, 5)

  const formTokens = [
    '--surface',
    '--surface-raised',
    '--surface-muted',
    '--bd-surface',
    '--bd-card-bg',
    '--bd-input-bg',
    '--bd-button-primary-bg',
    '--ink',
    '--ink-2',
    '--line',
    '--primary',
    '--secondary',
    '--bg',
  ]

  for (const family of PHOTO_HERO_FAMILIES) {
    for (const appearance of ['light', 'dark']) {
      const atmosphere = getPhotoHeroVars(family, appearance)
      for (const key of ['--scene-intro', '--glass-bg', '--glass-line', '--glass-ink']) {
        assert.ok(
          typeof atmosphere[key] === 'string' && atmosphere[key].length > 0,
          `${family}/${appearance} must define ${key}`,
        )
      }

      for (const token of formTokens) {
        const value = resolveToken(family, appearance, token)
        assert.ok(
          typeof value === 'string' && value.length > 0,
          `${family}/${appearance} must resolve ${token}`,
        )
      }

      // Border tokens are derived by the shared theme layer from the semantic
      // line triplets, because the normalizer drops rgba line values.
      assert.ok(
        typeof resolveToken(family, appearance, '--line-strong') === 'string',
        `${family}/${appearance} must resolve --line-strong for the border tokens`,
      )
    }
  }

  // A family change must move the tokens the form surfaces consume. (`--surface`
  // is a shared neutral in light mode; the family identity arrives through
  // `--bg`, `--surface-raised`, `--primary`, and `--line`, and the shared theme
  // layer keeps a material alpha on the neutral surfaces so the family canvas
  // reads through them.)
  const familyTokers = ['--primary', '--bg', '--surface-raised', '--line']
  for (const token of familyTokers) {
    const values = new Set(PHOTO_HERO_FAMILIES.map((family) => resolveToken(family, 'light', token)))
    assert.equal(values.size, 5, `${token} must differ for every family`)
  }
  // Appearance must move a form surface too.
  assert.notEqual(
    resolveToken('slate-navy', 'light', '--bg'),
    resolveToken('slate-navy', 'dark', '--bg'),
  )
  // Field and line tokens must stay HSL triplets for `hsl(var(--…))` consumers.
  for (const token of ['--line', '--bg']) {
    assert.match(resolveToken('ocean-teal', 'light', token), HSL_TRIPLET)
  }
})

test('simulated viewports restate the form composition tiers', () => {
  assert.match(previewSource, /@container dlv \(max-width: 767\.9px\)\{/)
  assert.match(previewSource, /@container dlv \(min-width: 768px\)\{/)
  assert.match(previewSource, /@container dlv \(min-width: 1024px\)\{/)
  // The desktop rail is hidden below the desktop tier and shown at it.
  assert.match(
    previewSource,
    /\[data-dlv-sim\] \.ite-root \.bd-document-grid > div\[class~="hidden"\]\[class~="lg:flex"\]\{display:none\}/,
  )
  assert.match(
    previewSource,
    /\[data-dlv-sim\] \.ite-root \.bd-document-grid > div\[class~="hidden"\]\[class~="lg:flex"\]\{display:flex/,
  )
  // The phone action bar follows the tiers.
  assert.match(previewSource, /\[data-dlv-sim\] \.ite-root \.bd-document-form \[class~="lg:hidden"\]\{display:block\}/)
  assert.match(previewSource, /\[data-dlv-sim\] \.ite-root \.bd-document-form \[class~="lg:hidden"\]\{display:none\}/)
  // Every tier rule is gated to simulated mode.
  const blocks = previewSource.match(/@container dlv \([^)]*\)\{[\s\S]*?\n {2}\}/g) || []
  assert.equal(blocks.length, 3, 'the three composition tiers must be restated')
  for (const block of blocks) {
    const declarations = block
      .split('\n')
      .filter((line) => line.includes('{') && line.includes(':'))
      .filter((line) => !line.trim().startsWith('@'))
    assert.ok(declarations.length > 0)
    for (const line of declarations) {
      assert.match(line, /\[data-dlv-sim\]/, `tier rule must be simulated-only: ${line.trim()}`)
    }
  }
  // Nothing is scaled, and the form keeps a natural vertical flow.
  assert.ok(!previewSource.includes('transform:scale'), 'no scale transform may be used')
  assert.match(previewSource, /env\(safe-area-inset-bottom/)
})

test('experimental styling stays scoped to the experiment root', () => {
  assert.match(previewSource, /const PREVIEW_CSS = `/)
  assert.ok(!previewSource.includes(':root{'), 'no global root rule may be declared')
  assert.ok(!previewSource.includes('@tailwind'), 'no global stylesheet directives')
  assert.ok(!/(^|\n)\s*(html|body)\s*\{/.test(previewSource), 'no global element rule')

  const css = previewSource.match(/const PREVIEW_CSS = `([\s\S]*?)`\n/)
  assert.ok(css, 'the experiment stylesheet must be declared in PREVIEW_CSS')
  const headers = [...css[1].matchAll(/(^|\n)\s*([^{}\n@][^{}\n]*)\{/g)]
    .map((match) => match[2])
    .filter((header) => !header.trim().startsWith('@'))
  assert.ok(headers.length > 10)
  for (const header of headers) {
    for (const selector of header.split(',')) {
      const trimmed = selector.trim()
      if (!trimmed) continue
      const scoped = trimmed.startsWith('.ite-') || /^\[data-dlv-sim\] \.ite-root\b/.test(trimmed)
      assert.ok(scoped, `unscoped selector found in the experiment stylesheet: ${trimmed}`)
    }
  }
})

test('accessibility and motion contracts hold', () => {
  assert.match(previewSource, /role="status"/)
  assert.match(previewSource, /role="dialog"/)
  assert.match(previewSource, /aria-pressed=\{/)
  assert.match(previewSource, /aria-label=\{paletteOpen \? 'Close theme palette' : 'Open theme palette'\}/)
  assert.match(previewSource, /aria-label="Close experiment and return to Design Lab"/)
  assert.match(previewSource, /:focus-visible/)
  assert.match(previewSource, /prefers-reduced-motion:reduce/)
  assert.match(previewSource, /prefers-reduced-transparency:reduce/)
  assert.match(previewSource, /<h1 className="ite-vh">Invoice Form Theme Experiment<\/h1>/)
  // Escape returns focus to the trigger; outside taps close the panel.
  assert.match(previewSource, /event\.key !== 'Escape'/)
  assert.match(previewSource, /paletteRef\.current\?\.focus\(\)/)
})

test('the dashboard viewport switcher is not regressed by this experiment', () => {
  assert.match(dashboardPreviewSource, /<ViewportSwitcher viewportId=\{viewportId\} onSelect=\{setViewportId\} \/>/)
  assert.match(dashboardPreviewSource, /@container dlv \(min-width: 1024px\)\{/)
  const designLabSource = read('src/pages/DesignLab.tsx')
  assert.ok(!designLabSource.includes('ViewportSwitcher'), 'Design Lab has no viewport switcher')
})
