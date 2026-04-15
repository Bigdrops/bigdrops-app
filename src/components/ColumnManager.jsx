import { useMemo, useState } from 'react'
import {
  ChevronDown,
  Eye,
  EyeOff,
  GripVertical,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const COLUMN_TYPES = ['text', 'number', 'date']

function SectionTitle({ children, action }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
        {children}
      </div>
      {action}
    </div>
  )
}

function BuiltInColumnRow({
  column,
  onToggleVisible,
  onLabelChange,
  onFormulaChange,
  onMoveUp,
  onMoveDown,
  disableMoveUp,
  disableMoveDown,
}) {
  const typeLabel =
    {
      install_rate: 'Rate',
      vat_rate: 'VAT%',
      discount_rate: 'Disc%',
    }[column.type] || column.type

  return (
    <div
      className={cn(
        'rounded-[18px] border bg-white px-3 py-3 transition',
        column.visible
          ? 'border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.04)]'
          : 'border-slate-200 bg-slate-50/70 opacity-70',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex shrink-0 flex-col gap-1 pt-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={disableMoveUp}
            className="flex h-7 w-7 items-center justify-center rounded-[9px] border border-slate-200 bg-slate-50 text-slate-400 disabled:opacity-30"
            aria-label={`Move ${column.label} up`}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToggleVisible}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-[9px] border transition',
              column.visible
                ? 'border-slate-200 bg-slate-50 text-slate-700'
                : 'border-slate-300 bg-slate-100 text-slate-500',
            )}
            aria-label={column.visible ? `Hide ${column.label}` : `Show ${column.label}`}
          >
            {column.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <Input
            value={column.label || ''}
            onChange={(e) => onLabelChange(e.target.value)}
            placeholder="Column label"
            className="h-11 rounded-[14px] border-slate-200 bg-slate-50 px-4 text-[15px] font-medium text-slate-900"
          />

          {column.key === 'install_rate' ? (
            <div className="mt-2 flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                value={column.formula || ''}
                onChange={(e) => onFormulaChange?.(e.target.value)}
                placeholder="Multiplier"
                className="h-10 rounded-[12px] border-slate-200 bg-slate-50 text-sm"
              />
              <span className="shrink-0 text-xs text-slate-500">× (Qty × Rate)</span>
            </div>
          ) : null}

          <div className="mt-2 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[12px] font-medium text-slate-500">
            {typeLabel}
          </div>

          {column.key === 'vat_rate' || column.key === 'discount_rate' ? (
            <div className="mt-2 text-[12px] leading-5 text-slate-500">
              Leave blank to use the global value. Set 0 on a row to exclude it.
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-1 pt-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={disableMoveUp}
            className="flex h-7 w-7 items-center justify-center rounded-[9px] border border-slate-200 bg-slate-50 text-slate-500 disabled:opacity-30"
            aria-label={`Move ${column.label} up`}
          >
            <ChevronDown className="h-4 w-4 rotate-180" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={disableMoveDown}
            className="flex h-7 w-7 items-center justify-center rounded-[9px] border border-slate-200 bg-slate-50 text-slate-500 disabled:opacity-30"
            aria-label={`Move ${column.label} down`}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function CustomColumnCard({
  column,
  onToggleVisible,
  onLabelChange,
  onTypeChange,
  onToggleInclude,
  onDelete,
}) {
  return (
    <div
      className={cn(
        'rounded-[20px] border bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition',
        column.visible ? 'border-slate-200' : 'border-slate-200 bg-slate-50/70 opacity-70',
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onToggleVisible}
          className={cn(
            'mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border transition',
            column.visible
              ? 'border-slate-200 bg-slate-50 text-slate-700'
              : 'border-slate-300 bg-slate-100 text-slate-500',
          )}
          aria-label={column.visible ? `Hide ${column.label}` : `Show ${column.label}`}
        >
          {column.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>

        <div className="min-w-0 flex-1">
          <Input
            value={column.label || ''}
            onChange={(e) => onLabelChange(e.target.value)}
            placeholder="Column label"
            className="h-11 rounded-[14px] border-slate-200 bg-slate-50 px-4 text-[15px] font-medium text-slate-900"
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
              {COLUMN_TYPES.map((type) => {
                const active = column.type === type
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => onTypeChange(type)}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-[12px] font-medium transition',
                      active
                        ? 'bg-white text-slate-900 shadow-[0_1px_4px_rgba(15,23,42,0.05)]'
                        : 'text-slate-500',
                    )}
                  >
                    {type}
                  </button>
                )
              })}
            </div>

            {column.type === 'number' ? (
              <label className="ml-auto flex items-center gap-2 text-[13px] text-slate-700">
                <input
                  type="checkbox"
                  checked={!!column.includeInTotal}
                  onChange={(e) => onToggleInclude(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Add to total
              </label>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={onDelete}
          className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100"
          aria-label={`Delete ${column.label}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function OverrideRow({ label, count, onReset }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[14px] border border-slate-200 bg-white px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="text-[14px] font-medium text-slate-800">{label}</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[12px] font-semibold text-slate-500">
          {count}
        </span>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={onReset}
        disabled={count === 0}
        className="h-8 rounded-full border-slate-200 px-3 text-xs font-semibold text-slate-700 disabled:opacity-40"
      >
        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
        Reset
      </Button>
    </div>
  )
}

function ResetConfirmDialog({ open, onCancel, onConfirm }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 px-4 backdrop-blur-[2px]">
      <div className="w-full max-w-[360px] rounded-[28px] bg-white p-6 shadow-[0_20px_40px_rgba(0,0,0,0.2)]">
        <div className="mb-2 text-[20px] font-bold text-slate-900">Reset table?</div>
        <div className="mb-6 text-[14px] leading-6 text-slate-600">
          Restore default columns and layout. Items remain unchanged.
        </div>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-12 flex-1 rounded-[16px] border-0 bg-slate-100 text-slate-800"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className="h-12 flex-1 rounded-[16px] bg-red-600 text-white hover:bg-red-700"
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function ColumnManager({
  open,
  onOpenChange,
  columns = [],
  customColumns = [],
  items = [],
  onToggleColumnVisibility,
  onUpdateColumnLabel,
  onUpdateInstallFormula,
  onMoveColumnUp,
  onMoveColumnDown,
  onAddCustomColumn,
  onUpdateCustomColumnLabel,
  onUpdateCustomColumnType,
  onToggleCustomColumnInclude,
  onDeleteCustomColumn,
  onResetOverride,
  onResetAllOverrides,
  onResetTable,
  onDone,
}) {
  const [showResetDialog, setShowResetDialog] = useState(false)

  const builtinColumns = useMemo(
    () => columns.filter((col) => !String(col.key).startsWith('custom_')),
    [columns],
  )

  const overrideCounts = useMemo(() => {
    const standardRows = items.filter((item) => item?.row_type === 'standard' || !item?.row_type)
    return {
      vat: standardRows.filter((item) => item?.vat_rate != null).length,
      discount: standardRows.filter((item) => item?.discount_rate != null).length,
      install: standardRows.filter((item) => item?.install_rate_override === true).length,
    }
  }, [items])

  const totalOverrideCount =
    overrideCounts.vat + overrideCounts.discount + overrideCounts.install

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="max-h-[90dvh] rounded-t-[32px] border-none bg-white p-0 sm:mx-auto sm:max-w-[600px] [&>[data-slot=sheet-close]]:hidden"
        >
          <div className="mx-auto mt-3 h-[5px] w-12 rounded-full bg-slate-300" />

          <div className="flex max-h-[90dvh] flex-col overflow-hidden">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 pb-4 pt-3">
              <div>
                <h2 className="text-[22px] font-bold tracking-[-0.02em] text-slate-900">
                  Table Settings
                </h2>
                <p className="mt-0.5 text-[14px] text-slate-500">
                  Manage columns and row overrides
                </p>
              </div>

              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-600"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-4 pt-5">
              <SectionTitle>Columns</SectionTitle>
              <div className="space-y-3">
                {builtinColumns.map((column, index) => (
                  <BuiltInColumnRow
                    key={column.key}
                    column={column}
                    onToggleVisible={() => onToggleColumnVisibility?.(column.key)}
                    onLabelChange={(value) => onUpdateColumnLabel?.(column.key, value)}
                    onFormulaChange={(value) => onUpdateInstallFormula?.(column.key, value)}
                    onMoveUp={() => onMoveColumnUp?.(column.key)}
                    onMoveDown={() => onMoveColumnDown?.(column.key)}
                    disableMoveUp={index === 0}
                    disableMoveDown={index === builtinColumns.length - 1}
                  />
                ))}
              </div>

              <div className="mt-7">
                <SectionTitle
                  action={
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onAddCustomColumn}
                      className="h-10 rounded-full border-dashed border-slate-400 px-4 text-sm font-semibold text-slate-800"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add column
                    </Button>
                  }
                >
                  Custom Columns
                </SectionTitle>

                {customColumns.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-slate-200 px-6 py-8 text-center text-sm text-slate-500">
                    No custom columns yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customColumns.map((column) => (
                      <CustomColumnCard
                        key={column.key}
                        column={column}
                        onToggleVisible={() => onToggleColumnVisibility?.(column.key)}
                        onLabelChange={(value) =>
                          onUpdateCustomColumnLabel?.(column.key, value)
                        }
                        onTypeChange={(value) =>
                          onUpdateCustomColumnType?.(column.key, value)
                        }
                        onToggleInclude={(checked) =>
                          onToggleCustomColumnInclude?.(column.key, checked)
                        }
                        onDelete={() => onDeleteCustomColumn?.(column.key)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-7 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-[16px] font-bold text-slate-900">Row Overrides</div>
                <div className="mt-1 text-[13px] text-slate-500">
                  Clear per-row VAT, discount, and install overrides
                </div>

                <div className="mt-4 space-y-2.5">
                  <OverrideRow
                    label="VAT"
                    count={overrideCounts.vat}
                    onReset={() => onResetOverride?.('vat')}
                  />
                  <OverrideRow
                    label="Discount"
                    count={overrideCounts.discount}
                    onReset={() => onResetOverride?.('discount')}
                  />
                  <OverrideRow
                    label="Install"
                    count={overrideCounts.install}
                    onReset={() => onResetOverride?.('install')}
                  />
                </div>

                <div className="mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onResetAllOverrides}
                    disabled={totalOverrideCount === 0}
                    className="h-10 rounded-full border-slate-200 bg-white px-4 text-sm font-semibold text-blue-600 disabled:opacity-40"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset all overrides
                  </Button>
                </div>

                <div className="mt-5 flex items-center justify-between gap-4 border-t border-slate-200 pt-4">
                  <div>
                    <div className="text-[15px] font-semibold text-slate-900">Table Reset</div>
                    <div className="text-[13px] text-slate-500">
                      Restore columns and layout
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowResetDialog(true)}
                    className="h-10 rounded-full border-slate-200 px-4 text-sm font-semibold text-red-700"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset
                  </Button>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 px-6 py-4">
              <Button
                type="button"
                onClick={() => {
                  onDone?.()
                  onOpenChange(false)
                }}
                className="h-[54px] w-full rounded-[18px] bg-slate-950 text-[18px] font-bold text-white hover:bg-slate-900"
              >
                Done
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ResetConfirmDialog
        open={showResetDialog}
        onCancel={() => setShowResetDialog(false)}
        onConfirm={() => {
          setShowResetDialog(false)
          onResetTable?.()
        }}
      />
    </>
  )
}