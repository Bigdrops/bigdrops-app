import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { formatDocumentNumber, parseTrailingSequence, resolvePrefix } from '../../domain/prefixConstants.ts'
import {
  AUTO_CURSOR_KEY,
  clearAutoCursors,
  cursorFamiliesForPrefixKey,
  findFreeSequence,
  mergeAutoCursor,
  mergePrefixUpdate,
  nextAutomaticNumber,
  readAutoCursor,
  resetAllPrefixesUpdate,
  resetPrefixUpdate,
} from '../../domain/prefixConstants.ts'
import { getNextInvoiceNumber } from '../../domain/documentConversion.ts'
import { getNextQuotationNumber } from '../../domain/quotation/normalize.ts'
import { getNextRfqNumber } from '../../domain/rfq/normalize.ts'
import { getNextBoqNumber } from '../../domain/boq/normalize.ts'
import { getNextCsrNumber } from '../../domain/csr/csrNumbering.ts'
import { getNextWaybillNumber } from '../../components/waybill/waybillUtils.ts'
import { withUniqueRetry } from '../../lib/withUniqueRetry.ts'

test('numbering: canonical formatter matches the Settings preview contract', () => {
  assert.equal(formatDocumentNumber('SASINV', 1), 'SASINV-000001')
  assert.equal(formatDocumentNumber('SASINV', 114), 'SASINV-000114')
  assert.equal(formatDocumentNumber('QTN', 7), 'QTN-000007')
  assert.equal(parseTrailingSequence('SASINV113'), 113)
  assert.equal(parseTrailingSequence('SASINV-000113'), 113)
  assert.equal(parseTrailingSequence('SPECIAL-INV-2026-A'), null)
  assert.equal(parseTrailingSequence(''), null)
})

test('numbering: invoice auto generation follows the configured format', () => {
  // Reported defect: SASINV110-113 existed without dash or padding.
  const rows = ['SASINV110', 'SASINV111', 'SASINV112', 'SASINV113'].map((invoice_number) => ({ invoice_number }))
  assert.equal(getNextInvoiceNumber(rows, 'SASINV'), 'SASINV-000114')
  assert.equal(getNextInvoiceNumber([], 'SASINV'), 'SASINV-000001')
  // Other families and custom identifiers do not disturb the sequence.
  assert.equal(getNextInvoiceNumber([...rows, { invoice_number: 'QTN-000001' }], 'SASINV'), 'SASINV-000114')
  assert.equal(getNextInvoiceNumber([...rows, { invoice_number: 'SPECIAL-INV-2026-A' }], 'SASINV'), 'SASINV-000114')
  // Same-prefix custom numbers participate so the next auto never collides.
  assert.equal(getNextInvoiceNumber([...rows, { invoice_number: 'SASINV-000200' }], 'SASINV'), 'SASINV-000201')
  // Legacy padded rows keep working.
  assert.equal(getNextInvoiceNumber([{ invoice_number: 'SASINV-000009' }], 'SASINV'), 'SASINV-000010')
})

test('numbering: quotation, rfq, boq generators follow the canonical format', () => {
  assert.equal(getNextQuotationNumber([], 'SASQ'), 'SASQ-000001')
  assert.equal(getNextQuotationNumber([{ quotation_number: 'SASQ-0042' }], 'SASQ'), 'SASQ-000043')
  assert.equal(getNextRfqNumber([], 'RFQ'), 'RFQ-000001')
  assert.equal(getNextRfqNumber([{ rfq_number: 'RFQ-0012' }], 'RFQ'), 'RFQ-000013')
  assert.equal(getNextBoqNumber([], 'BOQ'), 'BOQ-000001')
  assert.equal(getNextBoqNumber([{ boq_number: 'BOQ-0099' }], 'BOQ'), 'BOQ-000100')
})

test('numbering: csr and waybill generators follow the canonical serial width', () => {
  assert.equal(getNextCsrNumber(null, 'SASCSR'), 'SASCSR-000001')
  assert.equal(getNextCsrNumber('SASCSR-000041', 'SASCSR'), 'SASCSR-000042')
  assert.equal(getNextWaybillNumber('external', [], 'WBL'), 'WBL-E-000001')
  assert.equal(getNextWaybillNumber('internal', ['WBL-I-000003'], 'WBL'), 'WBL-I-000004')
})

test('numbering: Settings preview templates cannot silently diverge from the canonical format', () => {
  const source = fs.readFileSync(path.resolve('src/pages/settings/DocumentPrefixesSettingsSection.tsx'), 'utf8')
  for (const key of ['invoice', 'quotation', 'rfq', 'boq', 'csr', 'receipt', 'letter', 'project']) {
    assert.match(source, new RegExp(`${key}: \\(p\\) => \\[`), `preview template for ${key} must exist`)
  }
  // Every preview example uses the 6-digit serial the canonical formatter emits.
  const previews = [...source.matchAll(/`\$\{p\}([^`]*)-0+1`/g)].map((m) => m[0])
  assert.ok(previews.length > 0, 'preview templates must show zero-padded serials')
  for (const preview of previews) {
    assert.match(preview, /-0{5}1/, `preview ${preview} must use a 6-digit serial`)
  }
  assert.equal(formatDocumentNumber('SASINV', 1), 'SASINV-000001')
})

test('numbering: conflicting manual number is rejected, never substituted', async () => {
  // Exact regression case: SASINV-CUSTOM exists, user enters SASINV-CUSTOM.
  const seen = []
  let regenerations = 0
  const result = await withUniqueRetry(
    async (candidate) => {
      seen.push(candidate)
      return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } }
    },
    async () => {
      regenerations += 1
      return 'SASINV-000114'
    },
    'SASINV-CUSTOM',
  )
  assert.deepEqual(seen, ['SASINV-CUSTOM'])
  assert.equal(regenerations, 0)
  assert.equal(result.data, null)
  assert.equal(result.error?.code, '23505')
})

test('numbering: explicit manual number survives creation unchanged', async () => {
  const seen = []
  const result = await withUniqueRetry(
    async (candidate) => {
      seen.push(candidate)
      return { data: { n: candidate }, error: null }
    },
    async () => 'SASINV-000114',
    'SPECIAL-INV-2026-A',
  )
  assert.deepEqual(seen, ['SPECIAL-INV-2026-A'])
  assert.equal(result.data.n, 'SPECIAL-INV-2026-A')
})

test('numbering: empty manual number invokes automatic sequencing', async () => {
  for (const empty of [undefined, '']) {
    const seen = []
    const result = await withUniqueRetry(
      async (candidate) => {
        seen.push(candidate)
        return { data: { n: candidate }, error: null }
      },
      async () => 'SASINV-000114',
      empty?.trim() || undefined,
    )
    assert.deepEqual(seen, ['SASINV-000114'])
    assert.equal(result.data.n, 'SASINV-000114')
  }
})

test('numbering: duplicate protection still retries and surfaces terminal errors', async () => {
  let calls = 0
  const result = await withUniqueRetry(
    async () => {
      calls += 1
      return { data: null, error: { code: '23505', message: 'duplicate' } }
    },
    async () => 'SASINV-000114',
    undefined,
    2,
  )
  assert.equal(calls, 3)
  assert.equal(result.error.code, '23505')

  const other = await withUniqueRetry(
    async () => ({ data: null, error: { code: '42501', message: 'denied' } }),
    async () => 'SASINV-000114',
    undefined,
  )
  assert.equal(other.error.code, '42501')
})

test('numbering: manual custom numbers do not corrupt the subsequent auto sequence', () => {
  const rows = [
    { invoice_number: 'SASINV-000113' },
    { invoice_number: 'SPECIAL-INV-2026-A' },
  ]
  assert.equal(getNextInvoiceNumber(rows, 'SASINV'), 'SASINV-000114')
})

test('numbering: exact required sequence with manual identifiers interleaved', () => {
  // Standard §5.2 normative example. Cursor starts empty (fresh family).
  const family = 'K-'
  const occupied = new Set()
  let cursor = undefined

  const auto = () => {
    const { candidate, seq } = nextAutomaticNumber(family, cursor, [...occupied])
    occupied.add(candidate)
    cursor = seq + 1
    return candidate
  }
  const manual = (value) => {
    // Manuals occupy exactly their identifier and never move the cursor.
    occupied.add(value)
    return value
  }

  assert.equal(auto(), 'K-000001')
  assert.equal(auto(), 'K-000002')
  assert.equal(manual('KP-000007'), 'KP-000007')
  assert.equal(auto(), 'K-000003')
  assert.equal(manual('K-000005'), 'K-000005')
  assert.equal(auto(), 'K-000004')
  // The cursor reaches occupied K-000005 and skips it. Never duplicated.
  assert.equal(auto(), 'K-000006')
  assert.equal([...occupied].filter((n) => n === 'K-000005').length, 1)
})

test('numbering: manuals never advance the cursor even inside the active family', () => {
  const family = 'K-'
  // Autos reached 3; a same-family manual lands far above.
  const occupied = new Set(['K-000001', 'K-000002', 'K-000003', 'K-000005'])
  const first = nextAutomaticNumber(family, 4, [...occupied])
  assert.equal(first.candidate, 'K-000004')
  // Cursor still 5 afterwards from the caller's perspective: the manual
  // contributed nothing. Next call with cursor 5 skips the manual.
  const second = nextAutomaticNumber(family, 5, [...occupied, first.candidate])
  assert.equal(second.candidate, 'K-000006')
})

test('numbering: bootstrap absorbs legacy rows without reusing identifiers', () => {
  // No cursor yet (pre-contract history): start above everything once.
  const occupied = ['SASINV110', 'SASINV-000113', 'SASINV-900000']
  const maxSeq = Math.max(...occupied.map((n) => parseTrailingSequence(n) ?? 0))
  const first = nextAutomaticNumber('SASINV-', undefined, occupied, maxSeq)
  assert.equal(first.candidate, 'SASINV-900001')
})

test('numbering: cursor persistence helpers are monotonic and lossless', () => {
  assert.equal(readAutoCursor(null, 'SASINV-'), undefined)
  assert.equal(readAutoCursor({}, 'SASINV-'), undefined)
  assert.equal(readAutoCursor({ [AUTO_CURSOR_KEY]: { 'SASINV-': 4 } }, 'SASINV-'), 4)
  assert.equal(readAutoCursor({ [AUTO_CURSOR_KEY]: { 'SASINV-': 'x' } }, 'SASINV-'), undefined)

  const merged = mergeAutoCursor({ invoice: 'SASINV', [AUTO_CURSOR_KEY]: { 'SASINV-': 4 } }, 'SASINV-', 3)
  assert.equal(merged.invoice, 'SASINV')
  assert.deepEqual(merged[AUTO_CURSOR_KEY], { 'SASINV-': 4 })

  const advanced = mergeAutoCursor({}, 'SASINV-', 5)
  assert.deepEqual(advanced[AUTO_CURSOR_KEY], { 'SASINV-': 5 })

  assert.deepEqual(cursorFamiliesForPrefixKey('waybill', 'WBL'), ['WBL-E-', 'WBL-I-', 'WBL-ME-', 'WBL-MI-'])
  assert.deepEqual(cursorFamiliesForPrefixKey('csr', 'SASCSR'), ['SASCSR-', 'SASCSR-M-'])
  assert.deepEqual(cursorFamiliesForPrefixKey('invoice', 'SASINV'), ['SASINV-'])

  const cleared = clearAutoCursors(
    { invoice: 'SASINV', [AUTO_CURSOR_KEY]: { 'SASINV-': 9, 'WBL-E-': 2 } },
    ['SASINV-'],
  )
  assert.equal(cleared.invoice, 'SASINV')
  assert.deepEqual(cleared[AUTO_CURSOR_KEY], { 'WBL-E-': 2 })

  const emptied = clearAutoCursors({ [AUTO_CURSOR_KEY]: { 'SASINV-': 9 } }, ['SASINV-'])
  assert.ok(!(AUTO_CURSOR_KEY in emptied))

  const draft = mergePrefixUpdate({ invoice: 'OLD', [AUTO_CURSOR_KEY]: { 'SASINV-': 9 } }, { invoice: 'SASINV' })
  assert.equal(draft.invoice, 'SASINV')
  assert.deepEqual(draft[AUTO_CURSOR_KEY], { 'SASINV-': 9 })

  const reset = resetPrefixUpdate({ invoice: 'SASINV', [AUTO_CURSOR_KEY]: { 'SASINV-': 9 } }, 'invoice', 'INV', ['SASINV-', 'INV-'])
  assert.equal(reset.invoice, 'INV')
  assert.ok(!(AUTO_CURSOR_KEY in reset))

  const full = resetAllPrefixesUpdate({ invoice: 'X', [AUTO_CURSOR_KEY]: { 'K-': 2 } }, { invoice: 'INV' })
  assert.equal(full.invoice, 'INV')
  assert.ok(!(AUTO_CURSOR_KEY in full))

  assert.equal(findFreeSequence('K-', 5, new Set(['K-000005', 'K-000006'])), 7)
  assert.equal(findFreeSequence('K-', 1, new Set()), 1)
})

test('numbering: save paths separate manual identity from automatic allocation', () => {
  // Only explicitly typed values may seed the retry as manual; untouched
  // pre-fills and empty fields take the automatic path. Automatic success
  // advances the cursor; manual success never does.
  const hookFiles = [
    'src/hooks/useInvoiceSave.ts',
    'src/hooks/useQuotationSave.ts',
    'src/domain/waybill/waybillMutations.ts',
  ]
  for (const file of hookFiles) {
    const source = fs.readFileSync(path.resolve(file), 'utf8')
    assert.match(source, /numberIsManual/, `${file} must track manual identity`)
    assert.match(source, /advanceAutoCursor/, `${file} must advance the cursor on automatic success`)
    assert.match(source, /fetchAutoCursor/, `${file} must read the cursor for automatic candidates`)
  }
  for (const file of ['src/pages/NewRfq.tsx', 'src/pages/NewBoq.tsx']) {
    const source = fs.readFileSync(path.resolve(file), 'utf8')
    assert.match(source, /advanceAutoCursor/, `${file} must advance the cursor on automatic success`)
  }
  const csr = fs.readFileSync(path.resolve('src/pages/CsrFormPage.tsx'), 'utf8')
  assert.match(csr, /autoNumberRef/, 'CSR must compare the field against the last system pre-fill')
  assert.match(csr, /advanceAutoCursor/, 'CSR must advance the cursor on automatic success')
})

test('numbering: settings writes preserve cursor state and resets clear it', () => {
  const source = fs.readFileSync(path.resolve('src/pages/settings/DocumentPrefixesSettingsSection.tsx'), 'utf8')
  assert.match(source, /mergePrefixUpdate/, 'prefix saves must merge instead of replacing')
  assert.match(source, /resetPrefixUpdate/, 'solo resets must clear the affected cursor families')
  assert.match(source, /resetAllPrefixesUpdate/, 'full reset must drop all cursor state')
  assert.match(source, /readRawPrefixes/, 'writes must merge over fresh raw JSON')
})

test('numbering: form init preserves typed manual numbers', () => {
  const invoice = fs.readFileSync(path.resolve('src/pages/InvoiceFormPage.tsx'), 'utf8')
  assert.match(invoice, /current!\.invoice_number\?\.trim\(\) \? current/, 'invoice init must not clobber manual numbers')
  const quotation = fs.readFileSync(path.resolve('src/pages/QuotationFormPage.tsx'), 'utf8')
  assert.match(quotation, /current\.quotation_number \|\| nextQuotationNumber/, 'quotation init must not clobber manual numbers')
  assert.equal(resolvePrefix({ invoice: 'SASINV' }, 'invoice'), 'SASINV')
  assert.equal(resolvePrefix(null, 'invoice'), 'INV')
})
