import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// The oversized shared markup dialog was replaced on Mobile/Fold by a
// compact bounded sheet. The production engine (preview, apply, undo,
// eligibility, rounding) stays the single authority in the editor and
// domain layers. These structural tests guard that boundary: the mobile
// presentation must receive computed results through props and must not
// implement markup math of its own.
const sheetSource = readFileSync(
  new URL('../../components/cps/CpsMarkupSheet.tsx', import.meta.url),
  'utf8',
)
const editorSource = readFileSync(
  new URL('../../components/cps/CostPricingSheetEditor.tsx', import.meta.url),
  'utf8',
)
const priceFlowSource = readFileSync(
  new URL('../../components/cps/CpsMarkupPriceFlow.tsx', import.meta.url),
  'utf8',
)
const formSource = readFileSync(
  new URL('../../components/cps/CostPricingSheetForm.tsx', import.meta.url),
  'utf8',
)

test('mobile markup sheet implements no markup math', () => {
  for (const forbidden of [
    'previewInstantMarkup',
    'applyInstantMarkup',
    'Decimal',
    'computeCpsTotals',
    'computeCpsRowEconomics',
    'parseFloat',
  ]) {
    assert.ok(
      !sheetSource.includes(forbidden),
      `CpsMarkupSheet must not contain ${forbidden}; engine output arrives via props`,
    )
  }
})

test('mobile markup sheet reads only pure row selectors from the engine', () => {
  assert.ok(
    sheetSource.includes('isInstantMarkupEligible'),
    'eligibility must come from the production selector',
  )
  assert.ok(
    sheetSource.includes('getCpsRowKey'),
    'row identity must come from the production key helper',
  )
})

test('editor renders the compact sheet on mobile and keeps the dialog on desktop', () => {
  assert.ok(editorSource.includes('<CpsMarkupSheet'), 'mobile branch must render CpsMarkupSheet')
  assert.ok(
    editorSource.includes('<InstantMarkupDialog'),
    'desktop branch must keep InstantMarkupDialog',
  )
  assert.ok(
    !editorSource.includes('dock='),
    'the dead mobile dialog branch (dock prop) must stay removed',
  )
})

test('mobile toolbar still opens markup through the existing intent', () => {
  assert.ok(
    /onClick=\{\(\) => onRequestMarkup\?\.\(\)\}/.test(formSource),
    'Markup toolbar button must call onRequestMarkup',
  )
})

test('mobile CPS form carries custom columns and custom row data', () => {
  assert.ok(formSource.includes("String(k).startsWith('custom_')"), 'mobile column resolver must keep custom columns')
  assert.ok(formSource.includes('customData'), 'mobile rows must carry custom data')
  assert.ok(formSource.includes("column.key.startsWith('custom_')"), 'mobile form must render visible custom columns')
  assert.ok(editorSource.includes('customData: toMobileCustomData(row.custom_data)'), 'editor must map domain custom_data into mobile rows')
  assert.ok(editorSource.includes('custom_data: { ...(row.custom_data || {}), ...(mrow.customData || {}) }'), 'editor must return mobile custom data to domain rows')
})

test('mobile form exposes the production undo affordance without local markup history', () => {
  assert.ok(formSource.includes('hasUndo'), 'form must accept production undo state')
  assert.ok(formSource.includes('onUndoMarkup'), 'form must call the production undo callback')
  assert.ok(
    !formSource.includes('setUndoRows') && !formSource.includes('undoRows'),
    'form must not own undo history',
  )
})

test('markup sheet uses item enumeration instead of status dots', () => {
  assert.ok(sheetSource.includes('itemNumber'), 'sheet rows must receive presentation item numbers')
  assert.ok(sheetSource.includes("String(itemNumber).padStart(2, '0')"), 'item numbers must render as 01, 02, 03')
  assert.ok(!sheetSource.includes('h-2.5 w-2.5 shrink-0 rounded-full'), 'old colored status dot must not return')
})

test('excluded rows are muted as whole rows, not only tiny markers', () => {
  assert.ok(sheetSource.includes('data-markup-excluded'), 'excluded row state must be visible on the row')
  assert.ok(sheetSource.includes('bg-bd-surface-muted/70'), 'excluded rows must use muted Theme Manager surface tokens')
  assert.ok(sheetSource.includes('text-bd-text-muted'), 'excluded rows must de-emphasize text with semantic muted tokens')
})

test('reset and undo reset are separate sheet-session controls', () => {
  assert.ok(sheetSource.includes('Reset markup?'), 'reset must require confirmation')
  assert.ok(sheetSource.includes('onUndoReset'), 'sheet must expose a separate undo reset callback')
  assert.ok(sheetSource.includes('Undo Reset'), 'sheet must render a Ctrl+Z-style undo reset action')
  assert.ok(
    /canUndoReset\s*\?\s*\(/.test(sheetSource),
    'Undo Reset must be conditional, not visible in the initial sheet state',
  )
  assert.ok(
    /canUndoReset\s*\?\s*\(/.test(editorSource),
    'Undo Reset must be conditional, not visible in the initial desktop dialog state',
  )
  assert.ok(editorSource.includes('markupOpeningRows'), 'reset must restore from the session-opening snapshot')
  assert.ok(editorSource.includes('resetInstantMarkupWorkingRows(markupOpeningRows)'), 'reset must not zero current working SP values')
  assert.ok(!editorSource.includes('resetInstantMarkupSellingPrices'), 'old destructive zero-SP reset helper must not be used')
  assert.ok(editorSource.includes('resetUndoRows'), 'reset snapshot must be separate from post-apply undoRows')
  assert.ok(editorSource.includes('setUndoRows(rows)'), 'post-apply undo snapshot must remain form-level')
})

test('markup workspace commits the live proposal through existing editor row update authority', () => {
  assert.ok(editorSource.includes('markupWorkingRows'), 'editor must own a sheet-session working row state')
  assert.ok(!editorSource.includes('handlePreview'), 'no explicit preview step may remain')
  assert.ok(!editorSource.includes('handleApplyPreviewMarkup'), 'no intermediate preview-to-workspace commit may remain')
  assert.ok(!editorSource.includes('onPreview'), 'no preview callback may be wired')
  assert.ok(!editorSource.includes('onApplyPreview'), 'no second commit stage may be wired')
  assert.ok(!editorSource.includes('onBack={() => setPreview'), 'no preview back-navigation may remain')
  assert.ok(!sheetSource.includes('onBack'), 'sheet must not expose back-navigation')
  assert.ok(editorSource.includes('updateRows(finalRows)'), 'final apply must use the existing row update authority')
  assert.ok(sheetSource.includes('Apply Markup'), 'sheet must expose the single apply action')
  assert.ok(!/\bStack(?:ed|ing)?\b|Next Stack|Apply Working SP/i.test(sheetSource), 'sheet must not expose stack terminology')
  assert.ok(!/\bStack(?:ed|ing)?\b|Next Stack|Apply Working SP/i.test(editorSource), 'editor markup UI must not expose stack terminology')
})

test('live proposal derives from mode, value, and inclusion without a preview action', () => {
  assert.ok(
    /useMemo\(\(\) => \{[\s\S]*?previewInstantMarkup\(activeMarkupRows/.test(editorSource),
    'editor must derive the live proposal from working rows, mode, value, and inclusion',
  )
  assert.ok(!sheetSource.includes('Preview Markup'), 'sheet must not render a preview button')
  assert.ok(!sheetSource.includes('Apply to Form'), 'sheet must not render a second commit stage')
  assert.ok(!editorSource.includes('Apply to Form'), 'dialog must not render a second commit stage')
  const sheetApplyCount = sheetSource.split('Apply Markup').length - 1
  assert.equal(sheetApplyCount, 1, 'sheet must expose exactly one apply action')
})

test('typing, mode, and inclusion changes commit nothing by themselves', () => {
  assert.ok(editorSource.includes('onValueChange={setMarkupValue}'), 'value input must only update local state')
  assert.ok(editorSource.includes('onModeChange={setMarkupMode}'), 'mode toggle must only update local state')
  assert.ok(
    !/setMarkupValue\([^)]*\)[\s\S]{0,200}?updateRows/.test(editorSource.replace(/handleApplyMarkup[\s\S]*$/, '')),
    'keystroke handlers must not reach the row update authority',
  )
})

test('live summary sits near the controls with polite live-region semantics', () => {
  assert.ok(sheetSource.includes('aria-live="polite"'), 'sheet summary must announce reactive updates')
  assert.ok(sheetSource.includes('Aggregate change'), 'sheet summary must show aggregate change')
  assert.ok(sheetSource.includes('Selling total'), 'sheet summary must retain selling total')
  assert.ok(sheetSource.includes('Gross profit'), 'sheet summary must retain gross profit')
  assert.ok(editorSource.includes('aria-live="polite"'), 'dialog summary must announce reactive updates')
  assert.ok(editorSource.includes('Selling total'), 'dialog summary must retain selling total')
  assert.ok(editorSource.includes('Gross profit'), 'dialog summary must retain gross profit')
})

test('markup rows show the live price transition with CP, SP, arrow, and result hierarchy', () => {
  assert.ok(sheetSource.includes('proposedSp'), 'sheet rows must receive the live calculated price')
  assert.ok(sheetSource.includes('CpsMarkupPriceFlow'), 'sheet rows must use the shared price transition')
  assert.ok(editorSource.includes('proposedSp'), 'dialog rows must receive the live calculated price')
  assert.ok(editorSource.includes('CpsMarkupPriceFlow'), 'dialog rows must use the shared price transition')
  assert.ok(priceFlowSource.includes('CP{'), 'price flow must expose immutable cost context')
  assert.ok(priceFlowSource.includes('SP{'), 'price flow must expose current working selling price')
  assert.ok(priceFlowSource.includes('data-price-arrow'), 'price flow must expose a visual transition arrow')
  assert.ok(priceFlowSource.includes('data-price="next"'), 'price flow must structurally distinguish the result price')
  assert.ok(priceFlowSource.includes('const hasDestination = !excluded'), 'excluded rows must not show an active calculated destination')
  assert.ok(!sheetSource.includes('Proposed'), 'sheet must not render rejected Proposed terminology')
  assert.ok(!editorSource.includes('Proposed'), 'dialog must not render rejected Proposed terminology')
  assert.ok(!priceFlowSource.includes('Proposed'), 'price flow must not label the result as proposed')
  assert.ok(!/>\s*Current\s*</.test(sheetSource), 'sheet must not render verbose Current terminology')
  assert.ok(!/>\s*Current\s*</.test(editorSource), 'dialog must not render verbose Current terminology')
  assert.ok(!priceFlowSource.includes('Current'), 'price flow must not use verbose current-row copy')
})

test('markup copy states the CP fallback accurately', () => {
  for (const [source, name] of [[sheetSource, 'sheet'], [editorSource, 'dialog']]) {
    assert.ok(
      source.includes('or CP when SP is empty'),
      `${name} helper must state the CP fallback`,
    )
    assert.ok(
      !source.includes('Mark up from current SP. CP and excluded rows stay unchanged.'),
      `${name} must not keep the incomplete copy`,
    )
    assert.ok(
      !source.includes('Next SP = current working SP'),
      `${name} must not claim SP-only base math`,
    )
  }
  assert.ok(
    !sheetSource.includes('set the current working selling prices to zero'),
    'sheet reset copy must not claim zeroing',
  )
  assert.ok(
    !editorSource.includes('set the current working selling prices to zero'),
    'dialog reset copy must not claim zeroing',
  )
  assert.ok(sheetSource.includes('when you opened Instant Markup'), 'sheet reset copy must describe snapshot restore')
  assert.ok(editorSource.includes('when you opened Instant Markup'), 'dialog reset copy must describe snapshot restore')
})

test('mobile final apply stays reachable with a persistent safe-area footer', () => {
  assert.ok(
    sheetSource.includes("paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))'"),
    'sheet footer must keep safe-area padding',
  )
})

test('desktop dialog bounds the workspace with one scroll region and a persistent footer', () => {
  assert.ok(editorSource.includes('cps-overlay dock'), 'dialog keeps the bounded viewport dock shell')
  assert.ok(editorSource.includes('cps-mk-dialog'), 'dialog sheet must not scroll as a whole')
  assert.ok(editorSource.includes('cps-mk-list'), 'dialog list must own long-list scrolling')
  assert.ok(editorSource.includes('cps-mk-foot'), 'dialog footer must persist outside the scroll region')
})

test('reset confirmation is not trapped inside the markup sheet or desktop dock layer', () => {
  assert.ok(!sheetSource.includes('container={confirmHost}'), 'sheet reset confirmation must use the shared alert dialog layer')
  assert.ok(!editorSource.includes('container={confirmHost}'), 'desktop reset confirmation must use the shared alert dialog layer')
  assert.ok(!sheetSource.includes('setConfirmHost'), 'sheet must not own a local confirmation portal host')
  assert.ok(!editorSource.includes('setConfirmHost'), 'desktop dialog must not own a local confirmation portal host')
})
