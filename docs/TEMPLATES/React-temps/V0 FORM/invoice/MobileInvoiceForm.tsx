"use client"

import { useState } from "react"
import {
  Plus,
  Layers,
  MoreHorizontal,
  ChevronDown,
  Calendar,
  FileText,
  User,
  Hash,
  Clock,
  Save,
  Settings2,
  Upload,
  GripHorizontal,
  Paperclip,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import MobileItemCard from "./MobileItemCard"
import MobileGroupCard from "./MobileGroupCard"
import TotalsPanel from "./TotalsPanel"
import ActionsSheet from "./ActionsSheet"
import type {
  Invoice,
  InvoiceItem,
  InvoiceGroup,
  ExtraCharge,
  ColumnConfig,
  DiscountType,
  WhtType,
  InvoiceAttachment,
} from "@/lib/invoice-types"
import {
  BUILTIN_COLUMNS,
  makeEmptyItem,
  makeEmptyGroup,
  makeExtraCharge,
} from "@/lib/invoice-types"

// ─────────────────────────────────────────────────────────────────────────────
// PLACEHOLDER SLOTS for external components
// ─────────────────────────────────────────────────────────────────────────────

function ClientSelectorSlot({
  clientId,
  clientName,
  onClientChange,
}: {
  clientId: string | null
  clientName: string
  onClientChange: (id: string, name: string, client: unknown) => void
}) {
  return (
    <Card className="rounded-xl border-zinc-200 bg-white">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-zinc-500">
          <User className="h-4 w-4" />
          <span className="text-sm">
            {clientName || "ClientSelector placeholder"}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function RichTextEditorSlot({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
      <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-3 py-2">
        <span className="rounded-md bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          Toolbar
        </span>
        <div className="h-2 w-2 rounded-full bg-zinc-300" />
        <div className="h-2 w-2 rounded-full bg-zinc-300" />
        <div className="h-2 w-2 rounded-full bg-zinc-300" />
        <span className="ml-auto text-[10px] text-zinc-400">TipTap slot</span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={6}
        className="min-h-36 w-full resize-none border-0 bg-white px-3 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
      />
    </div>
  )
}

function AttachmentsPanelSlot({
  attachments,
  onChange,
}: {
  attachments: InvoiceAttachment[]
  onChange: (attachments: InvoiceAttachment[]) => void
}) {
  return (
    <Card className="rounded-xl border-dashed border-zinc-300 bg-zinc-50">
      <CardContent className="flex items-center justify-center p-4 text-sm text-zinc-500">
        AttachmentsPanel placeholder ({attachments.length} files)
      </CardContent>
    </Card>
  )
}

function ColumnManagerSlot({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md rounded-2xl bg-white p-4">
        <div className="mb-4 text-lg font-semibold">ColumnManager Placeholder</div>
        <Button onClick={onClose}>Close</Button>
      </Card>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function numberToWords(num: number): string {
  if (num === 0) return "Zero Naira Only"
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]
  
  const convert = (n: number): string => {
    if (n < 20) return ones[n]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "")
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " and " + convert(n % 100) : "")
    if (n < 1000000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "")
    if (n < 1000000000) return convert(Math.floor(n / 1000000)) + " Million" + (n % 1000000 ? " " + convert(n % 1000000) : "")
    return convert(Math.floor(n / 1000000000)) + " Billion" + (n % 1000000000 ? " " + convert(n % 1000000000) : "")
  }
  
  return convert(Math.round(num)) + " Naira Only"
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function MobileInvoiceForm() {
  // ─────────────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────────────

  const [saving, setSaving] = useState(false)

  // Invoice header
  const [invoice, setInvoice] = useState<Invoice>({
    invoice_number: "INV-001",
    po_number: "",
    client_id: null,
    client_name: "",
    issue_date: new Date().toISOString().split("T")[0],
    due_date: "",
    status: "draft",
    document_type: "INVOICE",
    payment_terms: "Net 30",
    notes: "",
    terms: "",
    workmanship: 0,
    transportation: 0,
    shipping: 0,
    discount: 0,
    vat: 7.5,
    wht: 0,
    invoice_title: "",
    work_duration: "",
  })

  // Line items
  const [items, setItems] = useState<InvoiceItem[]>([
    { ...makeEmptyItem(), sort_order: 0 },
  ])

  // Groups
  const [groups, setGroups] = useState<InvoiceGroup[]>([])

  // Columns
  const [columns, setColumns] = useState<ColumnConfig[]>([...BUILTIN_COLUMNS])

  // Tax settings
  const [discountType, setDiscountType] = useState<DiscountType>("fixed")
  const [whtType, setWhtType] = useState<WhtType>("percent")

  // Extra charges
  const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>([])

  // Attachments
  const [attachments, setAttachments] = useState<InvoiceAttachment[]>([])

  // UI state
  const [showNotesTerm, setShowNotesTerm] = useState(false)
  const [showAttachments, setShowAttachments] = useState(false)
  const [showColumnManager, setShowColumnManager] = useState(false)
  const [showActionsSheet, setShowActionsSheet] = useState(false)
  const [headerExpanded, setHeaderExpanded] = useState(true)

  // ─────────────────────────────────────────────────────────────────────────
  // DERIVED
  // ─────────────────────────────────────────────────────────────────────────

  const customColumns = columns.filter((c) => c.key.startsWith("custom_"))
  
  const isVisible = (key: string) => columns.find((c) => c.key === key)?.visible ?? false
  const getColumn = (key: string) => columns.find((c) => c.key === key)

  const computeItemAmount = (item: InvoiceItem) =>
    Number(item.quantity || 0) * Number(item.unit_price || 0)

  const computeInstallRate = (item: InvoiceItem) => {
    const col = getColumn("install_rate")
    if (item.install_rate_override && item.install_rate !== null) {
      return Number(item.install_rate)
    }
    if (col?.formula) {
      const factor = parseFloat(col.formula)
      if (!Number.isNaN(factor) && factor > 0) {
        return factor * Number(item.quantity || 1) * Number(item.unit_price || 0)
      }
    }
    return Number(item.install_rate || 0)
  }

  // Calculate totals
  const standardItems = items.filter((i) => i.row_type === "standard")
  
  const rawSubtotal = standardItems.reduce((sum, item) => sum + computeItemAmount(item), 0)
  
  const installRateTotal = standardItems.reduce((sum, item) => sum + computeInstallRate(item), 0)

  const fixedChargesTotal =
    Number(invoice.workmanship || 0) +
    Number(invoice.transportation || 0) +
    Number(invoice.shipping || 0)

  const extraWithTax = extraCharges
    .filter((c) => c.withTax)
    .reduce((sum, c) => sum + Number(c.value || 0), 0)

  const extraWithoutTax = extraCharges
    .filter((c) => !c.withTax)
    .reduce((sum, c) => sum + Number(c.value || 0), 0)

  const baseForDiscount = rawSubtotal + installRateTotal + fixedChargesTotal + extraWithTax

  const discountAmount =
    discountType === "percent"
      ? (baseForDiscount * Number(invoice.discount || 0)) / 100
      : Number(invoice.discount || 0)

  const afterDiscount = baseForDiscount - discountAmount

  const vatAmount = (afterDiscount * Number(invoice.vat || 0)) / 100

  const grandTotal = afterDiscount + vatAmount + extraWithoutTax

  const whtAmount =
    whtType === "percent"
      ? (grandTotal * Number(invoice.wht || 0)) / 100
      : Number(invoice.wht || 0)

  const totalPayable = grandTotal - whtAmount

  const amountInWords = numberToWords(totalPayable)

  // Group subtotals
  const computeGroupSubtotal = (groupId: string) =>
    items
      .filter((i) => i.row_type === "standard" && i.group_id === groupId)
      .reduce((sum, item) => sum + computeItemAmount(item), 0)

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const updateInvoice = (field: keyof Invoice, value: unknown) =>
    setInvoice((prev) => ({ ...prev, [field]: value }))

  const updateItem = (index: number, field: string, value: unknown) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item
        if (field === "__install_rate_override" && typeof value === "object") {
          return { ...item, ...(value as object) }
        }
        return { ...item, [field]: value }
      })
    )
  }

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { ...makeEmptyItem(), sort_order: prev.length },
    ])
  }

  const removeItem = (index: number) => {
    setItems((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((item, i) => ({ ...item, sort_order: i }))
    )
  }

  const moveItem = (index: number, dir: number) => {
    const newIdx = index + dir
    if (newIdx < 0 || newIdx >= items.length) return
    setItems((prev) => {
      const next = [...prev]
      ;[next[index], next[newIdx]] = [next[newIdx], next[index]]
      return next.map((item, i) => ({ ...item, sort_order: i }))
    })
  }

  const insertItemAfter = (index: number) => {
    setItems((prev) => {
      const newItem = { ...makeEmptyItem() }
      const currentItem = prev[index]
      if (currentItem?.group_id) {
        newItem.group_id = currentItem.group_id
        newItem.group_name = currentItem.group_name
      }
      const next = [...prev]
      next.splice(index + 1, 0, newItem)
      return next.map((item, i) => ({ ...item, sort_order: i }))
    })
  }

  // Groups
  const addGroup = () => {
    const group = makeEmptyGroup()
    group.name = `Group ${groups.length + 1}`
    setGroups((prev) => [...prev, group])
    setItems((prev) => [
      ...prev,
      {
        ...makeEmptyItem(),
        row_type: "group_header",
        group_id: group.id,
        group_name: group.name,
        sort_order: prev.length,
      },
    ])
  }

  const updateGroupName = (groupId: string, name: string) => {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, name } : g)))
    setItems((prev) =>
      prev.map((item) =>
        item.group_id === groupId ? { ...item, group_name: name } : item
      )
    )
  }

  const toggleGroupSubtotal = (groupId: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, showSubtotal: !g.showSubtotal } : g))
    )
  }

  const deleteGroup = (groupId: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId))
    setItems((prev) =>
      prev
        .filter((item) => !(item.row_type === "group_header" && item.group_id === groupId))
        .map((item) =>
          item.group_id === groupId
            ? { ...item, group_id: null, group_name: "" }
            : item
        )
        .map((item, i) => ({ ...item, sort_order: i }))
    )
  }

  const addItemToGroup = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId)
    if (!group) return

    setItems((prev) => {
      let insertAt = prev.findIndex(
        (item) => item.row_type === "group_header" && item.group_id === groupId
      )
      if (insertAt === -1) insertAt = prev.length - 1

      for (let i = insertAt + 1; i < prev.length; i++) {
        if (prev[i].row_type === "group_header") break
        if (prev[i].group_id === groupId) insertAt = i
      }

      const newItem = {
        ...makeEmptyItem(),
        group_id: groupId,
        group_name: group.name,
      }

      const next = [...prev]
      next.splice(insertAt + 1, 0, newItem)
      return next.map((item, i) => ({ ...item, sort_order: i }))
    })
  }

  // Extra charges
  const addExtraCharge = () => setExtraCharges((prev) => [...prev, makeExtraCharge()])

  const updateExtraCharge = (id: string, field: keyof ExtraCharge, value: unknown) => {
    setExtraCharges((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    )
  }

  const removeExtraCharge = (id: string) => {
    setExtraCharges((prev) => prev.filter((c) => c.id !== id))
  }

  // Save
  const handleSave = async (status: string) => {
    setSaving(true)
    // Simulated save
    await new Promise((r) => setTimeout(r, 1000))
    setSaving(false)
    alert(`Invoice saved as ${status}`)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS FOR RENDERING
  // ─────────────────────────────────────────────────────────────────────────

  const getItemIndex = (uiKey: string) => items.findIndex((i) => i._uiKey === uiKey)

  const getItemNumber = (index: number) => {
    let num = 0
    for (let i = 0; i <= index; i++) {
      if (items[i].row_type === "standard") num++
    }
    return num
  }

  // Separate ungrouped items and grouped sections
  const ungroupedItems = items.filter(
    (i) => i.row_type === "standard" && !i.group_id
  )

  const groupSections = groups.map((group) => ({
    group,
    items: items.filter(
      (i) => i.row_type === "standard" && i.group_id === group.id
    ),
  }))

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  const labelCls = "text-[10px] font-semibold uppercase tracking-wide text-zinc-500"
  const inputCls = "h-9 rounded-xl border-zinc-200 bg-white text-sm"
  const lineItemsCount = items.filter((i) => i.row_type === "standard").length
  const topCommandButtonCls =
    "h-9 flex-1 gap-1.5 rounded-xl border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700"
  const lowerActionButtonCls =
    "h-10 flex-1 gap-1.5 rounded-xl border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700"
  const handleImportCSV = () => alert("CSV import placeholder")
  const showAdditionalContent = showNotesTerm || showAttachments

  return (
    <div className="min-h-screen bg-zinc-100 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-zinc-900">New Invoice</h1>
            <p className="text-xs text-zinc-500">{invoice.invoice_number}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowActionsSheet(true)}
            className="h-9 w-9 rounded-xl"
          >
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="space-y-4 p-4">
        {/* Invoice Header Fields */}
        <Collapsible open={headerExpanded} onOpenChange={setHeaderExpanded}>
          <Card className="rounded-xl border-zinc-200 bg-white">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-zinc-500" />
                  <span className="text-sm font-semibold text-zinc-900">Invoice Details</span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-zinc-400 transition-transform ${
                    headerExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <CardContent className="space-y-4 border-t border-zinc-100 px-4 pb-4 pt-3">
                {/* Client */}
                <div>
                  <label className={labelCls}>Client</label>
                  <div className="mt-1">
                    <ClientSelectorSlot
                      clientId={invoice.client_id || null}
                      clientName={invoice.client_name || ""}
                      onClientChange={(id, name) =>
                        setInvoice((prev) => ({ ...prev, client_id: id, client_name: name }))
                      }
                    />
                  </div>
                </div>

                {/* Invoice Number & PO */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Invoice #</label>
                    <div className="relative mt-1">
                      <Hash className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                      <Input
                        value={invoice.invoice_number || ""}
                        onChange={(e) => updateInvoice("invoice_number", e.target.value)}
                        className={`pl-8 ${inputCls}`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>PO Number</label>
                    <Input
                      value={invoice.po_number || ""}
                      onChange={(e) => updateInvoice("po_number", e.target.value)}
                      placeholder="Optional"
                      className={`mt-1 ${inputCls}`}
                    />
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Issue Date</label>
                    <div className="relative mt-1">
                      <Calendar className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                      <Input
                        type="date"
                        value={invoice.issue_date || ""}
                        onChange={(e) => updateInvoice("issue_date", e.target.value)}
                        className={`pl-8 ${inputCls}`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Due Date</label>
                    <div className="relative mt-1">
                      <Calendar className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                      <Input
                        type="date"
                        value={invoice.due_date || ""}
                        onChange={(e) => updateInvoice("due_date", e.target.value)}
                        className={`pl-8 ${inputCls}`}
                      />
                    </div>
                  </div>
                </div>

                {/* Title & Duration */}
                <div>
                  <label className={labelCls}>Invoice Title (Optional)</label>
                  <Input
                    value={invoice.invoice_title || ""}
                    onChange={(e) => updateInvoice("invoice_title", e.target.value)}
                    placeholder="e.g. Solar Panel Installation"
                    className={`mt-1 ${inputCls}`}
                  />
                </div>

                <div>
                  <label className={labelCls}>Work Duration</label>
                  <div className="relative mt-1">
                    <Clock className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                    <Input
                      value={invoice.work_duration || ""}
                      onChange={(e) => updateInvoice("work_duration", e.target.value)}
                      placeholder="e.g. 2 weeks"
                      className={`pl-8 ${inputCls}`}
                    />
                  </div>
                </div>

              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Card className="rounded-xl border-zinc-200 bg-white">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Custom Fields</h2>
                <p className="text-xs text-zinc-500">Repeatable header metadata sits here during transplant</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => alert("Custom field shell placeholder")}
                className="h-8 gap-1.5 rounded-xl border-zinc-200 bg-white px-3 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Custom Field
              </Button>
            </div>

            <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-3">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <GripHorizontal className="h-4 w-4" />
                Custom header fields will render here as compact repeatable rows.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items Section */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Line Items</h2>
            <span className="text-xs text-zinc-500">
              {lineItemsCount} {lineItemsCount === 1 ? "item" : "items"}
            </span>
          </div>

          <div className="mb-3 rounded-2xl border border-zinc-200 bg-white p-2">
            <div className="grid grid-cols-4 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowColumnManager(true)}
                className={topCommandButtonCls}
              >
                <Settings2 className="h-3.5 w-3.5" />
                Settings
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleImportCSV}
                className={topCommandButtonCls}
              >
                <Upload className="h-3.5 w-3.5" />
                Import
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addGroup}
                className={topCommandButtonCls}
              >
                <Layers className="h-3.5 w-3.5" />
                Group
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                className={topCommandButtonCls}
              >
                <Plus className="h-3.5 w-3.5" />
                Item
              </Button>
            </div>
          </div>

          {/* Grouped Sections */}
          {groupSections.map(({ group, items: groupItems }) => (
            <MobileGroupCard
              key={group.id}
              group={group}
              items={groupItems}
              allItems={items}
              invoice={invoice}
              columns={columns}
              customColumns={customColumns}
              groupSubtotal={computeGroupSubtotal(group.id)}
              getItemIndex={getItemIndex}
              getItemNumber={getItemNumber}
              onUpdateGroupName={updateGroupName}
              onToggleGroupSubtotal={toggleGroupSubtotal}
              onDeleteGroup={deleteGroup}
              onAddItemToGroup={addItemToGroup}
              onUpdateItem={updateItem}
              onRemoveItem={removeItem}
              onMoveItem={moveItem}
              onInsertItemAfter={insertItemAfter}
              isVisible={isVisible}
              getColumn={getColumn}
              computeItemAmount={computeItemAmount}
            />
          ))}

          {/* Ungrouped Items */}
          {ungroupedItems.map((item) => {
            const idx = getItemIndex(item._uiKey || "")
            const num = getItemNumber(idx)
            const isFirst = idx === 0 || items[idx - 1]?.row_type === "group_header"
            const isLast = idx === items.length - 1 || items[idx + 1]?.row_type === "group_header"

            return (
              <MobileItemCard
                key={item._uiKey}
                item={item}
                index={idx}
                number={num}
                invoice={invoice}
                columns={columns}
                customColumns={customColumns}
                computedAmount={computeItemAmount(item)}
                isFirst={isFirst}
                isLast={isLast}
                onUpdate={updateItem}
                onRemove={removeItem}
                onMoveUp={(i) => moveItem(i, -1)}
                onMoveDown={(i) => moveItem(i, 1)}
                onInsertBelow={insertItemAfter}
                isVisible={isVisible}
                getColumn={getColumn}
              />
            )
          })}

          {lineItemsCount === 0 && (
            <Card className="rounded-xl border-dashed border-zinc-300 bg-zinc-50">
              <CardContent className="flex flex-col items-center justify-center gap-2 py-8">
                <p className="text-sm text-zinc-500">No line items yet</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  className="gap-1.5 rounded-xl"
                >
                  <Plus className="h-4 w-4" />
                  Add first item
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={addItem}
                className={lowerActionButtonCls}
              >
                <Plus className="h-4 w-4" />
                + Add Item
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={addGroup}
                className={lowerActionButtonCls}
              >
                <Layers className="h-4 w-4" />
                + Add Group
              </Button>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <Card className="rounded-xl border-zinc-200 bg-white">
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">Additional Info</h3>
                <p className="text-xs text-zinc-500">Secondary document details and payment copy</p>
              </div>
            </div>

            <div>
              <label className={labelCls}>Payment Terms</label>
              <select
                value={invoice.payment_terms || "Net 30"}
                onChange={(e) => updateInvoice("payment_terms", e.target.value)}
                className={`mt-1 w-full ${inputCls} px-3`}
              >
                <option value="Due on Receipt">Due on Receipt</option>
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 45">Net 45</option>
                <option value="Net 60">Net 60</option>
                <option value="Custom">Custom</option>
              </select>
              {invoice.payment_terms === "Custom" && (
                <Input
                  value={invoice.custom_payment_terms || ""}
                  onChange={(e) => updateInvoice("custom_payment_terms", e.target.value)}
                  placeholder="Enter custom terms"
                  className={`mt-2 ${inputCls}`}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {showAdditionalContent && (
          <Card className="rounded-xl border-zinc-200 bg-white">
            <CardContent className="space-y-4 p-4">
              <div>
                <div className="mb-1">
                  <h3 className="text-sm font-semibold text-zinc-900">Additional Content</h3>
                  <p className="text-xs text-zinc-500">TipTap-ready shells for rich document content and attachments</p>
                </div>
              </div>

              {showNotesTerm && (
                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>Notes</label>
                    <div className="mt-1">
                      <RichTextEditorSlot
                        value={invoice.notes || ""}
                        onChange={(v) => updateInvoice("notes", v)}
                        placeholder="Rich notes content will mount here..."
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Terms & Conditions</label>
                    <div className="mt-1">
                      <RichTextEditorSlot
                        value={invoice.terms || ""}
                        onChange={(v) => updateInvoice("terms", v)}
                        placeholder="Rich terms content will mount here..."
                      />
                    </div>
                  </div>
                </div>
              )}

              {showAttachments && (
                <div>
                  <label className={labelCls}>Attachments</label>
                  <div className="mt-1 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-700">
                      <Paperclip className="h-4 w-4" />
                      Attachment Shell
                    </div>
                    <AttachmentsPanelSlot
                      attachments={attachments}
                      onChange={setAttachments}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Totals */}
        <TotalsPanel
          rawSubtotal={rawSubtotal}
          installRateTotal={installRateTotal}
          workmanship={Number(invoice.workmanship || 0)}
          transportation={Number(invoice.transportation || 0)}
          shipping={Number(invoice.shipping || 0)}
          onWorkmanshipChange={(v) => updateInvoice("workmanship", v)}
          onTransportationChange={(v) => updateInvoice("transportation", v)}
          onShippingChange={(v) => updateInvoice("shipping", v)}
          extraCharges={extraCharges}
          onAddExtraCharge={addExtraCharge}
          onUpdateExtraCharge={updateExtraCharge}
          onRemoveExtraCharge={removeExtraCharge}
          discountValue={Number(invoice.discount || 0)}
          discountType={discountType}
          onDiscountValueChange={(v) => updateInvoice("discount", v)}
          onDiscountTypeChange={setDiscountType}
          discountAmount={discountAmount}
          vatPercent={Number(invoice.vat || 0)}
          onVatPercentChange={(v) => updateInvoice("vat", v)}
          vatAmount={vatAmount}
          whtValue={Number(invoice.wht || 0)}
          whtType={whtType}
          onWhtValueChange={(v) => updateInvoice("wht", v)}
          onWhtTypeChange={setWhtType}
          whtAmount={whtAmount}
          grandTotal={grandTotal}
          totalPayable={totalPayable}
          amountInWords={amountInWords}
        />

        <Card className="rounded-xl border-zinc-200 bg-white">
          <CardContent className="space-y-4 p-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Output Settings</h3>
              <p className="text-xs text-zinc-500">Document-level sections to include when rendering the invoice</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3">
                <div>
                  <div className="text-sm font-medium text-zinc-900">Notes & Terms</div>
                  <div className="text-xs text-zinc-500">Include rich content blocks in the lower document</div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNotesTerm(!showNotesTerm)}
                  className="h-8 rounded-xl border-zinc-200 px-3 text-xs"
                >
                  {showNotesTerm ? "On" : "Off"}
                </Button>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3">
                <div>
                  <div className="text-sm font-medium text-zinc-900">Attachments</div>
                  <div className="text-xs text-zinc-500">Show the file attachment block in the document shell</div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAttachments(!showAttachments)}
                  className="h-8 rounded-xl border-zinc-200 px-3 text-xs"
                >
                  {showAttachments ? "On" : "Off"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-zinc-200 bg-white">
          <CardContent className="space-y-4 p-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Save Actions</h3>
              <p className="text-xs text-zinc-500">Final document actions follow the quotation-style bottom stack</p>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSave("draft")}
                disabled={saving}
                className="h-12 flex-1 rounded-xl border-zinc-300 text-sm font-medium"
              >
                {saving ? "Saving..." : "Save Draft"}
              </Button>
              <Button
                type="button"
                onClick={() => handleSave("sent")}
                disabled={saving}
                className="h-12 flex-[1.5] rounded-xl bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-800"
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save & Send"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Actions Sheet */}
      <ActionsSheet
        open={showActionsSheet}
        onOpenChange={setShowActionsSheet}
        onOpenColumnManager={() => setShowColumnManager(true)}
        onAddGroup={addGroup}
        onImportCSV={handleImportCSV}
        onToggleNotesTerm={() => setShowNotesTerm(!showNotesTerm)}
        showNotesTerm={showNotesTerm}
        onToggleAttachments={() => setShowAttachments(!showAttachments)}
        showAttachments={showAttachments}
      />

      {/* Column Manager */}
      <ColumnManagerSlot
        open={showColumnManager}
        onClose={() => setShowColumnManager(false)}
      />
    </div>
  )
}
