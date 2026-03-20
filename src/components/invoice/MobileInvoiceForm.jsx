import { useMemo, useRef, useState } from 'react'
import { Calendar, FileText, GripHorizontal, Hash, Layers, MoreHorizontal, Plus, Settings2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import ClientSelector from '@/components/ClientSelector'
import ColumnManager from '@/components/ColumnManager'
import RichTextEditor from '@/components/RichTextEditor'
import AttachmentsPanel from '@/components/AttachmentsPanel'
import ActionsSheet from './ActionsSheet'
import MobileItemCard from './MobileItemCard'
import MobileGroupCard from './MobileGroupCard'
import TotalsPanel from './TotalsPanel'

const cardCls = 'rounded-[24px] border-zinc-200 bg-white shadow-sm'
const inputCls = 'mt-1 h-11 rounded-2xl border-zinc-200 bg-white text-sm text-zinc-900'
const labelCls = 'text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500'

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
    onImportFileChange,
    onAddItem,
    onAddGroup,
    onAddItemToGroup,
    onUpdateItem,
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
    showColumnManager,
    setShowColumnManager,
    isMobile,
  } = props

  const [showActionsSheet, setShowActionsSheet] = useState(false)
  const importInputRef = useRef(null)
  const additionalInfoRef = useRef(null)

  const orderedGroups = useMemo(() => {
    const seen = new Set()
    const groupMap = new Map(groups.map((group) => [group.id, group]))

    return items
      .filter((item) => item.row_type === 'group_header')
      .map((header, index) => {
        const fallbackId = header.group_id || `group_${index}`
        const group = groupMap.get(fallbackId) || {
          id: fallbackId,
          name: header.group_name || `Group ${index + 1}`,
          showSubtotal: false,
        }
        if (seen.has(group.id)) return null
        seen.add(group.id)
        return {
          group,
          items: items.filter((item) => item.row_type === 'standard' && item.group_id === group.id),
        }
      })
      .filter(Boolean)
  }, [groups, items])

  const ungroupedItems = useMemo(
    () => items.filter((item) => item.row_type === 'standard' && !item.group_id),
    [items],
  )

  const lineItemsCount = useMemo(
    () => items.filter((item) => item.row_type === 'standard').length,
    [items],
  )

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

  const getItemIndex = (uiKey) => items.findIndex((item) => (item._uiKey || item.id) === uiKey)
  const getItemNumber = (index) =>
    items.slice(0, index + 1).filter((item) => item.row_type === 'standard').length
  const getComputedAmount = (item) =>
    computedAmountMap.get(item._uiKey || item.id) ?? Number(item.quantity || 0) * Number(item.unit_price || 0)

  const rowImagesEnabled = items.some((item) => item.row_type === 'standard' && item.image_url)

  return (
    <>
      <div className="mx-auto max-w-5xl px-3 pb-12 pt-4 sm:px-4 sm:pt-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">{modeLabel}</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-[30px]">{title}</h1>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 rounded-2xl border-zinc-200 bg-white"
            onClick={() => setShowActionsSheet(true)}
          >
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-4">
          <Card className={cardCls}>
            <CardContent className="space-y-4 p-4">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Invoice Details</h2>
                <p className="text-xs text-zinc-500">Core invoice metadata stays at the top of the shell.</p>
              </div>

              <ClientSelector
                clientId={invoice.client_id || null}
                clientName={invoice.client_name || ''}
                isMobile={isMobile}
                onClientChange={(id, name) => {
                  updateInvoice('client_id', id)
                  updateInvoice('client_name', name)
                }}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Invoice Number</label>
                  <div className="relative">
                    <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <Input
                      value={invoice.invoice_number || ''}
                      onChange={(e) => updateInvoice('invoice_number', e.target.value)}
                      className={`${inputCls} pl-10`}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>PO Number</label>
                  <Input
                    value={invoice.po_number || ''}
                    onChange={(e) => updateInvoice('po_number', e.target.value)}
                    placeholder="Optional"
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Issue Date</label>
                  <div className="relative">
                    <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <Input
                      type="date"
                      value={invoice.issue_date || ''}
                      onChange={(e) => updateInvoice('issue_date', e.target.value)}
                      className={`${inputCls} pl-10`}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Due Date</label>
                  <div className="relative">
                    <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <Input
                      type="date"
                      value={invoice.due_date || ''}
                      onChange={(e) => updateInvoice('due_date', e.target.value)}
                      className={`${inputCls} pl-10`}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className={labelCls}>Invoice Title</label>
                <div className="relative">
                  <FileText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    value={invoiceTitle || ''}
                    onChange={(e) => setInvoiceTitle(e.target.value)}
                    placeholder="e.g. Solar installation"
                    className={`${inputCls} pl-10`}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Work Duration</label>
                <Input
                  value={invoice.work_duration || ''}
                  onChange={(e) => updateInvoice('work_duration', e.target.value)}
                  placeholder="e.g. 2 weeks"
                  className={inputCls}
                />
              </div>
            </CardContent>
          </Card>

          <Card className={cardCls}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900">Custom Fields</h2>
                  <p className="text-xs text-zinc-500">Repeatable header fields live between invoice details and line items.</p>
                </div>
                <Button type="button" variant="outline" size="sm" className="h-9 rounded-2xl border-zinc-200 bg-white px-3 text-xs" onClick={onAddHeaderField}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add Field
                </Button>
              </div>

              {customFields.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-sm text-zinc-500">
                  <div className="flex items-center gap-2">
                    <GripHorizontal className="h-4 w-4" />
                    Add compact label/value rows for invoice header metadata.
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {customFields.map((field) => (
                    <div key={field.id} className="grid grid-cols-[minmax(0,160px)_minmax(0,1fr)_auto] gap-2">
                      <Input
                        value={field.label || ''}
                        onChange={(e) => onUpdateHeaderField(field.id, 'label', e.target.value)}
                        placeholder="Label"
                        className="h-11 rounded-2xl border-zinc-200 bg-white text-sm"
                      />
                      <Input
                        value={field.value || ''}
                        onChange={(e) => onUpdateHeaderField(field.id, 'value', e.target.value)}
                        placeholder="Value"
                        className="h-11 rounded-2xl border-zinc-200 bg-white text-sm"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11 rounded-2xl text-red-500 hover:bg-red-50 hover:text-red-600"
                        onClick={() => onRemoveHeaderField(field.id)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <section className="space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Line Items</h2>
              <p className="text-xs text-zinc-500">{lineItemsCount} {lineItemsCount === 1 ? 'item' : 'items'} in the current invoice</p>
            </div>

            <div className="rounded-[24px] border border-zinc-200 bg-white p-2">
              <div className="grid grid-cols-4 gap-2">
                <Button type="button" variant="outline" size="sm" className="h-11 rounded-2xl border-zinc-200 bg-white text-xs" onClick={() => setShowColumnManager(true)}>
                  <Settings2 className="mr-1.5 h-4 w-4" />
                  Settings
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-11 rounded-2xl border-zinc-200 bg-white text-xs" onClick={() => importInputRef.current?.click()}>
                  <Upload className="mr-1.5 h-4 w-4" />
                  Import
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-11 rounded-2xl border-zinc-200 bg-white text-xs" onClick={onAddGroup}>
                  <Layers className="mr-1.5 h-4 w-4" />
                  Group
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-11 rounded-2xl border-zinc-200 bg-white text-xs" onClick={onAddItem}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Item
                </Button>
              </div>
              <input ref={importInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onImportFileChange} />
            </div>

            <div className="space-y-3">
              {orderedGroups.map(({ group, items: groupItems }) => (
                <MobileGroupCard
                  key={group.id}
                  group={group}
                  items={groupItems}
                  allItems={items}
                  invoice={invoice}
                  customColumns={customColumns}
                  groupSubtotal={computedGroupMap.get(group.id)?.subtotal || 0}
                  getItemIndex={getItemIndex}
                  getItemNumber={getItemNumber}
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
              ))}

              {ungroupedItems.map((item) => {
                const index = getItemIndex(item._uiKey || item.id)
                return (
                  <MobileItemCard
                    key={item._uiKey || item.id || index}
                    item={item}
                    index={index}
                    number={getItemNumber(index)}
                    invoice={invoice}
                    customColumns={customColumns}
                    computedAmount={getComputedAmount(item)}
                    isFirst={index === 0 || items[index - 1]?.row_type === 'group_header'}
                    isLast={index === items.length - 1 || items[index + 1]?.row_type === 'group_header'}
                    onUpdate={onUpdateItem}
                    onRemove={onRemoveItem}
                    onMoveUp={(itemIndex) => onMoveItem(itemIndex, -1)}
                    onMoveDown={(itemIndex) => onMoveItem(itemIndex, 1)}
                    onInsertBelow={onInsertItemAfter}
                    isVisible={isVisible}
                    getColumn={getColumn}
                  />
                )
              })}
            </div>

            <div className="rounded-[24px] border border-zinc-200 bg-white p-2">
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" className="h-12 rounded-2xl border-zinc-200 bg-white" onClick={onAddItem}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  + Add Item
                </Button>
                <Button type="button" variant="outline" className="h-12 rounded-2xl border-zinc-200 bg-white" onClick={onAddGroup}>
                  <Layers className="mr-1.5 h-4 w-4" />
                  + Add Group
                </Button>
              </div>
            </div>
          </section>

          <section ref={additionalInfoRef} className="space-y-4">
            <Card className={cardCls}>
              <CardContent className="space-y-4 p-4">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">Commercial Terms</h3>
                  <p className="text-xs text-zinc-500">Payment terms and lower document details stay in the additional-info flow.</p>
                </div>

                <div>
                  <label className={labelCls}>Payment Terms</label>
                  <select
                    value={invoice.payment_terms || ''}
                    onChange={(e) => updateInvoice('payment_terms', e.target.value)}
                    className="mt-1 h-11 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900"
                  >
                    <option value="">Select terms</option>
                    <option value="Due on Receipt">Due on Receipt</option>
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Net 45">Net 45</option>
                    <option value="Net 60">Net 60</option>
                    <option value="Custom">Custom</option>
                  </select>
                  {invoice.payment_terms === 'Custom' ? (
                    <Input
                      value={invoice.custom_payment_terms || ''}
                      onChange={(e) => updateInvoice('custom_payment_terms', e.target.value)}
                      placeholder="Enter custom payment terms"
                      className={inputCls}
                    />
                  ) : null}
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-900">Additional Notes</h4>
                      <p className="text-xs text-zinc-500">Plain-text lines that render below totals.</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" className="h-9 rounded-2xl border-zinc-200 bg-white px-3 text-xs" onClick={onAddBottomField}>
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Add Row
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {bottomFields.length === 0 ? (
                      <div className="rounded-[20px] border border-dashed border-zinc-300 bg-zinc-50 px-4 py-4 text-sm text-zinc-500">
                        Add optional lower notes like advance-payment reminders or delivery terms.
                      </div>
                    ) : (
                      bottomFields.map((field) => (
                        <div key={field.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                          <Input
                            value={field.text || ''}
                            onChange={(e) => onUpdateBottomField(field.id, e.target.value)}
                            placeholder="e.g. ADVANCE PAYMENT DUE (60%): NGN 141,601"
                            className="h-11 rounded-2xl border-zinc-200 bg-white text-sm"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 rounded-2xl text-red-500 hover:bg-red-50 hover:text-red-600"
                            onClick={() => onRemoveBottomField(field.id)}
                          >
                            ×
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={cardCls}>
              <CardContent className="space-y-4 p-4">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">Notes & Terms</h3>
                  <p className="text-xs text-zinc-500">TipTap stays intact, just mounted inside the new shell.</p>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <Input
                      value={notesTitle}
                      onChange={(e) => setNotesTitle(e.target.value)}
                      className="mb-2 h-9 rounded-2xl border-zinc-200 bg-zinc-50 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600"
                    />
                    <RichTextEditor
                      value={invoice.notes || ''}
                      onChange={(value) => updateInvoice('notes', value)}
                      placeholder="Notes to client..."
                    />
                  </div>
                  <div>
                    <Input
                      value={termsTitle}
                      onChange={(e) => setTermsTitle(e.target.value)}
                      className="mb-2 h-9 rounded-2xl border-zinc-200 bg-zinc-50 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600"
                    />
                    <RichTextEditor
                      value={invoice.terms || ''}
                      onChange={(value) => updateInvoice('terms', value)}
                      placeholder="Terms and conditions..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={cardCls}>
              <CardContent className="space-y-4 p-4">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">Attachments</h3>
                  <p className="text-xs text-zinc-500">Supporting documents stay embedded in the lower additional-info flow.</p>
                </div>
                <AttachmentsPanel attachments={attachments} onChange={setAttachments} />
              </CardContent>
            </Card>
          </section>

          <TotalsPanel
            rawSubtotal={rawSubtotal}
            installRateTotal={installRateTotal}
            workmanship={Number(invoice.workmanship || 0)}
            transportation={Number(invoice.transportation || 0)}
            shipping={Number(invoice.shipping || 0)}
            chargeLabels={chargeLabels}
            onChargeLabelChange={onChargeLabelChange}
            onWorkmanshipChange={(value) => updateInvoice('workmanship', value)}
            onTransportationChange={(value) => updateInvoice('transportation', value)}
            onShippingChange={(value) => updateInvoice('shipping', value)}
            extraCharges={extraCharges}
            onAddExtraCharge={onAddExtraCharge}
            onUpdateExtraCharge={onUpdateExtraCharge}
            onRemoveExtraCharge={onRemoveExtraCharge}
            discountValue={Number(invoice.discount || 0)}
            discountType={discountType}
            discountTiming={discountTiming}
            onDiscountValueChange={(value) => updateInvoice('discount', value)}
            onDiscountTypeChange={setDiscountType}
            onDiscountTimingChange={setDiscountTiming}
            discountAmount={discountAmount}
            vatPercent={Number(invoice.vat || 0)}
            onVatPercentChange={(value) => updateInvoice('vat', value)}
            vatAmount={vatAmount}
            whtValue={Number(invoice.wht || 0)}
            whtType={whtType}
            onWhtValueChange={(value) => updateInvoice('wht', value)}
            onWhtTypeChange={setWhtType}
            whtAmount={whtAmount}
            grandTotal={grandTotal}
            totalPayable={totalPayable}
            amountInWords={amountInWords}
          />

          <Card className={cardCls}>
            <CardContent className="space-y-4 p-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">Output Settings</h3>
                <p className="text-xs text-zinc-500">Document output controls now live beside the totals stack.</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-[20px] border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-zinc-900">Merge Qty + Unit on PDF</div>
                    <div className="text-xs text-zinc-500">Shows values like “5 Sets” in a single PDF cell.</div>
                  </div>
                  <Switch checked={mergeQtyUnit} onCheckedChange={setMergeQtyUnit} />
                </div>

                <div className="flex items-center justify-between rounded-[20px] border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-zinc-900">Row Image Output</div>
                    <div className="text-xs text-zinc-500">Row-level image actions drive this automatically. No global toggle required.</div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${rowImagesEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-200 text-zinc-600'}`}>
                    {rowImagesEnabled ? 'Enabled' : 'Inactive'}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[20px] border border-zinc-200 bg-zinc-50 px-4 py-3">
                    <div className="text-sm font-medium text-zinc-900">Notes & Terms</div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {invoice.notes || invoice.terms ? 'Ready to render with current content.' : 'Fill the rich text editors to include content.'}
                    </div>
                  </div>
                  <div className="rounded-[20px] border border-zinc-200 bg-zinc-50 px-4 py-3">
                    <div className="text-sm font-medium text-zinc-900">Attachments</div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {attachments.length > 0 ? `${attachments.length} supporting document${attachments.length === 1 ? '' : 's'} linked.` : 'No supporting documents linked yet.'}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={cardCls}>
            <CardContent className="space-y-4 p-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">Save Actions</h3>
                <p className="text-xs text-zinc-500">The save handlers are unchanged; only the surrounding shell was transplanted.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Button type="button" variant="outline" className="h-12 rounded-2xl border-zinc-300 bg-white" onClick={onCancel}>
                  Cancel
                </Button>
                <Button type="button" variant="outline" className="h-12 rounded-2xl border-zinc-300 bg-white" onClick={onSaveDraft} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Draft'}
                </Button>
                <Button type="button" className="h-12 rounded-2xl bg-zinc-900 text-white hover:bg-zinc-800" onClick={onSaveSent} disabled={saving}>
                  {saving ? 'Saving...' : primaryLabel}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ActionsSheet
        open={showActionsSheet}
        onOpenChange={setShowActionsSheet}
        onOpenColumnManager={() => setShowColumnManager(true)}
        onImport={() => importInputRef.current?.click()}
        onAddGroup={onAddGroup}
        onScrollToAdditionalInfo={() => additionalInfoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
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
        />
      ) : null}
    </>
  )
}
