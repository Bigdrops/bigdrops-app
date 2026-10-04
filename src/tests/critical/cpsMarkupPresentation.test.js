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
