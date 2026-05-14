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
  getLegacyAdvanceStatus,
  isLegacyAdvanceChildRow,
  isOrphanAdvanceChildRow,
  isArchivedOrQuarantinedAdvanceChildRow,
  isActiveRuntimeAdvanceMetadata,
  isHistoricalAdvanceArtifact,
} from '@/domain/invoice/advanceLegacyCleanup'
import {
  getAdvanceInvoiceMetadata,
  isAdvanceInvoiceParent,
  isMalformedAdvanceMetadata,
  normalizeAdvanceMetadata,
  mergeAdvanceInvoiceMetadata,
} from '@/domain/invoice/advanceMetadata'
import {
  runAdvanceDiagnostics,
  detectParentsMissingCanonicalMetadata,
  detectOrphanAdvanceRows,
  detectInconsistentParentChildMetadata,
  identifyRowsSafeForArchival,
} from '@/domain/invoice/advanceDiagnostics'

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

  // Test: getAdvanceSummaryValues — metadata-only, no legacy fallback
  test('should use parent metadata when present', () => {
    const parent = createParentWithMetadata()
    const result = getAdvanceSummaryValues(parent)
    return result !== null && result.primaryLabel === 'Metadata Primary'
  })

  test('should return null for legacy child rows — no fallback', () => {
    const legacyChild = {
      ...createLegacyAdvanceChild(),
      custom_fields: {
        advance_invoice: {
          role: 'advance',
          mode: 'percent',
          value: 25,
          contractValue: 800,
          primaryLabel: 'Legacy Primary',
        },
      },
    }
    return getAdvanceSummaryValues(legacyChild) === null
  })

  test('should return null for non-advance invoices', () => {
    const regular = createNonAdvanceInvoice()
    return getAdvanceSummaryValues(regular) === null
  })

  // Test: getAdvanceDraftFromInvoice — metadata-only
  test('getAdvanceDraftFromInvoice should use parent metadata when present', () => {
    const parent = createParentWithMetadata()
    const result = getAdvanceDraftFromInvoice(parent)
    return result.primaryLabel === 'Metadata Primary'
  })

  test('getAdvanceDraftFromInvoice should return defaults when no parent metadata', () => {
    const regular = createNonAdvanceInvoice()
    const result = getAdvanceDraftFromInvoice(regular)
    return result.primaryLabel === 'Advance invoice due now' && result.mode === 'percent'
  })

  // Test: Malformed metadata rejection
  test('isMalformedAdvanceMetadata should reject child-role configs', () => {
    return isMalformedAdvanceMetadata({ role: 'advance', amount: 100 }) === true
  })

  test('isMalformedAdvanceMetadata should reject unknown keys', () => {
    return isMalformedAdvanceMetadata({ enabled: true, amount: 500, mode: 'fixed', value: 500, badKey: true }) === true
  })

  test('isMalformedAdvanceMetadata should reject invalid mode', () => {
    return isMalformedAdvanceMetadata({ enabled: true, amount: 500, mode: 'nonsense', value: 500 }) === true
  })

  test('isMalformedAdvanceMetadata should accept valid metadata', () => {
    return isMalformedAdvanceMetadata({ enabled: true, amount: 500, mode: 'fixed', value: 500 }) === false
  })

  // Test: Diagnostic utilities
  test('runAdvanceDiagnostics should produce summary counts', () => {
    const rows = [
      createParentWithMetadata(),
      createLegacyAdvanceChild({ id: 'c1' }),
      createLegacyAdvanceChild({ id: 'c2', archived_at: '2024-01-01' }),
      createLegacyAdvanceChild({ id: 'c3', parent_invoice_id: null }),
      createNonAdvanceInvoice(),
    ]
    const { summary } = runAdvanceDiagnostics(rows)
    return summary.totalRows === 5
      && summary.legacyChildren === 3
      && summary.archivedOrQuarantined === 1
      && summary.orphans === 1
      && summary.activeLegacy === 1
      && summary.parentsWithMetadata === 1
  })

  test('detectOrphanAdvanceRows should find orphan rows', () => {
    const rows = [
      createLegacyAdvanceChild({ id: 'c1' }),
      createLegacyAdvanceChild({ id: 'c2', parent_invoice_id: null }),
      createParentWithMetadata(),
    ]
    const orphans = detectOrphanAdvanceRows(rows)
    return orphans.length === 1 && orphans[0].id === 'c2'
  })

  test('detectInconsistentParentChildMetadata should flag missing parent metadata', () => {
    const parentWithoutMetadata = {
      id: 'parent-456',
      invoice_number: 'INV-002',
      custom_fields: {},
      total: 1000,
    }
    const child = createLegacyAdvanceChild({ parent_invoice_id: 'parent-456' })
    const rows = [parentWithoutMetadata, child]
    const warnings = detectInconsistentParentChildMetadata(rows)
    return warnings.length === 1 && warnings[0].warning.includes('no advance metadata')
  })

  test('identifyRowsSafeForArchival should identify archived, orphan, and metadata-backed rows', () => {
    const parentWithMetadata = createParentWithMetadata()
    const rows = [
      parentWithMetadata,
      createLegacyAdvanceChild({ id: 'c1', archived_at: '2024-01-01' }),
      createLegacyAdvanceChild({ id: 'c2', parent_invoice_id: null }),
      createLegacyAdvanceChild({ id: 'c3', parent_invoice_id: 'parent-123' }),
    ]
    const safe = identifyRowsSafeForArchival(rows)
    return safe.length === 3
      && safe.some((s) => s.id === 'c1' && s.reason === 'archived')
      && safe.some((s) => s.id === 'c2' && s.reason === 'orphan')
      && safe.some((s) => s.id === 'c3' && s.reason === 'parent_has_metadata')
  })

  // Test: Defensive guardrails
  test('should handle null invoice gracefully', () => {
    return getAdvanceSummaryValues(null) === null && getAdvanceDraftFromInvoice(null) !== null
  })

  test('should handle undefined invoice gracefully', () => {
    return getAdvanceSummaryValues(undefined) === null && getAdvanceDraftFromInvoice(undefined) !== null
  })

  // Regression: Historical access boundary helpers
  test('isActiveRuntimeAdvanceMetadata should return true for parent with valid metadata', () => {
    const parent = createParentWithMetadata()
    return isActiveRuntimeAdvanceMetadata(parent) === true
  })

  test('isActiveRuntimeAdvanceMetadata should return false for legacy child row', () => {
    const child = createLegacyAdvanceChild()
    return isActiveRuntimeAdvanceMetadata(child) === false
  })

  test('isActiveRuntimeAdvanceMetadata should return false for regular invoice', () => {
    const regular = createNonAdvanceInvoice()
    return isActiveRuntimeAdvanceMetadata(regular) === false
  })

  test('isActiveRuntimeAdvanceMetadata should return false for null/undefined', () => {
    return isActiveRuntimeAdvanceMetadata(null) === false
      && isActiveRuntimeAdvanceMetadata(undefined) === false
  })

  test('isHistoricalAdvanceArtifact should return true for legacy child row', () => {
    const child = createLegacyAdvanceChild()
    return isHistoricalAdvanceArtifact(child) === true
  })

  test('isHistoricalAdvanceArtifact should return false for parent metadata row', () => {
    const parent = createParentWithMetadata()
    return isHistoricalAdvanceArtifact(parent) === false
  })

  test('isHistoricalAdvanceArtifact should return false for regular invoice', () => {
    const regular = createNonAdvanceInvoice()
    return isHistoricalAdvanceArtifact(regular) === false
  })

  // Regression: normalizeAdvanceMetadata fail-closed
  test('normalizeAdvanceMetadata should return valid metadata for good input', () => {
    const result = normalizeAdvanceMetadata({
      enabled: true,
      amount: 5000,
      mode: 'fixed',
      value: 5000,
      document_number: 'INV-001-A',
    })
    return result !== null
      && result.amount === 5000
      && result.document_number === 'INV-001-A'
  })

  test('normalizeAdvanceMetadata should return null for malformed input', () => {
    const result = normalizeAdvanceMetadata({
      enabled: true,
      amount: 5000,
      mode: 'nonsense' as any,
      value: 5000,
    })
    return result === null
  })

  test('normalizeAdvanceMetadata should return null for input with unknown keys', () => {
    const result = normalizeAdvanceMetadata({
      enabled: true,
      amount: 5000,
      mode: 'fixed',
      value: 5000,
      badKey: 'hack' as any,
    } as any)
    return result === null
  })

  // Regression: mergeAdvanceInvoiceMetadata preserves unrelated custom fields
  test('mergeAdvanceInvoiceMetadata should preserve unrelated keys', () => {
    const merged = mergeAdvanceInvoiceMetadata(
      { signature_url: 'sig.png', notes_title: 'My Notes' },
      normalizeAdvanceMetadata({ enabled: true, amount: 5000, mode: 'fixed', value: 5000 })!,
    )
    return merged.signature_url === 'sig.png'
      && merged.notes_title === 'My Notes'
      && merged.advance_invoice.amount === 5000
  })

  // Regression: hasMeaningfulParentMetadata rejects malformed configs (fail-closed)
  test('getAdvanceInvoiceMetadata should return null for malformed but enabled config', () => {
    const result = getAdvanceInvoiceMetadata({
      custom_fields: {
        advance_invoice: {
          enabled: true,
          amount: NaN,
          mode: 'fixed',
          value: 5000,
        },
      },
    })
    return result === null
  })

  test('getAdvanceDraftFromInvoice should return defaults for malformed parent metadata', () => {
    const draft = getAdvanceDraftFromInvoice({
      invoice_number: 'INV-001',
      custom_fields: {
        advance_invoice: {
          enabled: true,
          amount: 5000,
          mode: 'nonsense',
          value: 5000,
        },
      },
    })
    return draft.mode === 'percent' && draft.inputValue === 30
  })

  // Regression: Prevention of child-row authority restoration
  test('child row with role:advance must never be treated as parent by isAdvanceInvoiceParent', () => {
    const childConfig = {
      custom_fields: {
        advance_invoice: {
          role: 'advance',
          parentId: 'parent-1',
          mode: 'fixed',
          value: 500,
          contractValue: 1000,
          primaryLabel: 'Child Label',
          secondaryLabel: 'Child Balance',
        },
      },
    }
    return isAdvanceInvoiceParent(childConfig) === false
  })

  test('getAdvanceSummaryValues must return null for child row with rich legacy config', () => {
    const richChildRow = {
      total: 500,
      custom_fields: {
        advance_invoice: {
          role: 'advance',
          parentId: 'parent-1',
          mode: 'percent',
          value: 30,
          contractValue: 1000,
          primaryLabel: 'Child Primary',
          secondaryLabel: 'Child Secondary',
        },
      },
    }
    return getAdvanceSummaryValues(richChildRow) === null
  })

  test('getAdvanceDraftFromInvoice must not use child-row labels as defaults', () => {
    const childRow = {
      invoice_number: 'INV-001-A',
      total: 500,
      custom_fields: {
        advance_invoice: {
          role: 'advance',
          parentId: 'parent-1',
          primaryLabel: 'Child Draft Label',
          secondaryLabel: 'Child Draft Secondary',
        },
      },
    }
    const draft = getAdvanceDraftFromInvoice(childRow)
    return draft.primaryLabel === 'Advance invoice due now'
      && draft.secondaryLabel === 'Balance upon completion'
  })

  // Regression: runAdvanceDiagnostics with regular invoices (no advance config) should not count as missing metadata
  test('runAdvanceDiagnostics should not count regular invoices as parentsMissingMetadata', () => {
    const rows = [
      createNonAdvanceInvoice(),
      createNonAdvanceInvoice({ id: 'regular-2', invoice_number: 'INV-003' }),
      createParentWithMetadata(),
    ]
    const { summary } = runAdvanceDiagnostics(rows)
    return summary.parentsWithMetadata === 1
      && summary.parentsMissingMetadata === 0
  })

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`)
  return failed === 0
}

runTests()