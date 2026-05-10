// @ts-nocheck
/**
 * Test suite for advance invoice runtime filtering behavior
 * DISABLED — vitest not installed in project. Re-enable after adding vitest to deps.
 *
 * Tests the following scenarios:
 * - Archived row exclusion
 * - Orphan exclusion
 * - Fallback precedence ordering
 * - Metadata-first resolution
 * - Non-advance invoices remaining unaffected
 *
 * To re-enable: move back to src/tests/invoice/, install vitest, remove @ts-nocheck
 */
import { getAdvanceDraftFromInvoice } from '@/domain/invoice/advanceChildFlow'
import { 
  shouldExcludeFromRuntime, 
  getActiveLegacyAdvanceChildren,
  getLegacyAdvanceStatus,
  isOrphanAdvanceChildRow,
  isArchivedOrQuarantinedAdvanceChildRow
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

describe('Legacy Advance Runtime Filters', () => {
  describe('shouldExcludeFromRuntime', () => {
    it('should exclude archived legacy child rows', () => {
      const archived = createLegacyAdvanceChild({ archived_at: '2024-01-01' })
      expect(shouldExcludeFromRuntime(archived)).toBe(true)
    })

    it('should exclude orphan legacy child rows', () => {
      const orphan = createLegacyAdvanceChild({ parent_invoice_id: null })
      expect(shouldExcludeFromRuntime(orphan)).toBe(true)
    })

    it('should NOT exclude active legacy child rows', () => {
      const active = createLegacyAdvanceChild()
      expect(shouldExcludeFromRuntime(active)).toBe(false)
    })
  })

  describe('getActiveLegacyAdvanceChildren', () => {
    it('should filter out archived and orphan rows', () => {
      const invoices = [
        createLegacyAdvanceChild({ id: '1' }),
        createLegacyAdvanceChild({ id: '2', archived_at: '2024-01-01' }),
        createLegacyAdvanceChild({ id: '3', parent_invoice_id: null }),
        createLegacyAdvanceChild({ id: '4' }),
      ]

      const active = getActiveLegacyAdvanceChildren(invoices)
      expect(active).toHaveLength(2)
      expect(active.map(i => i.id)).toEqual(['1', '4'])
    })
  })

  describe('getLegacyAdvanceStatus', () => {
    it('should return quarantined for archived rows', () => {
      const archived = createLegacyAdvanceChild({ archived_at: '2024-01-01' })
      expect(getLegacyAdvanceStatus(archived)).toBe('quarantined')
    })

    it('should return orphan for rows without parent', () => {
      const orphan = createLegacyAdvanceChild({ parent_invoice_id: null })
      expect(getLegacyAdvanceStatus(orphan)).toBe('orphan')
    })

    it('should return active for healthy legacy children', () => {
      const active = createLegacyAdvanceChild()
      expect(getLegacyAdvanceStatus(active)).toBe('active')
    })
  })
})

describe('advanceSummary fallback behavior', () => {
  describe('getAdvanceSummaryValues', () => {
    it('should use parent metadata when present', () => {
      const parent = createParentWithMetadata()
      const result = getAdvanceSummaryValues(parent)
      
      expect(result).not.toBeNull()
      expect(result?.primaryLabel).toBe('Metadata Primary')
      expect(result?.secondaryLabel).toBe('Metadata Secondary')
    })

    it('should NOT use legacy fallback for archived child rows', () => {
      const archived = createLegacyAdvanceChild({ archived_at: '2024-01-01' })
      const result = getAdvanceSummaryValues(archived)
      
      expect(result).not.toBeNull()
      // Should use defaults since legacy fallback is blocked
      expect(result?.primaryLabel).toBe('Advance invoice due now')
    })

    it('should NOT use legacy fallback for orphan rows', () => {
      const orphan = createLegacyAdvanceChild({ parent_invoice_id: null })
      const result = getAdvanceSummaryValues(orphan)
      
      expect(result).not.toBeNull()
      // Should use defaults since legacy fallback is blocked
      expect(result?.primaryLabel).toBe('Advance invoice due now')
    })

    it('should use legacy fallback for active non-archived non-orphan rows WITHOUT parent metadata', () => {
      // Create invoice that IS a legacy child but has no parent metadata on itself
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
      
      expect(result).not.toBeNull()
      expect(result?.primaryLabel).toBe('Legacy Primary')
    })

    it('should return null for non-advance invoices', () => {
      const regular = createNonAdvanceInvoice()
      const result = getAdvanceSummaryValues(regular)
      
      expect(result).toBeNull()
    })
  })
})

describe('getAdvanceDraftFromInvoice fallback behavior', () => {
  describe('getAdvanceDraftFromInvoice', () => {
    it('should use parent metadata when present', () => {
      const parent = createParentWithMetadata()
      const result = getAdvanceDraftFromInvoice(parent)
      
      expect(result.primaryLabel).toBe('Metadata Primary')
      expect(result.secondaryLabel).toBe('Metadata Secondary')
    })

    it('should NOT use legacy fallback for archived child rows', () => {
      const archived = createLegacyAdvanceChild({ archived_at: '2024-01-01' })
      const result = getAdvanceDraftFromInvoice(archived)
      
      // Should use defaults since legacy fallback is blocked
      expect(result.primaryLabel).toBe('Advance invoice due now')
    })

    it('should NOT use legacy fallback for orphan rows', () => {
      const orphan = createLegacyAdvanceChild({ parent_invoice_id: null })
      const result = getAdvanceDraftFromInvoice(orphan)
      
      // Should use defaults since legacy fallback is blocked
      expect(result.primaryLabel).toBe('Advance invoice due now')
    })

    it('should use legacy fallback for active non-archived non-orphan rows WITHOUT parent metadata', () => {
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
      
      expect(result.primaryLabel).toBe('Draft Legacy')
      expect(result.secondaryLabel).toBe('Draft Secondary')
      expect(result.mode).toBe('fixed')
    })
  })
})

describe('Non-advance invoices remain unaffected', () => {
  it('should return null for regular invoices in getAdvanceSummaryValues', () => {
    const regular = createNonAdvanceInvoice()
    const result = getAdvanceSummaryValues(regular)
    
    expect(result).toBeNull()
  })

  it('should return default values for regular invoices in getAdvanceDraftFromInvoice', () => {
    const regular = createNonAdvanceInvoice()
    const result = getAdvanceDraftFromInvoice(regular)
    
    expect(result.primaryLabel).toBe('Advance invoice due now')
    expect(result.secondaryLabel).toBe('Balance upon completion')
    expect(result.mode).toBe('percent')
    expect(result.inputValue).toBe(30)
  })
})

describe('Defensive guardrails', () => {
  it('should handle null invoice gracefully', () => {
    expect(getAdvanceSummaryValues(null)).toBeNull()
    expect(getAdvanceDraftFromInvoice(null)).toBeDefined()
  })

  it('should handle undefined invoice gracefully', () => {
    expect(getAdvanceSummaryValues(undefined)).toBeNull()
    expect(getAdvanceDraftFromInvoice(undefined)).toBeDefined()
  })

  it('should handle empty custom_fields gracefully', () => {
    const empty = createNonAdvanceInvoice({ custom_fields: undefined })
    expect(getAdvanceSummaryValues(empty)).toBeNull()
  })

  it('should handle string custom_fields gracefully', () => {
    const withString = createNonAdvanceInvoice({ custom_fields: '{ "other": "data" }' })
    expect(getAdvanceSummaryValues(withString)).toBeNull()
  })
})