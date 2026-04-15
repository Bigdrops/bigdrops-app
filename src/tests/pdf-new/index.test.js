import test from 'node:test'
import assert from 'node:assert/strict'

import {
  generateInvoicePdf,
  generateQuotationPdf,
} from '../../components/pdf-new/index.ts'

test('generateInvoicePdf warns that the new invoice pdf system is not implemented yet', async () => {
  const warnings = []
  const originalWarn = console.warn
  console.warn = (...args) => {
    warnings.push(args)
  }

  try {
    const result = await generateInvoicePdf({
      documentNumber: 'INV-001',
    })

    assert.deepEqual(result, { status: 'not-implemented' })
    assert.equal(warnings.length, 1)
    assert.match(String(warnings[0]?.[0] || ''), /invoice/i)
    assert.match(String(warnings[0]?.[0] || ''), /not implemented/i)
  } finally {
    console.warn = originalWarn
  }
})

test('generateQuotationPdf warns that the new quotation pdf system is not implemented yet', async () => {
  const warnings = []
  const originalWarn = console.warn
  console.warn = (...args) => {
    warnings.push(args)
  }

  try {
    const result = await generateQuotationPdf({
      documentNumber: 'QUO-001',
    })

    assert.deepEqual(result, { status: 'not-implemented' })
    assert.equal(warnings.length, 1)
    assert.match(String(warnings[0]?.[0] || ''), /quotation/i)
    assert.match(String(warnings[0]?.[0] || ''), /not implemented/i)
  } finally {
    console.warn = originalWarn
  }
})
