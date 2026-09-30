import { useEntity } from '@/lib/tenant/contexts'
import type { TenantClient } from '@/lib/tenantClient'
import { feedback } from '@/lib/feedback'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { withUniqueRetry } from '@/lib/withUniqueRetry'
import { advanceAutoCursor, fetchAutoCursor } from '@/domain/documentNumbering'
import { parseTrailingSequence, resolvePrefix } from '@/domain/prefixConstants'
import type { Boq } from '@/domain/boq/types'
import { denormalizeToDbBoq, denormalizeToDbBoqRow, getNextBoqNumber } from '@/domain/boq/normalize'
import { computeBoqCommercialView } from '@/domain/boq/calculations'
import { useDocumentSave, type DocumentSaveStrategy } from './useDocumentSave'
import { supabase } from '@/supabase'

type UseBoqSaveParams = {
  getBoq: () => Boq
  initialSnapshot?: Boq | null
  documentPrefixes: unknown
  isCreate: boolean
  isEdit: boolean
  id?: string
  numberIsManual: boolean
  navigate: (path: string) => void
}

type BoqSaveInput = UseBoqSaveParams & {
  tenantClient: TenantClient
}

function validateBoq(boq: Boq): string | null {
  if (!String(boq.boq_number || '').trim()) return 'Enter a Cost & Pricing Sheet number.'
  for (const [index, row] of (boq.table_rows || []).entries()) {
    if (row.row_type === 'section') continue
    if (!String(row.description || '').trim()) return `Enter a description for row ${index + 1}.`
    if (Number(row.quantity || 0) <= 0) return `Enter a quantity greater than zero for row ${index + 1}.`
    if (Number(row.sp || 0) <= 0) return `Enter an SP greater than zero for row ${index + 1}.`
  }
  return null
}

const boqSaveStrategy: DocumentSaveStrategy<BoqSaveInput> = {
  validate(input) {
    const errorDescription = validateBoq(input.getBoq())
    if (errorDescription) return { valid: false, error: 'Save blocked', errorDescription }

    if (input.isEdit && input.initialSnapshot) {
      const current = input.getBoq()
      if (String(current.boq_number || '') !== String(input.initialSnapshot.boq_number || '')) {
        return {
          valid: false,
          error: 'Identity locked',
          errorDescription: 'The Cost & Pricing Sheet number cannot be changed after saving. Duplicate the document to use a different number.',
        }
      }
    }

    return { valid: true }
  },

  buildPayload(input) {
    const boq = input.getBoq()
    const costing = computeBoqCommercialView(boq).costing
    return denormalizeToDbBoq({
      ...boq,
      custom_fields: {
        ...(boq.custom_fields || {}),
        costing,
      },
    })
  },

  async persist(input, payload, { isCreate, id }) {
    const { tenantClient } = input
    if (!isCreate) {
      const { error } = await tenantClient.from('boqs').update(payload).eq('id', id)
      return { data: null, error }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: new Error('You must be signed in to create a Cost & Pricing Sheet.') }
    }

    const boqPrefix = resolvePrefix(input.documentPrefixes as any, 'boq')
    const boqFamily = `${boqPrefix}-`
    const manualNumber = input.numberIsManual ? String(input.getBoq().boq_number || '').trim() || undefined : undefined

    const created = await withUniqueRetry(
      async (candidateNumber: string) => {
        payload.boq_number = candidateNumber
        return tenantClient.from('boqs').insert([{ ...payload, user_id: user.id }]).select().single()
      },
      async () => {
        const [{ data: rows }, cursor] = await Promise.all([
          tenantClient.from('boqs').select('boq_number'),
          fetchAutoCursor(tenantClient, boqFamily),
        ])
        return getNextBoqNumber(rows || [], boqPrefix, cursor)
      },
      manualNumber,
    )

    if (!created.error && !manualNumber) {
      const seq = parseTrailingSequence((created.data as { boq_number?: string | null } | null)?.boq_number)
      if (seq !== null) await advanceAutoCursor(tenantClient, boqFamily, seq)
    }

    return created
  },

  async afterSave(input, { effectiveId, isCreate }) {
    const { tenantClient } = input
    const boq = input.getBoq()

    if (!isCreate) {
      const { error: deleteError } = await tenantClient.from('boq_rows').delete().eq('boq_id', effectiveId)
      if (deleteError) {
        feedback.error('Item save failed', {
          description: getUserFacingMutationMessage(deleteError, { action: 'save' }),
        })
        throw deleteError
      }
    }

    const dbRows = boq.table_rows
      .filter((row) => (row.row_type === 'section' ? row.section_title?.trim() : row.description?.trim()))
      .map((row, index) => denormalizeToDbBoqRow({ ...row, sort_order: index }, effectiveId))

    if (dbRows.length > 0) {
      const { error: rowsError } = await tenantClient.from('boq_rows').insert(dbRows)
      if (rowsError) {
        feedback.error('Item save failed', {
          description: getUserFacingMutationMessage(rowsError, { action: 'save' }),
        })
        throw rowsError
      }
    }

    try {
      const { recordAuditLog } = await import('@/lib/audit')
      await recordAuditLog(tenantClient, {
        entityType: 'boq' as any,
        recordId: effectiveId,
        entityLabel: boq.boq_number,
        action: isCreate ? 'CREATE' : 'UPDATE',
        oldData: input.initialSnapshot || null,
        newData: boq,
        trackedFields: ['boq_number', 'title', 'vendor_name', 'vendor_contact', 'notes', 'custom_fields'],
      })
    } catch (auditErr) {
      console.error('Cost & Pricing Sheet audit failed:', auditErr)
    }
  },

  getNavigationTarget(effectiveId) {
    return `/boqs/${effectiveId}`
  },
}

export function useBoqSave(params: UseBoqSaveParams) {
  const { tenantClient } = useEntity()
  const input = { ...params, tenantClient } satisfies BoqSaveInput

  return useDocumentSave({
    input,
    strategy: boqSaveStrategy,
    isCreate: params.isCreate,
    isEdit: params.isEdit,
    id: params.id,
    navigate: params.navigate,
  })
}
