import { useEntity } from '@/lib/tenant/contexts'
import type { TenantClient } from '@/lib/tenantClient'
import { feedback } from '@/lib/feedback'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { withUniqueRetry } from '@/lib/withUniqueRetry'
import { advanceAutoCursor, fetchAutoCursor } from '@/domain/documentNumbering'
import { parseTrailingSequence, resolvePrefix } from '@/domain/prefixConstants'
import type { Cps } from '@/domain/cps/types'
import { denormalizeToDbCps, denormalizeToDbCpsRow, getNextCpsNumber } from '@/domain/cps/normalize'
import { computeCpsCommercialView } from '@/domain/cps/calculations'
import { useDocumentSave, type DocumentSaveStrategy } from './useDocumentSave'
import { supabase } from '@/supabase'

type UseCpsSaveParams = {
  getCps: () => Cps
  initialSnapshot?: Cps | null
  documentPrefixes: unknown
  isCreate: boolean
  isEdit: boolean
  id?: string
  numberIsManual: boolean
  navigate: (path: string) => void
}

type CpsSaveInput = UseCpsSaveParams & {
  tenantClient: TenantClient
}

function validateCps(cps: Cps): string | null {
  if (!String(cps.cps_number || '').trim()) return 'Enter a Cost & Pricing Sheet number.'
  if (!String(cps.custom_fields?.client_id || '').trim()) return 'Select a client before saving this Cost & Pricing Sheet.'
  for (const [index, row] of (cps.table_rows || []).entries()) {
    if (row.row_type === 'section') continue
    if (!String(row.description || '').trim()) return `Enter a description for row ${index + 1}.`
    if (Number(row.quantity || 0) <= 0) return `Enter a quantity greater than zero for row ${index + 1}.`
    if (Number(row.sp || 0) <= 0) return `Enter an SP greater than zero for row ${index + 1}.`
  }
  return null
}

const cpsSaveStrategy: DocumentSaveStrategy<CpsSaveInput> = {
  validate(input) {
    const errorDescription = validateCps(input.getCps())
    if (errorDescription) return { valid: false, error: 'Save blocked', errorDescription }

    if (input.isEdit && input.initialSnapshot) {
      const current = input.getCps()
      if (String(current.cps_number || '') !== String(input.initialSnapshot.cps_number || '')) {
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
    const cps = input.getCps()
    const costing = computeCpsCommercialView(cps).costing
    return denormalizeToDbCps({
      ...cps,
      custom_fields: {
        ...(cps.custom_fields || {}),
        costing,
      },
    })
  },

  async persist(input, payload, { isCreate, id }) {
    const { tenantClient } = input
    if (!isCreate) {
      const { error } = await tenantClient.from('cps_sheets').update(payload).eq('id', id)
      return { data: null, error }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: new Error('You must be signed in to create a Cost & Pricing Sheet.') }
    }

    const cpsPrefix = resolvePrefix(input.documentPrefixes as any, 'cps_sheets')
    const cpsFamily = `${cpsPrefix}-`
    const manualNumber = input.numberIsManual ? String(input.getCps().cps_number || '').trim() || undefined : undefined

    const created = await withUniqueRetry(
      async (candidateNumber: string) => {
        payload.cps_number = candidateNumber
        return tenantClient.from('cps_sheets').insert([{ ...payload, user_id: user.id }]).select().single()
      },
      async () => {
        const [{ data: rows }, cursor] = await Promise.all([
          tenantClient.from('cps_sheets').select('cps_number'),
          fetchAutoCursor(tenantClient, cpsFamily),
        ])
        return getNextCpsNumber(rows || [], cpsPrefix, cursor)
      },
      manualNumber,
    )

    if (!created.error && !manualNumber) {
      const seq = parseTrailingSequence((created.data as { cps_number?: string | null } | null)?.cps_number)
      if (seq !== null) await advanceAutoCursor(tenantClient, cpsFamily, seq)
    }

    return created
  },

  async afterSave(input, { effectiveId, isCreate }) {
    const { tenantClient } = input
    const cps = input.getCps()

    if (!isCreate) {
      const { error: deleteError } = await tenantClient.from('cps_rows').delete().eq('cps_sheet_id', effectiveId)
      if (deleteError) {
        feedback.error('Item save failed', {
          description: getUserFacingMutationMessage(deleteError, { action: 'save' }),
        })
        throw deleteError
      }
    }

    const dbRows = cps.table_rows
      .filter((row) => (row.row_type === 'section' ? row.section_title?.trim() : row.description?.trim()))
      .map((row, index) => denormalizeToDbCpsRow({ ...row, sort_order: index }, effectiveId))

    if (dbRows.length > 0) {
      const { error: rowsError } = await tenantClient.from('cps_rows').insert(dbRows)
      if (rowsError) {
        feedback.error('Item save failed', {
          description: getUserFacingMutationMessage(rowsError, { action: 'save' }),
        })
        throw rowsError
      }
    }

    // Field-level, readable audit. The form supplies the pre-edit snapshot,
    // so the diff is a real before/after comparison of the document and its
    // item rows. A derived-total change is never recorded here.
    try {
      const {
        CPS_AUDIT_SOURCE,
        buildCpsAuditMeta,
        buildCpsEditMeta,
        recordCpsAuditEvent,
      } = await import('@/domain/cps/audit')

      if (isCreate || !input.initialSnapshot) {
        await recordCpsAuditEvent(tenantClient, {
          recordId: effectiveId,
          entityLabel: cps.cps_number,
          meta: buildCpsAuditMeta({
            event: 'CREATED',
            rootId: effectiveId,
            sourceContext: CPS_AUDIT_SOURCE.form,
            summary: 'Created CPS',
          }),
        })
      } else {
        const meta = buildCpsEditMeta(input.initialSnapshot, cps, CPS_AUDIT_SOURCE.form)
        if (meta) {
          await recordCpsAuditEvent(tenantClient, {
            recordId: effectiveId,
            entityLabel: cps.cps_number,
            meta: { ...meta, rootId: effectiveId },
          })
        }
      }
    } catch (auditErr) {
      console.error('Cost & Pricing Sheet audit failed:', auditErr)
    }
  },

  getNavigationTarget(effectiveId) {
    return `/cost-pricing-sheets/${effectiveId}`
  },
}

export function useCpsSave(params: UseCpsSaveParams) {
  const { tenantClient } = useEntity()
  const input = { ...params, tenantClient } satisfies CpsSaveInput

  return useDocumentSave({
    input,
    strategy: cpsSaveStrategy,
    isCreate: params.isCreate,
    isEdit: params.isEdit,
    id: params.id,
    navigate: params.navigate,
  })
}
