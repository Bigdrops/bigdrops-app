import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const read = (relativePath) => fs.readFileSync(path.resolve(relativePath), 'utf8')

test('reports tax helper separates invoice VAT, expected invoice WHT, and payment WHT', () => {
  const reportUtilsSource = read('src/components/reports/reportUtils.ts')

  assert.match(reportUtilsSource, /export const computeReportTaxMetrics =/)
  assert.match(reportUtilsSource, /vatChargedValue = invoices\.reduce\(\(sum, row\) => sum \+ Number\(row\?\.vat \|\| 0\), 0\)/)
  assert.match(reportUtilsSource, /expectedWhtExposureValue = invoices\.reduce\(\(sum, row\) => sum \+ Number\(row\?\.wht \|\| 0\), 0\)/)
  assert.match(reportUtilsSource, /actualWhtDeductedValue = payments\.reduce\(\(sum, row\) => sum \+ Number\(row\?\.wht_amount \|\| 0\), 0\)/)
  assert.match(reportUtilsSource, /vatLessActualWhtValue = vatChargedValue - actualWhtDeductedValue/)
})

test('reports overview and tax section use the split WHT labels', () => {
  const reportsSource = read('src/pages/Reports.tsx')
  const overviewSource = read('src/components/reports/OverviewSection.tsx')
  const taxSectionSource = read('src/components/reports/TaxSection.tsx')

  assert.match(reportsSource, /expectedWhtExposure: formatMoney\(expectedWhtExposureValue\)/)
  assert.match(reportsSource, /actualWhtDeducted: formatMoney\(actualWhtDeductedValue\)/)
  assert.match(reportsSource, /vatLessActualWht: formatMoney\(vatLessActualWhtValue\)/)

  assert.match(overviewSource, /Expected WHT Exposure/)
  assert.match(overviewSource, /Actual WHT Deducted/)
  assert.match(overviewSource, /VAT Less Actual WHT/)
  assert.doesNotMatch(overviewSource, /WHT Received/)

  assert.match(taxSectionSource, /Expected WHT Exposure/)
  assert.match(taxSectionSource, /Actual WHT Deducted/)
  assert.match(taxSectionSource, /VAT Less Actual WHT/)
  assert.doesNotMatch(taxSectionSource, /label: 'WHT Received'/)
})
