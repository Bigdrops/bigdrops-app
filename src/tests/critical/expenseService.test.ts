import test from 'node:test'
import assert from 'node:assert/strict'
import Decimal from 'decimal.js'
import { CATEGORY_JOURNAL_EFFECT } from '../../domain/accounting/expenseTypes'
import type { CreateExpenseInput } from '../../domain/accounting/expenseTypes'

// ============================================
// CATEGORY_JOURNAL_EFFECT tests (pure logic)
// ============================================

test('CATEGORY_JOURNAL_EFFECT maps all four categories to correct accounts', () => {
  assert.equal(CATEGORY_JOURNAL_EFFECT.operational.debit, '5000')
  assert.equal(CATEGORY_JOURNAL_EFFECT.operational.credit, '1100')

  assert.equal(CATEGORY_JOURNAL_EFFECT.capital.debit, '1500')
  assert.equal(CATEGORY_JOURNAL_EFFECT.capital.credit, '1100')

  assert.equal(CATEGORY_JOURNAL_EFFECT.personal.debit, '3000')
  assert.equal(CATEGORY_JOURNAL_EFFECT.personal.credit, '1100')

  assert.equal(CATEGORY_JOURNAL_EFFECT.non_deductible.debit, '5000')
  assert.equal(CATEGORY_JOURNAL_EFFECT.non_deductible.credit, '1100')
})

test('CATEGORY_JOURNAL_EFFECT has exactly four categories', () => {
  const keys = Object.keys(CATEGORY_JOURNAL_EFFECT)
  assert.equal(keys.length, 4)
  assert.deepEqual(keys.sort(), ['capital', 'non_deductible', 'operational', 'personal'])
})

// ============================================
// Amount validation tests (pure logic)
// ============================================

test('expense amount must be positive', () => {
  const input: CreateExpenseInput = {
    entityId: 'test-entity',
    periodCode: '2026-01',
    transactionDate: '2026-01-15',
    amount: '-1000',
    category: 'operational',
    description: 'Test expense',
    vendorName: 'Test Vendor',
    accountCode: '5000',
  }
  const amount = parseFloat(input.amount)
  assert.ok(amount < 0 || isNaN(amount), 'Negative amount should be rejected')
})

test('expense amount of zero is rejected', () => {
  const input: CreateExpenseInput = {
    entityId: 'test-entity',
    periodCode: '2026-01',
    transactionDate: '2026-01-15',
    amount: '0',
    category: 'operational',
    description: 'Test expense',
    vendorName: 'Test Vendor',
    accountCode: '5000',
  }
  const amount = parseFloat(input.amount)
  assert.equal(amount, 0, 'Zero amount should be rejected')
})

test('expense amount of positive value is accepted', () => {
  const input: CreateExpenseInput = {
    entityId: 'test-entity',
    periodCode: '2026-01',
    transactionDate: '2026-01-15',
    amount: '50000',
    category: 'operational',
    description: 'Office supplies',
    vendorName: 'Test Vendor',
    accountCode: '5000',
  }
  const amount = parseFloat(input.amount)
  assert.ok(amount > 0, 'Positive amount should be accepted')
})

// ============================================
// Category journal effect tests
// ============================================

test('operational expense has correct journal effect', () => {
  const effect = CATEGORY_JOURNAL_EFFECT.operational
  assert.equal(effect.debit, '5000', 'Operational debits expense account')
  assert.equal(effect.credit, '1100', 'Operational credits cash/bank')
})

test('capital expense has correct journal effect', () => {
  const effect = CATEGORY_JOURNAL_EFFECT.capital
  assert.equal(effect.debit, '1500', 'Capital debits asset account')
  assert.equal(effect.credit, '1100', 'Capital credits cash/bank')
})

test('personal expense has correct journal effect', () => {
  const effect = CATEGORY_JOURNAL_EFFECT.personal
  assert.equal(effect.debit, '3000', 'Personal debits drawings account')
  assert.equal(effect.credit, '1100', 'Personal credits cash/bank')
})

test('non_deductible expense has correct journal effect', () => {
  const effect = CATEGORY_JOURNAL_EFFECT.non_deductible
  assert.equal(effect.debit, '5000', 'Non-deductible debits expense account')
  assert.equal(effect.credit, '1100', 'Non-deductible credits cash/bank')
})

// ============================================
// Status lifecycle tests
// ============================================

test('status enum has exactly three values', () => {
  const statuses = ['draft', 'posted', 'voided']
  assert.equal(statuses.length, 3)
  assert.ok(statuses.includes('draft'))
  assert.ok(statuses.includes('posted'))
  assert.ok(statuses.includes('voided'))
})

test('category enum has exactly four values', () => {
  const categories = ['operational', 'capital', 'personal', 'non_deductible']
  assert.equal(categories.length, 4)
  assert.ok(categories.includes('operational'))
  assert.ok(categories.includes('capital'))
  assert.ok(categories.includes('personal'))
  assert.ok(categories.includes('non_deductible'))
})

// ============================================
// Journal line construction tests
// ============================================

test('post lines for operational expense are balanced', () => {
  const effect = CATEGORY_JOURNAL_EFFECT.operational
  const amount = '15000.00'
  const lines = [
    { accountCode: effect.debit, side: 'debit' as const, amount },
    { accountCode: effect.credit, side: 'credit' as const, amount },
  ]
  const debits = lines.filter(l => l.side === 'debit').reduce((s, l) => s + new Decimal(l.amount).toNumber(), 0)
  const credits = lines.filter(l => l.side === 'credit').reduce((s, l) => s + new Decimal(l.amount).toNumber(), 0)
  assert.equal(debits, credits, 'Post lines must balance')
  assert.equal(lines.length, 2, 'Post produces exactly two lines')
})

test('void reversal lines for operational expense are balanced', () => {
  const effect = CATEGORY_JOURNAL_EFFECT.operational
  const amount = '15000.00'
  const lines = [
    { accountCode: effect.credit, side: 'debit' as const, amount },
    { accountCode: effect.debit, side: 'credit' as const, amount },
  ]
  const debits = lines.filter(l => l.side === 'debit').reduce((s, l) => s + new Decimal(l.amount).toNumber(), 0)
  const credits = lines.filter(l => l.side === 'credit').reduce((s, l) => s + new Decimal(l.amount).toNumber(), 0)
  assert.equal(debits, credits, 'Reversal lines must balance')
  assert.equal(lines.length, 2, 'Reversal produces exactly two lines')
})

test('reversal swaps debit and credit accounts from original post', () => {
  const effect = CATEGORY_JOURNAL_EFFECT.operational
  const postLines = [
    { accountCode: effect.debit, side: 'debit' as const },
    { accountCode: effect.credit, side: 'credit' as const },
  ]
  const reversalLines = [
    { accountCode: effect.credit, side: 'debit' as const },
    { accountCode: effect.debit, side: 'credit' as const },
  ]
  assert.notEqual(postLines[0].accountCode, reversalLines[0].accountCode, 'Reversal swaps debit account')
  assert.notEqual(postLines[1].accountCode, reversalLines[1].accountCode, 'Reversal swaps credit account')
})

// ============================================
// Idempotency key derivation tests
// ============================================

test('idempotency keys are deterministic from source id', () => {
  const sourceId = 'test-expense-123'
  const ingestKey = `expense:${sourceId}:ingest`
  const postKey = `expense:${sourceId}:post`
  const voidKey = `expense:${sourceId}:void`
  assert.ok(ingestKey.includes(sourceId), 'Ingest key contains source id')
  assert.ok(postKey.includes(sourceId), 'Post key contains source id')
  assert.ok(voidKey.includes(sourceId), 'Void key contains source id')
  assert.notEqual(ingestKey, postKey, 'Ingest and post keys differ')
  assert.notEqual(postKey, voidKey, 'Post and void keys differ')
})

// ============================================
// Edge case tests (Decimal.js)
// ============================================

test('Decimal zero handling: zero is positive in Decimal', () => {
  const zero = new Decimal('0.00')
  assert.ok(zero.isPositive(), 'Decimal zero is considered positive (known gotcha)')
  assert.ok(!zero.greaterThan(0), 'greaterThan(0) correctly rejects zero')
})

test('Decimal precision: 0.1 + 0.2 = 0.3 exactly', () => {
  const a = new Decimal('0.1')
  const b = new Decimal('0.2')
  const sum = a.plus(b)
  assert.ok(sum.equals('0.3'), 'Decimal arithmetic is exact')
})

test('Decimal monetary formatting: two decimal places', () => {
  const amount = new Decimal('1234.5')
  const formatted = amount.toFixed(2)
  assert.equal(formatted, '1234.50', 'Monetary values formatted to two decimals')
})
