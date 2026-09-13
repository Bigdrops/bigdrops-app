import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createAccount,
  createPeriod,
  createSeedChartOfAccounts,
  postEntry,
  linesAreBalanced,
} from '../../domain/accounting/index.ts'
import { createTaxJournalEntry, TAX_ACCOUNTS } from '../../domain/tax/taxBridge.ts'

// ── Gate G: Tax Computation → Journal Entry Bridge — Critical Tests ──
// These tests verify:
//   - createTaxJournalEntry produces a balanced draft journal entry
//   - CIT expense = tax_payable + development_levy
//   - Development levy line included only when non-zero
//   - Source reference traces to the computation result
//   - Idempotency key is deterministic
//   - Error on zero total expense
//   - Error on missing accounts
//   - Error on inactive accounts
//   - Error on no open period
//   - Seed chart includes tax accounts
//   - Bridge output passes accounting kernel validation

// ── Shared test data ──

function makeResult(overrides = {}) {
  return {
    assessment_profit: '20000000.00',
    chargeable_income: '20000000.00',
    tax_payable: '6000000.00',
    tax_credits: '0.00',
    development_levy: '800000.00',
    etr_rate: '0.30',
    etr_flagged: false,
    classification: {
      company_type: 'large_company',
      cit_rate: '0.30',
      is_small_company: false,
      development_levy_applies: true,
      development_levy_rate: '0.04',
    },
    trace: {
      accounting_profit: '20000000.00',
      tax_adjustments: [],
      adjusted_profit: '20000000.00',
      capital_allowances: [],
      total_capital_allowances: '0.00',
      assessable_profit: '20000000.00',
      loss_deducted: '0.00',
      chargeable_income: '20000000.00',
      cit_rate: '0.30',
      cit_before_credits: '6000000.00',
      tax_credits: [],
      development_levy: '800000.00',
      tax_payable: '6000000.00',
      classification: {},
      rule_versions: {},
    },
    rule_versions: {},
    status: 'finalized',
    ...overrides,
  }
}

function setup() {
  const accounts = createSeedChartOfAccounts()
  const periods = [
    createPeriod({ code: '2026-09', startDate: '2026-09-01', endDate: '2026-09-30' }),
  ]
  periods[0].state = 'open'
  return { accounts, periods }
}

// ── 1. Bridge exports ──

test('bridge: exports createTaxJournalEntry', async () => {
  const mod = await import('../../domain/tax/taxBridge.ts')
  assert.equal(typeof mod.createTaxJournalEntry, 'function')
})

test('bridge: exports TAX_ACCOUNTS constants', async () => {
  const mod = await import('../../domain/tax/taxBridge.ts')
  assert.equal(mod.TAX_ACCOUNTS.TAX_EXPENSE, '5500')
  assert.equal(mod.TAX_ACCOUNTS.CIT_PAYABLE, '2310')
  assert.equal(mod.TAX_ACCOUNTS.DEV_LEVY_PAYABLE, '2320')
})

// ── 2. Balanced journal entry ──

test('bridge: produces a balanced journal entry', () => {
  const { accounts, periods } = setup()
  const entry = createTaxJournalEntry({
    result: makeResult({ tax_payable: '6000000.00' }),
    development_levy: '800000.00',
    accounts,
    periods,
  })

  assert.equal(linesAreBalanced(entry.lines), true)
  // Dr 5500: 6,800,000.00 = Cr 2310: 6,000,000.00 + Cr 2320: 800,000.00
  assert.equal(entry.lines.length, 3)
})

test('bridge: CIT expense equals tax_payable plus development_levy', () => {
  const { accounts, periods } = setup()
  const entry = createTaxJournalEntry({
    result: makeResult({ tax_payable: '6000000.00' }),
    development_levy: '800000.00',
    accounts,
    periods,
  })

  const dr = entry.lines.find((l) => l.side === 'debit')
  assert.ok(dr)
  assert.equal(dr.accountCode, '5500')
  assert.equal(dr.amount, '6800000.00')

  const crCIT = entry.lines.find((l) => l.accountCode === '2310')
  assert.ok(crCIT)
  assert.equal(crCIT.side, 'credit')
  assert.equal(crCIT.amount, '6000000.00')

  const crDevLevy = entry.lines.find((l) => l.accountCode === '2320')
  assert.ok(crDevLevy)
  assert.equal(crDevLevy.side, 'credit')
  assert.equal(crDevLevy.amount, '800000.00')
})

// ── 3. Development levy line ──

test('bridge: development levy line excluded when zero', () => {
  const { accounts, periods } = setup()
  const entry = createTaxJournalEntry({
    result: makeResult({ tax_payable: '6000000.00' }),
    development_levy: '0.00',
    accounts,
    periods,
  })

  // Only 2 lines: Dr 5500, Cr 2310
  assert.equal(entry.lines.length, 2)
  assert.equal(entry.lines.find((l) => l.accountCode === '2320'), undefined)
})

test('bridge: development levy line included when non-zero', () => {
  const { accounts, periods } = setup()
  const entry = createTaxJournalEntry({
    result: makeResult({ tax_payable: '6000000.00' }),
    development_levy: '800000.00',
    accounts,
    periods,
  })

  const crDevLevy = entry.lines.find((l) => l.accountCode === '2320')
  assert.ok(crDevLevy)
  assert.equal(crDevLevy.side, 'credit')
  assert.equal(crDevLevy.amount, '800000.00')
})

// ── 4. Source reference and idempotency ──

test('bridge: source reference traces to the computation result', () => {
  const { accounts, periods } = setup()
  const result = makeResult({ assessment_profit: '20000000.00' })
  const entry = createTaxJournalEntry({
    result,
    development_levy: '0.00',
    accounts,
    periods,
  })

  assert.equal(entry.sourceRef.sourceType, 'tax_computation')
  assert.ok(entry.sourceRef.sourceId.includes('20000000'))
})

test('bridge: idempotency key is deterministic for same inputs', () => {
  const { accounts, periods } = setup()
  const result = makeResult()
  const e1 = createTaxJournalEntry({ result, development_levy: '0.00', accounts, periods })
  const e2 = createTaxJournalEntry({ result, development_levy: '0.00', accounts, periods })

  assert.equal(e1.idempotencyKey, e2.idempotencyKey)
})

// ── 5. Error cases ──

test('bridge: throws on zero total expense', () => {
  const { accounts, periods } = setup()
  assert.throws(
    () =>
      createTaxJournalEntry({
        result: makeResult({ tax_payable: '0.00' }),
        development_levy: '0.00',
        accounts,
        periods,
      }),
    /total tax expense is zero/,
  )
})

test('bridge: throws on missing tax expense account', () => {
  const periods = [
    createPeriod({ code: '2026-09', startDate: '2026-09-01', endDate: '2026-09-30' }),
  ]
  periods[0].state = 'open'

  const accounts = [
    createAccount({ code: '2310', name: 'CIT Payable', type: 'liability', normalBalance: 'credit' }),
  ]

  assert.throws(
    () =>
      createTaxJournalEntry({
        result: makeResult({ tax_payable: '6000000.00' }),
        development_levy: '0.00',
        accounts,
        periods,
      }),
    /5500.*not found/,
  )
})

test('bridge: throws on missing CIT payable account', () => {
  const periods = [
    createPeriod({ code: '2026-09', startDate: '2026-09-01', endDate: '2026-09-30' }),
  ]
  periods[0].state = 'open'

  const accounts = [
    createAccount({ code: '5500', name: 'Tax Expense', type: 'expense', normalBalance: 'debit' }),
  ]

  assert.throws(
    () =>
      createTaxJournalEntry({
        result: makeResult({ tax_payable: '6000000.00' }),
        development_levy: '0.00',
        accounts,
        periods,
      }),
    /2310.*not found/,
  )
})

test('bridge: throws on missing dev levy account when levy non-zero', () => {
  const periods = [
    createPeriod({ code: '2026-09', startDate: '2026-09-01', endDate: '2026-09-30' }),
  ]
  periods[0].state = 'open'

  const accounts = [
    createAccount({ code: '5500', name: 'Tax Expense', type: 'expense', normalBalance: 'debit' }),
    createAccount({ code: '2310', name: 'CIT Payable', type: 'liability', normalBalance: 'credit' }),
  ]

  assert.throws(
    () =>
      createTaxJournalEntry({
        result: makeResult({ tax_payable: '6000000.00' }),
        development_levy: '800000.00',
        accounts,
        periods,
      }),
    /2320.*not found/,
  )
})

test('bridge: throws on inactive tax expense account', () => {
  const periods = [
    createPeriod({ code: '2026-09', startDate: '2026-09-01', endDate: '2026-09-30' }),
  ]
  periods[0].state = 'open'

  const taxExpense = createAccount({ code: '5500', name: 'Tax Expense', type: 'expense', normalBalance: 'debit' })
  taxExpense.active = false

  const accounts = [
    taxExpense,
    createAccount({ code: '2310', name: 'CIT Payable', type: 'liability', normalBalance: 'credit' }),
  ]

  assert.throws(
    () =>
      createTaxJournalEntry({
        result: makeResult({ tax_payable: '6000000.00' }),
        development_levy: '0.00',
        accounts,
        periods,
      }),
    /Tax Expense.*inactive/,
  )
})

test('bridge: throws when no open period exists', () => {
  const accounts = createSeedChartOfAccounts()
  const periods = [
    createPeriod({ code: '2026-09', startDate: '2026-09-01', endDate: '2026-09-30' }),
  ]
  periods[0].state = 'closed'

  assert.throws(
    () =>
      createTaxJournalEntry({
        result: makeResult({ tax_payable: '6000000.00' }),
        development_levy: '0.00',
        accounts,
        periods,
      }),
    /no open accounting period/,
  )
})

// ── 6. Seed chart has tax accounts ──

test('seed chart: includes CIT accounts', () => {
  const accounts = createSeedChartOfAccounts()
  const codes = new Set(accounts.map((a) => a.code))

  assert.ok(codes.has('5500'), 'seed chart must include Tax Expense (5500)')
  assert.ok(codes.has('2310'), 'seed chart must include CIT Payable (2310)')
  assert.ok(codes.has('2320'), 'seed chart must include Dev Levy Payable (2320)')
})

test('seed chart: CIT accounts have correct types and normal balances', () => {
  const accounts = createSeedChartOfAccounts()
  const taxExpense = accounts.find((a) => a.code === '5500')
  assert.ok(taxExpense)
  assert.equal(taxExpense.type, 'expense')
  assert.equal(taxExpense.normalBalance, 'debit')

  const citPayable = accounts.find((a) => a.code === '2310')
  assert.ok(citPayable)
  assert.equal(citPayable.type, 'liability')
  assert.equal(citPayable.normalBalance, 'credit')

  const devLevyPayable = accounts.find((a) => a.code === '2320')
  assert.ok(devLevyPayable)
  assert.equal(devLevyPayable.type, 'liability')
  assert.equal(devLevyPayable.normalBalance, 'credit')
})

// ── 7. Bridge output passes accounting kernel validation ──

test('bridge: output passes postEntry validation', () => {
  const { accounts, periods } = setup()
  const entry = createTaxJournalEntry({
    result: makeResult({ tax_payable: '6000000.00' }),
    development_levy: '800000.00',
    accounts,
    periods,
  })

  // Should not throw — the entry is valid and postable
  const posted = postEntry({ entry, accounts, periods })
  assert.equal(posted.status, 'posted')
  assert.ok(posted.postedAt)
})

test('bridge: zero-levy output passes postEntry validation', () => {
  const { accounts, periods } = setup()
  const entry = createTaxJournalEntry({
    result: makeResult({ tax_payable: '6000000.00' }),
    development_levy: '0.00',
    accounts,
    periods,
  })

  const posted = postEntry({ entry, accounts, periods })
  assert.equal(posted.status, 'posted')
})

// ── 8. Edge case: small company (zero tax) ──

test('bridge: small company with zero tax throws (nothing to post)', () => {
  const { accounts, periods } = setup()
  assert.throws(
    () =>
      createTaxJournalEntry({
        result: makeResult({ tax_payable: '0.00' }),
        development_levy: '0.00',
        accounts,
        periods,
      }),
    /total tax expense is zero/,
  )
})

// ── 9. Memo field ──

test('bridge: memo includes assessment profit', () => {
  const { accounts, periods } = setup()
  const entry = createTaxJournalEntry({
    result: makeResult({ assessment_profit: '20000000.00' }),
    development_levy: '0.00',
    accounts,
    periods,
  })

  assert.ok(entry.memo)
  assert.ok(entry.memo.includes('20000000'))
})

// ── 10. Exact money: decimal precision ──

test('bridge: handles fractional kobo amounts correctly', () => {
  const { accounts, periods } = setup()
  const entry = createTaxJournalEntry({
    result: makeResult({ tax_payable: '6000000.33' }),
    development_levy: '800000.17',
    accounts,
    periods,
  })

  assert.equal(linesAreBalanced(entry.lines), true)
  const dr = entry.lines.find((l) => l.side === 'debit')
  assert.ok(dr)
  assert.equal(dr.amount, '6800000.50')
})
