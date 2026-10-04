import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { buildCpsViewData, buildCpsViewSegments } from '../../domain/cps/viewData.ts'

const viewSource = readFileSync(
  new URL('../../components/cps/CostPricingSheetViewPresentations.tsx', import.meta.url),
  'utf8',
)
const viewCss = readFileSync(
  new URL('../../components/cps/cost-pricing-sheet-view.css', import.meta.url),
  'utf8',
)
const pageSource = readFileSync(
  new URL('../../pages/ViewCps.tsx', import.meta.url),
  'utf8',
)
const fabSource = readFileSync(
  new URL('../../components/document-view/shared/FloatingDownloadButton.tsx', import.meta.url),
  'utf8',
)
const fabCss = readFileSync(
  new URL('../../components/document-view/shared/FloatingDownloadButton.module.css', import.meta.url),
  'utf8',
)

test('CPS view separates document actions from identity', () => {
  assert.match(viewSource, /function DocumentActionRow/)
  assert.match(viewSource, /<DocumentActionRow onEdit=\{props\.onEdit\} onConvert=\{\(\) => setConvertOpen\(true\)\} \/>/)
  assert.match(viewSource, /<Dossier \{\.\.\.props\}/)
  assert.match(viewCss, /\.cps-doc-actions/)
  assert.ok(
    viewSource.indexOf('<DocumentActionRow') < viewSource.indexOf('<Dossier'),
    'document actions must render before the identity dossier',
  )
})

test('CPS document action order is Convert to Quote, Edit, Download', () => {
  const actionStart = viewSource.indexOf('<section className="cps-doc-actions"')
  const actionEnd = viewSource.indexOf('</section>', actionStart)
  const actionMarkup = viewSource.slice(actionStart, actionEnd)

  assert.ok(actionStart > -1, 'action row must exist')
  assert.ok(actionMarkup.indexOf('Convert to Quote') < actionMarkup.indexOf('Edit'))
  assert.ok(actionMarkup.indexOf('Edit') < actionMarkup.indexOf('Download'))
  assert.match(viewCss, /\.cps-doc-actions\s*\{[\s\S]*display:\s*flex/)
  assert.doesNotMatch(viewCss, /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/)
  assert.match(viewCss, /--bd-button-primary-bg/)
  assert.match(viewCss, /--bd-surface-action/)
  assert.match(viewCss, /--bd-action-icon-bg/)
  assert.match(viewSource, /<FileOutput size=\{15\} \/>/)
  assert.match(viewCss, /\.cps-view-btn\.convert\s*\{[\s\S]*flex:\s*1 1 clamp\(148px,\s*46%,\s*190px\)/)
  assert.match(viewCss, /\.cps-view-btn\.convert\s*\{[\s\S]*min-width:\s*148px/)
  assert.match(viewCss, /\.cps-view-btn\.soft\s*\{[\s\S]*flex:\s*0 1 auto/)
  assert.match(viewCss, /\.cps-view-btn\.convert\s*\{[\s\S]*linear-gradient\(180deg,\s*hsl\(var\(--bd-button-primary-bg\) \/ \.16\)/)
  assert.match(viewCss, /\.cps-view-btn\.convert \.cps-action-icon\s*\{[\s\S]*background:\s*hsl\(var\(--bd-button-primary-bg\)\)/)
  assert.match(viewCss, /\.cps-view-btn span:last-child\s*\{[\s\S]*white-space:\s*nowrap/)
  assert.doesNotMatch(cssRule('.cps-view-btn span:last-child'), /text-overflow:\s*ellipsis/)
  assert.doesNotMatch(viewCss, /\.cps-view-btn\.convert\s*\{[\s\S]*background:\s*var\(--brand\)/)
})

test('CPS action row participates in normal scroll flow', () => {
  const mobileActionRule = cssRule('.cps-view-wrap .cps-doc-actions')

  assert.doesNotMatch(mobileActionRule, /position:\s*sticky/)
  assert.doesNotMatch(mobileActionRule, /top:\s*56px/)
  assert.match(viewCss, /\.cps-view-wrap\s*\{[\s\S]*padding:\s*8px 20px 24px/)
  assert.doesNotMatch(viewCss, /112px/)
})

test('direct Convert to Quote and More Actions reuse one conversion authority', () => {
  const conversionCalls = viewSource.match(/props\.actions\.onConvertToQuotation\(\)/g) || []
  assert.equal(conversionCalls.length, 2, 'desktop and mobile wrappers may each call the same page action once')
  assert.match(viewSource, /label: 'Convert to Quotation'[\s\S]*onClick: onRequestConvert/)
  assert.match(viewSource, /Convert to Quote/)
  assert.doesNotMatch(viewSource, /convertCpsToQuotation/)
})

test('CPS palette customization and More Actions use separate authorities', () => {
  assert.match(viewSource, /import DocumentSheet from '@\/components\/document-view\/shared\/DocumentSheet'/)
  assert.match(viewSource, /import DocumentCustomizeCard from '@\/components\/document-view\/shared\/DocumentCustomizeCard'/)
  assert.match(viewSource, /usePdfCustomization\(\{[\s\S]*documentFamily: 'cps_sheets'/)
  assert.match(viewSource, /<CpsCustomizeSheet open=\{customizeOpen\} onClose=\{\(\) => setCustomizeOpen\(false\)\} \/>/)
  assert.match(viewSource, /aria-label="Customize PDF" onClick=\{\(\) => setCustomizeOpen\(true\)\}/)
  assert.match(viewSource, /aria-label="More actions" onClick=\{\(\) => setMoreOpen\(true\)\}/)
  assert.doesNotMatch(viewSource, /aria-label="Customize PDF" onClick=\{\(\) => setMoreOpen\(true\)\}/)
})

test('CPS More Actions removes Approve sheet status action', () => {
  const sectionsStart = viewSource.indexOf('const sections = [')
  const sectionsEnd = viewSource.indexOf('return (', sectionsStart)
  const moreSections = viewSource.slice(sectionsStart, sectionsEnd)

  assert.ok(sectionsStart > -1, 'More Actions sections must exist')
  assert.doesNotMatch(moreSections, /Approve sheet/)
  assert.doesNotMatch(moreSections, /Mark this sheet as approved/)
  assert.doesNotMatch(moreSections, /Reopen sheet/)
  assert.doesNotMatch(moreSections, /onToggleStatus/)
  assert.doesNotMatch(moreSections, /title: 'Status'/)
})

test('CPS group presentation removes generated alphabet labels', () => {
  assert.doesNotMatch(viewSource, /Group \$\{segment\./)
  assert.doesNotMatch(viewSource, /End of Group/i)
  assert.doesNotMatch(viewSource, /function groupLetter/)
  assert.doesNotMatch(viewSource, /String\.fromCharCode\(65/)
  assert.doesNotMatch(viewSource, /className="ghost"/)
  assert.doesNotMatch(viewSource, />Individual item</)
  assert.match(viewSource, /\{mobile \? <h3>\{segment\.row\.title\}<\/h3> : <h2>\{segment\.row\.title\}<\/h2>\}/)
  assert.match(viewSource, /<span className="k">Group Subtotal/)
  assert.match(viewSource, /<span className="cps-gicon" aria-hidden="true"><Package size=\{22\} \/><\/span>/)
  assert.doesNotMatch(viewCss, /--cps-group-breakout/)
  assert.match(viewCss, /\.cps-grp\s*\{[\s\S]*border:\s*1px solid hsl\(var\(--bd-button-primary-bg\) \/ \.36\)/)
  assert.match(viewCss, /\.cps-view-wrap \.cps-grp\s*\{[\s\S]*margin-top:\s*18px/)
  assert.match(viewCss, /\.cps-view-wrap \.cps-doc\s*\{[\s\S]*margin:\s*14px 0 0/)
  assert.match(viewCss, /\.cps-view-wrap \.cps-summary\s*\{[\s\S]*margin:\s*14px 0 0/)
  assert.match(viewCss, /\.cps-ghead\s*\{[\s\S]*padding:\s*16px 18px/)
  assert.match(viewCss, /\.cps-entry\.in-group\s*\{[\s\S]*padding-left:\s*18px[\s\S]*padding-right:\s*18px/)
  assert.match(viewCss, /\.cps-ghead\s*\{[\s\S]*--bd-button-primary-bg/)
  assert.match(viewCss, /\.cps-gsub\s*\{[\s\S]*--bd-button-primary-bg/)
})

test('CPS view segments use one group membership authority for count, rows and subtotal', () => {
  const groupId = 'group-electrical'
  const cps = {
    id: 'cps-1',
    cps_number: 'SASBOQ-000007',
    template_id: 'modern',
    title: 'CPS Form Test',
    client_name: 'Lorem Ipsum',
    project_name: '',
    issue_date: '2026-10-04',
    show_vendor_identity: false,
    show_brand_name: false,
    brand_name_override: '',
    background_color: '',
    text_color: '',
    border_color: '',
    accent_color: '',
    preset_name: '',
    notes: '',
    table_columns: [],
    created_at: '',
    updated_at: '',
    table_rows: [
      row('section', 0, { id: groupId, group_id: groupId, section_title: 'Electrical Materials' }),
      row('item', 1, { id: 'a1', group_id: groupId, description: 'LED Flood Light 100W', quantity: 10, cp: '18500', sp: '25000' }),
      row('item', 2, { id: 'u1', group_id: null, description: 'Ungrouped item', quantity: 1, cp: '100', sp: '150' }),
      row('item', 3, { id: 'a2', group_id: groupId, description: '4 Core 16 sqmm Cable', quantity: 100, cp: '12500', sp: '16000' }),
    ],
  }

  const view = buildCpsViewData(cps)
  const segments = buildCpsViewSegments(view.rows)
  const group = segments.find((segment) => segment.type === 'group')
  const standalone = segments.filter((segment) => segment.type === 'item')

  assert.deepEqual(view.rows.map((viewRow) => viewRow.key), [groupId, 'a1', 'u1', 'a2'])
  assert.equal(group.count, 2)
  assert.deepEqual(group.items.map((item) => item.key), ['a1', 'a2'])
  assert.equal(group.total, 1850000)
  assert.equal(standalone.length, 1)
  assert.equal(standalone[0].row.key, 'u1')
  assert.equal(standalone[0].membership, undefined)
})

test('CPS identity keeps company branding and moves client/title into compact context', () => {
  assert.match(viewSource, /settings\?\.company_name/)
  assert.match(viewSource, /resolveCanonicalLogoUrl\(settings\)/)
  assert.match(viewSource, /className="cps-issuer"/)
  assert.match(viewSource, />Company<\/div>/)
  assert.match(viewSource, /<div className="company">\{companyName\}<\/div>/)
  assert.doesNotMatch(viewSource, /cps-client-block/)
  assert.doesNotMatch(viewSource, /cps-document-block/)
  assert.doesNotMatch(viewSource, />Document<\/div>/)
  assert.match(viewSource, /<span>Client<\/span>[\s\S]*<b>\{clientName\}<\/b>/)
  assert.match(viewSource, /<span>Title<\/span>[\s\S]*<b>\{title\}<\/b>/)
  assert.match(viewSource, /const title = document\.title\?\.trim\(\) \? document\.title\.trim\(\) : ''/)
  assert.doesNotMatch(viewSource, /const title = document\.title \|\| 'Untitled Cost & Pricing Sheet'/)
  assert.ok(viewSource.indexOf('className="cps-issuer"') < viewSource.indexOf('className="cps-context-strip"'))
})

test('CPS local fake bottom navigation is removed and real app navigation is restored', () => {
  assert.doesNotMatch(viewSource, /cps-bottom-nav/)
  assert.doesNotMatch(viewCss, /\.cps-bottom-nav/)
  assert.doesNotMatch(pageSource, /immersive/)
  assert.match(pageSource, /<Layout title="Cost & Pricing Sheet" session=\{null\} hidePageHeader/)
})

test('CPS download FAB uses canonical download FAB geometry and nav offset', () => {
  assert.match(viewSource, /<FloatingDownloadButton label="Download Cost & Pricing Sheet" \/>/)
  assert.match(viewCss, /bottom:\s*calc\(var\(--bd-app-bottom-nav-offset,\s*72px\) \+ env\(safe-area-inset-bottom,\s*0px\) \+ 16px\)/)
  assert.match(fabSource, /DownloadIcon size=\{20\}/)
  assert.match(fabCss, /width:\s*50px/)
  assert.match(fabCss, /height:\s*50px/)
  assert.match(fabCss, /border-radius:\s*18px/)
  assert.match(fabCss, /background:\s*hsl\(var\(--bd-fab-bg\)\)/)
  assert.match(fabCss, /color:\s*hsl\(var\(--bd-fab-text\)\)/)
  assert.match(fabCss, /fill:\s*currentColor/)
  assert.match(fabCss, /scale\(1\.05\)/)
  assert.match(fabCss, /scale\(0\.95\)/)
  assert.match(viewCss, /\.cps-fab-slot button\s*\{[\s\S]*background:\s*hsl\(var\(--bd-fab-bg\)\)/)
  assert.match(viewCss, /\.cps-fab-slot button\s*\{[\s\S]*color:\s*hsl\(var\(--bd-fab-text\)\)/)
  assert.match(viewCss, /\.cps-fab-slot button svg,\s*\.cps-fab-slot button svg path\s*\{[\s\S]*fill:\s*currentColor/)
  assert.doesNotMatch(fabSource, /console\.(group|log|groupEnd)/)
})

test('CPS view redesign does not introduce calculation or schema work', () => {
  for (const forbidden of [
    'calculateCpsTotals',
    'instant-markup',
    'computeCpsRowEconomics',
    'Decimal',
    'supabase db push',
    'migration',
  ]) {
    assert.ok(!viewSource.includes(forbidden), `view source must not contain ${forbidden}`)
  }
})

function row(row_type, sort_order, overrides = {}) {
  return {
    id: overrides.id || `${row_type}-${sort_order}`,
    row_type,
    sort_order,
    section_title: '',
    description: '',
    specification: '',
    quantity: 0,
    unit: 'NOS',
    notes: '',
    make_brand: '',
    cp: '0',
    sp: '0',
    image_url: null,
    group_id: null,
    ...overrides,
  }
}

function cssRule(selector) {
  const start = viewCss.indexOf(`${selector} {`)
  assert.ok(start > -1, `Missing CSS rule for ${selector}`)
  const end = viewCss.indexOf('}', start)
  return viewCss.slice(start, end + 1)
}
