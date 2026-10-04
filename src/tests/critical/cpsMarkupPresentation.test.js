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

test('mobile form exposes the production undo affordance without its own stack', () => {
  assert.ok(formSource.includes('hasUndo'), 'form must accept production undo state')
  assert.ok(formSource.includes('onUndoMarkup'), 'form must call the production undo callback')
  assert.ok(
    !formSource.includes('setUndoRows') && !formSource.includes('undoRows'),
    'form must not own an undo stack',
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
  assert.ok(editorSource.includes('resetUndoRows'), 'reset snapshot must be separate from post-apply undoRows')
  assert.ok(editorSource.includes('setUndoRows(rows)'), 'post-apply undo snapshot must remain form-level')
})

test('stack workspace commits through existing editor row update authority', () => {
  assert.ok(editorSource.includes('markupWorkingRows'), 'editor must own a sheet-session working row state')
  assert.ok(editorSource.includes('handleStackMarkup'), 'editor must support stacking without closing the sheet')
  assert.ok(editorSource.includes('updateRows(finalRows)'), 'final apply must use the existing row update authority')
  assert.ok(sheetSource.includes('Stack Operation'), 'sheet must expose stack operation separate from final apply')
  assert.ok(sheetSource.includes('Apply Working SP'), 'sheet must expose final working-state apply')
})
