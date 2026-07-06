import { useCallback, useState } from 'react'
import { supabase } from '../supabase'
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
import { createSaveTimer, getJsonSizeBytes } from '@/lib/saveTiming'
import { normalizeRichTextHtml } from '@/components/pdf-new/core/richText'
import { getNextInvoiceNumber } from '@/domain/documentConversion'
import { resolvePrefix } from '@/domain/prefixConstants'
import { withUniqueRetry } from '@/lib/withUniqueRetry'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { assertIdentityImmutable } from '@/domain/invoice/assertIdentityImmutable'
import type { ComputedItem, ComputedGroup } from '@/lib/Calculations'

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

export function useInvoiceSave(params: UseInvoiceSaveParams) {
  const [saving, setSaving] = useState(false)

  const save = useCallback(async (status: string) => {
    const {
      invoice, invoiceTitle, items, groups, customFields, additionalFields,
      extraCharges, chargeLabels, columns, notesTitle, termsTitle, attachments,
      mergeQtyUnit, discountType, discountTiming, whtType, calculationInputs,
      signatoryId, pdfOutput, initialCustomFields, initialInvoiceSnapshot,
      baseCustomFields, documentTotals, documentPrefixes, isCreate, isEdit, id,
      navigate, onInvalidRow,
    } = params

    if (!invoice?.client_id) {
      feedback.error('Validation Error', { description: 'Pick a client before saving' })
      return
    }

    const standardItems = items.filter((item) => item.row_type === 'standard')
    const hasMeaningfulItem = standardItems.some((item) => item.description?.trim())

    if (!hasMeaningfulItem) {
      feedback.error('Validation Error', { description: 'Add at least one item before saving' })
      return
    }

    const invalidStandardRowCount = standardItems.filter((item) => !item.description?.trim()).length
    if (invalidStandardRowCount > 0) {
      const firstInvalidIdx = items.findIndex((item) => item.row_type === 'standard' && !item.description?.trim())
      onInvalidRow(firstInvalidIdx)
      setTimeout(() => onInvalidRow(null), 2500)
      feedback.error('Validation Error', {
        description: `${invalidStandardRowCount} item row${invalidStandardRowCount === 1 ? '' : 's'} must have a description before saving.`,
      })
      return
    }

    if (isEdit && initialInvoiceSnapshot) {
      try {
        assertIdentityImmutable(initialInvoiceSnapshot, invoice)
      } catch (err: any) {
        const field = err.message?.replace('IDENTITY_MUTATION_DETECTED: ', '') || 'identity'
        feedback.error('Identity locked', {
          description: `${field} cannot be changed after saving. To use a different client or number, please duplicate this document.`,
        })
        setSaving(false)
        return
      }
    }

    const { project: validatedProject, error: projectError } = await validateProjectAssignment(supabase as any, {
      projectId: invoice.project_id,
      documentClientId: invoice.client_id,
      documentClientName: invoice.client_name,
    })

    if (projectError) {
      feedback.error('Project link invalid', { description: projectError })
      return
    }

    setSaving(true)
    const timer = createSaveTimer('invoice-save-total', { mode: isCreate ? 'new' : 'edit', status, invoiceId: isEdit ? (id || null) : null })

    const buildCustomFieldsStart = timer.phaseStart('build-custom-fields')
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
    timer.phaseEnd('build-custom-fields', buildCustomFieldsStart, {
      customFieldsBytes: getJsonSizeBytes(customFieldsData),
      attachmentsCount: attachments.length,
      headerFieldCount: customFields.length,
      additionalFieldCount: additionalFields.length,
      extraChargeCount: extraCharges.length,
      columnCount: columns.length,
      groupCount: groups.length,
      pdfOutputBytes: getJsonSizeBytes(pdfOutput),
    })

    const buildPayloadStart = timer.phaseStart('build-payload')

    const notesChanged = isEdit ? (invoice.notes !== initialInvoiceSnapshot?.notes) : true
    const termsChanged = isEdit ? (invoice.terms !== initialInvoiceSnapshot?.terms) : true
    const normalizedNotes = notesChanged ? normalizeRichTextHtml(invoice.notes) : (initialInvoiceSnapshot?.notes ?? invoice.notes)
    const normalizedTerms = termsChanged ? normalizeRichTextHtml(invoice.terms) : (initialInvoiceSnapshot?.terms ?? invoice.terms)

    const updatedInvoice = isEdit
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
      project_id: validatedProject?.id || null,
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

    if (isCreate) {
      payload.invoice_number = invoice.invoice_number
    }

    timer.phaseEnd('build-payload', buildPayloadStart, {
      documentTable: 'invoices',
      payloadBytes: getJsonSizeBytes(payload),
      notesBytes: getJsonSizeBytes(normalizedNotes),
      termsBytes: getJsonSizeBytes(normalizedTerms),
      customFieldsBytes: getJsonSizeBytes(customFieldsData),
      notesNormalized: notesChanged,
      termsNormalized: termsChanged,
    })

    const saveDocumentRowStart = timer.phaseStart('save-document-row')

    let invoiceRow: any = null
    let error: any = null

    if (isCreate) {
      const result = await withUniqueRetry(
        async (candidateNumber: string) => {
          payload.invoice_number = candidateNumber
          return (supabase.from('invoices') as any).insert([payload]).select().single() as Promise<{ data: any; error: any }>
        },
        async () => {
          const { data: rows } = await supabase.from('invoices').select('invoice_number')
          return getNextInvoiceNumber(rows || [], resolvePrefix(documentPrefixes, 'invoice'))
        },
      )
      invoiceRow = result.data
      error = result.error
    } else {
      const result = await (supabase
        .from('invoices') as any)
        .update(payload)
        .eq('id', id)
      error = result.error
    }

    timer.phaseEnd('save-document-row', saveDocumentRowStart, {
      table: 'invoices',
      operation: isCreate ? 'insert-select-single' : 'update',
      supabaseCalls: 1,
    })

    if (error || (isCreate && !invoiceRow)) {
      feedback.error('Save failed', {
        description: getUserFacingMutationMessage(error, { action: 'save' }),
      })
      setSaving(false)
      return
    }

    const effectiveId = isCreate ? invoiceRow!.id : id

    const itemsToSave = items.map((item, index) => toDbItem(item, effectiveId!, index))

    if (isEdit) {
      const deleteExistingItemsStart = timer.phaseStart('delete-existing-items')
      const { error: deleteError } = await supabase.from('invoice_items').delete().eq('invoice_id', id)
      timer.phaseEnd('delete-existing-items', deleteExistingItemsStart, {
        table: 'invoice_items',
        operation: 'delete-by-invoice_id',
        supabaseCalls: 1,
      })
      if (deleteError) {
        feedback.error('Save failed', {
          description: getUserFacingMutationMessage(deleteError, { action: 'save' }),
        })
        setSaving(false)
        return
      }
    } else {
      const deleteExistingItemsStart = timer.phaseStart('delete-existing-items')
      timer.phaseEnd('delete-existing-items', deleteExistingItemsStart, {
        table: 'invoice_items',
        skipped: true,
        supabaseCalls: 0,
        reason: 'new invoice save does not delete existing rows',
      })
    }

    if (itemsToSave.length > 0) {
      const insertItemsStart = timer.phaseStart('insert-items')
      const { error: insertError } = await supabase.from('invoice_items').insert(itemsToSave)
      timer.phaseEnd('insert-items', insertItemsStart, {
        table: 'invoice_items',
        rowCount: itemsToSave.length,
        payloadBytes: getJsonSizeBytes(itemsToSave),
        supabaseCalls: 1,
      })
      if (insertError) {
        feedback.error('Save failed', {
          description: getUserFacingMutationMessage(insertError, { action: 'save' }),
        })
        setSaving(false)
        return
      }
    } else {
      const insertItemsStart = timer.phaseStart('insert-items')
      timer.phaseEnd('insert-items', insertItemsStart, {
        table: 'invoice_items',
        rowCount: 0,
        skipped: true,
        supabaseCalls: 0,
      })
    }

    const saveAuditLogStart = timer.phaseStart('save-audit-log')
    try {
      const { recordAuditLog, INVOICE_TRACKED_FIELDS } = await import('@/lib/audit')
      if (isCreate) {
        const { recordInvoiceCreated } = await import('@/lib/audit')
        await recordInvoiceCreated(invoiceRow!.id)
        await recordAuditLog({
          entityType: 'invoice',
          recordId: invoiceRow!.id,
          entityLabel: invoiceRow!.invoice_number,
          action: 'CREATE',
          oldData: null,
          newData: invoiceRow,
          trackedFields: INVOICE_TRACKED_FIELDS,
        })
      } else {
        timer.phaseEnd('post-save-refetch', null, { skipped: true, reason: 'no refetch — use merged snapshot' })
        await recordAuditLog({
          entityType: 'invoice',
          recordId: effectiveId || '',
          entityLabel: initialInvoiceSnapshot?.invoice_number || null,
          action: 'UPDATE',
          oldData: initialInvoiceSnapshot,
          newData: updatedInvoice,
          trackedFields: INVOICE_TRACKED_FIELDS,
        })
      }
    } catch (auditErr) {
      console.error('Audit trail failed:', auditErr)
    }
    timer.phaseEnd('save-audit-log', saveAuditLogStart, {
      tables: ['audit_logs'],
      rpcCalls: isCreate ? 2 : 1,
      includesAuthLookup: true,
    })

    setSaving(false)
    const navigationTarget = '/invoices/' + effectiveId
    const navigationAfterSaveStart = timer.phaseStart('navigation-after-save')
    navigate(navigationTarget)
    timer.phaseEnd('navigation-after-save', navigationAfterSaveStart, {
      target: navigationTarget,
    })
    timer.finish({
      supabaseCalls: itemsToSave.length > 0 ? (isCreate ? 4 : 5) : (isCreate ? 3 : 4),
      itemRowCount: itemsToSave.length,
    })
  }, [
    params.invoice, params.invoiceTitle, params.items, params.groups,
    params.initialCustomFields, params.baseCustomFields,
    params.customFields, params.additionalFields, params.extraCharges,
    params.chargeLabels, params.columns,
    params.notesTitle, params.termsTitle, params.attachments, params.mergeQtyUnit,
    params.discountType, params.discountTiming, params.whtType, params.calculationInputs,
    params.signatoryId, params.pdfOutput, params.documentPrefixes, params.documentTotals,
    params.isCreate, params.isEdit, params.id, params.initialInvoiceSnapshot,
    params.navigate, params.onInvalidRow,
  ])

  return { save, saving }
}
