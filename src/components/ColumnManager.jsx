import { useState } from 'react'
import {
  Settings2,
  Table2,
  Percent,
  Eye,
  EyeOff,
  GripVertical,
  Plus,
  RotateCcw,
  X,
  Trash2,
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs'
import { COLUMN_TYPES } from './useInvoiceColumns.jsx'

export default function ColumnManager({
  columns,
  onUpdate,
  onToggle,
  onAddCustom,
  onRemoveCustom,
  onReset,
  onMove,
  onClose,
  vat,
  setVat,
  wht,
  setWht,
  whtType,
  setWhtType,
}) {
  const [activeTab, setActiveTab] = useState('table')

  const builtinCols = columns.filter((c) => !c.key.startsWith('custom_'))
  const customCols = columns.filter((c) => c.key.startsWith('custom_'))

  const handleDragStart = (e, key) => e.dataTransfer.setData('text/plain', key)
  const handleDragOver = (e) => e.preventDefault()
  const handleDrop = (e, targetKey) => {
    e.preventDefault()
    const draggedKey = e.dataTransfer.getData('text/plain')
    if (!draggedKey || draggedKey === targetKey || !onMove) return
    const fromIdx = columns.findIndex((c) => c.key === draggedKey)
    const toIdx = columns.findIndex((c) => c.key === targetKey)
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return
    onMove(draggedKey, toIdx)
  }

  const typeLabel = (t) =>
    ({ install_rate: 'Rate', vat_rate: 'VAT%', discount_rate: 'Disc%' }[t] || t)

  const RowShell = ({ children, muted = false }) => (
    <div
      className={`flex items-start gap-3 border-b border-zinc-200 py-3 ${
        muted ? 'opacity-60' : ''
      }`}
      style={{ backgroundColor: '#ffffff' }}
    >
      {children}
    </div>
  )

  const VisibilityBtn = ({ visible, onClick }) => (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={onClick}
      className="h-9 w-9 rounded-xl border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
      title={visible ? 'Hide column' : 'Show column'}
    >
      {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
    </Button>
  )

  const LabelInput = ({ value, onChange, placeholder }) => (
    <Input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="h-9 border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400"
    />
  )

  const ColRow = ({ col, isCustom }) => (
    <RowShell muted={!col.visible}>
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, col.key)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, col.key)}
        className="flex h-9 w-8 items-center justify-center text-zinc-400 cursor-grab"
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <VisibilityBtn visible={col.visible} onClick={() => onToggle(col.key)} />

      <div className="min-w-0 flex-1 space-y-2">
        <LabelInput
          value={col.label || ''}
          onChange={(e) => onUpdate(col.key, 'label', e.target.value)}
          placeholder="Column name"
        />

        {col.key === 'install_rate' && (
          <div className="space-y-1">
            <div className="text-xs text-zinc-500">
              Multiplier. Example: <strong>0.1</strong> means 10% of Qty × Rate.
              Leave blank for manual row entry.
            </div>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={col.formula || ''}
              onChange={(e) => onUpdate(col.key, 'formula', e.target.value)}
              placeholder="e.g. 0.1"
              className="h-9 border-zinc-300 bg-white text-zinc-900"
            />
          </div>
        )}

        {(col.key === 'vat_rate' || col.key === 'discount_rate') && (
          <div className="text-xs text-zinc-500">
            Set <strong>0</strong> on a row to exclude it. Leave blank to use the global rate.
          </div>
        )}

        {isCustom && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900"
              value={col.type}
              onChange={(e) => onUpdate(col.key, 'type', e.target.value)}
            >
              {COLUMN_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            {col.type === 'number' && (
              <label className="flex items-center gap-2 text-sm text-zinc-600">
                <input
                  type="checkbox"
                  checked={!!col.includeInTotal}
                  onChange={(e) => onUpdate(col.key, 'includeInTotal', e.target.checked)}
                />
                Add to total
              </label>
            )}
          </div>
        )}
      </div>

      {!isCustom ? (
        <div className="pt-2">
          <div className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] text-zinc-500">
            {typeLabel(col.type || 'text')}
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemoveCustom(col.key)}
          className="h-9 w-9 rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </RowShell>
  )

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
    >
      <div className="absolute inset-0" onClick={onClose} />

      <Card
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border-zinc-200 shadow-2xl"
        style={{ backgroundColor: '#ffffff' }}
      >
        <div
          className="flex items-center justify-between border-b border-zinc-200 px-5 py-4"
          style={{ backgroundColor: '#ffffff' }}
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-900">
                Table & Tax Settings
              </h3>
              <div className="text-xs text-zinc-500">
                Manage columns, labels, row behavior, VAT and WHT
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-xl text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div
          className="flex-1 overflow-y-auto px-5 py-4"
          style={{ backgroundColor: '#ffffff' }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList
              className="mb-4 grid w-full grid-cols-2 rounded-xl border border-zinc-200 p-1"
              style={{ backgroundColor: '#f4f4f5' }}
            >
              <TabsTrigger
                value="table"
                className="gap-2 rounded-lg text-zinc-700 data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm"
              >
                <Table2 className="h-4 w-4" />
                Table
              </TabsTrigger>
              <TabsTrigger
                value="tax"
                className="gap-2 rounded-lg text-zinc-700 data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm"
              >
                <Percent className="h-4 w-4" />
                Tax
              </TabsTrigger>
            </TabsList>

            <TabsContent value="table" className="mt-0 space-y-5">
              <Card className="rounded-2xl border-zinc-200 bg-white shadow-none">
                <CardContent className="p-4">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Standard Columns
                  </div>
                  <div className="bg-white">
                    {builtinCols.map((col) => (
                      <ColRow key={col.key} col={col} isCustom={false} />
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-zinc-200 bg-white shadow-none">
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Custom Columns
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onAddCustom}
                      className="gap-2 rounded-xl border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100"
                    >
                      <Plus className="h-4 w-4" />
                      Add Custom Column
                    </Button>
                  </div>

                  {customCols.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500">
                      No custom columns yet.
                    </div>
                  ) : (
                    <div className="bg-white">
                      {customCols.map((col) => (
                        <ColRow key={col.key} col={col} isCustom={true} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tax" className="mt-0">
              <Card className="rounded-2xl border-zinc-200 bg-white shadow-none">
                <CardContent className="space-y-5 p-4">
                  <div className="space-y-2">
                    <Label htmlFor="global-vat" className="text-zinc-800">
                      VAT %
                    </Label>
                    <Input
                      id="global-vat"
                      type="number"
                      min="0"
                      value={vat ?? 0}
                      onChange={(e) => setVat(Number(e.target.value))}
                      className="border-zinc-300 bg-white text-zinc-900"
                    />
                    <div className="text-xs text-zinc-500">
                      Standard Nigerian VAT rate can be set here for the invoice.
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-zinc-800">WHT (Withholding Tax)</Label>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant={whtType === 'percent' ? 'default' : 'outline'}
                        onClick={() => setWhtType('percent')}
                        className={
                          whtType === 'percent'
                            ? 'rounded-xl bg-zinc-900 text-white hover:bg-black'
                            : 'rounded-xl border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100'
                        }
                      >
                        Percent %
                      </Button>
                      <Button
                        type="button"
                        variant={whtType === 'fixed' ? 'default' : 'outline'}
                        onClick={() => setWhtType('fixed')}
                        className={
                          whtType === 'fixed'
                            ? 'rounded-xl bg-zinc-900 text-white hover:bg-black'
                            : 'rounded-xl border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100'
                        }
                      >
                        Fixed ₦
                      </Button>
                    </div>

                    <Input
                      type="number"
                      min="0"
                      value={wht ?? 0}
                      onChange={(e) => setWht(Number(e.target.value))}
                      className="border-zinc-300 bg-white text-zinc-900"
                    />

                    <div className="text-xs text-zinc-500">
                      WHT is deducted from the payable amount, not added to the invoice total.
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
                    Row-level VAT and row-level discount controls still remain in the table when those columns are visible.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div
          className="flex gap-3 border-t border-zinc-200 px-5 py-4"
          style={{ backgroundColor: '#ffffff' }}
        >
          <Button
            type="button"
            variant="outline"
            onClick={onReset}
            className="flex-1 rounded-xl border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100 gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button
            type="button"
            onClick={onClose}
            className="flex-[1.4] rounded-xl bg-zinc-900 text-white hover:bg-black"
          >
            Done
          </Button>
        </div>
      </Card>
    </div>
  )
}