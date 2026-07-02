import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { supabase } from '../supabase'
import SharedDocumentForm from '@/components/document/SharedDocumentForm'
import { PdfOutputSettings } from '@/components/PdfOutputSettings'
import {
  DEFAULT_INVOICE_PDF_OUTPUT,
  getInvoicePdfOutput,
  getInvoiceSignatoryId,
  invoiceImportAdapter,
  normalizeAdditionalFieldEntries,
  parseCustomFields,
  filterPopulatedAdditionalFields,
  syncGroupsFromItems,
} from '@/domain/invoice'
import type {
  InvoiceItem,
  InvoiceAttachment,
  InvoicePdfOutput,
  DiscountType,
  DiscountTiming,
  WhtType,
  InvoiceCustomFields,
} from '@/domain/invoice'
import {
  buildCalculationInputs,
  inferLegacyCalculationState,
  makeEmptyItem,
  normalizeExtraCharges,
  normalizeFieldEntries,
  toDbItem,
  useInvoiceColumns,
} from '../components/useInvoiceColumns'
import { computeDocument, type ComputedItem, type ComputedGroup } from '../lib/Calculations'
import { resolveFinancialColumns } from '@/domain/financial/resolveFinancialColumns'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { numberToWords } from '../hooks/useInvoiceForm'
import { useInvoiceEditableState } from '@/hooks/useInvoiceEditableState'
import { useLayoutMode } from '@/hooks/useLayoutMode'
import { feedback } from '@/lib/feedback'
import { validateProjectAssignment } from '@/domain/projects'
import { createSaveTimer, getJsonSizeBytes } from '@/lib/saveTiming'
import { normalizeRichTextHtml } from '@/components/pdf-new/core/richText'
import { getNextInvoiceNumber } from '@/domain/documentConversion'
import { resolvePrefix } from '@/domain/prefixConstants'
import { useSettings } from '@/hooks/useSettings'
import { withUniqueRetry } from '@/lib/withUniqueRetry'
import { mapDbInvoiceItem } from '@/domain/invoice'

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

interface LocationState {
  prefill?: any
  prefillItems?: any[]
  projectId?: string | number
  clientId?: string | number
  clientName?: string
}

interface InvoiceFormPageProps {
  mode: 'create' | 'edit'
}

export default function InvoiceFormPage({ mode }: InvoiceFormPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const { settings } = useSettings()
  const { isMobile } = useLayoutMode()
  const isCreate = mode === 'create'
  const isEdit = mode === 'edit'

  const routeState = isCreate ? (location.state as LocationState) || {} : {}
  const prefill = isCreate ? routeState.prefill : null
  const prefillItems = isCreate ? routeState.prefillItems : null
  const projectPrefill = isCreate
    ? {
        projectId: String(routeState.projectId || prefill?.project_id || ''),
        clientId: String(routeState.clientId || prefill?.client_id || ''),
        clientName: String(routeState.clientName || prefill?.client_name || ''),
      }
    : { projectId: '', clientId: '', clientName: '' }

  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEdit)
  const [invalidRowIndex, setInvalidRowIndex] = useState<number | null>(null)
  const [showColumnManager, setShowColumnManager] = useState(false)
  const [signatories, setSignatories] = useState<any[]>([])
  const [bankAccounts, setBankAccounts] = useState<any[]>([])
  const [settingsData, setSettingsData] = useState<any>(null)
  const [initialInvoiceSnapshot, setInitialInvoiceSnapshot] = useState<any>(null)
  const [baseCustomFields, setBaseCustomFields] = useState<any>({})

  const {
    invoice,
    setInvoice,
    items,
    setItems,
    groups,
    setGroups,
    itemsRef,
    customFields,
    setCustomFields,
    additionalFields,
    setAdditionalFields,
    extraCharges,
    setExtraCharges,
    chargeLabels,
    setChargeLabels,
    notesTitle,
    setNotesTitle,
    termsTitle,
    setTermsTitle,
    mergeQtyUnit,
    setMergeQtyUnit,
    invoiceTitle,
    setInvoiceTitle,
    attachments,
    setAttachments,
    signatoryId,
    setSignatoryId,
    pdfOutput,
    setPdfOutput,
    discountType,
    setDiscountType,
    discountTiming,
    setDiscountTiming,
    whtType,
    setWhtType,
    updateInvoice,
    updateItem,
    resetItemOverrides,
    addItem,
    removeItem,
    insertItemAfter,
    moveItem,
    addGroup,
    updateGroupName,
    toggleGroupSubtotal,
    deleteGroup,
    addItemToGroup,
    handleAddHeaderField,
    handleUpdateHeaderField,
    handleRemoveHeaderField,
    handleAddAdditionalField,
    handleUpdateAdditionalField,
    handleRemoveAdditionalField,
    handleChargeLabelChange,
    handleAddExtraCharge,
    handleUpdateExtraCharge,
    handleRemoveExtraCharge,
    handleClearAll,
  } = useInvoiceEditableState({ mode, prefill, prefillItems, projectPrefill })

  const initialCustomFields = useMemo(
    () => (isCreate ? parseCustomFields(prefill?.custom_fields) : baseCustomFields),
    [isCreate, prefill?.custom_fields, baseCustomFields],
  )

  const {
    columns,
    setColumns,
    isVisible,
    getColumn,
    toggleVisible,
    toggleDisabled,
    updateColumn,
    addCustomColumn,
    removeCustomColumn,
    resetColumns,
    moveColumn,
    customColumns,
  } = useInvoiceColumns()

  /* ── Create-mode init effects ── */
  useEffect(() => {
    if (!isCreate) return
    setAdditionalFields(normalizeAdditionalFieldEntries(initialCustomFields.additionalFields, initialCustomFields.bottom))
  }, [isCreate, initialCustomFields])

  useEffect(() => {
    if (!isCreate) return
    if (initialCustomFields?.discountType) setDiscountType(initialCustomFields.discountType as DiscountType)
    if (initialCustomFields?.discountTiming) setDiscountTiming(initialCustomFields.discountTiming as DiscountTiming)
    if (initialCustomFields?.whtType) setWhtType(initialCustomFields.whtType as WhtType)
  }, [isCreate, initialCustomFields])

  useEffect(() => {
    if (!isCreate) return
    if (initialCustomFields?.columnConfig) {
      setColumns(resolveFinancialColumns(initialCustomFields.columnConfig as any[]))
    }
  }, [isCreate, initialCustomFields, setColumns])

  useEffect(() => {
    if (!isCreate || !prefillItems || prefillItems.length === 0) return
    const seen = new Set<string>()
    const recovered: InvoiceGroup[] = []
    prefillItems.forEach((item: any) => {
      if (item.row_type === 'group_header' && item.group_id && !seen.has(item.group_id)) {
        seen.add(item.group_id)
        const meta = initialCustomFields?.groupMeta?.[item.group_id]
        recovered.push({
          id: item.group_id,
          name: meta?.name || item.group_name || `Group ${recovered.length + 1}`,
          showSubtotal: meta?.showSubtotal ?? false,
        })
      }
    })
    if (recovered.length > 0) setGroups(recovered)
  }, [isCreate, prefillItems, initialCustomFields])

  useEffect(() => {
    if (!isCreate) return
    if (!projectPrefill.projectId && !projectPrefill.clientId && !projectPrefill.clientName) return
    setInvoice((current) => ({
      ...current!,
      project_id: current!.project_id || projectPrefill.projectId || '',
      client_id: current!.client_id || projectPrefill.clientId || '',
      client_name: current!.client_name || projectPrefill.clientName || '',
    }))
  }, [isCreate, projectPrefill.clientId, projectPrefill.clientName, projectPrefill.projectId])

  useEffect(() => {
    if (!isCreate || prefill) return
    supabase
      .from('invoices')
      .select('invoice_number')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const newNumber = getNextInvoiceNumber(data || [], resolvePrefix(settings?.document_prefixes, 'invoice'))
        setInvoice((current) => ({ ...current!, invoice_number: newNumber }))
      })
  }, [isCreate, prefill, settings?.document_prefixes])

  useEffect(() => {
    if (!isCreate) return
    setSignatoryId(getInvoiceSignatoryId(prefill?.custom_fields))
    setPdfOutput(getInvoicePdfOutput(prefill?.custom_fields))
  }, [isCreate, prefill?.custom_fields])

  /* ── Edit-mode load effect ── */
  useEffect(() => {
    if (!isEdit || !id) return

    const load = async () => {
      const [signatoryRows, bankAccountRows, settingsRows, invoiceResult] = await Promise.all([
        supabase.from('signatories').select('*').order('name'),
        supabase.from('bank_accounts').select('*').order('is_default', { ascending: false }),
        supabase.from('settings').select('company_tagline, footer_text').eq('id', 1).single(),
        supabase.from('invoices').select('*').eq('id', id).single(),
      ])
      setSignatories(signatoryRows.data || [])
      setBankAccounts(bankAccountRows.data || [])
      setSettingsData(settingsRows.data || null)

      const data = invoiceResult.data
      if (!data) {
        navigate('/invoices')
        return
      }

      let savedGroupMeta: Record<string, any> = {}
      let parsedCustomFields: any = null

      try {
        const parsed = parseCustomFields(data.custom_fields)
        parsedCustomFields = parsed
        setBaseCustomFields(parsed)
        setSignatoryId(getInvoiceSignatoryId(parsed))
        setPdfOutput(getInvoicePdfOutput(parsed))
        if (parsed && !Array.isArray(parsed)) {
          setCustomFields(normalizeFieldEntries(parsed.header, 'value'))
          setAdditionalFields(normalizeAdditionalFieldEntries(parsed.additionalFields, parsed.bottom))
          setExtraCharges(normalizeExtraCharges(parsed.extraCharges))
          if (parsed.chargeLabels) setChargeLabels(parsed.chargeLabels as any)
          setColumns(resolveFinancialColumns(parsed.columnConfig as any[]))
          if (parsed.notesTitle) setNotesTitle(parsed.notesTitle as any)
          if (parsed.termsTitle) setTermsTitle(parsed.termsTitle as any)
          if (parsed.attachments) setAttachments(parsed.attachments as any)
          if (typeof parsed.mergeQtyUnit === 'boolean') setMergeQtyUnit(parsed.mergeQtyUnit as any)
          if (parsed.discountType) setDiscountType(parsed.discountType)
          if (parsed.discountTiming) setDiscountTiming(parsed.discountTiming)
          if (parsed.whtType) setWhtType(parsed.whtType)
          if (parsed.groupMeta) savedGroupMeta = parsed.groupMeta
        } else if (Array.isArray(parsed)) {
          setCustomFields(normalizeFieldEntries(parsed, 'value'))
        }
      } catch (err) {
        console.error('Failed to parse custom fields:', err)
      }

      if (data.invoice_title) setInvoiceTitle(data.invoice_title)

      const { data: itemRows } = await supabase.from('invoice_items').select('*').eq('invoice_id', id).order('sort_order')
      const legacyCalculationState = inferLegacyCalculationState({
        invoice: data,
        items: itemRows || [],
        customFields: parsedCustomFields && !Array.isArray(parsedCustomFields) ? parsedCustomFields : {},
      })

      const loadedItems = (itemRows && itemRows.length > 0 ? itemRows : [makeEmptyItem()]).map((item) => mapDbInvoiceItem(item))

      setItems(loadedItems)
      setInitialInvoiceSnapshot(data)
      setInvoice({
        ...data,
        vat: legacyCalculationState.editableInputs.vatRate,
        discount: legacyCalculationState.editableInputs.discountValue,
        wht: legacyCalculationState.calculationInputs.whtValue,
      })
      setDiscountType(legacyCalculationState.calculationInputs.discountType as DiscountType)
      setDiscountTiming(legacyCalculationState.calculationInputs.discountTiming as DiscountTiming)
      setWhtType(legacyCalculationState.calculationInputs.whtType as WhtType)

      const seenGroupIds = new Set()
      const discoveredGroups = loadedItems
        .filter((item) => item.row_type === 'group_header')
        .map((item, index) => {
          const groupId = item.group_id || `group_${index}`
          if (seenGroupIds.has(groupId)) return null
          seenGroupIds.add(groupId)
          const meta = savedGroupMeta[groupId] || savedGroupMeta[item.group_name || ''] || {}
          return {
            id: groupId,
            name: item.group_name || `Group ${index + 1}`,
            showSubtotal: !!meta.showSubtotal,
          }
        })
        .filter(Boolean) as InvoiceGroup[]

      setGroups(discoveredGroups)
      setLoading(false)
    }

    void load()
  }, [isEdit, id, navigate, setColumns])

  /* ── Shared init effect (signatories, bank accounts, settings) ── */
  useEffect(() => {
    if (isEdit) return
    const loadSignatories = async () => {
      const [signatoriesResult, bankAccountsResult, settingsResult] = await Promise.all([
        supabase.from('signatories').select('*').order('name'),
        supabase.from('bank_accounts').select('*').order('is_default', { ascending: false }),
        supabase.from('settings').select('company_tagline, footer_text').eq('id', 1).single(),
      ])
      setSignatories(signatoriesResult.data || [])
      setBankAccounts(bankAccountsResult.data || [])
      setSettingsData(settingsResult.data || null)
    }

    void loadSignatories()
  }, [isEdit])

  const handleImportApply = useCallback((result: any) => {
    invoiceImportAdapter.applyResult({
      result,
      setColumns,
      setItems,
      updateTopLevelField: (field: string, value: any) => {
        if (field === 'title') setInvoiceTitle(value)
        else updateInvoice(field, value)
      },
      setExtraCharges,
      setGroups,
    })
  }, [updateInvoice])

  /* ── Derived values ── */

  const calculationInputs = useMemo(
    () => buildCalculationInputs({ invoice, discountType, discountTiming, whtType }),
    [invoice?.vat, invoice?.discount, invoice?.wht, discountType, discountTiming, whtType],
  )
  const documentTotals = useMemo(() => {
    if (!invoice && isEdit) {
      return {
        items: [] as ComputedItem[],
        groups: [] as ComputedGroup[],
        subtotal: 0,
        installRateTotal: 0,
        extraChargesTotal: 0,
        taxableBase: 0,
        discount: 0,
        vat: 0,
        wht: 0,
        grandTotal: 0,
        totalPayable: 0,
      }
    }
    return computeDocument({
      items,
      columns,
      document: {
        ...invoice!,
        workmanship: Number(invoice?.workmanship || 0),
        transportation: Number(invoice?.transportation || 0),
        shipping: Number(invoice?.shipping || 0),
      },
      cf: {
        extraCharges,
        calculationInputs,
      },
    })
  }, [items, columns, extraCharges, calculationInputs, invoice, isEdit])

  /* ── Save handler ── */

  const handleSave = useCallback(async (status: string) => {
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
      setInvalidRowIndex(firstInvalidIdx)
      setTimeout(() => setInvalidRowIndex(null), 2500)
      feedback.error('Validation Error', {
        description: `${invalidStandardRowCount} item row${invalidStandardRowCount === 1 ? '' : 's'} must have a description before saving.`,
      })
      return
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

    /* ── Build custom fields ── */
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
      additionalFields: filterPopulatedAdditionalFields(additionalFields),
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

    /* ── Build payload ── */
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

    /* ── Save document row ── */
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
          return getNextInvoiceNumber(rows || [], resolvePrefix(settings?.document_prefixes, 'invoice'))
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

    /* ── Save items ── */
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

    /* ── Audit trail ── */
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
    invoice, invoiceTitle, items, groups, initialCustomFields, baseCustomFields,
    customFields, additionalFields, extraCharges, chargeLabels, columns,
    notesTitle, termsTitle, attachments, mergeQtyUnit,
    discountType, discountTiming, whtType, calculationInputs,
    signatoryId, pdfOutput, settings?.document_prefixes, documentTotals,
    isCreate, isEdit, id, initialInvoiceSnapshot,
  ])

  /* ── Render ── */

  const pageTitle = isCreate ? 'Create Invoice' : 'Edit Invoice'
  const modeLabel = isCreate ? 'New Invoice' : 'Edit Invoice'
  const primaryLabel = isCreate ? 'Create Invoice' : 'Save Changes'

  const onSaveUnpaid = useCallback(() => handleSave('unpaid'), [handleSave])

  const handleCancel = useCallback(() => navigate(isCreate ? '/invoices' : '/invoices/' + id), [isCreate, id, navigate])

  if (isEdit && (loading || !invoice)) {
    return (
      <Layout title={pageTitle} hidePageHeader>
        <div className="w-full px-4 py-6 pb-24 text-sm text-muted-foreground sm:px-6 md:mx-auto md:max-w-2xl md:pb-12 lg:px-8">
          Loading invoice...
        </div>
      </Layout>
    )
  }

  return (
    <Layout title={pageTitle} hidePageHeader>
      <div className="mx-auto w-full max-w-4xl space-y-6 px-0 sm:px-2">
        <SharedDocumentForm
          title={pageTitle}
          modeLabel={modeLabel}
          invoice={invoice!}
          invoiceTitle={invoiceTitle}
          setInvoiceTitle={setInvoiceTitle}
          updateInvoice={updateInvoice}
          items={items}
          groups={groups}
          customFields={customFields}
          additionalFields={additionalFields}
          extraCharges={extraCharges}
          chargeLabels={chargeLabels}
          notesTitle={notesTitle}
          setNotesTitle={setNotesTitle}
          termsTitle={termsTitle}
          setTermsTitle={setTermsTitle}
          attachments={attachments}
          setAttachments={setAttachments}
          signatories={signatories}
          signatoryId={signatoryId}
          onSignatoryChange={setSignatoryId}
          mergeQtyUnit={mergeQtyUnit}
          setMergeQtyUnit={setMergeQtyUnit}
          columns={columns}
          isVisible={isVisible}
          getColumn={getColumn}
          toggleVisible={toggleVisible}
          toggleDisabled={toggleDisabled}
          updateColumn={updateColumn}
          addCustomColumn={addCustomColumn}
          removeCustomColumn={removeCustomColumn}
          resetColumns={resetColumns}
          moveColumn={moveColumn}
          customColumns={customColumns}
          computedItems={documentTotals.items}
          computedGroups={documentTotals.groups}
          rawSubtotal={documentTotals.subtotal}
          installRateTotal={documentTotals.installRateTotal}
          vatAmount={documentTotals.vat}
          discountAmount={documentTotals.discount}
          grandTotal={documentTotals.grandTotal}
          whtAmount={documentTotals.wht}
          totalPayable={documentTotals.totalPayable}
          amountInWords={numberToWords(documentTotals.totalPayable)}
          discountType={discountType}
          setDiscountType={setDiscountType}
          discountTiming={discountTiming}
          setDiscountTiming={setDiscountTiming}
          whtType={whtType}
          setWhtType={setWhtType}
          saving={saving}
          primaryLabel={primaryLabel}
          onSaveSent={onSaveUnpaid}
          onSaveDraft={onSaveUnpaid}
          onFloatingSave={onSaveUnpaid}
          onCancel={handleCancel}
          onApplyImport={handleImportApply}
          importAdapter={invoiceImportAdapter}
          onAddItem={addItem}
          onAddGroup={addGroup}
          onAddItemToGroup={addItemToGroup}
          onUpdateItem={updateItem}
          onResetItemOverrides={resetItemOverrides}
          onRemoveItem={removeItem}
          onMoveItem={moveItem}
          onInsertItemAfter={insertItemAfter}
          onUpdateGroupName={updateGroupName}
          onToggleGroupSubtotal={toggleGroupSubtotal}
          onDeleteGroup={deleteGroup}
          onAddHeaderField={handleAddHeaderField}
          onUpdateHeaderField={handleUpdateHeaderField}
          onRemoveHeaderField={handleRemoveHeaderField}
          onAddAdditionalField={handleAddAdditionalField}
          onUpdateAdditionalField={handleUpdateAdditionalField}
          onRemoveAdditionalField={handleRemoveAdditionalField}
          onChargeLabelChange={handleChargeLabelChange}
          onAddExtraCharge={handleAddExtraCharge}
          onUpdateExtraCharge={handleUpdateExtraCharge}
          onRemoveExtraCharge={handleRemoveExtraCharge}
          onClearAll={handleClearAll}
          invalidRowIndex={invalidRowIndex}
          onClearInvalidRow={() => setInvalidRowIndex(null)}
          showColumnManager={showColumnManager}
          setShowColumnManager={setShowColumnManager}
          isMobile={isMobile}
        />

        <div className="mx-auto w-full max-w-4xl px-0 pb-6 sm:px-2">
          <PdfOutputSettings
            value={pdfOutput}
            onChange={setPdfOutput}
            bankAccounts={bankAccounts.map((account) => ({
              id: account.id,
              bankName: account.bank_name || '',
              accountName: account.account_name || '',
              accountNumber: account.account_number || '',
              sortCode: account.sort_code || '',
              isDefault: !!account.is_default,
            }))}
            companyTagline={settingsData?.company_tagline || ''}
            footerText={settingsData?.footer_text || ''}
            showBalanceDueOption
          />
        </div>
      </div>
    </Layout>
  )
}
