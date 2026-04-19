import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import ClientSelector from '@/components/ClientSelector'
import ActionsSheet from '@/components/invoice/ActionsSheet'
import { FormHeader } from './FormHeader'
import { FormLineItems } from './FormLineItems'
import { FormCommercialTerms } from './FormCommercialTerms'
import { FormTotals } from './FormTotals'
import { FormNotesTerms } from './FormNotesTerms'
import { FormFooter } from './FormFooter'
import { pageCardCls } from '@/components/invoice/mobile/mobileFormPrimitives'

const ColumnManager = lazy(() => import('@/components/ColumnManager'))
const JsonItemsImportSheet = lazy(() => import('@/components/items/JsonItemsImportSheet'))

function SheetLoadingState({ label }: { label: string }) {
  return (
    <div className={`${pageCardCls} mx-auto p-4 text-sm text-[var(--bd-text3)] md:max-w-3xl`}>
      Loading {label}...
    </div>
  )
}

export default function SharedDocumentForm(props: any) {
  const {
    title,
    modeLabel,
    invoice,
    invoiceTitle,
    setInvoiceTitle,
    updateInvoice,
    items,
    groups,
    customFields,
    additionalFields,
    extraCharges,
    chargeLabels,
    notesTitle,
    setNotesTitle,
    termsTitle,
    setTermsTitle,
    attachments,
    setAttachments,
    signatories,
    signatoryId,
    onSignatoryChange,
    afterSignatorySlot,
    mergeQtyUnit,
    setMergeQtyUnit,
    columns,
    isVisible,
    getColumn,
    toggleVisible,
    updateColumn,
    addCustomColumn,
    removeCustomColumn,
    resetColumns,
    moveColumn,
    customColumns,
    computedItems,
    computedGroups,
    rawSubtotal,
    installRateTotal,
    vatAmount,
    discountAmount,
    grandTotal,
    whtAmount,
    totalPayable,
    amountInWords,
    discountType,
    setDiscountType,
    discountTiming,
    setDiscountTiming,
    whtType,
    setWhtType,
    saving,
    primaryLabel,
    onSaveSent,
    onSaveDraft,
    onCancel,
    onApplyImport,
    importAdapter,
    onAddItem,
    onAddGroup,
    onAddItemToGroup,
    onUpdateItem,
    onResetItemOverrides,
    onRemoveItem,
    onMoveItem,
    onInsertItemAfter,
    onUpdateGroupName,
    onToggleGroupSubtotal,
    onDeleteGroup,
    onAddHeaderField,
    onUpdateHeaderField,
    onRemoveHeaderField,
    onAddAdditionalField,
    onUpdateAdditionalField,
    onRemoveAdditionalField,
    onAddExtraCharge,
    onUpdateExtraCharge,
    onRemoveExtraCharge,
    onFloatingSave,
    showColumnManager,
    setShowColumnManager,
    isMobile,
  } = props

  const [showImportSheet, setShowImportSheet] = useState(false)
  const [showActionsSheet, setShowActionsSheet] = useState(false)
  const [showNotesTerms, setShowNotesTerms] = useState(false)
  const [showSignatory, setShowSignatory] = useState(false)
  const [showLinks, setShowLinks] = useState(false)
  const [showClientPicker, setShowClientPicker] = useState(false)

  const notesTermsRef = useRef<HTMLDivElement>(null)
  const linksRef = useRef<HTMLDivElement>(null)

  const isQuotation = useMemo(() => {
    const documentType = String(invoice.document_type || '').toUpperCase()
    return documentType.includes('QUOT') || /quotation/i.test(title) || /quotation/i.test(modeLabel)
  }, [invoice.document_type, modeLabel, title])

  const workmanship = Number(invoice.workmanship || 0)
  const transportation = Number(invoice.transportation || 0)
  const shipping = Number(invoice.shipping || 0)

  const summaryRows = [
    { label: 'Subtotal', value: rawSubtotal },
    installRateTotal > 0 ? { label: 'Install Rate', value: installRateTotal } : null,
    workmanship > 0 ? { label: chargeLabels.workmanship || 'Workmanship', value: workmanship } : null,
    transportation > 0 ? { label: chargeLabels.transportation || 'Transportation', value: transportation } : null,
    shipping > 0 ? { label: chargeLabels.shipping || 'Shipping', value: shipping } : null,
    discountAmount > 0 ? { label: 'Discount', value: -discountAmount, negative: true } : null,
    { label: 'VAT', value: vatAmount },
    whtAmount > 0 ? { label: 'WHT', value: -whtAmount, negative: true } : null,
    { label: 'Grand Total', value: grandTotal, strong: true },
  ].filter(Boolean)

  return (
    <div className="bd-form-shell bd-custom-scrollbar overflow-x-hidden px-0 pt-4 sm:pt-6">
      <div className="mx-auto w-full max-w-4xl px-0 sm:px-2">
        <div className="space-y-8 pb-12">
          <FormHeader
            modeLabel={modeLabel}
            title={title}
            onOpenActionsSheet={() => setShowActionsSheet(true)}
            invoice={invoice}
            invoiceTitle={invoiceTitle}
            setInvoiceTitle={setInvoiceTitle}
            updateInvoice={updateInvoice}
            isQuotation={isQuotation}
            onOpenClientPicker={() => setShowClientPicker(true)}
          />

          <FormLineItems
            items={items}
            groups={groups}
            invoice={invoice}
            isQuotation={isQuotation}
            customColumns={customColumns}
            computedItems={computedItems}
            computedGroups={computedGroups}
            isVisible={isVisible}
            getColumn={getColumn}
            onAddItem={onAddItem}
            onAddGroup={onAddGroup}
            onAddItemToGroup={onAddItemToGroup}
            onUpdateItem={onUpdateItem}
            onRemoveItem={onRemoveItem}
            onMoveItem={onMoveItem}
            onInsertItemAfter={onInsertItemAfter}
            onUpdateGroupName={onUpdateGroupName}
            onToggleGroupSubtotal={onToggleGroupSubtotal}
            onDeleteGroup={onDeleteGroup}
            onOpenImport={() => setShowImportSheet(true)}
            onOpenTableSettings={() => setShowColumnManager(true)}
          />

          <FormCommercialTerms
            invoice={invoice}
            isQuotation={isQuotation}
            updateInvoice={updateInvoice}
            discountType={discountType}
            setDiscountType={setDiscountType}
            discountTiming={discountTiming}
            setDiscountTiming={setDiscountTiming}
            whtType={whtType}
            setWhtType={setWhtType}
            extraCharges={extraCharges}
            onAddExtraCharge={onAddExtraCharge}
            onUpdateExtraCharge={onUpdateExtraCharge}
            onRemoveExtraCharge={onRemoveExtraCharge}
            additionalFields={additionalFields}
            onAddAdditionalField={onAddAdditionalField}
            onUpdateAdditionalField={onUpdateAdditionalField}
            onRemoveAdditionalField={onRemoveAdditionalField}
          />

          <FormTotals
            invoice={invoice}
            updateInvoice={updateInvoice}
            summaryRows={summaryRows}
            totalPayable={totalPayable}
            amountInWords={amountInWords}
          />

          <FormNotesTerms
            notesTitle={notesTitle}
            setNotesTitle={setNotesTitle}
            termsTitle={termsTitle}
            setTermsTitle={setTermsTitle}
            invoice={invoice}
            updateInvoice={updateInvoice}
            showNotesTerms={showNotesTerms}
            setShowNotesTerms={setShowNotesTerms}
            signatoryId={signatoryId}
            onSignatoryChange={onSignatoryChange}
            signatories={signatories}
            afterSignatorySlot={afterSignatorySlot}
            showSignatory={showSignatory}
            setShowSignatory={setShowSignatory}
            referenceLinks={attachments}
            updateReferenceLink={(idx, field, val) => {
              const next = attachments.map((l: any, i: number) => i === idx ? { ...l, [field]: val } : l)
              setAttachments(next)
            }}
            removeReferenceLink={(idx) => setAttachments(attachments.filter((_: any, i: number) => i !== idx))}
            addReferenceLink={() => setAttachments([...attachments, { label: '', url: '', _uiKey: crypto.randomUUID() }])}
            showLinks={showLinks}
            setShowLinks={setShowLinks}
          />
        </div>
      </div>

      <FormFooter
        onCancel={onCancel}
        onSaveDraft={onSaveDraft}
        onSaveSent={onSaveSent}
        onFloatingSave={onFloatingSave}
        saving={saving}
        primaryLabel={primaryLabel}
      />

      <div className="sr-only">
        <ClientSelector
          clientId={invoice.client_id || null}
          clientName={invoice.client_name || ''}
          isMobile={isMobile}
          compact
          dense
          hideHeader
          hideTrigger
          allowClear={false}
          open={showClientPicker}
          onOpenChange={setShowClientPicker}
          onClientChange={(id: string, name: string) => {
            updateInvoice('client_id', id)
            updateInvoice('client_name', name)
          }}
        />
      </div>

      <ActionsSheet
        open={showActionsSheet}
        onOpenChange={setShowActionsSheet}
        onSaveDraft={onSaveDraft}
        onCancel={onCancel}
        onOpenColumnManager={() => setShowColumnManager(true)}
        onImport={() => setShowImportSheet(true)}
        mergeQtyUnit={mergeQtyUnit}
        onToggleMergeQtyUnit={() => setMergeQtyUnit(!mergeQtyUnit)}
        onAddGroup={onAddGroup}
        onScrollToAdditionalInfo={() => {
          setShowNotesTerms(true)
          notesTermsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }}
        onScrollToLinks={() => {
          setShowLinks(true)
          linksRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }}
      />

      {showImportSheet && (
        <Suspense fallback={<SheetLoadingState label="import tools" />}>
          <JsonItemsImportSheet
            open={showImportSheet}
            onOpenChange={setShowImportSheet}
            onApplyImport={onApplyImport}
            items={items}
            columns={columns}
            adapter={importAdapter}
            title="Import Excel/JSON"
            side="bottom"
            contentClassName="sm:mx-auto sm:max-w-2xl"
          />
        </Suspense>
      )}

      {showColumnManager && (
        <Suspense fallback={<SheetLoadingState label="column settings" />}>
          <ColumnManager
            columns={columns}
            items={items}
            onUpdate={updateColumn}
            onToggle={toggleVisible}
            onAddCustom={addCustomColumn}
            onRemoveCustom={removeCustomColumn}
            onReset={resetColumns}
            onMove={moveColumn}
            onClose={() => setShowColumnManager(false)}
            onResetItemOverrides={onResetItemOverrides}
          />
        </Suspense>
      )}
    </div>
  )
}
