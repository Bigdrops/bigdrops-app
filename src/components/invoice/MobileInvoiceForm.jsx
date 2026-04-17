import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import {
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FileInput,
  FolderPlus,
  Hash,
  MoreHorizontal,
  Plus,
  Settings2,
  Trash2,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import ClientSelector from '@/components/ClientSelector'
import ActionsSheet from './ActionsSheet'
import CommercialTermsSection from '@/components/invoice/CommercialTermsSection'
import MobileItemCard from './MobileItemCard'
import MobileGroupCard from './MobileGroupCard'
import {
  asLinkAttachment,
  ChipButton,
  fieldCls,
  formatCurrency,
  labelCls,
  pageCardCls,
  SectionLabel,
  ToolbarButton,
} from '@/components/invoice/mobile/mobileFormPrimitives'
import {
  MobileInvoiceFooterActions,
  MobileInvoiceNotesTermsSection,
  MobileInvoiceReferenceLinksSection,
  MobileInvoiceSignatorySection,
} from '@/components/invoice/mobile/MobileInvoiceCollapsibleSections'

const ColumnManager = lazy(() => import('@/components/ColumnManager'))
const JsonItemsImportSheet = lazy(() => import('@/components/items/JsonItemsImportSheet'))

function SheetLoadingState({ label }) {
  return (
    <div className={`${pageCardCls} mx-3 p-4 text-sm text-[#64748b] sm:mx-4 md:mx-auto md:max-w-3xl`}>
      Loading {label}...
    </div>
  )
}

export default function MobileInvoiceForm(props) {
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
  const [showTotalsAdjust, setShowTotalsAdjust] = useState(false)
  const [showNotesTerms, setShowNotesTerms] = useState(false)
  const [showSignatory, setShowSignatory] = useState(false)
  const [showLinks, setShowLinks] = useState(false)
  const [showClientPicker, setShowClientPicker] = useState(false)

  const notesTermsRef = useRef(null)
  const linksRef = useRef(null)

  const isQuotation = useMemo(() => {
    const documentType = String(invoice.document_type || '').toUpperCase()
    return documentType.includes('QUOT') || /quotation/i.test(title) || /quotation/i.test(modeLabel)
  }, [invoice.document_type, modeLabel, title])

  const groupMap = useMemo(() => new Map(groups.map((group) => [group.id, group])), [groups])
  const lineItemsCount = useMemo(() => items.filter((item) => item.row_type === 'standard').length, [items])

  const computedAmountMap = useMemo(() => {
    const map = new Map()
    computedItems.forEach((item, index) => {
      const key = items[index]?._uiKey || items[index]?.id
      if (key) map.set(key, item.visible_line_total ?? item.line_subtotal)
    })
    return map
  }, [computedItems, items])

  const computedGroupMap = useMemo(
    () => new Map(computedGroups.map((group) => [group.group_id, group])),
    [computedGroups],
  )

  const getItemNumber = (index) =>
    items.slice(0, index + 1).filter((item) => item.row_type === 'standard').length

  const getComputedAmount = (item) =>
    computedAmountMap.get(item._uiKey || item.id) ?? Number(item.quantity || 0) * Number(item.unit_price || 0)

  const lineItemRows = useMemo(() => {
    const rows = []
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index]
      if (item.row_type === 'group_header') {
        const groupId = item.group_id || `group_${index}`
        const group = groupMap.get(groupId) || { id: groupId, name: item.group_name || `Group ${rows.length + 1}`, showSubtotal: false }
        const groupItems = []
        let cursor = index + 1
        while (cursor < items.length) {
          const nextItem = items[cursor]
          if (nextItem.row_type === 'group_header') break
          if (nextItem.row_type === 'standard' && nextItem.group_id === groupId) {
            groupItems.push({
              item: nextItem,
              index: cursor,
              number: getItemNumber(cursor),
              isFirst: groupItems.length === 0,
              isLast: false,
            })
            index = cursor
            cursor += 1
            continue
          }
          break
        }
        if (groupItems.length > 0) groupItems[groupItems.length - 1].isLast = true
        rows.push({ type: 'group', key: item._uiKey || item.id || groupId, group, items: groupItems })
        continue
      }
      if (item.row_type === 'standard') {
        rows.push({
          type: 'item',
          key: item._uiKey || item.id || index,
          item,
          index,
          number: getItemNumber(index),
          groupName: item.group_id ? groupMap.get(item.group_id)?.name || item.group_name || '' : '',
          isFirst: index === 0 || items[index - 1]?.row_type === 'group_header',
          isLast: index === items.length - 1 || items[index + 1]?.row_type === 'group_header',
        })
      }
    }
    return rows
  }, [groupMap, items])

  const referenceLinks = Array.isArray(attachments) ? attachments.map(asLinkAttachment) : []
  const workmanship = Number(invoice.workmanship || 0)
  const transportation = Number(invoice.transportation || 0)
  const shipping = Number(invoice.shipping || 0)

  const updateReferenceLink = (linkIndex, field, value) =>
    setAttachments(referenceLinks.map((link, index) => (index === linkIndex ? { ...link, [field]: value } : link)))
  const addReferenceLink = () => setAttachments([...referenceLinks, { label: '', url: '' }])
  const removeReferenceLink = (linkIndex) => setAttachments(referenceLinks.filter((_, index) => index !== linkIndex))

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
    <>
      <div className="min-h-screen bg-[#f2f4f8] px-3 pb-8 pt-4 font-sans text-[#0f172a] sm:px-4 md:mx-auto md:max-w-3xl">
        <div className="space-y-5">
          <div>
            <SectionLabel color="#0f172a">{isQuotation ? 'Quotation Details' : 'Document Details'}</SectionLabel>
            <div className={`${pageCardCls} p-4`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-[#94a3b8]">{modeLabel}</div>
                  <h1 className="mt-1 text-[28px] font-black leading-none tracking-[-0.04em] text-[#0f172a]">{title}</h1>
                </div>
                <button
                  type="button"
                  onClick={() => setShowActionsSheet(true)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border-[1.5px] border-[#e2e8f0] bg-white text-[#475569]"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowClientPicker(true)}
                className="mt-4 block w-full rounded-[16px] border-2 border-dashed border-[#d8e1ec] bg-[#f8fafc] p-3 text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#ecfdf5] text-[#059669]">
                    <BriefcaseBusiness className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#94a3b8]">Client</div>
                    <div className="mt-0.5 truncate text-[14px] font-bold text-[#0f172a]">{invoice.client_name || 'Select a client'}</div>
                    <div className="text-[11px] text-[#94a3b8]">
                      {invoice.client_name ? 'Selected client' : 'Tap to choose client'}
                    </div>
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 text-[#cbd5e1]" />
                </div>
              </button>
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
                  onClientChange={(id, name) => {
                    updateInvoice('client_id', id)
                    updateInvoice('client_name', name)
                  }}
                />
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <label className={labelCls}>{isQuotation ? 'Quotation Title' : 'Invoice Title'}</label>
                  <Input
                    value={invoiceTitle || ''}
                    onChange={(event) => setInvoiceTitle(event.target.value)}
                    placeholder={isQuotation ? 'Quotation title' : 'Invoice title'}
                    className={fieldCls}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>{isQuotation ? 'Quotation No.' : 'Invoice No.'}</label>
                    <div className="relative">
                      <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                      <Input
                        value={invoice.invoice_number || ''}
                        onChange={(event) => updateInvoice('invoice_number', event.target.value)}
                        className={`${fieldCls} pl-9 font-mono font-bold`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>PO No.</label>
                    <Input
                      value={invoice.po_number || ''}
                      onChange={(event) => updateInvoice('po_number', event.target.value)}
                      placeholder="Optional"
                      className={fieldCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>{isQuotation ? 'Quotation Date' : 'Issue Date'}</label>
                    <Input
                      type="date"
                      value={invoice.issue_date || ''}
                      onChange={(event) => updateInvoice('issue_date', event.target.value)}
                      className={fieldCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{isQuotation ? 'Valid Until' : 'Due Date'}</label>
                    <Input
                      type="date"
                      value={invoice.due_date || ''}
                      onChange={(event) => updateInvoice('due_date', event.target.value)}
                      className={fieldCls}
                    />
                  </div>
                </div>

              </div>
            </div>
          </div>

          <div>
            <SectionLabel
              color="#7c3aed"
              trailing={
                <ChipButton className="bg-[#f5f3ff] text-[#7c3aed]" onClick={onAddHeaderField}>
                  <Plus className="h-3.5 w-3.5" />
                  Add Field
                </ChipButton>
              }
            >
              Custom Fields
            </SectionLabel>
            <div className={`${pageCardCls} space-y-2 p-4`}>
              {customFields.length === 0 ? (
                <div className="rounded-[16px] border border-dashed border-[#ddd6fe] bg-[#f5f3ff] px-4 py-5 text-[13px] text-[#6d28d9]">
                  No custom fields yet.
                </div>
              ) : (
                customFields.map((field) => (
                  <div key={field.id} className="grid grid-cols-[minmax(0,1fr)_120px_38px] items-center gap-2">
                    <Input
                      value={field.label || ''}
                      onChange={(event) => onUpdateHeaderField(field.id, 'label', event.target.value)}
                      placeholder="Field label"
                      className={fieldCls}
                    />
                    <Input
                      value={field.value || ''}
                      onChange={(event) => onUpdateHeaderField(field.id, 'value', event.target.value)}
                      placeholder="Value"
                      className={`${fieldCls} text-center`}
                    />
                    <button
                      type="button"
                      onClick={() => onRemoveHeaderField(field.id)}
                      className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <SectionLabel
              color="#059669"
              trailing={
                <span className="inline-flex h-8 items-center rounded-full border-[1.5px] border-[#a7f3d0] bg-[#ecfdf5] px-[13px] text-[12px] font-bold text-[#059669]">
                  {lineItemsCount} {lineItemsCount === 1 ? 'item' : 'items'}
                </span>
              }
            >
              Line Items
            </SectionLabel>

            <div className={`${pageCardCls} mb-4 p-3`}>
              <div className="grid grid-cols-2 gap-2">
                <ToolbarButton onClick={() => setShowImportSheet(true)}>
                  <FileInput className="h-4 w-4" />
                  <span>Import</span>
                </ToolbarButton>
                <ToolbarButton onClick={() => setShowColumnManager(true)}>
                  <Settings2 className="h-4 w-4" />
                  <span>Table Settings</span>
                </ToolbarButton>
              </div>
            </div>

            <div className="space-y-0">
              {lineItemRows.map((row) =>
                row.type === 'group' ? (
                  <MobileGroupCard
                    key={row.key}
                    group={row.group}
                    items={row.items}
                    invoice={invoice}
                    customColumns={customColumns}
                    groupSubtotal={computedGroupMap.get(row.group.id)?.subtotal || 0}
                    onUpdateGroupName={onUpdateGroupName}
                    onToggleGroupSubtotal={onToggleGroupSubtotal}
                    onDeleteGroup={onDeleteGroup}
                    onAddItemToGroup={onAddItemToGroup}
                    onUpdateItem={onUpdateItem}
                    onRemoveItem={onRemoveItem}
                    onMoveItem={onMoveItem}
                    onInsertItemAfter={onInsertItemAfter}
                    isVisible={isVisible}
                    getColumn={getColumn}
                    getComputedAmount={getComputedAmount}
                  />
                ) : (
                  <MobileItemCard
                    key={row.key}
                    item={row.item}
                    index={row.index}
                    number={row.number}
                    invoice={invoice}
                    customColumns={customColumns}
                    computedAmount={getComputedAmount(row.item)}
                    groupName={row.groupName}
                    isFirst={row.isFirst}
                    isLast={row.isLast}
                    onUpdate={onUpdateItem}
                    onRemove={onRemoveItem}
                    onMoveUp={(itemIndex) => onMoveItem(itemIndex, -1)}
                    onMoveDown={(itemIndex) => onMoveItem(itemIndex, 1)}
                    onInsertBelow={onInsertItemAfter}
                    isVisible={isVisible}
                    getColumn={getColumn}
                  />
                ),
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onAddItem}
                className="h-10 rounded-[12px] border border-[#86efac] bg-[#f0fdf4] text-[13px] font-semibold text-[#047857]"
              >
                <span className="inline-flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add item
                </span>
              </button>
              <button
                type="button"
                onClick={onAddGroup}
                className="h-10 rounded-[12px] border border-[#fcd34d] bg-[#fffbeb] text-[13px] font-medium text-[#b45309]"
              >
                <span className="inline-flex items-center gap-2">
                  <FolderPlus className="h-4 w-4" />
                  Add group
                </span>
              </button>
            </div>
          </div>

          <CommercialTermsSection
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

          <div>
            <SectionLabel color="#059669">Totals Summary</SectionLabel>
            <div className={`${pageCardCls} p-4`}>
              <div className="space-y-2">
                {summaryRows.map((row) => (
                  <div key={row.label} className={`flex items-center justify-between gap-3 text-[14px] ${row.strong ? 'border-t border-[#e2e8f0] pt-2' : ''}`}>
                    <span className={row.strong ? 'font-bold text-[#0f172a]' : 'text-[#64748b]'}>{row.label}</span>
                    <span className={`font-bold ${row.negative ? 'text-[#dc2626]' : 'text-[#0f172a]'}`}>
                      {row.negative ? '-' : ''}
                      {formatCurrency(Math.abs(Number(row.value || 0)))}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowTotalsAdjust((current) => !current)}
                  className="inline-flex h-8 items-center gap-2 rounded-full border-[1.5px] border-[#e2e8f0] bg-white px-[13px] text-[12px] font-bold text-[#334155]"
                >
                  {showTotalsAdjust ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  Adjust VAT
                </button>
                {showTotalsAdjust ? (
                  <div className="mt-3">
                    <label className={labelCls}>VAT %</label>
                    <Input
                      type="number"
                      min="0"
                      value={Number(invoice.vat || 0)}
                      onChange={(event) => updateInvoice('vat', Number(event.target.value))}
                      className={fieldCls}
                    />
                  </div>
                ) : null}
              </div>

              {amountInWords ? <div className="mt-4 text-[12px] italic text-[#64748b]">{amountInWords}</div> : null}

              <div className="mt-4 rounded-[18px] bg-[#0f172a] px-4 py-5 text-white">
                <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#94a3b8]">Total Payable</div>
                <div className="mt-2 text-[38px] font-black leading-none tracking-[-0.04em] text-[#34d399]">{formatCurrency(totalPayable)}</div>
              </div>
            </div>
          </div>

          <div ref={notesTermsRef}>
            <MobileInvoiceNotesTermsSection
              notesTitle={notesTitle}
              setNotesTitle={setNotesTitle}
              termsTitle={termsTitle}
              setTermsTitle={setTermsTitle}
              invoice={invoice}
              updateInvoice={updateInvoice}
              open={showNotesTerms}
              onToggle={() => setShowNotesTerms((current) => !current)}
            />
          </div>

          <MobileInvoiceSignatorySection
            signatoryId={signatoryId}
            onSignatoryChange={onSignatoryChange}
            signatories={signatories}
            afterSignatorySlot={afterSignatorySlot}
            open={showSignatory}
            onToggle={() => setShowSignatory((current) => !current)}
          />

          <div ref={linksRef}>
            <MobileInvoiceReferenceLinksSection
              referenceLinks={referenceLinks}
              updateReferenceLink={updateReferenceLink}
              removeReferenceLink={removeReferenceLink}
              addReferenceLink={addReferenceLink}
              open={showLinks}
              onToggle={() => setShowLinks((current) => !current)}
            />
          </div>
        </div>
      </div>

      <MobileInvoiceFooterActions
        onCancel={onCancel}
        onSaveDraft={onSaveDraft}
        onSaveSent={onSaveSent}
        onFloatingSave={onFloatingSave}
        saving={saving}
        primaryLabel={primaryLabel}
      />

      <ActionsSheet
        open={showActionsSheet}
        onOpenChange={setShowActionsSheet}
        onSaveDraft={onSaveDraft}
        onCancel={onCancel}
        onOpenColumnManager={() => setShowColumnManager(true)}
        onImport={() => setShowImportSheet(true)}
        mergeQtyUnit={mergeQtyUnit}
        onToggleMergeQtyUnit={() => setMergeQtyUnit((current) => !current)}
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

      {showImportSheet ? (
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
      ) : null}

      {showColumnManager ? (
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
      ) : null}
    </>
  )
}
