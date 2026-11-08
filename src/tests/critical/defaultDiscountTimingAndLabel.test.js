import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { emptyPurchaseOrderCalculationInputs, parsePurchaseOrderCalculationInputs } from '../../domain/purchase-order/types.ts'
import { toFormDiscountTiming } from '../../domain/purchase-order/formAdapter.ts'
import { DEFAULT_CONVERSION_OPTIONS } from '../../domain/cps/conversion.ts'

const root = path.resolve('.')

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8')
}

test('FormCommercialTerms displays Apply discount label above Before/After VAT toggle', () => {
  const termsSource = read('src/components/document/FormCommercialTerms.tsx')

  // Label must be "Apply discount" (rendered uppercase as "APPLY DISCOUNT" via .cps-label)
  assert.match(termsSource, /<label className="cps-label">Apply discount<\/label>/)
  assert.doesNotMatch(termsSource, /When discount reduces tax/i)
})

test('QuotationFormPage defaults discount timing to before and discount type to percent', () => {
  const quotationSource = read('src/pages/QuotationFormPage.tsx')

  // Initial state defaults
  assert.match(quotationSource, /const \[discountType, setDiscountType\] = useState<'fixed' \| 'percent'>\('percent'\)/)
  assert.match(quotationSource, /const \[discountTiming, setDiscountTiming\] = useState<'before' \| 'after'>\('before'\)/)

  // Edit / duplicate fallback defaults when customFields discount is unset
  assert.match(quotationSource, /setDiscountType\(\(parsedCf\?\.discountType as 'fixed' \| 'percent'\) \|\| 'percent'\)/)
  assert.match(quotationSource, /setDiscountTiming\(\(parsedCf\?\.discountTiming as 'before' \| 'after'\) \|\| 'before'\)/)
})

test('Invoice editable state defaults discount timing to before and discount type to percent', () => {
  const invoiceHookSource = read('src/hooks/useInvoiceEditableState.ts')

  assert.match(invoiceHookSource, /const \[discountType, setDiscountType\] = useState<DiscountType>\('percent'\)/)
  assert.match(invoiceHookSource, /const \[discountTiming, setDiscountTiming\] = useState<DiscountTiming>\('before'\)/)
})

test('Purchase Order domain and calculation inputs default discount timing to before_tax', () => {
  const emptyInputs = emptyPurchaseOrderCalculationInputs()
  assert.equal(emptyInputs.discountTiming, 'before_tax')
  assert.equal(emptyInputs.discountType, 'percent')

  // Maps to 'before' for the form toggle
  assert.equal(toFormDiscountTiming(emptyInputs.discountTiming), 'before')

  // Fallback for unset inputs
  const parsed = parsePurchaseOrderCalculationInputs({})
  assert.equal(parsed.discountTiming, 'before_tax')
  assert.equal(parsed.discountType, 'percent')
})

test('CPS conversion options default discount timing to before and discount type to percent', () => {
  assert.equal(DEFAULT_CONVERSION_OPTIONS.discountTiming, 'before')
  assert.equal(DEFAULT_CONVERSION_OPTIONS.discountType, 'percent')

  const sheetSource = read('src/components/cps/CpsConversionOptionsSheet.tsx')
  assert.match(sheetSource, /useState<'fixed' \| 'percent'>\('percent'\)/)
  assert.match(sheetSource, /useState<'before' \| 'after'>\('before'\)/)
})
