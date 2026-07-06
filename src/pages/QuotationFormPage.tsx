import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { supabase } from '../supabase'
import { PdfOutputSettings } from '@/components/PdfOutputSettings'
import {
  buildCalculationInputs,
  ensureUiKey,
  makeEmptyItem,
  makeExtraCharge,
  makeFieldEntry,
  normalizeExtraCharges,
  useInvoiceColumns,
} from '@/components/useInvoiceColumns.jsx'
import type { ColumnConfig, ExtraCharge, InvoiceFieldEntry, InvoiceItem } from '@/domain/invoice'
import {
  buildQuotationFormState,
  type DbQuotation,
  type DbQuotationItem,
  quotationImportAdapter,
} from '@/domain/quotation'
import type { ApplyImportResult } from '@/domain/import/types'
import { computeDocument } from '@/lib/Calculations'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import {
  peekNextOfflineQuotationNumber,
} from '@/lib/native/quotationOffline'
import { feedback } from '@/lib/feedback'
import { useLayoutMode } from '@/hooks/useLayoutMode'
import { useSettings } from '@/hooks/useSettings'
import { resolvePrefix } from '@/domain/prefixConstants'
import { formatQuotationStatus } from '../components/quotation/quotationStatus'
import type {
  BankAccountRow,
  PdfOutputState,
  QuotationEditorState,
  QuotationGroupState,
  RfqConversionPrefillState,
  SignatoryRow,
} from '../components/quotation/quotationFormTypes'
import { defaultPdfOutput, canUseOfflineQuotationDrafts } from '../components/quotation/quotationFormConstants'
import { useQuotationLineItems } from '../components/quotation/useQuotationLineItems'
import {
  parseGroupMeta,
  parseChargeLabels,
  normalizeQuotationGrouping,
  toGroupMetaMap,
  buildCustomFields,
} from '../components/quotation/quotationFormUtils'
import SharedDocumentForm from '@/components/document/SharedDocumentForm'
import { useQuotationSave } from '@/hooks/useQuotationSave'

export default function QuotationFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { id: quotationId } = useParams<{ id: string }>()
  const prefill = (location.state || {}) as RfqConversionPrefillState
  const { isMobile } = useLayoutMode()
  const { settings } = useSettings()
  const isEdit = mode === 'edit'
  const isCreate = mode === 'create'
  const [loading, setLoading] = useState(isEdit)
  const [invalidRowIndex, setInvalidRowIndex] = useState<number | null>(null)
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
              quantity: Number(item?.quantity || 1),
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
      if (isCreate && canUseOfflineQuotationDrafts()) {
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
        setInitialNotes((quotationRow.notes as string) || '')
        setInitialTerms((quotationRow.terms as string) || '')
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

  const handleImportApply = useCallback((result: ApplyImportResult) => {
    quotationImportAdapter.applyResult({
      result,
      setColumns,
      setItems: (nextItems) => lineItemsHandlers.commitGrouping(nextItems, result.groups || []),
      setGroups: () => {},
      updateTopLevelField: (field, value) => {
        if (field === 'title') updateQuotation('quotation_title', value)
        else updateQuotation(field as any, value)
      },
      setExtraCharges: (charges) => setExtraCharges(charges),
    })
  }, [updateQuotation, lineItemsHandlers, setColumns])

  const handleClearAll = useCallback(() => {
    lineItemsHandlers.commitGrouping(
      [{ ...makeEmptyItem(), row_type: 'standard', group_id: null, group_name: '' }],
      [],
    )
  }, [lineItemsHandlers])

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
    [calculationInputs, extraCharges, normalizedItems, quotation, columns],
  )

  const handlePdfOutputChange = useCallback(async (next: PdfOutputState) => {
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
  }, [isEdit, quotationId, quotation, columns, headerFields, additionalFields, discountType, discountTiming, whtType, notesTitle, termsTitle, mergeQtyUnit, showItemImages, normalizedGroups, attachments, extraCharges, chargeLabels, signatoryId, pdfOutput])

  const { save, saving } = useQuotationSave({
    quotation,
    quotationTitle: quotation.quotation_title || '',
    items,
    groups: normalizedGroups as any,
    customFields: headerFields,
    additionalFields,
    extraCharges,
    chargeLabels,
    columns,
    notesTitle,
    termsTitle,
    attachments: attachments as any,
    mergeQtyUnit,
    discountType,
    discountTiming,
    whtType,
    calculationInputs,
    signatoryId,
    pdfOutput,
    initialNotes,
    initialTerms,
    initialQuotationSnapshot,
    normalizedItems,
    normalizedGroups: normalizedGroups as any,
    showItemImages,
    documentTotals: totals,
    documentPrefixes: settings?.document_prefixes,
    isCreate,
    isEdit,
    id: quotationId,
    navigate,
    onInvalidRow: setInvalidRowIndex,
    setQuotationNumber: (num: string) => setQuotation((current) => ({ ...current, quotation_number: num })),
  })

  if (loading) {
    return (
      <Layout title={isEdit ? 'Edit Quotation' : 'New Quotation'} session={null}>
        <div className="rounded-xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground shadow-sm sm:px-6">Loading quotation...</div>
      </Layout>
    )
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

  const pageTitle = isEdit ? 'Edit Quotation' : 'New Quotation'

  return (
    <Layout title={pageTitle} session={null}>
      <div className="mx-auto w-full max-w-4xl space-y-6 px-0 sm:px-2">
        <SharedDocumentForm
          title={pageTitle}
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
          onSaveSent={() => save('open')}
          onSaveDraft={() => save('open')}
          onFloatingSave={() => save('open')}
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
    </Layout>
  )
}
