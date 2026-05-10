/**
 * Manual verification script for advance invoice runtime filtering behavior
 * 
 * Run with: npx tsx src/tests/invoice/advanceRuntimeFilters.verify.ts
 */

import { 
  getAdvanceSummaryValues 
} from '@/domain/invoice/advanceSummary'
import { 
  getAdvanceDraftFromInvoice 
} from '@/domain/invoice/advanceChildFlow'
import { 
  shouldExcludeFromRuntime, 
  getActiveLegacyAdvanceChildren,
  getLegacyAdvanceStatus 
} from '@/domain/invoice/advanceLegacyCleanup'

// Test helpers
const createLegacyAdvanceChild = (overrides: Record<string, unknown> = {}) => ({
  id: 'test-id',
  invoice_number: 'INV-001-A',
  custom_fields: {
    advance_invoice: {
      role: 'advance',
      parentId: 'parent-123',
      mode: 'percent',
      value: 30,
      contractValue: 1000,
      primaryLabel: 'Test Advance',
      secondaryLabel: 'Balance due',
    },
    ...overrides,
  },
  total: 300,
  archived_at: null,
  parent_invoice_id: 'parent-123',
  ...overrides,
})

const createParentWithMetadata = (overrides: Record<string, unknown> = {}) => ({
  id: 'parent-123',
  invoice_number: 'INV-001',
  custom_fields: {
    advance_invoice: {
      enabled: true,
      amount: 300,
      mode: 'percentage',
      value: 30,
      document_number: 'INV-001-A',
      primary_label: 'Metadata Primary',
      secondary_label: 'Metadata Secondary',
      contract_value: 1000,
      legacy_child_invoice_id: 'child-123',
    },
    ...overrides,
  },
  total: 1000,
  ...overrides,
})

const createNonAdvanceInvoice = (overrides: Record<string, unknown> = {}) => ({
  id: 'regular-123',
  invoice_number: 'INV-002',
  custom_fields: {},
  total: 500,
  ...overrides,
})

function runTests() {
  console.log('=== Running Advance Runtime Filters Tests ===\n')
  let passed = 0
  let failed = 0

  function test(name: string, fn: () => boolean) {
    try {
      if (fn()) {
        console.log(`✓ ${name}`)
        passed++
      } else {
        console.log(`✗ ${name}`)
        failed++
      }
    } catch (e) {
      console.log(`✗ ${name} - Error: ${e}`)
      failed++
    }
  }

  // Test: shouldExcludeFromRuntime
  test('should exclude archived legacy child rows', () => {
    const archived = createLegacyAdvanceChild({ archived_at: '2024-01-01' })
    return shouldExcludeFromRuntime(archived) === true
  })

  test('should exclude orphan legacy child rows', () => {
    const orphan = createLegacyAdvanceChild({ parent_invoice_id: null })
    return shouldExcludeFromRuntime(orphan) === true
  })

  test('should NOT exclude active legacy child rows', () => {
    const active = createLegacyAdvanceChild()
    return shouldExcludeFromRuntime(active) === false
  })

  // Test: getActiveLegacyAdvanceChildren
  test('should filter out archived and orphan rows', () => {
    const invoices = [
      createLegacyAdvanceChild({ id: '1' }),
      createLegacyAdvanceChild({ id: '2', archived_at: '2024-01-01' }),
      createLegacyAdvanceChild({ id: '3', parent_invoice_id: null }),
      createLegacyAdvanceChild({ id: '4' }),
    ]

    const active = getActiveLegacyAdvanceChildren(invoices)
    return active.length === 2 && active[0].id === '1' && active[1].id === '4'
  })

  // Test: getLegacyAdvanceStatus
  test('should return quarantined for archived rows', () => {
    const archived = createLegacyAdvanceChild({ archived_at: '2024-01-01' })
    return getLegacyAdvanceStatus(archived) === 'quarantined'
  })

  test('should return orphan for rows without parent', () => {
    const orphan = createLegacyAdvanceChild({ parent_invoice_id: null })
    return getLegacyAdvanceStatus(orphan) === 'orphan'
  })

  test('should return active for healthy legacy children', () => {
    const active = createLegacyAdvanceChild()
    return getLegacyAdvanceStatus(active) === 'active'
  })

  // Test: getAdvanceSummaryValues fallback behavior
  test('should use parent metadata when present', () => {
    const parent = createParentWithMetadata()
    const result = getAdvanceSummaryValues(parent)
    return result !== null && result.primaryLabel === 'Metadata Primary'
  })

  test('should NOT use legacy fallback for archived child rows', () => {
    const archived = createLegacyAdvanceChild({ archived_at: '2024-01-01' })
    const result = getAdvanceSummaryValues(archived)
    return result !== null && result.primaryLabel === 'Advance invoice due now'
  })

  test('should NOT use legacy fallback for orphan rows', () => {
    const orphan = createLegacyAdvanceChild({ parent_invoice_id: null })
    const result = getAdvanceSummaryValues(orphan)
    return result !== null && result.primaryLabel === 'Advance invoice due now'
  })

  test('should use legacy fallback for active non-archived non-orphan rows WITHOUT parent metadata', () => {
    const legacyChild = {
      ...createLegacyAdvanceChild(),
      custom_fields: {
        advance_invoice: {
          role: 'advance',
          mode: 'percent',
          value: 25,
          contractValue: 800,
          primaryLabel: 'Legacy Primary',
          secondaryLabel: 'Legacy Secondary',
        },
      },
    }
    
    const result = getAdvanceSummaryValues(legacyChild)
    return result !== null && result.primaryLabel === 'Legacy Primary'
  })

  test('should return null for non-advance invoices', () => {
    const regular = createNonAdvanceInvoice()
    return getAdvanceSummaryValues(regular) === null
  })

  // Test: getAdvanceDraftFromInvoice fallback behavior
  test('getAdvanceDraftFromInvoice should use parent metadata when present', () => {
    const parent = createParentWithMetadata()
    const result = getAdvanceDraftFromInvoice(parent)
    return result.primaryLabel === 'Metadata Primary'
  })

  test('getAdvanceDraftFromInvoice should NOT use legacy fallback for archived child rows', () => {
    const archived = createLegacyAdvanceChild({ archived_at: '2024-01-01' })
    const result = getAdvanceDraftFromInvoice(archived)
    return result.primaryLabel === 'Advance invoice due now'
  })

  test('getAdvanceDraftFromInvoice should NOT use legacy fallback for orphan rows', () => {
    const orphan = createLegacyAdvanceChild({ parent_invoice_id: null })
    const result = getAdvanceDraftFromInvoice(orphan)
    return result.primaryLabel === 'Advance invoice due now'
  })

  test('getAdvanceDraftFromInvoice should use legacy fallback for active non-archived non-orphan rows WITHOUT parent metadata', () => {
    const legacyChild = {
      ...createLegacyAdvanceChild(),
      custom_fields: {
        advance_invoice: {
          role: 'advance',
          mode: 'fixed',
          value: 500,
          primaryLabel: 'Draft Legacy',
          secondaryLabel: 'Draft Secondary',
        },
      },
    }
    
    const result = getAdvanceDraftFromInvoice(legacyChild)
    return result.primaryLabel === 'Draft Legacy' && result.mode === 'fixed'
  })

  // Test: Non-advance invoices remain unaffected
  test('getAdvanceSummaryValues should return null for regular invoices', () => {
    const regular = createNonAdvanceInvoice()
    return getAdvanceSummaryValues(regular) === null
  })

  test('getAdvanceDraftFromInvoice should return default values for regular invoices', () => {
    const regular = createNonAdvanceInvoice()
    const result = getAdvanceDraftFromInvoice(regular)
    return result.primaryLabel === 'Advance invoice due now' && result.mode === 'percent'
  })

  // Test: Defensive guardrails
  test('should handle null invoice gracefully', () => {
    return getAdvanceSummaryValues(null) === null && getAdvanceDraftFromInvoice(null) !== null
  })

  test('should handle undefined invoice gracefully', () => {
    return getAdvanceSummaryValues(undefined) === null && getAdvanceDraftFromInvoice(undefined) !== null
  })

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`)
  return failed === 0
}

runTests()