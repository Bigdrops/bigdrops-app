import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createAccount,
  createPeriod,
  createJournalEntry,
  createSeedChartOfAccounts,
  debit,
  credit,
  postEntry,
  reverseEntry,
  normalizeIdempotencyKey,
  linesAreBalanced,
  PostingError,
} from '../../domain/accounting/index.ts'

function setup() {
  const accounts = createSeedChartOfAccounts()
  const periods = [
    createPeriod({ code: '2026-09', startDate: '2026-09-01', endDate: '2026-09-30' }),
  ]
  periods[0].state = 'open'
  return { accounts, periods }
}

function makeEntry(overrides = {}) {
  const base = createJournalEntry({
    idempotencyKey: normalizeIdempotencyKey('payment', 'pmt-1', 'revenue'),
    periodCode: '2026-09',
    transactionDate: '2026-09-15',
    sourceRef: { sourceType: 'payment', sourceId: 'pmt-1' },
    lines: [debit('1100', '1000.00'), credit('4000', '1000.00')],
  })
  return { ...base, ...overrides }
}

test('balanced entry posts', () => {
  const { accounts, periods } = setup()
  const posted = postEntry({ entry: makeEntry(), accounts, periods })
  assert.equal(posted.status, 'posted')
  assert.ok(posted.postedAt)
})

test('unbalanced entry is rejected', () => {
  const { accounts, periods } = setup()
  const entry = makeEntry({ lines: [debit('1100', '1000.00'), credit('4000', '999.99')] })
  assert.throws(() => postEntry({ entry, accounts, periods }), PostingError)
})

test('exact money: 0.1 plus 0.2 balances 0.3 without float drift', () => {
  const { accounts, periods } = setup()
  const entry = makeEntry({
    lines: [debit('1100', '0.10'), debit('1100', '0.20'), credit('4000', '0.30')],
  })
  assert.equal(linesAreBalanced(entry.lines), true)
  assert.doesNotThrow(() => postEntry({ entry, accounts, periods }))
})

test('only open periods accept ordinary postings', () => {
  const { accounts } = setup()
  for (const state of ['planned', 'closed', 'locked']) {
    const period = createPeriod({ code: `P-${state}`, startDate: '2026-09-01', endDate: '2026-09-30' })
    period.state = state
    const entry = makeEntry({ periodCode: `P-${state}` })
    assert.throws(
      () => postEntry({ entry, accounts, periods: [period] }),
      PostingError,
      `${state} period must reject ordinary postings`,
    )
  }
})

test('transaction date outside period boundaries is rejected', () => {
  const { accounts, periods } = setup()
  const entry = makeEntry({ transactionDate: '2026-08-31' })
  assert.throws(() => postEntry({ entry, accounts, periods }), PostingError)
})

test('unknown account is rejected', () => {
  const { accounts, periods } = setup()
  const entry = makeEntry({ lines: [debit('9999', '100.00'), credit('4000', '100.00')] })
  assert.throws(() => postEntry({ entry, accounts, periods }), PostingError)
})

test('inactive account is rejected', () => {
  const { accounts, periods } = setup()
  const inactive = createAccount({ code: '9000', name: 'Retired', type: 'expense', normalBalance: 'debit' })
  inactive.active = false
  const entry = makeEntry({
    lines: [debit('9000', '100.00'), credit('4000', '100.00')],
  })
  assert.throws(
    () => postEntry({ entry, accounts: [...accounts, inactive], periods }),
    PostingError,
  )
})

test('missing source reference is rejected', () => {
  const { accounts, periods } = setup()
  const entry = makeEntry({ sourceRef: null })
  assert.throws(() => postEntry({ entry, accounts, periods }), PostingError)
})

test('missing idempotency key is rejected', () => {
  const { accounts, periods } = setup()
  const entry = makeEntry({ idempotencyKey: '' })
  assert.throws(() => postEntry({ entry, accounts, periods }), PostingError)
})

test('negative amount is rejected; use the opposite side instead', () => {
  const { accounts, periods } = setup()
  const entry = makeEntry({ lines: [debit('1100', '-100.00'), credit('4000', '-100.00')] })
  assert.throws(() => postEntry({ entry, accounts, periods }), PostingError)
})

test('reversal is equal-and-opposite, linked, and marks the original reversed', () => {
  const { accounts, periods } = setup()
  const original = postEntry({ entry: makeEntry(), accounts, periods })
  const { reversal, updatedOriginal } = reverseEntry({
    entry: original,
    reversalPeriodCode: '2026-09',
    accounts,
    periods,
    reversalIdempotencyKey: normalizeIdempotencyKey('correction', 'corr-1', 'reversal'),
  })
  assert.equal(reversal.lines.length, 2)
  assert.equal(reversal.lines[0].side, 'credit')
  assert.equal(reversal.lines[0].amount, '1000.00')
  assert.equal(reversal.lines[1].side, 'debit')
  assert.equal(reversal.lines[1].amount, '1000.00')
  assert.equal(linesAreBalanced(reversal.lines), true)
  assert.equal(updatedOriginal.status, 'reversed')
  assert.ok(updatedOriginal.reversedByEntryId)
  assert.equal(reversal.reversalOfEntryId, original.id ?? original.idempotencyKey)
})

test('reversal requires a postable target period', () => {
  const { accounts } = setup()
  const period = createPeriod({ code: '2026-09', startDate: '2026-09-01', endDate: '2026-09-30' })
  period.state = 'open'
  const original = postEntry({ entry: makeEntry(), accounts, periods: [period] })
  // Close the period, then a reversal into it must be rejected.
  period.state = 'closed'
  assert.throws(
    () =>
      reverseEntry({
        entry: original,
        reversalPeriodCode: '2026-09',
        accounts,
        periods: [period],
        reversalIdempotencyKey: 'correction:corr-2:reversal',
      }),
    PostingError,
  )
})

test('already-reversed entry cannot be reversed again', () => {
  const { accounts, periods } = setup()
  const original = postEntry({ entry: makeEntry(), accounts, periods })
  const first = reverseEntry({
    entry: original,
    reversalPeriodCode: '2026-09',
    accounts,
    periods,
    reversalIdempotencyKey: 'correction:corr-3:reversal',
  })
  assert.throws(
    () =>
      reverseEntry({
        entry: first.updatedOriginal,
        reversalPeriodCode: '2026-09',
        accounts,
        periods,
        reversalIdempotencyKey: 'correction:corr-4:reversal',
      }),
    /already reversed/,
  )
})

test('seed chart of accounts: unique codes and correct normal balances', () => {
  const accounts = createSeedChartOfAccounts()
  const codes = accounts.map((a) => a.code)
  assert.equal(new Set(codes).size, codes.length)
  const bank = accounts.find((a) => a.code === '1100')
  assert.equal(bank.name, 'Bank')
  assert.equal(bank.normalBalance, 'debit')
  const vatControl = accounts.find((a) => a.code === '2100')
  assert.equal(vatControl.normalBalance, 'credit')
  const accumulatedDepreciation = accounts.find((a) => a.code === '1510')
  assert.equal(accumulatedDepreciation.type, 'asset')
  assert.equal(accumulatedDepreciation.normalBalance, 'credit')
})

test('idempotency key is deterministic per source event and purpose', () => {
  assert.equal(
    normalizeIdempotencyKey('payment', 'pmt-9', 'revenue'),
    normalizeIdempotencyKey('payment', 'pmt-9', 'revenue'),
  )
  assert.notEqual(
    normalizeIdempotencyKey('payment', 'pmt-9', 'revenue'),
    normalizeIdempotencyKey('payment', 'pmt-9', 'vat'),
  )
})