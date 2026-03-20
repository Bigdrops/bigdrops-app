/**
 * InvoiceFormShell — Production-ready mobile-first invoice UI
 *
 * STRUCTURAL NOTES:
 * - Groups are REAL data rows with row_type = "group_header" and group_id
 * - Grouped items are linked by group_id (NOT visual wrappers)
 * - Columns are CONFIGURABLE via useInvoiceColumns hook
 * - Image upload is PER-ITEM (not global)
 * - Notes/terms use RichTextEditor slots
 * - Attachments panel is preserved
 * - Totals show ALL line items with full complexity (VAT, discount, WHT, install rate)
 */

import type { ReactNode } from 'react'
import { useState } from 'react'
import { ChevronDown, ChevronUp, GripVertical, ImagePlus, MoreHorizontal, Plus, Settings2, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import type { InvoiceItem, ColumnConfig, InvoiceGroup } from '@/domain/invoice/types'

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface InvoiceFormShellProps {
  // Header
  invoiceNumber?: string
  invoiceTitle?: string
  issueDate?: string
  dueDate?: string
  documentType?: string
  onInvoiceNumberChange?: (value: string) => void
  onInvoiceTitleChange?: (value: string) => void
  onIssueDateChange?: (value: string) => void
  onDueDateChange?: (value: string) => void

  // Client Selector Slot
  clientSelectorSlot?: ReactNode

  // Items
  items: InvoiceItem[]
  groups: InvoiceGroup[]
  onUpdateItem: (index: number, field: string, value: unknown) => void
  onRemoveItem: (index: number) => void
  onMoveItem: (index: number, direction: number) => void
  onInsertItemAfter: (index: number) => void
  onAddItem: () => void
  onAddGroup: () => void
  onUpdateGroupName: (groupId: string, name: string) => void
  onToggleGroupSubtotal: (groupId: string) => void
  onDeleteGroup: (groupId: string) => void
  onAddItemToGroup: (groupId: string) => void

  // Columns
  columns: ColumnConfig[]
  isVisible: (key: string) => boolean
  getColumn: (key: string) => ColumnConfig | undefined
  customColumns: ColumnConfig[]
  showItemImages?: boolean
  onOpenColumnManager?: () => void

  // Totals
  subtotal: number
  installRateTotal: number
  vatAmount: number
  discountAmount: number
  grandTotal: number
  whtAmount: number
  totalPayable: number
  computedGroups?: Map<string, { subtotal: number }>

  // Invoice settings
  invoice: {
    vat?: number
    discount?: number
    wht?: number
    workmanship?: number
    transportation?: number
    shipping?: number
    [key: string]: unknown
  }
  discountType?: 'fixed' | 'percent'
  discountTiming?: 'before' | 'after'
  whtType?: 'fixed' | 'percent'
  onUpdateInvoice: (field: string, value: unknown) => void

  // Extra charges
  extraCharges?: Array<{ id?: string; label?: string; value?: number | string; withTax?: boolean }>
  chargeLabels?: { workmanship?: string; transportation?: string; shipping?: string }

  // Notes/Terms slots
  notesTermsSlot?: ReactNode

  // Payment terms slot
  paymentTermsSlot?: ReactNode

  // Custom fields slots
  customFieldsSlot?: ReactNode
  bottomFieldsSlot?: ReactNode

  // Attachments slot
  attachmentsSlot?: ReactNode

  // Item image upload slot render function
  renderItemImage?: (item: InvoiceItem, index: number) => ReactNode

  // Unit input slot render function
  renderUnitInput?: (item: InvoiceItem, index: number) => ReactNode

  // Actions
  saving?: boolean
  onSave: (status: string) => void
  onCancel?: () => void
  primaryLabel?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE LINE ITEM CARD
// ─────────────────────────────────────────────────────────────────────────────

interface MobileLineItemProps {
  item: InvoiceItem
  index: number
  number: number
  isFirst: boolean
  isLast: boolean
  columns: ColumnConfig[]
  isVisible: (key: string) => boolean
  getColumn: (key: string) => ColumnConfig | undefined
  customColumns: ColumnConfig[]
  showItemImages?: boolean
  invoice: { vat?: number; [key: string]: unknown }
  computedAmount: number
  groupName?: string
  onUpdate: (index: number, field: string, value: unknown) => void
  onRemove: (index: number) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  onInsertBelow: (index: number) => void
  renderItemImage?: (item: InvoiceItem, index: number) => ReactNode
  renderUnitInput?: (item: InvoiceItem, index: number) => ReactNode
}

function MobileLineItem({
  item,
  index,
  number,
  isFirst,
  isLast,
  isVisible,
  getColumn,
  customColumns,
  showItemImages,
  invoice,
  computedAmount,
  groupName,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onInsertBelow,
  renderItemImage,
  renderUnitInput,
}: MobileLineItemProps) {
  const [expanded, setExpanded] = useState(false)

  const autoInstall = (() => {
    const col = getColumn('install_rate')
    return col?.formula
      ? parseFloat(col.formula) * Number(item.quantity || 1) * Number(item.unit_price || 0)
      : null
  })()

  const hasDiscountOverride = item.discount_rate !== null && item.discount_rate !== undefined
  const isDiscountExcluded = item.discount_rate === 0
  const hasVatOverride = item.vat_rate !== null && item.vat_rate !== undefined
  const isVatExcluded = item.vat_rate === 0

  return (
    <Card className="relative overflow-hidden border-border/60 bg-card shadow-sm">
      <CardContent className="p-0">
        {/* Main compact row */}
        <div className="flex items-start gap-3 p-3">
          {/* Number badge */}
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-card">
            {number}
          </div>

          {/* Content area */}
          <div className="min-w-0 flex-1">
            {/* Description */}
            <Input
              value={item.description || ''}
              onChange={(e) => onUpdate(index, 'description', e.target.value)}
              placeholder="Item description"
              className="mb-1 h-auto border-0 bg-transparent p-0 text-sm font-medium text-foreground shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
            />

            {/* Sub-description */}
            <Input
              value={item.sub_description || ''}
              onChange={(e) => onUpdate(index, 'sub_description', e.target.value)}
              placeholder="Additional details..."
              className="h-auto border-0 bg-transparent p-0 text-xs text-muted-foreground shadow-none placeholder:text-muted-foreground/50 focus-visible:ring-0"
            />

            {/* Qty | Rate | Amount row */}
            <div className="mt-2 flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Qty:</span>
                <Input
                  type="number"
                  min="0"
                  value={item.quantity}
                  onChange={(e) => onUpdate(index, 'quantity', Number(e.target.value))}
                  className="h-6 w-14 border-border/50 bg-secondary/50 px-1.5 text-center text-xs"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Rate:</span>
                <Input
                  type="number"
                  min="0"
                  value={item.unit_price}
                  onChange={(e) => onUpdate(index, 'unit_price', Number(e.target.value))}
                  className="h-6 w-20 border-border/50 bg-secondary/50 px-1.5 text-center text-xs"
                />
              </div>
              <div className="ml-auto text-right">
                <span className="text-muted-foreground">Amount: </span>
                <span className="font-semibold text-foreground">
                  N{computedAmount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Status badges */}
            <div className="mt-2 flex flex-wrap gap-1">
              {groupName && (
                <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {groupName}
                </span>
              )}
              {isVatExcluded && (
                <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                  VAT excluded
                </span>
              )}
              {isDiscountExcluded && (
                <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                  No discount
                </span>
              )}
              {hasDiscountOverride && !isDiscountExcluded && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                  {item.discount_rate}% discount
                </span>
              )}
            </div>
          </div>

          {/* Image upload slot (top-right) */}
          {showItemImages && renderItemImage && (
            <div className="shrink-0">
              {renderItemImage(item, index)}
            </div>
          )}
        </div>

        {/* Expandable section */}
        {expanded && (
          <div className="border-t border-border/50 bg-secondary/30 px-3 py-3">
            <div className="grid grid-cols-2 gap-3">
              {isVisible('unit') && (
                <div>
                  <Label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Unit
                  </Label>
                  {renderUnitInput ? (
                    renderUnitInput(item, index)
                  ) : (
                    <Input
                      value={item.unit || ''}
                      onChange={(e) => onUpdate(index, 'unit', e.target.value)}
                      placeholder="Unit"
                      className="h-8 text-xs"
                    />
                  )}
                </div>
              )}

              {isVisible('make') && (
                <div className="col-span-2">
                  <Label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Make / Brand
                  </Label>
                  <Input
                    value={item.make || ''}
                    onChange={(e) => onUpdate(index, 'make', e.target.value)}
                    placeholder="Brand or manufacturer"
                    className="h-8 text-xs"
                  />
                </div>
              )}

              {isVisible('install_rate') && (
                <div>
                  <Label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Install Rate
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={item.install_rate_override ? (item.install_rate ?? '') : ''}
                    placeholder={autoInstall !== null ? String(Number(autoInstall.toFixed(2))) : '0'}
                    onChange={(e) => {
                      const val = e.target.value
                      onUpdate(
                        index,
                        '__install_rate_override',
                        val === ''
                          ? { install_rate_override: false, install_rate: null }
                          : { install_rate_override: true, install_rate: Number(val) }
                      )
                    }}
                    className="h-8 text-xs"
                  />
                </div>
              )}

              {isVisible('vat_rate') && (
                <div>
                  <Label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    VAT %
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={hasVatOverride ? item.vat_rate : ''}
                    placeholder={String(invoice.vat || 0)}
                    onChange={(e) => {
                      const val = e.target.value
                      onUpdate(index, 'vat_rate', val === '' ? null : Number(val))
                    }}
                    className={`h-8 text-xs ${isVatExcluded ? 'border-destructive/50 bg-destructive/5' : ''}`}
                  />
                </div>
              )}

              {isVisible('discount_rate') && (
                <div>
                  <Label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Discount %
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={hasDiscountOverride ? item.discount_rate : ''}
                    placeholder="global"
                    onChange={(e) => {
                      const val = e.target.value
                      onUpdate(index, 'discount_rate', val === '' ? null : Number(val))
                    }}
                    className={`h-8 text-xs ${isDiscountExcluded ? 'border-destructive/50 bg-destructive/5' : hasDiscountOverride ? 'border-amber-500/50 bg-amber-50' : ''}`}
                  />
                </div>
              )}

              {/* Custom columns */}
              {customColumns.filter((c) => c.visible).map((col) => (
                <div key={col.key} className="col-span-2">
                  <Label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {col.label}
                  </Label>
                  <Input
                    type={col.type === 'number' ? 'number' : 'text'}
                    value={(item.custom_data || {})[col.key] || ''}
                    onChange={(e) =>
                      onUpdate(index, 'custom_data', {
                        ...(item.custom_data || {}),
                        [col.key]: col.type === 'number' ? Number(e.target.value) : e.target.value,
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center justify-between border-t border-border/50 bg-secondary/20 px-2 py-1.5">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onMoveUp(index)}
              disabled={isFirst}
              className="text-muted-foreground"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onMoveDown(index)}
              disabled={isLast}
              className="text-muted-foreground"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setExpanded(!expanded)}
              className="gap-1 text-muted-foreground"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
              <span>{expanded ? 'Less' : 'More'}</span>
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onInsertBelow(index)}
              className="gap-1 text-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Below</span>
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onRemove(index)}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP HEADER CARD
// ─────────────────────────────────────────────────────────────────────────────

interface GroupHeaderCardProps {
  item: InvoiceItem
  index: number
  group: InvoiceGroup | undefined
  groupSubtotal: number
  onUpdateGroupName: (groupId: string, name: string) => void
  onToggleGroupSubtotal: (groupId: string) => void
  onDeleteGroup: (groupId: string) => void
  onAddItemToGroup: (groupId: string) => void
  onUpdateItem: (index: number, field: string, value: unknown) => void
  onRemoveItem: (index: number) => void
  showItemImages?: boolean
  renderItemImage?: (item: InvoiceItem, index: number) => ReactNode
}

function GroupHeaderCard({
  item,
  index,
  group,
  groupSubtotal,
  onUpdateGroupName,
  onToggleGroupSubtotal,
  onDeleteGroup,
  onAddItemToGroup,
  onUpdateItem,
  onRemoveItem,
  showItemImages,
  renderItemImage,
}: GroupHeaderCardProps) {
  if (!group) return null

  return (
    <Card className="border-2 border-primary/20 bg-primary/5 shadow-sm">
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          {/* Grip handle */}
          <div className="flex h-6 w-6 shrink-0 cursor-grab items-center justify-center text-muted-foreground">
            <GripVertical className="h-4 w-4" />
          </div>

          {/* Group name input */}
          <div className="min-w-0 flex-1">
            <Input
              value={item.group_name || ''}
              onChange={(e) => {
                if (group) onUpdateGroupName(group.id!, e.target.value)
                else onUpdateItem(index, 'group_name', e.target.value)
              }}
              placeholder="Group name"
              className="h-auto border-0 bg-transparent p-0 text-sm font-semibold text-foreground shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
            />

            {/* Subtotal toggle */}
            <div className="mt-2 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={group.showSubtotal}
                  onCheckedChange={() => onToggleGroupSubtotal(group.id!)}
                  className="h-4 w-7"
                />
                <span className="text-[11px] text-muted-foreground">Show subtotal</span>
              </div>
              {group.showSubtotal && (
                <span className="text-xs font-semibold text-primary">
                  N{groupSubtotal.toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* Image slot */}
          {showItemImages && renderItemImage && (
            <div className="shrink-0">
              {renderItemImage(item, index)}
            </div>
          )}

          {/* Delete button */}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => (group ? onDeleteGroup(group.id!) : onRemoveItem(index))}
            className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Add item to group */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAddItemToGroup(group.id!)}
          className="mt-2 w-full gap-1 border border-dashed border-primary/30 text-primary hover:bg-primary/10"
        >
          <Plus className="h-3.5 w-3.5" />
          Add item to group
        </Button>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// INVOICE TOTALS SECTION
// ─────────────────────────────────────────────────────────────────────────────

interface InvoiceTotalsSectionProps {
  subtotal: number
  installRateTotal: number
  vatAmount: number
  discountAmount: number
  grandTotal: number
  whtAmount: number
  totalPayable: number
  extraCharges?: Array<{ label?: string; value?: number | string }>
  chargeLabels?: { workmanship?: string; transportation?: string; shipping?: string }
  invoice: { workmanship?: number; transportation?: number; shipping?: number }
  discountType?: 'fixed' | 'percent'
  whtType?: 'fixed' | 'percent'
}

function InvoiceTotalsSection({
  subtotal,
  installRateTotal,
  vatAmount,
  discountAmount,
  grandTotal,
  whtAmount,
  totalPayable,
  extraCharges,
  chargeLabels,
  invoice,
}: InvoiceTotalsSectionProps) {
  const workmanship = Number(invoice.workmanship || 0)
  const transportation = Number(invoice.transportation || 0)
  const shipping = Number(invoice.shipping || 0)
  const fixedChargesTotal = workmanship + transportation + shipping

  const TotalRow = ({ label, value, muted = false, bold = false }: { label: string; value: number; muted?: boolean; bold?: boolean }) => (
    <div className={`flex items-center justify-between py-1 ${muted ? 'text-muted-foreground' : ''}`}>
      <span className={`text-xs ${bold ? 'font-semibold' : ''}`}>{label}</span>
      <span className={`text-xs ${bold ? 'font-bold' : 'font-medium'}`}>
        N{value.toLocaleString()}
      </span>
    </div>
  )

  return (
    <Card className="border-border/60 bg-card shadow-sm">
      <CardContent className="p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Summary
        </h3>

        <div className="space-y-0.5">
          <TotalRow label="Subtotal" value={subtotal} />

          {installRateTotal > 0 && (
            <TotalRow label="Install Rate Total" value={installRateTotal} muted />
          )}

          {workmanship > 0 && (
            <TotalRow label={chargeLabels?.workmanship || 'Workmanship'} value={workmanship} muted />
          )}

          {transportation > 0 && (
            <TotalRow label={chargeLabels?.transportation || 'Transportation'} value={transportation} muted />
          )}

          {shipping > 0 && (
            <TotalRow label={chargeLabels?.shipping || 'Shipping'} value={shipping} muted />
          )}

          {extraCharges?.filter((c) => c.label && Number(c.value) > 0).map((charge, i) => (
            <TotalRow key={i} label={charge.label!} value={Number(charge.value || 0)} muted />
          ))}

          {discountAmount > 0 && (
            <div className="flex items-center justify-between py-1 text-destructive">
              <span className="text-xs">Discount</span>
              <span className="text-xs font-medium">-N{discountAmount.toLocaleString()}</span>
            </div>
          )}

          {vatAmount > 0 && (
            <TotalRow label="VAT" value={vatAmount} muted />
          )}

          <div className="my-2 border-t border-border/50" />

          <TotalRow label="Grand Total" value={grandTotal} bold />

          {whtAmount > 0 && (
            <div className="flex items-center justify-between py-1 text-amber-600">
              <span className="text-xs">Less WHT</span>
              <span className="text-xs font-medium">-N{whtAmount.toLocaleString()}</span>
            </div>
          )}

          <div className="mt-2 flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2">
            <span className="text-sm font-semibold text-foreground">Total Payable</span>
            <span className="text-lg font-bold text-primary">
              N{totalPayable.toLocaleString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STICKY ACTION FOOTER
// ─────────────────────────────────────────────────────────────────────────────

interface ActionFooterProps {
  saving?: boolean
  primaryLabel?: string
  onSave: (status: string) => void
  onCancel?: () => void
  onOpenMoreActions?: () => void
}

function ActionFooter({ saving, primaryLabel = 'Save Invoice', onSave, onCancel, onOpenMoreActions }: ActionFooterProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-sm safe-area-inset-bottom">
      <div className="mx-auto flex max-w-lg items-center gap-2">
        {onOpenMoreActions && (
          <Button variant="outline" size="icon" onClick={onOpenMoreActions} className="shrink-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="secondary"
          onClick={() => onSave('draft')}
          disabled={saving}
          className="flex-1"
        >
          {saving ? 'Saving...' : 'Save Draft'}
        </Button>
        <Button onClick={() => onSave('sent')} disabled={saving} className="flex-[1.5]">
          {saving ? 'Saving...' : primaryLabel}
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MORE ACTIONS SHEET
// ─────────────────────────────────────────────────────────────────────────────

interface MoreActionsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCancel?: () => void
  onOpenColumnManager?: () => void
}

function MoreActionsSheet({ open, onOpenChange, onCancel, onOpenColumnManager }: MoreActionsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle>More Actions</SheetTitle>
          <SheetDescription>Additional options for this invoice</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-2 pb-6">
          {onOpenColumnManager && (
            <Button
              variant="outline"
              className="justify-start gap-3"
              onClick={() => {
                onOpenChange(false)
                onOpenColumnManager()
              }}
            >
              <Settings2 className="h-4 w-4" />
              Table & Tax Settings
            </Button>
          )}
          {onCancel && (
            <Button variant="outline" className="justify-start gap-3 text-destructive" onClick={onCancel}>
              <X className="h-4 w-4" />
              Cancel / Discard
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN INVOICE FORM SHELL
// ─────────────────────────────────────────────────────────────────────────────

export function InvoiceFormShell({
  invoiceNumber,
  invoiceTitle,
  issueDate,
  dueDate,
  documentType = 'INVOICE',
  onInvoiceNumberChange,
  onInvoiceTitleChange,
  onIssueDateChange,
  onDueDateChange,
  clientSelectorSlot,
  items,
  groups,
  onUpdateItem,
  onRemoveItem,
  onMoveItem,
  onInsertItemAfter,
  onAddItem,
  onAddGroup,
  onUpdateGroupName,
  onToggleGroupSubtotal,
  onDeleteGroup,
  onAddItemToGroup,
  columns,
  isVisible,
  getColumn,
  customColumns,
  showItemImages,
  onOpenColumnManager,
  subtotal,
  installRateTotal,
  vatAmount,
  discountAmount,
  grandTotal,
  whtAmount,
  totalPayable,
  computedGroups,
  invoice,
  discountType,
  whtType,
  extraCharges,
  chargeLabels,
  notesTermsSlot,
  paymentTermsSlot,
  customFieldsSlot,
  bottomFieldsSlot,
  attachmentsSlot,
  renderItemImage,
  renderUnitInput,
  saving,
  onSave,
  onCancel,
  primaryLabel,
}: InvoiceFormShellProps) {
  const [moreActionsOpen, setMoreActionsOpen] = useState(false)

  // Count standard items for numbering
  let itemNumber = 0

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-sm font-semibold text-foreground">
                {documentType === 'QUOTATION' ? 'New Quotation' : 'New Invoice'}
              </h1>
              <p className="text-xs text-muted-foreground">{invoiceNumber}</p>
            </div>
            {onOpenColumnManager && (
              <Button variant="outline" size="icon-sm" onClick={onOpenColumnManager}>
                <Settings2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-lg space-y-4 px-4 py-4">
        {/* Invoice details card */}
        <Card className="border-border/60 bg-card shadow-sm">
          <CardContent className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Invoice #
                </Label>
                <Input
                  value={invoiceNumber || ''}
                  onChange={(e) => onInvoiceNumberChange?.(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Title
                </Label>
                <Input
                  value={invoiceTitle || ''}
                  onChange={(e) => onInvoiceTitleChange?.(e.target.value)}
                  placeholder="Optional title"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Issue Date
                </Label>
                <Input
                  type="date"
                  value={issueDate || ''}
                  onChange={(e) => onIssueDateChange?.(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Due Date
                </Label>
                <Input
                  type="date"
                  value={dueDate || ''}
                  onChange={(e) => onDueDateChange?.(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Client selector slot */}
            {clientSelectorSlot && <div className="pt-2">{clientSelectorSlot}</div>}
          </CardContent>
        </Card>

        {/* Line items section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Line Items
            </h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="xs" onClick={onAddGroup} className="gap-1">
                <Plus className="h-3 w-3" />
                Group
              </Button>
              <Button variant="default" size="xs" onClick={onAddItem} className="gap-1">
                <Plus className="h-3 w-3" />
                Item
              </Button>
            </div>
          </div>

          {/* Items list */}
          <div className="space-y-3">
            {items.map((item, index) => {
              const isFirst = index === 0
              const isLast = index === items.length - 1

              if (item.row_type === 'group_header') {
                const group = groups.find((g) => g.id === item.group_id)
                const groupSubtotal = computedGroups?.get(item.group_id || '')?.subtotal || 0

                return (
                  <GroupHeaderCard
                    key={item._uiKey || item.id || index}
                    item={item}
                    index={index}
                    group={group}
                    groupSubtotal={groupSubtotal}
                    onUpdateGroupName={onUpdateGroupName}
                    onToggleGroupSubtotal={onToggleGroupSubtotal}
                    onDeleteGroup={onDeleteGroup}
                    onAddItemToGroup={onAddItemToGroup}
                    onUpdateItem={onUpdateItem}
                    onRemoveItem={onRemoveItem}
                    showItemImages={showItemImages}
                    renderItemImage={renderItemImage}
                  />
                )
              }

              itemNumber++
              const computedAmount = Number(item.quantity || 0) * Number(item.unit_price || 0)
              const groupName = item.group_id
                ? groups.find((g) => g.id === item.group_id)?.name
                : undefined

              return (
                <MobileLineItem
                  key={item._uiKey || item.id || index}
                  item={item}
                  index={index}
                  number={itemNumber}
                  isFirst={isFirst}
                  isLast={isLast}
                  columns={columns}
                  isVisible={isVisible}
                  getColumn={getColumn}
                  customColumns={customColumns}
                  showItemImages={showItemImages}
                  invoice={invoice}
                  computedAmount={computedAmount}
                  groupName={groupName}
                  onUpdate={onUpdateItem}
                  onRemove={onRemoveItem}
                  onMoveUp={(i) => onMoveItem(i, -1)}
                  onMoveDown={(i) => onMoveItem(i, 1)}
                  onInsertBelow={onInsertItemAfter}
                  renderItemImage={renderItemImage}
                  renderUnitInput={renderUnitInput}
                />
              )
            })}
          </div>

          {items.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <p className="mb-3 text-sm text-muted-foreground">No items yet</p>
                <Button variant="default" size="sm" onClick={onAddItem} className="gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  Add Item
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Totals section */}
        <InvoiceTotalsSection
          subtotal={subtotal}
          installRateTotal={installRateTotal}
          vatAmount={vatAmount}
          discountAmount={discountAmount}
          grandTotal={grandTotal}
          whtAmount={whtAmount}
          totalPayable={totalPayable}
          extraCharges={extraCharges}
          chargeLabels={chargeLabels}
          invoice={invoice}
          discountType={discountType}
          whtType={whtType}
        />

        {/* Payment terms slot */}
        {paymentTermsSlot && <div>{paymentTermsSlot}</div>}

        {/* Custom fields slot */}
        {customFieldsSlot && <div>{customFieldsSlot}</div>}

        {/* Notes and terms slot */}
        {notesTermsSlot && <div>{notesTermsSlot}</div>}

        {/* Bottom fields slot */}
        {bottomFieldsSlot && <div>{bottomFieldsSlot}</div>}

        {/* Attachments slot */}
        {attachmentsSlot && (
          <Card className="border-border/60 bg-card shadow-sm">
            <CardContent className="p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Attachments
              </h3>
              {attachmentsSlot}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Sticky action footer */}
      <ActionFooter
        saving={saving}
        primaryLabel={primaryLabel}
        onSave={onSave}
        onCancel={onCancel}
        onOpenMoreActions={() => setMoreActionsOpen(true)}
      />

      {/* More actions sheet */}
      <MoreActionsSheet
        open={moreActionsOpen}
        onOpenChange={setMoreActionsOpen}
        onCancel={onCancel}
        onOpenColumnManager={onOpenColumnManager}
      />
    </div>
  )
}

export default InvoiceFormShell
