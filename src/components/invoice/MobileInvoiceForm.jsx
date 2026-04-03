import { useMemo, useRef, useState } from 'react'
import {
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FileInput,
  FolderPlus,
  Hash,
  Layers3,
  Link2,
  MoreHorizontal,
  NotebookText,
  Plus,
  Save,
  Settings2,
  Signature,
  X,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import ClientSelector from '@/components/ClientSelector'
import ColumnManager from '@/components/ColumnManager'
import RichTextEditor from '@/components/RichTextEditor'
import SignatoryPicker from '@/components/SignatoryPicker'
import ActionsSheet from './ActionsSheet'
import MobileItemCard from './MobileItemCard'
import MobileGroupCard from './MobileGroupCard'
import JsonItemsImportSheet from '@/components/items/JsonItemsImportSheet'

const pageCardCls =
  'rounded-[20px] border border-[#e2e8f0] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)]'
const fieldCls =
  'h-11 rounded-[12px] border-[1.5px] border-[#e2e8f0] bg-[#f8fafc] px-3 text-[14px] text-[#0f172a] shadow-none transition focus:border-[#94a3b8] focus:bg-white focus:ring-0 focus-visible:ring-0'
const labelCls = 'mb-1 block text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#94a3b8]'

function formatCurrency(value) {
  return `NGN ${Number(value || 0).toLocaleString()}`
}

function SectionLabel({ color, children, trailing }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3 px-0.5">
      <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#64748b]">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <span>{children}</span>
      </div>
      {trailing}
    </div>
  )
}

function ChipButton({ active = false, className = '', children, ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex h-8 items-center gap-2 rounded-full border-[1.5px] px-[13px] text-[12px] font-bold transition ${
        active
          ? 'border-[#0f172a] bg-[#0f172a] text-white'
          : 'border-[#e2e8f0] bg-white text-[#334155]'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

function ToolbarButton({ active = false, className = '', children, ...props }) {
  return (
    <button
      type="button"
      className={`inline-flex h-[42px] items-center justify-center gap-2 rounded-[14px] border-[1.5px] px-3 text-[13px] font-bold transition ${
        active
          ? 'border-[#0f172a] bg-[#0f172a] text-white'
          : 'border-[#e2e8f0] bg-white text-[#334155]'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

function SegmentedControl({ value, onChange, options }) {
  return (
    <div className="flex gap-[3px] rounded-[12px] border-[1.5px] border-[#e2e8f0] bg-[#f8fafc] p-[3px]">
      {options.map((option) => {
        const active = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`h-9 flex-1 rounded-[9px] text-[12px] font-extrabold transition ${
              active ? 'bg-[#0f172a] text-white' : 'text-[#64748b]'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function CompactSelectField({ value, onChange, options, className = '' }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={`${fieldCls} min-w-0 justify-between px-3 ${className}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function CollapseCard({ icon: Icon, iconTone, title, subtitle, open, onToggle, children, sectionColor }) {
  return (
    <div className={pageCardCls}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px]"
            style={{ backgroundColor: iconTone.bg, color: iconTone.fg }}
          >
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="text-[14px] font-bold text-[#0f172a]">{title}</div>
            <div className="text-[11px] text-[#94a3b8]">{subtitle}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sectionColor ? <span className="h-2 w-2 rounded-full" style={{ backgroundColor: sectionColor }} /> : null}
          {open ? <ChevronUp className="h-4 w-4 text-[#94a3b8]" /> : <ChevronRight className="h-4 w-4 text-[#94a3b8]" />}
        </div>
      </button>
      {open ? <div className="border-t border-[#e2e8f0] px-4 pb-4 pt-4">{children}</div> : null}
    </div>
  )
}

function asLinkAttachment(entry) {
  if (!entry || typeof entry !== 'object') return { label: '', url: '' }
  return {
    label: typeof entry.label === 'string' ? entry.label : '',
    url: typeof entry.url === 'string' ? entry.url : '',
  }
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
    bottomFields,
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
    onAddBottomField,
    onUpdateBottomField,
    onRemoveBottomField,
    onChargeLabelChange,
    onAddExtraCharge,
    onUpdateExtraCharge,
    onRemoveExtraCharge,
    onFloatingSave,
    showColumnManager,
    setShowColumnManager,
    isMobile,
    invoiceNumberReadOnly = false,
  } = props

  const [showImportSheet, setShowImportSheet] = useState(false)
  const [showActionsSheet, setShowActionsSheet] = useState(false)
  const [showTotalsAdjust, setShowTotalsAdjust] = useState(false)
  const [showNotesTerms, setShowNotesTerms] = useState(false)
  const [showSignatory, setShowSignatory] = useState(false)
  const [showLinks, setShowLinks] = useState(false)

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
      if (key) map.set(key, item.line_subtotal)
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

  const paymentTermValue = invoice.payment_terms || undefined
  const dueValidityLabel = isQuotation ? 'Validity' : 'Due / Validity'
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

              <div className="mt-4 rounded-[16px] border-2 border-dashed border-[#d8e1ec] bg-[#f8fafc] p-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#ecfdf5] text-[#059669]">
                    <BriefcaseBusiness className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#94a3b8]">Client</div>
                    <div className="mt-0.5 text-[14px] font-bold text-[#0f172a]">{invoice.client_name || 'Select a client'}</div>
                    <div className="text-[11px] text-[#94a3b8]">Tap to change</div>
                    <div className="mt-3">
                      <ClientSelector
                        clientId={invoice.client_id || null}
                        clientName={invoice.client_name || ''}
                        isMobile={isMobile}
                        compact
                        dense
                        hideHeader
                        onClientChange={(id, name) => {
                          updateInvoice('client_id', id)
                          updateInvoice('client_name', name)
                        }}
                      />
                    </div>
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 text-[#cbd5e1]" />
                </div>
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
                        readOnly={invoiceNumberReadOnly}
                        className={`${fieldCls} pl-9 font-mono font-bold ${invoiceNumberReadOnly ? 'opacity-70' : ''}`}
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
                  <div key={field.id} className="grid grid-cols-[minmax(0,1fr)_120px_38px] items-center gap-2 max-[520px]:grid-cols-1">
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
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <SectionLabel color="#475569">Item Controls</SectionLabel>
            <div className={`${pageCardCls} p-3`}>
              <div className="grid grid-cols-4 gap-2">
                <ToolbarButton onClick={() => setShowColumnManager(true)}>
                  <Settings2 className="h-4 w-4" />
                  <span>Columns</span>
                </ToolbarButton>
                <ToolbarButton onClick={() => setShowImportSheet(true)}>
                  <FileInput className="h-4 w-4" />
                  <span>Import</span>
                </ToolbarButton>
                <ToolbarButton onClick={onAddGroup}>
                  <Layers3 className="h-4 w-4" />
                  <span>Group</span>
                </ToolbarButton>
                <ToolbarButton active={mergeQtyUnit} onClick={() => setMergeQtyUnit(!mergeQtyUnit)}>
                  <Link2 className="h-4 w-4" />
                  <span>Qty+Unit</span>
                </ToolbarButton>
              </div>
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

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onAddItem}
                className="h-12 rounded-[16px] border-2 border-dashed border-[#6ee7b7] bg-[#f0fdf4] text-[14px] font-bold text-[#059669]"
              >
                <span className="inline-flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add item
                </span>
              </button>
              <button
                type="button"
                onClick={onAddGroup}
                className="h-12 rounded-[16px] border-2 border-dashed border-[#fcd34d] bg-[#fffbeb] text-[14px] font-bold text-[#d97706]"
              >
                <span className="inline-flex items-center gap-2">
                  <FolderPlus className="h-4 w-4" />
                  Add group
                </span>
              </button>
            </div>
          </div>

          <div>
            <SectionLabel color="#d97706">Commercial Terms</SectionLabel>
            <div className={`${pageCardCls} space-y-4 p-4`}>
              <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-2">
                <div className="min-w-0">
                  <label className={labelCls}>Payment Terms</label>
                  <Select value={paymentTermValue} onValueChange={(value) => updateInvoice('payment_terms', value)}>
                    <SelectTrigger className={`${fieldCls} justify-between`}>
                      <SelectValue placeholder="Select payment terms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50% advance · 50% on delivery">50% advance · 50% on delivery</SelectItem>
                      <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                      <SelectItem value="Net 15">Net 15</SelectItem>
                      <SelectItem value="Net 30">Net 30</SelectItem>
                      <SelectItem value="Net 45">Net 45</SelectItem>
                      <SelectItem value="Net 60">Net 60</SelectItem>
                      <SelectItem value="Custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0">
                  <label className={labelCls}>{dueValidityLabel}</label>
                  <Input
                    value={invoice.custom_payment_terms || ''}
                    onChange={(event) => updateInvoice('custom_payment_terms', event.target.value)}
                    placeholder={isQuotation ? 'e.g. Valid for 14 days' : 'e.g. Due in 14 days'}
                    className={fieldCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_88px_112px] items-end gap-2">
                <div className="min-w-0">
                  <label className={labelCls}>Discount</label>
                  <Input
                    type="number"
                    min="0"
                    value={Number(invoice.discount || 0)}
                    onChange={(event) => updateInvoice('discount', Number(event.target.value))}
                    className={fieldCls}
                  />
                </div>
                <div className="min-w-0">
                  <label className={labelCls}>Type</label>
                  <CompactSelectField
                    value={discountType}
                    onChange={setDiscountType}
                    options={[
                      { value: 'fixed', label: 'NGN' },
                      { value: 'percent', label: '%' },
                    ]}
                  />
                </div>
                <div className="min-w-0">
                  <label className={labelCls}>Apply</label>
                  <CompactSelectField
                    value={discountTiming}
                    onChange={setDiscountTiming}
                    options={[
                      { value: 'before', label: 'Before' },
                      { value: 'after', label: 'After' },
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_88px] items-end gap-2">
                <div className="min-w-0">
                  <label className={labelCls}>WHT Value</label>
                  <Input
                    type="number"
                    min="0"
                    value={Number(invoice.wht || 0)}
                    onChange={(event) => updateInvoice('wht', Number(event.target.value))}
                    className={fieldCls}
                  />
                </div>
                <div className="min-w-0">
                  <label className={labelCls}>WHT Type</label>
                  <CompactSelectField
                    value={whtType}
                    onChange={setWhtType}
                    options={[
                      { value: 'fixed', label: 'NGN' },
                      { value: 'percent', label: '%' },
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="min-w-0">
                  <label className={labelCls}>Work Duration</label>
                  <Input
                    value={invoice.work_duration || ''}
                    onChange={(event) => updateInvoice('work_duration', event.target.value)}
                    placeholder="e.g. 7 working days"
                    className={fieldCls}
                  />
                </div>
              </div>

              <div className="space-y-2">
                {[
                  ['workmanship', workmanship],
                  ['transportation', transportation],
                  ['shipping', shipping],
                ].map(([key, value]) => (
                  <div key={key} className="grid grid-cols-[minmax(0,1fr)_104px] gap-2">
                    <Input
                      value={chargeLabels[key] || ''}
                      onChange={(event) => onChargeLabelChange(key, event.target.value)}
                      placeholder={key}
                      className={fieldCls}
                    />
                    <Input
                      type="number"
                      min="0"
                      value={value}
                      onChange={(event) => updateInvoice(key, Number(event.target.value))}
                      className={`${fieldCls} text-right`}
                    />
                  </div>
                ))}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#94a3b8]">Extra Charges</div>
                  <ChipButton className="bg-[#fffbeb] text-[#d97706]" onClick={() => onAddExtraCharge(true)}>
                    <Plus className="h-3.5 w-3.5" />
                    Add Charge
                  </ChipButton>
                </div>
                <div className="space-y-2">
                  {extraCharges.map((charge) => (
                    <div key={charge.id} className="grid grid-cols-[minmax(0,1fr)_88px_94px_42px] items-center gap-2">
                      <Input
                        value={charge.label || ''}
                        onChange={(event) => onUpdateExtraCharge(charge.id, 'label', event.target.value)}
                        placeholder="Label"
                        className={fieldCls}
                      />
                      <Input
                        type="number"
                        min="0"
                        value={charge.value || 0}
                        onChange={(event) => onUpdateExtraCharge(charge.id, 'value', Number(event.target.value))}
                        className={`${fieldCls} text-right`}
                      />
                      <CompactSelectField
                        value={charge.withTax === false ? 'after_tax' : 'before_tax'}
                        onChange={(value) => onUpdateExtraCharge(charge.id, 'withTax', value === 'before_tax')}
                        options={[
                          { value: 'before_tax', label: 'Before' },
                          { value: 'after_tax', label: 'After' },
                        ]}
                      />
                      <button
                        type="button"
                        onClick={() => onRemoveExtraCharge(charge.id)}
                        className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-[#fecaca] bg-[#fff5f5] text-[#ef4444]"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#94a3b8]">Additional Rows</div>
                  <ChipButton className="bg-[#fffbeb] text-[#d97706]" onClick={onAddBottomField}>
                    <Plus className="h-3.5 w-3.5" />
                    Add Row
                  </ChipButton>
                </div>
                <div className="space-y-2">
                  {bottomFields.length === 0 ? (
                    <div className="rounded-[16px] border border-dashed border-[#e2e8f0] bg-[#f8fafc] px-4 py-5 text-[13px] text-[#64748b]">
                      No extra rows yet.
                    </div>
                  ) : (
                    bottomFields.map((field) => (
                      <div key={field.id} className="grid grid-cols-[minmax(0,1fr)_42px] gap-2">
                        <Input
                          value={field.text || ''}
                          onChange={(event) => onUpdateBottomField(field.id, event.target.value)}
                          placeholder="Additional row"
                          className={fieldCls}
                        />
                        <button
                          type="button"
                          onClick={() => onRemoveBottomField(field.id)}
                          className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8]"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

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
            <CollapseCard
              icon={NotebookText}
              iconTone={{ bg: '#f5f3ff', fg: '#7c3aed' }}
              title="Notes & Terms"
              subtitle="Optional rich text blocks"
              open={showNotesTerms}
              onToggle={() => setShowNotesTerms((current) => !current)}
              sectionColor="#7c3aed"
            >
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Notes Title</label>
                  <Input value={notesTitle} onChange={(event) => setNotesTitle(event.target.value)} className={fieldCls} />
                  <div className="mt-3">
                    <RichTextEditor
                      value={invoice.notes || ''}
                      onChange={(value) => updateInvoice('notes', value)}
                      placeholder="Notes..."
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Terms Title</label>
                  <Input value={termsTitle} onChange={(event) => setTermsTitle(event.target.value)} className={fieldCls} />
                  <div className="mt-3">
                    <RichTextEditor
                      value={invoice.terms || ''}
                      onChange={(value) => updateInvoice('terms', value)}
                      placeholder="Terms..."
                    />
                  </div>
                </div>
              </div>
            </CollapseCard>
          </div>

          <CollapseCard
            icon={Signature}
            iconTone={{ bg: '#eff6ff', fg: '#2563eb' }}
            title="Signatory"
            subtitle="Who signs this document"
            open={showSignatory}
            onToggle={() => setShowSignatory((current) => !current)}
            sectionColor="#2563eb"
          >
            <div className="space-y-4">
              <SignatoryPicker
                value={signatoryId}
                onChange={onSignatoryChange}
                signatories={signatories.map((s) => ({
                  id: s.id,
                  name: s.name,
                  role: s.role,
                  signatureUrl: s.signature_url || s.signatureUrl,
                }))}
              />
              {afterSignatorySlot ? afterSignatorySlot : null}
            </div>
          </CollapseCard>

          <div ref={linksRef}>
            <CollapseCard
              icon={Link2}
              iconTone={{ bg: '#f0fdf4', fg: '#059669' }}
              title="Reference Links"
              subtitle="Paste URLs instead of uploading files"
              open={showLinks}
              onToggle={() => setShowLinks((current) => !current)}
              sectionColor="#059669"
            >
              <div className="space-y-2">
                {referenceLinks.length === 0 ? (
                  <div className="rounded-[16px] border border-dashed border-[#bbf7d0] bg-[#f0fdf4] px-4 py-5 text-[13px] text-[#15803d]">
                    No reference links yet.
                  </div>
                ) : (
                  referenceLinks.map((link, index) => (
                    <div key={`${link.label}-${index}`} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_42px] items-center gap-2 max-[520px]:grid-cols-1">
                      <Input
                        value={link.label}
                        onChange={(event) => updateReferenceLink(index, 'label', event.target.value)}
                        placeholder="Link label"
                        className={fieldCls}
                      />
                      <Input
                        value={link.url}
                        onChange={(event) => updateReferenceLink(index, 'url', event.target.value)}
                        placeholder="https://..."
                        className={fieldCls}
                      />
                      <button
                        type="button"
                        onClick={() => removeReferenceLink(index)}
                        className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8]"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}

                <button
                  type="button"
                  onClick={addReferenceLink}
                  className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border-2 border-dashed border-[#e2e8f0] bg-[#f8fafc] text-[13px] font-bold text-[#64748b]"
                >
                  <Plus className="h-4 w-4" />
                  Add link
                </button>
              </div>
            </CollapseCard>
          </div>
        </div>
      </div>

      <div className="px-3 pb-5 pt-3 sm:px-4">
        <div className="mx-auto max-w-3xl">
          <div className={`${pageCardCls} p-2`}>
            <div className="grid grid-cols-[1fr_1fr_1.35fr] gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={saving}
                className="h-[52px] rounded-[14px] border-[1.5px] border-[#e2e8f0] bg-white text-[14px] font-bold text-[#475569] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSaveDraft}
                disabled={saving}
                className="h-[52px] rounded-[14px] border-[1.5px] border-[#e2e8f0] bg-[#f8fafc] text-[14px] font-bold text-[#475569] disabled:opacity-60"
              >
                Draft
              </button>
              <button
                type="button"
                onClick={onSaveSent}
                disabled={saving}
                className="h-[52px] rounded-[14px] border-0 bg-[#0f172a] text-[15px] font-extrabold text-white shadow-[0_4px_18px_rgba(15,23,42,0.22)] disabled:opacity-60"
              >
                {saving ? 'Saving…' : primaryLabel}
              </button>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onFloatingSave}
        disabled={saving}
        className="fixed bottom-[92px] right-4 z-[60] flex h-[52px] w-[52px] items-center justify-center rounded-[16px] bg-[#0f172a] text-white shadow-[0_8px_24px_rgba(15,23,42,0.28)] disabled:opacity-60"
      >
        <Save className="h-5 w-5" />
      </button>

      <ActionsSheet
        open={showActionsSheet}
        onOpenChange={setShowActionsSheet}
        onSaveDraft={onSaveDraft}
        onCancel={onCancel}
        onOpenColumnManager={() => setShowColumnManager(true)}
        onImport={() => setShowImportSheet(true)}
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

      {showColumnManager ? (
        <ColumnManager
          columns={columns}
          onUpdate={updateColumn}
          onToggle={toggleVisible}
          onAddCustom={addCustomColumn}
          onRemoveCustom={removeCustomColumn}
          onReset={resetColumns}
          onMove={moveColumn}
          onClose={() => setShowColumnManager(false)}
          vat={Number(invoice.vat || 0)}
          setVat={(value) => updateInvoice('vat', value)}
          wht={Number(invoice.wht || 0)}
          setWht={(value) => updateInvoice('wht', value)}
          whtType={whtType}
          setWhtType={setWhtType}
          items={items}
          onResetItemOverrides={onResetItemOverrides}
        />
      ) : null}
    </>
  )
}
