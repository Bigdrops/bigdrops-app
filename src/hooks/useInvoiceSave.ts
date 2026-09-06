import { useEntity } from '@/lib/tenant/contexts'
import type { TenantClient } from '@/lib/tenantClient'
import { toDbItem } from '@/domain/invoice'
import type {
  InvoiceAttachment,
  InvoiceCustomFields,
  InvoiceFieldEntry,
  InvoiceItem,
  DiscountType,
  DiscountTiming,
  ExtraCharge,
  WhtType,
  ColumnConfig,
  InvoicePdfOutput,
} from '@/domain/invoice'
import { numberToWords } from './useInvoiceForm'
import { feedback } from '@/lib/feedback'
import { validateProjectAssignment } from '@/domain/projects'
import { normalizeRichTextHtml } from '@/components/pdf/core/richText'
import { getNextInvoiceNumber } from '@/domain/documentConversion'
import { resolvePrefix } from '@/domain/prefixConstants'
import { withUniqueRetry } from '@/lib/withUniqueRetry'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { assertIdentityImmutable } from '@/domain/invoice/assertIdentityImmutable'
import type { ComputedItem, ComputedGroup } from '@/lib/Calculations'
import { useDocumentSave } from './useDocumentSave'
import type { DocumentSaveStrategy } from './useDocumentSave'

interface InvoiceFormFields {
  invoice_number: string
  po_number: string
  project_id: string
  client_id: string
  client_name: string
  issue_date: string
  due_date: string
  status: string
  document_type: string
  payment_terms: string
  custom_payment_terms: string
  notes: string
  terms: string
  workmanship: number
  transportation: number
  shipping: number
  discount: number
  vat: number
  wht: number
  work_duration: string
  amount_in_words: string
  [key: string]: any
}

interface InvoiceGroup {
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

interface UseInvoiceSaveParams {
  tenantClient: TenantClient
  entityId: string | null
  invoice: InvoiceFormFields
  invoiceTitle: string
  items: InvoiceItem[]
  groups: InvoiceGroup[]
  customFields: InvoiceFieldEntry[]
  additionalFields: InvoiceFieldEntry[]
  extraCharges: ExtraCharge[]
  chargeLabels: Record<string, string>
  columns: ColumnConfig[]
  notesTitle: string
  termsTitle: string
  attachments: InvoiceAttachment[]
  mergeQtyUnit: boolean
  discountType: DiscountType
  discountTiming: DiscountTiming
  whtType: WhtType
  calculationInputs: any
  signatoryId: string | null
  pdfOutput: InvoicePdfOutput
  initialCustomFields: InvoiceCustomFields | Record<string, never>
  initialInvoiceSnapshot: any
  baseCustomFields: InvoiceCustomFields | Record<string, never>
  documentTotals: DocumentTotals
  documentPrefixes: any
  isCreate: boolean
  isEdit: boolean
  id: string | undefined
  navigate: (path: string) => void
  onInvalidRow: (index: number | null) => void
}

let _validatedProject: any = null
let _updatedInvoice: any = null

const invoiceStrategy: DocumentSaveStrategy<UseInvoiceSaveParams> = {
  async validate(input) {
    const {
      invoice, items, isEdit, initialInvoiceSnapshot, documentPrefixes,
    } = input

    if (!invoice?.client_id) {
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

    if (isEdit && initialInvoiceSnapshot) {
      try {
        assertIdentityImmutable(initialInvoiceSnapshot, invoice)
      } catch (err: any) {
        const field = err.message?.replace('IDENTITY_MUTATION_DETECTED: ', '') || 'identity'
        const label = field === 'client_id' ? 'Client'
          : field === 'invoice_number' ? 'Invoice Number'
          : field === 'document_type' ? 'Document Type'
          : field === 'conversionTrail' ? 'Document Lineage'
          : field
        return {
          valid: false,
          error: 'Identity locked',
          errorDescription: `${label} cannot be changed after saving. To use a different ${label.toLowerCase()}, please duplicate this document.`,
        }
      }
    }

    const { project, error: projectError } = await validateProjectAssignment(input.tenantClient as any, {
      projectId: invoice.project_id,
      documentClientId: invoice.client_id,
      documentClientName: invoice.client_name,
    })

    if (projectError) {
      return { valid: false, error: 'Project link invalid', errorDescription: projectError }
    }

    _validatedProject = project
    return { valid: true }
  },

  buildPayload(input, { status }) {
    const {
      invoice, invoiceTitle, groups, items, customFields, additionalFields,
      extraCharges, chargeLabels, columns, notesTitle, termsTitle, attachments,
      mergeQtyUnit, discountType, discountTiming, whtType, calculationInputs,
      signatoryId, pdfOutput, initialCustomFields, baseCustomFields,
      initialInvoiceSnapshot, documentTotals, isEdit,
    } = input

    const groupMeta: Record<string, { name: string; showSubtotal: boolean }> = {}
    groups.forEach((group) => {
      groupMeta[group.id!] = { name: group.name!, showSubtotal: !!group.showSubtotal }
    })

    const paymentTermsValue = invoice.payment_terms === 'Custom' ? invoice.custom_payment_terms : invoice.payment_terms

    const customFieldsMergeBase = isEdit
      ? { ...baseCustomFields }
      : { ...initialCustomFields }
    delete customFieldsMergeBase.bottom

    const customFieldsData: InvoiceCustomFields = {
      ...customFieldsMergeBase,
      header: customFields.filter((field) => field.label && field.value) as any[],
      additionalFields: (Array.isArray(additionalFields) ? additionalFields : [])
        .filter((field: InvoiceFieldEntry) => field.label || field.value),
      extraCharges: extraCharges.filter((charge) => charge.label),
      chargeLabels,
      columnConfig: columns,
      notesTitle,
      termsTitle,
      attachments,
      mergeQtyUnit,
      showItemImages: items.some((item) => item.row_type === 'standard' && item.image_url),
      discountType,
      discountTiming,
      whtType,
      calculationInputs,
      groupMeta,
      signatoryId,
      pdfOutput,
    }
    const customFieldsJson = JSON.stringify(customFieldsData)

    const notesChanged = isEdit ? (invoice.notes !== initialInvoiceSnapshot?.notes) : true
    const termsChanged = isEdit ? (invoice.terms !== initialInvoiceSnapshot?.terms) : true
    const normalizedNotes = notesChanged ? normalizeRichTextHtml(invoice.notes) : (initialInvoiceSnapshot?.notes ?? invoice.notes)
    const normalizedTerms = termsChanged ? normalizeRichTextHtml(invoice.terms) : (initialInvoiceSnapshot?.terms ?? invoice.terms)

    _updatedInvoice = isEdit
      ? {
          ...invoice,
          notes: normalizedNotes,
          terms: normalizedTerms,
          subtotal: documentTotals.subtotal,
          install_rate_total: documentTotals.installRateTotal,
          total: documentTotals.totalPayable,
          vat: documentTotals.vat,
          discount: documentTotals.discount,
          wht: documentTotals.wht,
        }
      : null

    const payload: any = {
      po_number: String(invoice.po_number || '').trim() || null,
      invoice_title: invoiceTitle || null,
      project_id: _validatedProject?.id || null,
      client_id: invoice.client_id || null,
      client_name: invoice.client_name,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date || null,
      status,
      document_type: invoice.document_type,
      payment_terms: paymentTermsValue,
      notes: normalizedNotes,
      terms: normalizedTerms,
      workmanship: Number(invoice.workmanship || 0),
      transportation: Number(invoice.transportation || 0),
      shipping: Number(invoice.shipping || 0),
      discount: documentTotals.discount,
      vat: documentTotals.vat,
      wht: documentTotals.wht,
      custom_fields: customFieldsJson,
      work_duration: invoice.work_duration,
      subtotal: documentTotals.subtotal,
      install_rate_total: documentTotals.installRateTotal,
      total: documentTotals.totalPayable,
      amount_in_words: numberToWords(documentTotals.totalPayable),
    }

    if (input.isCreate) {
      payload.invoice_number = invoice.invoice_number
    }

    return payload
  },

  async persist(input, payload, { isCreate, id }) {
    const { tenantClient, entityId } = input
    const itemsToSave = input.items.map((item, index) => toDbItem(item, null, index))

    // Phase 3: composite save (invoice + items) is atomic via the tenant
    // transaction RPC when the entity id is available (post-cutover).
    if (entityId && isCreate) {
      return withUniqueRetry(
        async (candidateNumber: string) => {
          payload.invoice_number = candidateNumber
          const { data, error } = await tenantClient.rpc('save_invoice_with_items_transaction', {
            p_entity_id: entityId,
            p_invoice_payload: payload,
            p_items: itemsToSave,
            p_mode: 'create',
          })
          if (error) return { data: null, error }
          // PostgREST wraps jsonb function returns in an array.
          const rpcResult = Array.isArray(data) ? data[0] : data
          const resolved = rpcResult?.invoice ?? rpcResult
          return {
            data: {
              id: resolved?.id ?? rpcResult?.id,
              invoice_number: resolved?.invoice_number ?? payload.invoice_number,
            },
            error: null,
          }
        },
        async () => {
          const { data: rows } = await tenantClient.from('invoices').select('invoice_number')
          return getNextInvoiceNumber(rows || [], resolvePrefix(input.documentPrefixes, 'invoice'))
        },
      )
    }

    if (entityId && !isCreate) {
      payload.id = id
      const { error } = await tenantClient.rpc('save_invoice_with_items_transaction', {
        p_entity_id: entityId,
        p_invoice_payload: payload,
        p_items: itemsToSave,
        p_mode: 'update',
      })
      return { data: null, error }
    }

    // Pre-cutover fallback: sequential tenant writes (no entity id available).
    if (isCreate) {
      return withUniqueRetry(
        async (candidateNumber: string) => {
          payload.invoice_number = candidateNumber
          return (tenantClient.from('invoices') as any).insert([payload]).select().single() as Promise<{ data: any; error: any }>
        },
        async () => {
          const { data: rows } = await tenantClient.from('invoices').select('invoice_number')
          return getNextInvoiceNumber(rows || [], resolvePrefix(input.documentPrefixes, 'invoice'))
        },
      )
    }
    const { error } = await (tenantClient.from('invoices') as any).update(payload).eq('id', id)
    return { data: null, error }
  },

  async afterSave(input, { effectiveId, isCreate, createResult }) {
    const { items, isEdit, initialInvoiceSnapshot, tenantClient, entityId } = input

    // When the composite RPC persisted items, skip the separate item writes.
    if (!entityId) {
      const itemsToSave = items.map((item, index) => toDbItem(item, effectiveId, index))

      if (isEdit) {
        const { error: deleteError } = await tenantClient.from('invoice_items').delete().eq('invoice_id', effectiveId)
        if (deleteError) {
          feedback.error('Save failed', {
            description: getUserFacingMutationMessage(deleteError, { action: 'save' }),
          })
          throw deleteError
        }
      }

      if (itemsToSave.length > 0) {
        const { error: insertError } = await tenantClient.from('invoice_items').insert(itemsToSave)
        if (insertError) {
          feedback.error('Save failed', {
            description: getUserFacingMutationMessage(insertError, { action: 'save' }),
          })
          throw insertError
        }
      }
    }

    try {
      const { recordAuditLog, INVOICE_TRACKED_FIELDS } = await import('@/lib/audit')
      if (isCreate) {
        const { recordInvoiceCreated } = await import('@/lib/audit')
        await recordInvoiceCreated(tenantClient, effectiveId)
        await recordAuditLog(tenantClient, {
          entityType: 'invoice',
          recordId: effectiveId,
          entityLabel: createResult?.invoice_number ?? input.invoice.invoice_number,
          action: 'CREATE',
          oldData: null,
          newData: createResult ?? input.invoice,
          trackedFields: INVOICE_TRACKED_FIELDS,
        })
      } else {
        await recordAuditLog(tenantClient, {
          entityType: 'invoice',
          recordId: effectiveId,
          entityLabel: initialInvoiceSnapshot?.invoice_number || null,
          action: 'UPDATE',
          oldData: initialInvoiceSnapshot,
          newData: _updatedInvoice,
          trackedFields: INVOICE_TRACKED_FIELDS,
        })
      }
    } catch (auditErr) {
      console.error('Audit trail failed:', auditErr)
    }
  },

  getNavigationTarget(effectiveId) {
    return '/invoices/' + effectiveId
  },
}

export function useInvoiceSave(params: Omit<UseInvoiceSaveParams, 'tenantClient' | 'entityId'>) {
  const { tenantClient, entity } = useEntity()
  const input = {
    ...params,
    tenantClient,
    entityId: entity?.id ?? null,
  } satisfies UseInvoiceSaveParams

  return useDocumentSave({
    input,
    strategy: invoiceStrategy,
    isCreate: params.isCreate,
    isEdit: params.isEdit,
    id: params.id,
    navigate: params.navigate,
  })
}
