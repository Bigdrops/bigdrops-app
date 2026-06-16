import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import SharedDocumentForm from '@/components/document/SharedDocumentForm'
import { PdfOutputSettings } from '@/components/PdfOutputSettings'
import { supabase } from '@/supabase'
import {
  buildCalculationInputs,
  ensureUiKey,
  filterPopulatedAdditionalFields,
  makeEmptyGroup,
  makeEmptyItem,
  makeExtraCharge,
  makeFieldEntry,
  normalizeExtraCharges,
  useInvoiceColumns,
} from '@/components/useInvoiceColumns.jsx'
import { toDbItem } from '@/domain/invoice'
import type { ColumnConfig, ExtraCharge, InvoiceFieldEntry, InvoiceItem } from '@/domain/invoice'
import { normalizeQuantity } from '@/domain/invoice'
import {
  buildQuotationFormState,
  type DbQuotation,
  type DbQuotationItem,
  type Quotation,
  quotationImportAdapter,
} from '@/domain/quotation'
import type { ApplyImportResult } from '@/domain/import/types'
import { computeDocument } from '@/lib/Calculations'
import { withUniqueRetry } from '@/lib/withUniqueRetry'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { canUseAndroidNativeSqlite } from '@/lib/native/capacitor'
import { type ProjectLookupClient, type ProjectPrefillState, validateProjectAssignment } from '@/domain/projects'
import { normalizeRichTextHtml } from '@/components/pdf-new/core/richText'
import {
  createOfflineQuotationDraft,
  peekNextOfflineQuotationNumber,
} from '@/lib/native/quotationOffline'
import { feedback } from '@/lib/feedback'
import { useLayoutMode } from '@/hooks/useLayoutMode'
import { useSettings } from '@/hooks/useSettings'
import { resolvePrefix } from '@/domain/prefixConstants'
import { formatQuotationStatus } from './quotationStatus'
import type {
  BankAccountRow,
  PdfOutputState,
  QuotationEditorState,
  QuotationGroupState,
  RfqConversionPrefillState,
  SignatoryRow,
} from './quotationFormTypes'
import { defaultPdfOutput, canUseOfflineQuotationDrafts } from './quotationFormConstants'
import { useQuotationLineItems } from './useQuotationLineItems'
import {
  makeQuotationGroupId,
  parseGroupMeta,
  parseChargeLabels,
  normalizeQuotationGrouping,
  toGroupMetaMap,
  buildCustomFields,
  toQuotationItem,
} from './quotationFormUtils'
import { createSaveTimer, getJsonSizeBytes } from '@/lib/saveTiming'

export default function QuotationForm({ mode, quotationId }: { mode: 'new' | 'edit'; quotationId?: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  const prefill = (location.state || {}) as RfqConversionPrefillState
  const { isMobile } = useLayoutMode()
  const { settings } = useSettings()
  const isEdit = mode === 'edit'
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [showColumnManager, setShowColumnManager] = useState(false)
  const [quotation, setQuotation] = useState<QuotationEditorState>({
    quotation_number: '',
    po_number: '',
    project_id: prefill.projectId || '',
    client_id: '',
    client_name: '',
    issue_date: new Date().toISOString().split('T')[0],
    valid_until: '',
    status: 'open',
    quotation_title: '',
    notes: '',
    terms: '',
    workmanship: 0,
    transportation: 0,
    shipping: 0,
    discount: 0,
    vat: 7.5,
    wht: 0,
    payment_terms: 'Custom',
    custom_payment_terms: '',
  })
  const [headerFields, setHeaderFields] = useState<InvoiceFieldEntry[]>([])
  const [additionalFields, setAdditionalFields] = useState<InvoiceFieldEntry[]>([])
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed')
  const [discountTiming, setDiscountTiming] = useState<'before' | 'after'>('after')
  const [whtType, setWhtType] = useState<'fixed' | 'percent'>('percent')
  const [notesTitle, setNotesTitle] = useState('Notes')
  const [termsTitle, setTermsTitle] = useState('Terms and Conditions')
  const [attachments, setAttachments] = useState<Array<Record<string, unknown>>>([])
  const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>([])
  const [chargeLabels, setChargeLabels] = useState({
    workmanship: 'Workmanship',
    transportation: 'Transportation',
    shipping: 'Shipping',
  })
  const [signatories, setSignatories] = useState<SignatoryRow[]>([])
  const [signatoryId, setSignatoryId] = useState<string | null>(null)
  const [bankAccounts, setBankAccounts] = useState<BankAccountRow[]>([])
  const [settingsData, setSettingsData] = useState<{ company_tagline?: string | null; footer_text?: string | null } | null>(null)
  const [pdfOutput, setPdfOutput] = useState<PdfOutputState>(defaultPdfOutput)
  const [mergeQtyUnit, setMergeQtyUnit] = useState(true)
  const [showItemImages, setShowItemImages] = useState(false)
  const [groups, setGroups] = useState<QuotationGroupState[]>([])
  const [initialQuotationSnapshot, setInitialQuotationSnapshot] = useState<Record<string, unknown> | null>(null)
  const [initialNotes, setInitialNotes] = useState('')
  const [initialTerms, setInitialTerms] = useState('')
  const [items, setItems] = useState<InvoiceItem[]>([
    { ...makeEmptyItem(), row_type: 'standard', group_id: null, group_name: '' },
  ])
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

  useEffect(() => {
    if (isEdit) return
    if (!prefill.projectId && !prefill.clientId && !prefill.clientName) return

    setQuotation((current) => ({
      ...current,
      project_id: current.project_id || String(prefill.projectId || ''),
      client_id: current.client_id || String(prefill.clientId || ''),
      client_name: current.client_name || String(prefill.clientName || ''),
    }))
  }, [isEdit, prefill.clientId, prefill.clientName, prefill.projectId])

  useEffect(() => {
    if (isEdit) return
    if (!prefill.sourceRfq) return

    setQuotation((current) => ({
      ...current,
      quotation_title: current.quotation_title || String(prefill.sourceRfq?.title || ''),
      notes: current.notes || String(prefill.sourceRfq?.notes || ''),
    }))

    const nextItems = Array.isArray(prefill.sourceRfq.items)
      ? prefill.sourceRfq.items
          .filter((item) => String(item?.description || '').trim())
          .map((item, index) =>
            ensureUiKey({
              ...makeEmptyItem(),
              id: null,
              description: String(item?.description || ''),
              quantity: normalizeQuantity(item?.quantity, 1),
              unit: String(item?.unit || ''),
              sub_description: String(item?.specification || ''),
              row_type: 'standard',
              group_id: null,
              group_name: '',
              sort_order: index,
              custom_data: {},
            }),
          )
      : []

    if (nextItems.length > 0) {
      lineItemsHandlers.commitGrouping(nextItems)
    }
  }, [isEdit, prefill.sourceRfq])

  useEffect(() => {
    const load = async () => {
      if (!isEdit && canUseOfflineQuotationDrafts()) {
        try {
          const nextQuotationNumber = await peekNextOfflineQuotationNumber()
          setQuotation((current) => ({
            ...current,
            quotation_number: current.quotation_number || nextQuotationNumber,
          }))
        } catch (error) {
          console.warn('Failed to prepare offline quotation number', error)
        }

        setAttachments([])
        setExtraCharges([])
        setGroups([])
        setSignatoryId(null)
        setPdfOutput(defaultPdfOutput)
        setLoading(false)
        return
      }

      const [signatoriesResult, bankAccountsResult, settingsResult] = await Promise.all([
        supabase.from('signatories').select('*').order('name'),
        supabase.from('bank_accounts').select('*').order('is_default', { ascending: false }),
        supabase.from('settings').select('company_tagline, footer_text').eq('id', 1).single(),
      ])

      setSignatories((signatoriesResult.data || []) as SignatoryRow[])
      setBankAccounts((bankAccountsResult.data || []) as BankAccountRow[])
      setSettingsData(settingsResult.data || null)

      if (isEdit && quotationId) {
        const [{ data: quotationRow, error }, { data: itemRows }] = await Promise.all([
          supabase.from('quotations').select('*').eq('id', quotationId).single(),
          supabase.from('quotation_items').select('*').eq('quotation_id', quotationId).order('sort_order'),
        ])

        if (error || !quotationRow) {
          feedback.error('Quotation not found', { description: 'Quotation not found.' })
          navigate('/quotations')
          return
        }

        const state = buildQuotationFormState(quotationRow as DbQuotation, (itemRows || []) as DbQuotationItem[])
        const normalizedGrouping = normalizeQuotationGrouping(
          state.items,
          parseGroupMeta(state.quotation.custom_fields?.groupMeta),
        )

        setQuotation({
          ...state.quotation,
          payment_terms: String(state.quotation.custom_fields?.payment_terms || 'Custom'),
          custom_payment_terms: String(state.quotation.custom_fields?.custom_payment_terms || ''),
        })
        setInitialQuotationSnapshot(quotationRow as Record<string, unknown>)
        setInitialNotes(quotationRow.notes as string || '')
        setInitialTerms(quotationRow.terms as string || '')
        setItems(normalizedGrouping.items)
        setColumns(state.columns)
        setHeaderFields(state.headerFields)
        setAdditionalFields(state.additionalFields)
        setDiscountType(state.discountType)
        setDiscountTiming(state.discountTiming)
        setWhtType(state.whtType)
        setNotesTitle(state.notesTitle)
        setTermsTitle(state.termsTitle)
        setMergeQtyUnit(state.mergeQtyUnit)
        setShowItemImages(state.showItemImages)
        setAttachments(Array.isArray(state.quotation.custom_fields?.attachments) ? (state.quotation.custom_fields?.attachments as Array<Record<string, unknown>>) : [])
        setSignatoryId(typeof state.quotation.custom_fields?.signatoryId === 'string' ? state.quotation.custom_fields.signatoryId : null)
        setPdfOutput(
          state.quotation.custom_fields?.pdfOutput && typeof state.quotation.custom_fields.pdfOutput === 'object'
            ? {
                ...defaultPdfOutput,
                ...(state.quotation.custom_fields.pdfOutput as Partial<PdfOutputState>),
              }
            : defaultPdfOutput,
        )
        setExtraCharges(
          normalizeExtraCharges(
            Array.isArray(state.quotation.custom_fields?.extraCharges)
              ? state.quotation.custom_fields?.extraCharges
              : [],
          ),
        )
        setChargeLabels((current) => ({
          ...current,
          ...parseChargeLabels(state.quotation.custom_fields?.chargeLabels),
        }))
        setGroups(normalizedGrouping.groups)
        setLoading(false)
        return
      }

      const { data } = await supabase.from('quotations').select('quotation_number')
      const nums = (data || []).map((q: { quotation_number?: string | null }) => {
        const match = q.quotation_number?.match(/(\d+)$/)
        return match ? parseInt(match[1], 10) : 0
      })
      const next = Math.max(0, ...nums) + 1
      const quotationPrefix = resolvePrefix(settings?.document_prefixes, 'quotation')
      const nextQuotationNumber = `${quotationPrefix}-${String(next).padStart(4, '0')}`
      setQuotation((current) => ({
        ...current,
        quotation_number: nextQuotationNumber,
      }))
      setAttachments([])
      setExtraCharges([])
      setGroups([])
      setSignatoryId(null)
      setPdfOutput(defaultPdfOutput)
      setLoading(false)
    }

    void load()
  }, [isEdit, navigate, quotationId, setColumns, settings?.document_prefixes])

  const lineItemsHandlers = useQuotationLineItems({ items, setItems, groups, setGroups })
  const {
    addQuotationItem,
    insertItemAfter,
    updateItem,
    applyRowPatch,
    resetItemOverrides,
    removeItemAt,
    moveItemBy,
    addQuotationGroup,
    updateGroupName,
    toggleGroupSubtotal,
    deleteGroup,
    addItemToGroup,
  } = lineItemsHandlers

  const updateQuotation = <K extends keyof QuotationEditorState>(field: K, value: QuotationEditorState[K]) =>
    setQuotation((current) => ({ ...current, [field]: value }))

  const normalizedGroupMeta = useMemo(() => toGroupMetaMap(groups), [groups])
  const normalizedGrouping = useMemo(() => normalizeQuotationGrouping(items, normalizedGroupMeta), [items, normalizedGroupMeta])
  const normalizedItems = normalizedGrouping.items
  const normalizedGroups = normalizedGrouping.groups

  const handleImportApply = (result: ApplyImportResult) => {
    quotationImportAdapter.applyResult({
      result,
      setColumns,
      setItems: (nextItems) => lineItemsHandlers.commitGrouping(nextItems, result.groups || []),
      setGroups: () => {}, // No-op: groups are handled by commitGrouping
      updateTopLevelField: (field, value) => {
        if (field === 'title') updateQuotation('quotation_title', value)
        else updateQuotation(field as any, value)
      },
      setExtraCharges: (charges) => setExtraCharges(charges),
    })
  }

  const calculationInputs = useMemo(
    () => buildCalculationInputs({ invoice: quotation, discountType, discountTiming, whtType }),
    [discountTiming, discountType, quotation, whtType],
  )

  const totals = useMemo(
    () =>
      computeDocument({
        items: normalizedItems,
        columns,
        document: {
          ...quotation,
          workmanship: Number(quotation.workmanship || 0),
          transportation: Number(quotation.transportation || 0),
          shipping: Number(quotation.shipping || 0),
        },
        cf: {
          extraCharges,
          calculationInputs,
        },
      }),
    [calculationInputs, extraCharges, normalizedItems, quotation],
  )

  const handlePdfOutputChange = async (next: PdfOutputState) => {
    setPdfOutput(next)

    if (!isEdit || !quotationId) return

    const existingCustomFields = buildCustomFields({
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
      pdfOutput: next,
    })

    const { error } = await supabase
      .from('quotations')
      .update({
        custom_fields: JSON.stringify(existingCustomFields),
      })
      .eq('id', quotationId)

    if (error) {
      feedback.error('Save failed', {
        description: getUserFacingMutationMessage(error, { action: 'save' }),
      })
    }
  }

  const handleSave = async (status: Quotation['status']) => {
    if (!quotation.client_id) {
      feedback.error('Validation Error', { description: 'Pick a client before saving' })
      return
    }

    const standardItems = items.filter((item) => item.row_type === 'standard')
    const hasMeaningfulItem = standardItems.some((item) => item.description?.trim())

    if (!hasMeaningfulItem) {
      feedback.error('Validation Error', { description: 'Add at least one item before saving' })
      return
    }

    if (standardItems.some((item) => !item.description?.trim())) {
      feedback.error('Validation Error', { description: 'Each item needs a description' })
      return
    }

    const { project: validatedProject, error: projectError } = await validateProjectAssignment(
      supabase as unknown as ProjectLookupClient,
      {
      projectId: quotation.project_id,
      documentClientId: quotation.client_id,
      documentClientName: quotation.client_name,
      },
    )

    if (projectError) {
      feedback.error('Project link invalid', { description: projectError })
      return
    }

    setSaving(true)
    const timer = createSaveTimer('quotation-save-total', {
      mode: isEdit ? 'edit' : 'new',
      status: status || 'open',
      quotationId: quotationId || null,
    })
    const poNumber = String(quotation.po_number || '').trim()
    const buildCustomFieldsStart = timer.phaseStart('build-custom-fields')
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
    timer.phaseEnd('build-custom-fields', buildCustomFieldsStart, {
      customFieldsBytes: getJsonSizeBytes(customFieldsData),
      attachmentsCount: attachments.length,
      headerFieldCount: headerFields.length,
      additionalFieldCount: additionalFields.length,
      extraChargeCount: extraCharges.length,
      columnCount: columns.length,
      groupCount: normalizedGroups.length,
      pdfOutputBytes: getJsonSizeBytes(pdfOutput),
    })

const buildPayloadStart = timer.phaseStart('build-payload')
    const notesChanged = quotation.notes !== initialNotes
    const termsChanged = quotation.terms !== initialTerms
    const normalizedNotes = notesChanged ? normalizeRichTextHtml(quotation.notes || '') : initialNotes
    const normalizedTerms = termsChanged ? normalizeRichTextHtml(quotation.terms || '') : initialTerms
    const payload = {
      quotation_number: quotation.quotation_number || '',
      po_number: poNumber || null,
      quotation_title: quotation.quotation_title || null,
      project_id: validatedProject?.id || null,
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
      discount: totals.discount,
      vat: totals.vat,
      wht: totals.wht,
      subtotal: totals.subtotal,
      install_rate_total: totals.installRateTotal,
      total: totals.totalPayable,
      amount_in_words: quotation.amount_in_words || '',
      custom_fields: customFieldsJson,
    }
timer.phaseEnd('build-payload', buildPayloadStart, {
      documentTable: 'quotations',
      payloadBytes: getJsonSizeBytes(payload),
      notesBytes: getJsonSizeBytes(normalizedNotes),
      termsBytes: getJsonSizeBytes(normalizedTerms),
      customFieldsBytes: getJsonSizeBytes(customFieldsData),
      notesNormalized: notesChanged,
      termsNormalized: termsChanged,
    })

    const persistableItems = normalizedItems.filter((item) =>
      item.row_type === 'group_header' ? item.group_name?.trim() : item.description?.trim(),
    )

    if (!isEdit && canUseOfflineQuotationDrafts()) {
      try {
        const localDraft = await createOfflineQuotationDraft({
          ...payload,
          items: persistableItems.map((item, index) => ({ ...item, sort_order: index })),
        })
        setQuotation((current) => ({ ...current, quotation_number: localDraft.quotationNumber }))
        feedback.success('Saved offline', {
          description: `${localDraft.quotationNumber} was saved locally and queued for sync.`,
        })
        navigate('/quotations')
      } catch (error) {
        feedback.error('Offline save failed', {
          description: error instanceof Error ? error.message : 'Could not save this quotation offline.',
        })
      } finally {
        setSaving(false)
      }
      return
    }

    if (!isEdit) {
      let candidateNumber = payload.quotation_number
      const postSaveRefetchStart = timer.phaseStart('post-save-refetch')
      const { data: existing } = await supabase
        .from('quotations')
        .select('id')
        .eq('quotation_number', candidateNumber)
        .maybeSingle()
      timer.phaseEnd('post-save-refetch', postSaveRefetchStart, {
        table: 'quotations',
        operation: 'pre-save-number-check',
        supabaseCalls: 1,
      })
      if (existing) {
        const collisionPrefix = resolvePrefix(settings?.document_prefixes, 'quotation')
        const match = candidateNumber.match(/(\d+)$/)
        const num = match ? parseInt(match[1], 10) : 0
        candidateNumber = `${collisionPrefix}-${String(num + 1).padStart(4, '0')}`
        payload.quotation_number = candidateNumber
        setQuotation((current) => ({ ...current, quotation_number: candidateNumber }))
      }
    } else {
      const postSaveRefetchStart = timer.phaseStart('post-save-refetch')
      timer.phaseEnd('post-save-refetch', postSaveRefetchStart, {
        skipped: true,
        supabaseCalls: 0,
        reason: 'edit quotation save does not refetch before navigation',
      })
    }

    const saveDocumentRowStart = timer.phaseStart('save-document-row')
    let savedQuotation: any = null
    let error: any = null

    if (isEdit && quotationId) {
      const result = await supabase.from('quotations').update(payload).eq('id', quotationId).select().single()
      savedQuotation = result.data
      error = result.error
    } else {
      const result = await withUniqueRetry(
        async (candidateNumber: string) => {
          payload.quotation_number = candidateNumber
          setQuotation((current) => ({ ...current, quotation_number: candidateNumber }))
          return supabase.from('quotations').insert([payload]).select().single()
        },
        async () => {
          const { data: rows } = await supabase.from('quotations').select('quotation_number')
          const prefix = resolvePrefix(settings?.document_prefixes, 'quotation')
          return `${prefix}-${String(((rows || []).length + 1)).padStart(4, '0')}`
        },
      )
      savedQuotation = result.data
      error = result.error
    }

    timer.phaseEnd('save-document-row', saveDocumentRowStart, {
      table: 'quotations',
      operation: isEdit ? 'update-select-single' : 'insert-select-single',
      supabaseCalls: 1,
    })
    if (error || !savedQuotation) {
      feedback.error('Save failed', {
        description: getUserFacingMutationMessage(error, { action: 'save' }),
      })
      setSaving(false)
      return
    }

    const resolvedId = String(savedQuotation.id)
    const itemRows = persistableItems.map((item, index) => toQuotationItem(item, resolvedId, index))

    const deleteExistingItemsStart = timer.phaseStart('delete-existing-items')
    const { error: deleteError } = await supabase.from('quotation_items').delete().eq('quotation_id', resolvedId)
    timer.phaseEnd('delete-existing-items', deleteExistingItemsStart, {
      table: 'quotation_items',
      operation: 'delete-by-quotation_id',
      supabaseCalls: 1,
    })
    if (deleteError) {
      feedback.error('Save failed', {
        description: getUserFacingMutationMessage(deleteError, { action: 'save' }),
      })
      setSaving(false)
      return
    }

    if (itemRows.length > 0) {
      const insertItemsStart = timer.phaseStart('insert-items')
      const { error: itemError } = await supabase.from('quotation_items').insert(itemRows)
      timer.phaseEnd('insert-items', insertItemsStart, {
        table: 'quotation_items',
        rowCount: itemRows.length,
        payloadBytes: getJsonSizeBytes(itemRows),
        supabaseCalls: 1,
      })
      if (itemError) {
        feedback.error('Save failed', {
          description: getUserFacingMutationMessage(itemError, { action: 'save' }),
        })
        setSaving(false)
        return
      }
    } else {
      const insertItemsStart = timer.phaseStart('insert-items')
      timer.phaseEnd('insert-items', insertItemsStart, {
        table: 'quotation_items',
        rowCount: 0,
        skipped: true,
        supabaseCalls: 0,
      })
    }

    setSaving(false)
    // Audit Trail
    const saveAuditLogStart = timer.phaseStart('save-audit-log')
    try {
      const { recordQuotationCreated, recordAuditLog, QUOTATION_TRACKED_FIELDS } = await import('@/lib/audit')
      if (!isEdit) {
        await recordQuotationCreated(resolvedId)
        await recordAuditLog({
          entityType: 'quotation',
          recordId: resolvedId,
          entityLabel: savedQuotation.quotation_number,
          action: 'CREATE',
          oldData: null,
          newData: savedQuotation,
          trackedFields: QUOTATION_TRACKED_FIELDS,
        })
      } else {
        await recordAuditLog({
          entityType: 'quotation',
          recordId: resolvedId,
          entityLabel: savedQuotation.quotation_number,
          action: 'UPDATE',
          oldData: initialQuotationSnapshot,
          newData: savedQuotation,
          trackedFields: QUOTATION_TRACKED_FIELDS,
        })
      }
    } catch (auditErr) {
      console.error('Audit trail failed:', auditErr)
    }
    timer.phaseEnd('save-audit-log', saveAuditLogStart, {
      tables: ['audit_logs'],
      rpcCalls: isEdit ? 1 : 2,
      includesAuthLookup: true,
    })

    setSaving(false)
    const navigationAfterSaveStart = timer.phaseStart('navigation-after-save')
    navigate(`/quotations/${resolvedId}`)
    timer.phaseEnd('navigation-after-save', navigationAfterSaveStart, {
      target: `/quotations/${resolvedId}`,
    })
    timer.finish({
      supabaseCalls: (isEdit ? 0 : 1) + 1 + 1 + (itemRows.length > 0 ? 1 : 0) + (isEdit ? 1 : 2),
      itemRowCount: itemRows.length,
    })
  }

  if (loading) {
    return <div className="rounded-xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground shadow-sm sm:px-6">Loading quotation...</div>
  }

  const invoiceLikeQuotation = {
    ...quotation,
    invoice_number: quotation.quotation_number || '',
    due_date: quotation.valid_until || '',
    invoice_title: quotation.quotation_title || '',
  }

  const handleInvoiceLikeUpdate = (field: string, value: unknown) => {
    if (field === 'invoice_number') return updateQuotation('quotation_number', String(value || ''))
    if (field === 'due_date') return updateQuotation('valid_until', String(value || ''))
    if (field === 'invoice_title') return updateQuotation('quotation_title', String(value || ''))
    setQuotation((current) => ({ ...current, [field]: value }))
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-0 sm:px-2">
      <SharedDocumentForm
        title={isEdit ? 'Edit Quotation' : 'Create Quotation'}
        modeLabel={formatQuotationStatus(quotation.status || 'open')}
        invoice={invoiceLikeQuotation}
        invoiceTitle={quotation.quotation_title || ''}
        setInvoiceTitle={(value: string) => updateQuotation('quotation_title', value)}
        updateInvoice={handleInvoiceLikeUpdate}
        items={normalizedItems}
        groups={normalizedGroups}
        customFields={headerFields}
        additionalFields={additionalFields}
        extraCharges={extraCharges}
        chargeLabels={chargeLabels}
        notesTitle={notesTitle}
        setNotesTitle={setNotesTitle}
        termsTitle={termsTitle}
        setTermsTitle={setTermsTitle}
        attachments={attachments}
        setAttachments={setAttachments}
        signatories={signatories.map((signatory) => ({
          id: signatory.id,
          name: signatory.name,
          role: signatory.role || undefined,
          signatureUrl: signatory.signature_url || undefined,
        }))}
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
        computedItems={totals.items}
        computedGroups={totals.groups}
        rawSubtotal={totals.subtotal}
        installRateTotal={totals.installRateTotal}
        vatAmount={totals.vat}
        discountAmount={totals.discount}
        grandTotal={totals.grandTotal}
        whtAmount={totals.wht}
        totalPayable={totals.totalPayable}
        amountInWords={quotation.amount_in_words || ''}
        discountType={discountType}
        setDiscountType={setDiscountType}
        discountTiming={discountTiming}
        setDiscountTiming={setDiscountTiming}
        whtType={whtType}
        setWhtType={setWhtType}
        saving={saving}
        primaryLabel={isEdit ? 'Save Quotation' : 'Create Quotation'}
        onSaveSent={() => handleSave('open')}
        onSaveDraft={() => handleSave('open')}
        onFloatingSave={() => handleSave('open')}
        onCancel={() => navigate('/quotations')}
        onApplyImport={handleImportApply}
        importAdapter={quotationImportAdapter}
        onAddItem={addQuotationItem}
        onAddGroup={addQuotationGroup}
        onAddItemToGroup={addItemToGroup}
        onUpdateItem={(itemIndex: number, field: string, value: unknown) => {
          if (field === '__install_rate_override') return applyRowPatch(itemIndex, value as Partial<InvoiceItem>)
          updateItem(itemIndex, field, value)
        }}
        onResetItemOverrides={resetItemOverrides}
        onRemoveItem={removeItemAt}
        onMoveItem={moveItemBy}
        onInsertItemAfter={insertItemAfter}
        onUpdateGroupName={updateGroupName}
        onToggleGroupSubtotal={toggleGroupSubtotal}
        onDeleteGroup={deleteGroup}
        onAddHeaderField={() => setHeaderFields((current) => [...current, makeFieldEntry({ label: '', value: '' })])}
        onUpdateHeaderField={(id: string, field: 'label' | 'value', value: string) =>
          setHeaderFields((current) => current.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry)))
        }
        onRemoveHeaderField={(id: string) => setHeaderFields((current) => current.filter((entry) => entry.id !== id))}
        onAddAdditionalField={() => setAdditionalFields((current) => [...current, makeFieldEntry({ label: '', value: '' })])}
        onUpdateAdditionalField={(id: string, field: 'label' | 'value', value: string) =>
          setAdditionalFields((current) => current.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry)))
        }
        onRemoveAdditionalField={(id: string) => setAdditionalFields((current) => current.filter((field) => field.id !== id))}
        onChargeLabelChange={(key: string, value: string) => setChargeLabels((current) => ({ ...current, [key]: value }))}
        onAddExtraCharge={(withTax: boolean) => setExtraCharges((current) => [...current, makeExtraCharge({ withTax })])}
        onUpdateExtraCharge={(id: string, field: string, value: unknown) =>
          setExtraCharges((current) => current.map((charge) => (charge.id === id ? { ...charge, [field]: value } : charge)))
        }
        onRemoveExtraCharge={(id: string) => setExtraCharges((current) => current.filter((charge) => charge.id !== id))}
        showColumnManager={showColumnManager}
        setShowColumnManager={setShowColumnManager}
        isMobile={isMobile}
      />

      <div className="mx-auto w-full max-w-4xl px-0 pb-6 sm:px-2">
        <PdfOutputSettings
          value={pdfOutput}
          onChange={handlePdfOutputChange}
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
        />
      </div>
    </div>
  )
}
