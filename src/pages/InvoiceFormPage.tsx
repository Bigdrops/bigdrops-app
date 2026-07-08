import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { supabase } from '../supabase'
import SharedDocumentForm from '@/components/document/SharedDocumentForm'
import IdentityLockDialog from '@/components/document/IdentityLockDialog'
import { PdfOutputSettings } from '@/components/PdfOutputSettings'
import {
  DEFAULT_INVOICE_PDF_OUTPUT,
  getInvoicePdfOutput,
  getInvoiceSignatoryId,
  invoiceImportAdapter,
  normalizeAdditionalFieldEntries,
  parseCustomFields,
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
import { getNextInvoiceNumber } from '@/domain/documentConversion'
import { resolvePrefix } from '@/domain/prefixConstants'
import {
  buildCalculationInputs,
  useInvoiceColumns,
} from '../components/useInvoiceColumns'
import { computeDocument, type ComputedItem, type ComputedGroup } from '../lib/Calculations'
import { resolveFinancialColumns } from '@/domain/financial/resolveFinancialColumns'
import { numberToWords } from '../hooks/useInvoiceForm'
import { useInvoiceEditableState } from '@/hooks/useInvoiceEditableState'
import { useInvoiceReferenceData } from '@/hooks/useInvoiceReferenceData'
import { useInvoiceHydration } from '@/hooks/useInvoiceHydration'
import { useLayoutMode } from '@/hooks/useLayoutMode'
import { useSettings } from '@/hooks/useSettings'
import { useInvoiceSave } from '@/hooks/useInvoiceSave'

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

  const [invalidRowIndex, setInvalidRowIndex] = useState<number | null>(null)
  const [showColumnManager, setShowColumnManager] = useState(false)

  const [identityLockDialog, setIdentityLockDialog] = useState<{ open: boolean; field: 'client' | 'invoice_number' | null }>({ open: false, field: null })

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

  const refData = useInvoiceReferenceData()

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

  const hydration = useInvoiceHydration(
    { id, isEdit },
    {
      setInvoice,
      setItems,
      setGroups,
      setCustomFields,
      setAdditionalFields,
      setExtraCharges,
      setChargeLabels,
      setNotesTitle,
      setTermsTitle,
      setMergeQtyUnit,
      setInvoiceTitle,
      setAttachments,
      setSignatoryId,
      setPdfOutput,
      setDiscountType,
      setDiscountTiming,
      setWhtType,
      setColumns,
    },
    useCallback(() => navigate('/invoices'), [navigate]),
  )

  const initialCustomFields = useMemo(
    () => (isCreate ? parseCustomFields(prefill?.custom_fields) : hydration.baseCustomFields),
    [isCreate, prefill?.custom_fields, hydration.baseCustomFields],
  )

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

  /* ── Edit-mode & create-mode init handled by hydration + reference data hooks ── */

  const IDENTITY_FIELDS = ['client_id', 'client_name', 'invoice_number', 'document_type'] as const
  const guardedUpdateInvoice = useCallback((field: string, value: any) => {
    if (isEdit && IDENTITY_FIELDS.includes(field as typeof IDENTITY_FIELDS[number])) {
      setIdentityLockDialog({ open: true, field: field === 'client_id' ? 'client' : 'invoice_number' })
      return
    }
    updateInvoice(field, value)
  }, [isEdit, updateInvoice])

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

  /* ── Identity lock: duplicate from current editable state ── */
  const handleDuplicateFromEditable = useCallback(() => {
    const clonedInvoice = JSON.parse(JSON.stringify(invoice))
    const clonedItems = items.map((item) => ({ ...JSON.parse(JSON.stringify(item)), id: null }))

    navigate('/invoices/new', {
      state: {
        prefill: {
          ...clonedInvoice,
          client_id: null,
          client_name: '',
          project_id: null,
          status: 'unpaid',
          issue_date: new Date().toISOString().split('T')[0],
          due_date: null,
          subtotal: 0,
          total: 0,
          install_rate_total: 0,
          amount_in_words: '',
        },
        prefillItems: clonedItems,
      },
    })
  }, [invoice, items, navigate])

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

  const { save, saving } = useInvoiceSave({
    invoice,
    invoiceTitle,
    items,
    groups,
    initialCustomFields,
    customFields,
    additionalFields,
    extraCharges,
    chargeLabels,
    columns,
    notesTitle,
    termsTitle,
    attachments,
    mergeQtyUnit,
    discountType,
    discountTiming,
    whtType,
    calculationInputs,
    signatoryId,
    pdfOutput,
    documentTotals,
    isCreate,
    isEdit,
    id,
    initialInvoiceSnapshot: hydration.initialInvoiceSnapshot,
    baseCustomFields: hydration.baseCustomFields,
    documentPrefixes: settings?.document_prefixes,
    navigate,
    onInvalidRow: setInvalidRowIndex,
  })

  /* ── Render ── */

  const pageTitle = isCreate ? 'Create Invoice' : 'Edit Invoice'
  const modeLabel = isCreate ? 'New Invoice' : 'Edit Invoice'
  const primaryLabel = isCreate ? 'Create Invoice' : 'Save Changes'

  const onSaveUnpaid = useCallback(() => save('unpaid'), [save])

  const handleCancel = useCallback(() => navigate(isCreate ? '/invoices' : '/invoices/' + id), [isCreate, id, navigate])

  const handleLockedFieldClick = useCallback((field: 'client' | 'invoice_number') => {
    setIdentityLockDialog({ open: true, field })
  }, [])

  if (isEdit && (hydration.loading || !invoice)) {
    return (
      <Layout title={pageTitle} hidePageHeader immersive>
        <div className="w-full px-4 py-6 pb-24 text-sm text-muted-foreground sm:px-6 md:mx-auto md:max-w-2xl md:pb-12 lg:px-8">
          Loading invoice...
        </div>
      </Layout>
    )
  }

  return (
    <Layout title={pageTitle} hidePageHeader immersive>
      <div className="mx-auto w-full max-w-4xl space-y-6 px-0 sm:px-2">
        <SharedDocumentForm
          title={pageTitle}
          modeLabel={modeLabel}
          invoice={invoice!}
          invoiceTitle={invoiceTitle}
          setInvoiceTitle={setInvoiceTitle}
          updateInvoice={guardedUpdateInvoice}
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
          signatories={refData.signatories}
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
          onLockedFieldClick={isEdit ? handleLockedFieldClick : undefined}
        />

        <div className="mx-auto w-full max-w-4xl px-0 pb-6 sm:px-2">
          <PdfOutputSettings
            value={pdfOutput}
            onChange={setPdfOutput}
            bankAccounts={refData.bankAccounts.map((account) => ({
              id: account.id,
              bankName: account.bank_name || '',
              accountName: account.account_name || '',
              accountNumber: account.account_number || '',
              sortCode: account.sort_code || '',
              isDefault: !!account.is_default,
            }))}
            companyTagline={refData.settingsData?.company_tagline || ''}
            footerText={refData.settingsData?.footer_text || ''}
            showBalanceDueOption
          />
        </div>

        {isEdit && (
          <IdentityLockDialog
            open={identityLockDialog.open}
            onOpenChange={(open) => setIdentityLockDialog((prev) => ({ ...prev, open }))}
            fieldLabel={identityLockDialog.field === 'client' ? 'Client' : 'Invoice Number'}
            onDuplicate={handleDuplicateFromEditable}
          />
        )}
      </div>
    </Layout>
  )
}
