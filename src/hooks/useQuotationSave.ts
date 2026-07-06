import { supabase } from '../supabase'
import type {
  InvoiceItem,
  InvoiceFieldEntry,
  ExtraCharge,
  ColumnConfig,
  DiscountType,
  DiscountTiming,
  WhtType,
} from '@/domain/invoice'
import { feedback } from '@/lib/feedback'
import { validateProjectAssignment } from '@/domain/projects'
import { normalizeRichTextHtml } from '@/components/pdf-new/core/richText'
import { getNextQuotationNumber } from '@/domain/quotation'
import { resolvePrefix } from '@/domain/prefixConstants'
import { withUniqueRetry } from '@/lib/withUniqueRetry'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import type { ComputedItem, ComputedGroup } from '@/lib/Calculations'
import { useDocumentSave } from './useDocumentSave'
import type { DocumentSaveStrategy } from './useDocumentSave'
import { toQuotationItem } from '@/components/quotation/quotationFormUtils'
import { buildCustomFields } from '@/components/quotation/quotationFormUtils'
import {
  canUseOfflineQuotationDrafts,
} from '@/components/quotation/quotationFormConstants'
import {
  createOfflineQuotationDraft,
} from '@/lib/native/quotationOffline'
import type { QuotationEditorState, PdfOutputState } from '@/components/quotation/quotationFormTypes'

interface QuotationGroup {
  id?: string
  name?: string
  showSubtotal?: boolean
}

interface DocumentTotals {
  items: ComputedItem[]
  groups: ComputedGroup[]
  subtotal: number
  installRateTotal: number
  extraChargesTotal: number
  taxableBase: number
  discount: number
  vat: number
  wht: number
  grandTotal: number
  totalPayable: number
}

interface UseQuotationSaveParams {
  quotation: QuotationEditorState
  quotationTitle: string
  items: InvoiceItem[]
  groups: QuotationGroup[]
  customFields: InvoiceFieldEntry[]
  additionalFields: InvoiceFieldEntry[]
  extraCharges: ExtraCharge[]
  chargeLabels: Record<string, string>
  columns: ColumnConfig[]
  notesTitle: string
  termsTitle: string
  attachments: Array<Record<string, unknown>>
  mergeQtyUnit: boolean
  discountType: DiscountType
  discountTiming: DiscountTiming
  whtType: WhtType
  calculationInputs: any
  signatoryId: string | null
  pdfOutput: PdfOutputState
  initialNotes: string
  initialTerms: string
  initialQuotationSnapshot: Record<string, unknown> | null
  documentTotals: DocumentTotals
  documentPrefixes: any
  isCreate: boolean
  isEdit: boolean
  id: string | undefined
  navigate: (path: string) => void
  onInvalidRow: (index: number | null) => void
  setQuotationNumber: (num: string) => void
}

let _validatedProject: any = null
let _savedQuotation: any = null

const quotationStrategy: DocumentSaveStrategy<UseQuotationSaveParams> = {
  async validate(input) {
    const { quotation, items } = input

    if (!quotation?.client_id) {
      return { valid: false, error: 'Validation Error', errorDescription: 'Pick a client before saving' }
    }

    const standardItems = items.filter((item) => item.row_type === 'standard')
    const hasMeaningfulItem = standardItems.some((item) => item.description?.trim())

    if (!hasMeaningfulItem) {
      return { valid: false, error: 'Validation Error', errorDescription: 'Add at least one item before saving' }
    }

    const invalidStandardRowCount = standardItems.filter((item) => !item.description?.trim()).length
    if (invalidStandardRowCount > 0) {
      const firstInvalidIdx = items.findIndex((item) => item.row_type === 'standard' && !item.description?.trim())
      input.onInvalidRow(firstInvalidIdx)
      setTimeout(() => input.onInvalidRow(null), 2500)
      return {
        valid: false,
        error: 'Validation Error',
        errorDescription: `${invalidStandardRowCount} item row${invalidStandardRowCount === 1 ? '' : 's'} must have a description before saving.`,
      }
    }

    const { project, error: projectError } = await validateProjectAssignment(supabase as any, {
      projectId: quotation.project_id,
      documentClientId: quotation.client_id,
      documentClientName: quotation.client_name,
    })

    if (projectError) {
      return { valid: false, error: 'Project link invalid', errorDescription: projectError }
    }

    _validatedProject = project
    return { valid: true }
  },

  buildPayload(input, { status }) {
    const {
      quotation, quotationTitle, columns, headerFields, additionalFields,
      discountType, discountTiming, whtType, notesTitle, termsTitle,
      mergeQtyUnit, showItemImages, normalizedGroups, attachments,
      extraCharges, chargeLabels, signatoryId, pdfOutput,
      initialNotes, initialTerms, documentTotals, isEdit,
    } = input as any

    const notesChanged = isEdit ? (quotation.notes !== initialNotes) : true
    const termsChanged = isEdit ? (quotation.terms !== initialTerms) : true
    const normalizedNotes = notesChanged ? normalizeRichTextHtml(quotation.notes || '') : initialNotes
    const normalizedTerms = termsChanged ? normalizeRichTextHtml(quotation.terms || '') : initialTerms

    const customFieldsData = buildCustomFields({
      quotation,
      columns,
      headerFields,
      additionalFields,
      discountType,
      discountTiming,
      whtType,
      notesTitle,
      termsTitle,
      mergeQtyUnit,
      showItemImages,
      groups: normalizedGroups,
      attachments,
      extraCharges,
      chargeLabels,
      signatoryId,
      pdfOutput,
    })
    const customFieldsJson = JSON.stringify(customFieldsData)

    const payload: any = {
      quotation_number: quotation.quotation_number || '',
      po_number: String(quotation.po_number || '').trim() || null,
      quotation_title: quotationTitle || null,
      project_id: _validatedProject?.id || null,
      client_id: quotation.client_id || null,
      client_name: quotation.client_name || '',
      issue_date: quotation.issue_date || null,
      valid_until: quotation.valid_until || null,
      status: status || 'open',
      notes: normalizedNotes,
      terms: normalizedTerms,
      workmanship: Number(quotation.workmanship || 0),
      transportation: Number(quotation.transportation || 0),
      shipping: Number(quotation.shipping || 0),
      discount: documentTotals.discount,
      vat: documentTotals.vat,
      wht: documentTotals.wht,
      subtotal: documentTotals.subtotal,
      install_rate_total: documentTotals.installRateTotal,
      total: documentTotals.totalPayable,
      amount_in_words: quotation.amount_in_words || '',
      custom_fields: customFieldsJson,
    }

    return payload
  },

  async persist(input, payload, { isCreate, id }) {
    const { documentPrefixes, setQuotationNumber } = input as any

    if (isCreate && canUseOfflineQuotationDrafts()) {
      const offlineItems = (input as any).normalizedItems.map((item: any, index: number) => ({
        ...item,
        sort_order: index,
      }))
      try {
        const localDraft = await createOfflineQuotationDraft({
          ...payload,
          items: offlineItems,
        })
        setQuotationNumber(localDraft.quotationNumber)
        feedback.success('Saved offline', {
          description: `${localDraft.quotationNumber} was saved locally and queued for sync.`,
        })
        return { data: { id: localDraft.id || 'offline', quotation_number: localDraft.quotationNumber }, error: null }
      } catch (error) {
        feedback.error('Offline save failed', {
          description: error instanceof Error ? error.message : 'Could not save this quotation offline.',
        })
        return { data: null, error: error as any }
      }
    }

    if (isCreate) {
      return withUniqueRetry(
        async (candidateNumber: string) => {
          payload.quotation_number = candidateNumber
          return supabase.from('quotations').insert([payload]).select().single() as Promise<{ data: any; error: any }>
        },
        async () => {
          const { data: rows } = await supabase.from('quotations').select('quotation_number')
          return getNextQuotationNumber(rows || [], resolvePrefix(documentPrefixes, 'quotation'))
        },
      )
    }
    const { error } = await supabase.from('quotations').update(payload).eq('id', id)
    return { data: null, error }
  },

  async afterSave(input, { effectiveId, isCreate, createResult }) {
    const { normalizedItems, isEdit, initialQuotationSnapshot } = input as any

    const itemRows = normalizedItems.map((item: any, index: number) => toQuotationItem(item, effectiveId, index))

    if (isEdit) {
      const { error: deleteError } = await supabase.from('quotation_items').delete().eq('quotation_id', effectiveId)
      if (deleteError) {
        feedback.error('Save failed', {
          description: getUserFacingMutationMessage(deleteError, { action: 'save' }),
        })
        throw deleteError
      }
    }

    if (itemRows.length > 0) {
      const { error: insertError } = await supabase.from('quotation_items').insert(itemRows)
      if (insertError) {
        feedback.error('Save failed', {
          description: getUserFacingMutationMessage(insertError, { action: 'save' }),
        })
        throw insertError
      }
    }

    try {
      const { recordAuditLog, QUOTATION_TRACKED_FIELDS } = await import('@/lib/audit')
      if (isCreate) {
        const { recordQuotationCreated } = await import('@/lib/audit')
        await recordQuotationCreated(effectiveId)
        await recordAuditLog({
          entityType: 'quotation',
          recordId: effectiveId,
          entityLabel: createResult?.quotation_number ?? '',
          action: 'CREATE',
          oldData: null,
          newData: createResult ?? {},
          trackedFields: QUOTATION_TRACKED_FIELDS,
        })
      } else {
        await recordAuditLog({
          entityType: 'quotation',
          recordId: effectiveId,
          entityLabel: initialQuotationSnapshot?.quotation_number || null,
          action: 'UPDATE',
          oldData: initialQuotationSnapshot,
          newData: _savedQuotation,
          trackedFields: QUOTATION_TRACKED_FIELDS,
        })
      }
    } catch (auditErr) {
      console.error('Audit trail failed:', auditErr)
    }
  },

  getNavigationTarget(effectiveId) {
    return '/quotations/' + effectiveId
  },
}

export function useQuotationSave(params: UseQuotationSaveParams) {
  return useDocumentSave({
    input: params,
    strategy: quotationStrategy,
    isCreate: params.isCreate,
    isEdit: params.isEdit,
    id: params.id,
    navigate: params.navigate,
  })
}
