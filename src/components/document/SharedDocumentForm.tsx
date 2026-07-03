import React, { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react'
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

const SharedDocumentForm = React.memo(function SharedDocumentForm(props: any) {
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
    toggleDisabled,
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
    onClearAll,
    invalidRowIndex,
    onClearInvalidRow,
    showColumnManager,
    setShowColumnManager,
    isMobile,
  } = props

  const [showImportSheet, setShowImportSheet] = useState(false)
  const handleOpenImport = useCallback(() => setShowImportSheet(true), [])
  const handleOpenTableSettings = useCallback(() => setShowColumnManager(true), [])
  const handleUpdateReferenceLink = useCallback((idx: number, field: string, val: any) => {
    setAttachments((prev: any[]) => prev.map((l: any, i: number) => i === idx ? { ...l, [field]: val } : l))
  }, [])
  const handleRemoveReferenceLink = useCallback((idx: number) => {
    setAttachments((prev: any[]) => prev.filter((_: any, i: number) => i !== idx))
  }, [])
  const handleAddReferenceLink = useCallback(() => {
    setAttachments((prev: any[]) => [...prev, { label: '', url: '', _uiKey: crypto.randomUUID() }])
  }, [])
  const handleClientChange = useCallback((id: string, name: string) => {
    if (props.mode === 'edit') return
    updateInvoice('client_id', id)
    updateInvoice('client_name', name)
  }, [updateInvoice, props.mode])
  const handleCloseColumnManager = useCallback(() => setShowColumnManager(false), [])
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
  const timingMode = discountTiming === 'before' ? 'before' : 'after'

  const taxableChargeRows = extraCharges
    .filter((charge: any) => String(charge?.label || '').trim() && Number(charge?.value || 0) > 0 && charge?.withTax === true)
    .map((charge: any) => ({
      label: String(charge.label).trim(),
      value: Number(charge.value || 0),
    }))

  const nonTaxChargeRows = [
    workmanship > 0 ? { label: chargeLabels.workmanship || 'Workmanship', value: workmanship } : null,
    transportation > 0 ? { label: chargeLabels.transportation || 'Transportation', value: transportation } : null,
    shipping > 0 ? { label: chargeLabels.shipping || 'Shipping', value: shipping } : null,
    ...extraCharges
      .filter((charge: any) => String(charge?.label || '').trim() && Number(charge?.value || 0) > 0 && charge?.withTax === false)
      .map((charge: any) => ({
        label: String(charge.label).trim(),
        value: Number(charge.value || 0),
      })),
  ].filter(Boolean)

  const summaryRows = [
    { label: 'Subtotal', value: rawSubtotal },
    ...(timingMode === 'before' && discountAmount > 0
      ? [{ label: 'Discount', value: -discountAmount, negative: true }]
      : []),
    ...taxableChargeRows,
    ...(vatAmount > 0 || Number(invoice.vat || 0) > 0 ? [{ label: 'VAT', value: vatAmount }] : []),
    ...(timingMode === 'after' && discountAmount > 0
      ? [{ label: 'Discount', value: -discountAmount, negative: true }]
      : []),
    ...nonTaxChargeRows,
    ...(installRateTotal > 0 ? [{ label: 'Install Rate', value: installRateTotal }] : []),
    ...(whtAmount > 0 ? [{ label: 'WHT', value: -whtAmount, negative: true }] : []),
  ]

  return (
    <div className="bd-form-shell bd-custom-scrollbar overflow-x-hidden px-0 pt-1 sm:pt-2">
      <div className="mx-auto w-full max-w-[780px] px-3 sm:px-4">
        <div className="space-y-4 pb-6">
          <FormHeader
            modeLabel={modeLabel}
            title={title}
            onOpenActionsSheet={() => setShowActionsSheet(true)}
            invoice={invoice}
            invoiceTitle={invoiceTitle}
            setInvoiceTitle={setInvoiceTitle}
            updateInvoice={updateInvoice}
            isQuotation={isQuotation}
            isEdit={props.mode === 'edit'}
            onOpenClientPicker={() => setShowClientPicker(true)}
            onLockedFieldClick={props.onLockedFieldClick}
            customFields={customFields}
            onAddHeaderField={onAddHeaderField}
            onUpdateHeaderField={onUpdateHeaderField}
            onRemoveHeaderField={onRemoveHeaderField}
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
            onOpenImport={handleOpenImport}
            onOpenTableSettings={handleOpenTableSettings}
            onClearAll={onClearAll}
            invalidRowIndex={invalidRowIndex}
            onClearInvalidRow={onClearInvalidRow}
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
            finalLabel="Grand Total"
          />

          <div ref={notesTermsRef}>
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
              updateReferenceLink={handleUpdateReferenceLink}
              removeReferenceLink={handleRemoveReferenceLink}
              addReferenceLink={handleAddReferenceLink}
              showLinks={showLinks}
              setShowLinks={setShowLinks}
              linksSectionRef={linksRef}
            />
          </div>
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

      <ClientSelector
        clientId={invoice.client_id || null}
        clientName={invoice.client_name || ''}
        compact
        dense
        hideHeader
        hideTrigger
        allowClear={false}
        open={props.mode === 'edit' ? false : showClientPicker}
        onOpenChange={props.mode === 'edit' ? () => {} : setShowClientPicker}
        onClientChange={handleClientChange}
      />

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
            title="Import JSON"
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
            onToggleFull={toggleDisabled}
            onAddCustom={addCustomColumn}
            onRemoveCustom={removeCustomColumn}
            onReset={resetColumns}
            onMove={moveColumn}
            onClose={handleCloseColumnManager}
            onResetItemOverrides={onResetItemOverrides}
          />
        </Suspense>
      )}
    </div>
  )
})

export default SharedDocumentForm
