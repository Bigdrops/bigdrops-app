import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  addMonths,
  compareIso,
  formatIsoDisplay,
  getMonthGrid,
  getWeekdayLabels,
  isIsoDateString,
  parseIsoDate,
  toIsoDate,
} from '../../components/ui/date-helpers.ts'

test('date-field: parses valid ISO dates and rejects invalid ones', () => {
  assert.deepEqual(parseIsoDate('2026-09-25'), { y: 2026, m: 9, d: 25 })
  assert.equal(parseIsoDate('2026-02-30'), null)
  assert.equal(parseIsoDate('2026-13-01'), null)
  assert.equal(parseIsoDate('2026-00-10'), null)
  assert.equal(parseIsoDate('25/09/2026'), null)
  assert.equal(parseIsoDate(''), null)
  assert.equal(parseIsoDate('  2026-01-05  ')?.d, 5)
  assert.equal(isIsoDateString('2026-09-25'), true)
  assert.equal(isIsoDateString('not-a-date'), false)
})

test('date-field: serializes ISO dates with zero padding', () => {
  assert.equal(toIsoDate(2026, 9, 5), '2026-09-05')
  assert.equal(toIsoDate(2026, 12, 25), '2026-12-25')
})

test('date-field: display is DD/MM/YYYY with no timezone reinterpretation', () => {
  assert.equal(formatIsoDisplay('2026-09-25'), '25/09/2026')
  assert.equal(formatIsoDisplay('2026-01-05'), '05/01/2026')
  assert.equal(formatIsoDisplay(''), 'DD/MM/YYYY')
  assert.equal(formatIsoDisplay('garbage'), 'DD/MM/YYYY')
  assert.equal(formatIsoDisplay('', 'Select date'), 'Select date')
})

test('date-field: month grid is Monday-first with complete weeks', () => {
  // 2026-09-01 is a Tuesday, so the grid must lead with Monday 2026-08-31.
  const weeks = getMonthGrid(2026, 9)
  assert.ok(weeks.length >= 4 && weeks.length <= 6)
  for (const week of weeks) assert.equal(week.length, 7)
  assert.deepEqual(weeks[0][0], { y: 2026, m: 8, d: 31, inMonth: false })
  assert.deepEqual(weeks[0][1], { y: 2026, m: 9, d: 1, inMonth: true })
  const inMonth = weeks.flat().filter((day) => day.inMonth)
  assert.equal(inMonth.length, 30)
  assert.deepEqual(inMonth.map((day) => day.d), Array.from({ length: 30 }, (_, i) => i + 1))
  // February leap year keeps all 29 days.
  const feb = getMonthGrid(2024, 2).flat().filter((day) => day.inMonth)
  assert.equal(feb.length, 29)
  assert.equal(getWeekdayLabels().length, 7)
})

test('date-field: month arithmetic crosses year boundaries', () => {
  assert.deepEqual(addMonths(2026, 12, 1), { y: 2027, m: 1, d: 1 })
  assert.deepEqual(addMonths(2026, 1, -1), { y: 2025, m: 12, d: 1 })
  assert.equal(compareIso('2026-09-24', '2026-09-25'), -1)
  assert.equal(compareIso('2026-09-25', '2026-09-25'), 0)
  assert.equal(compareIso('2026-09-26', '2026-09-25'), 1)
})

test('date-field: FormHeader routes Quotation/Invoice dates through DateField', () => {
  const source = fs.readFileSync(path.resolve('src/components/document/FormHeader.tsx'), 'utf8')
  assert.match(source, /import \{ DateField \} from '@\/components\/ui\/date-field'/)
  assert.match(source, /<DateField/)
  assert.match(source, /label=\{isQuotation \? 'Quotation Date' : 'Issue Date'\}/)
  assert.match(source, /label=\{isQuotation \? 'Valid Until' : 'Due Date'\}/)
  // Persistence contract intact: same state keys flow both ways.
  assert.match(source, /value=\{invoice\.issue_date \|\| ''\}/)
  assert.match(source, /value=\{invoice\.due_date \|\| ''\}/)
  assert.match(source, /onChange=\{\(next\) => updateInvoice\('issue_date', next\)\}/)
  assert.match(source, /onChange=\{\(next\) => updateInvoice\('due_date', next\)\}/)
  // No native date input remains on this form; text fields still use Input.
  assert.doesNotMatch(source, /type="date"/)
  assert.match(source, /<Input/)
})

test('date-field: picker shell follows theme and safe-area conventions', () => {  const source = fs.readFileSync(path.resolve('src/components/ui/date-field.tsx'), 'utf8')
  const sheetSource = fs.readFileSync(path.resolve('src/components/ui/sheet.tsx'), 'utf8')
  // Sheet surface itself is theme-aware in the shared primitive.
  assert.match(sheetSource, /bg-bd-overlay-bg/)
  // Picker content uses overlay tokens, so dark mode never shows a white surface.
  assert.match(source, /text-bd-overlay-text/)
  assert.match(source, /border-bd-overlay-border/)
  assert.match(source, /env\(safe-area-inset-bottom\)/)
  assert.match(source, /max-w-md/)
  assert.match(source, /aria-label/)
  assert.match(source, /Previous month/)
  assert.match(source, /Next month/)
  // No native date input inside the shared picker.
  assert.doesNotMatch(source, /<input[^>]*type="date"/)
  assert.doesNotMatch(source, /showPicker/)
})

const MIGRATED_DATE_FILES = [
  'src/components/document/FormHeader.tsx',
  'src/components/waybill/WaybillForm.tsx',
  'src/components/boq/BoqForm.tsx',
  'src/components/rfq/RfqForm.tsx',
  'src/components/csr/CsrFormScreen.tsx',
  'src/components/document-view/invoice/InvoiceRecordPaymentSheet.tsx',
  'src/components/query/QueryFilterOverlay.tsx',
  'src/components/compliance/VatInputsPanel.tsx',
  'src/components/compliance/TaxRemindersPanel.tsx',
  'src/components/compliance/TaxFilingsPanel.tsx',
  'src/components/compliance/RecordCaptureSheet.tsx',
  'src/components/reports/ReportsFilterBar.tsx',
  'src/components/reports/TaxSection.tsx',
  'src/components/reports/ReceivablesSection.tsx',
  'src/components/reports/CollectionsSection.tsx',
  'src/components/project/ProjectDocumentStep3Review.tsx',
  'src/components/project/detail/ProjectDetailHeader.tsx',
  'src/pages/tax/NewTaxComputation.tsx',
  'src/pages/LetterFormPage.tsx',
  'src/pages/NewProject.tsx',
  'src/pages/settings/ArchivesSettingsSection.tsx',
  'src/pages/accounting/Periods.tsx',
  'src/pages/accounting/NewJournalEntry.tsx',
]

test('date-field: every migrated form uses DateField with no native date input left', () => {
  for (const file of MIGRATED_DATE_FILES) {
    const source = fs.readFileSync(path.resolve(file), 'utf8')
    assert.match(source, /DateField/, `${file} must use the shared DateField`)
    assert.doesNotMatch(source, /type="date"/, `${file} must not keep a native date input`)
  }
})

test('date-field: migrated fields preserve state keys and empty-value contracts', () => {
  const cases = [
    ['src/components/waybill/WaybillForm.tsx', /onChange=\{\(next\) => updateWaybill\('date', next\)\}/],
    ['src/components/boq/BoqForm.tsx', /onChange=\{\(next\) => onChange\(\{ issue_date: next \}\)\}/],
    ['src/components/rfq/RfqForm.tsx', /onChange=\{\(next\) => onUpdateRfq\(\{ issue_date: next \}\)\}/],
    ['src/components/csr/CsrFormScreen.tsx', /onChange=\{\(next\) => onUpdate\('start_date', next\)\}/],
    ['src/components/document-view/invoice/InvoiceRecordPaymentSheet.tsx', /onChange=\{\(next\) => setField\('date', next\)\}/],
    // Null-on-empty contracts preserved for optional period fields.
    ['src/components/compliance/TaxRemindersPanel.tsx', /period_start: next \|\| null/],
    ['src/components/compliance/TaxFilingsPanel.tsx', /submitted_at: next \|\| null/],
    ['src/pages/LetterFormPage.tsx', /disabled=\{!isDraft\}/],
    ['src/pages/accounting/NewJournalEntry.tsx', /id="je-date"/],
  ]
  for (const [file, pattern] of cases) {
    const source = fs.readFileSync(path.resolve(file), 'utf8')
    assert.match(source, pattern, `${file} must preserve its date contract`)
  }
})
