import React from 'react'
import { ChevronDown, ChevronUp, Plus, Rows3, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NumericInput } from '@/components/ui/numeric-input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { pageFormLabelClassName } from '@/components/ui/form-page-styles'
import { createEmptyTableRow } from '@/domain/table-document/rows'
import type { TableDocumentColumn, TableDocumentRow } from '@/domain/table-document/types'

type Props = {
  rows: TableDocumentRow[]
  columns: TableDocumentColumn[]
  onChange: (rows: TableDocumentRow[]) => void
  addItemLabel?: string
}

function normalizeRows(rows: TableDocumentRow[]) {
  return rows.map((row, index) => ({ ...row, sort_order: index }))
}

export function TableRowsEditor({
  rows,
  columns,
  onChange,
  addItemLabel = 'Add Item',
}: Props) {
  const visibleColumns = columns.filter((column) => column.visible)

  const updateRow = (index: number, patch: Partial<TableDocumentRow>) => {
    const next = [...rows]
    next[index] = { ...next[index], ...patch }
    onChange(normalizeRows(next))
  }

  const removeRow = (index: number) => {
    onChange(normalizeRows(rows.filter((_, rowIndex) => rowIndex !== index)))
  }

  const moveRow = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= rows.length) return
    const next = [...rows]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    onChange(normalizeRows(next))
  }

  const addRow = (rowType: 'item' | 'section') => {
    onChange(normalizeRows([...rows, createEmptyTableRow(rows.length, rowType)]))
  }

  return (
    <div className="space-y-4">
      {rows.map((row, index) => (
        <Card key={row.id || row._uiKey || `row-${index}`} className="p-4 mb-4 relative bg-card border-border shadow-none">
          <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-2">
            <div className="flex items-center gap-2">
              <Rows3 className="h-4 w-4 text-muted-foreground/40" />
              <span className="text-xs font-bold text-muted-foreground/60 tabular-nums">
                {row.row_type === 'section' ? `SECTION ${index + 1}` : `ROW ${index + 1}`}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => moveRow(index, index - 1)} disabled={index === 0}>
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => moveRow(index, index + 1)} disabled={index === rows.length - 1}>
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeRow(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label className={pageFormLabelClassName}>Row Type</Label>
              <Select value={row.row_type} onValueChange={(value) => updateRow(index, { row_type: value as 'item' | 'section' })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="item">Item Row</SelectItem>
                  <SelectItem value="section">Section Row</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {row.row_type === 'section' ? (
              <div>
                <Label className={pageFormLabelClassName}>Section Title</Label>
                <Input value={row.section_title} onChange={(event) => updateRow(index, { section_title: event.target.value })} placeholder="e.g. Electrical Materials" className="mt-1" />
              </div>
            ) : (
              <>
                <div>
                  <Label className={pageFormLabelClassName}>Description</Label>
                  <Input value={row.description} onChange={(event) => updateRow(index, { description: event.target.value })} placeholder="What are you requesting?" className="mt-1" />
                </div>

                {visibleColumns.some((column) => column.key === 'specification') ? (
                  <div>
                    <Label className={pageFormLabelClassName}>Specification</Label>
                    <Textarea value={row.specification} onChange={(event) => updateRow(index, { specification: event.target.value })} placeholder="Technical details or material notes" className="mt-1 min-h-[80px]" />
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-4">
                  {visibleColumns.some((column) => column.key === 'quantity') ? (
                    <div>
                      <Label className={pageFormLabelClassName}>Quantity</Label>
                      <NumericInput value={row.quantity || 0} onChange={(val) => updateRow(index, { quantity: val })} className="mt-1" />
                    </div>
                  ) : null}
                  {visibleColumns.some((column) => column.key === 'unit') ? (
                    <div>
                      <Label className={pageFormLabelClassName}>Unit / UOM</Label>
                      <Input value={row.unit} onChange={(event) => updateRow(index, { unit: event.target.value })} placeholder="PCS, M, BAG" className="mt-1" />
                    </div>
                  ) : null}
                </div>

                {visibleColumns.some((column) => column.key === 'make_brand') ? (
                  <div>
                    <Label className={pageFormLabelClassName}>Make / Brand</Label>
                    <Input value={row.make_brand} onChange={(event) => updateRow(index, { make_brand: event.target.value })} placeholder="Optional make or brand" className="mt-1" />
                  </div>
                ) : null}

                {(visibleColumns.some((column) => column.key === 'cp') || visibleColumns.some((column) => column.key === 'sp')) ? (
                  <div className="grid grid-cols-2 gap-4">
                    {visibleColumns.some((column) => column.key === 'cp') ? (
                      <div>
                        <Label className={pageFormLabelClassName}>CP</Label>
                        <Input value={row.cp} onChange={(event) => updateRow(index, { cp: event.target.value })} placeholder="Cost price" className="mt-1" />
                      </div>
                    ) : null}
                    {visibleColumns.some((column) => column.key === 'sp') ? (
                      <div>
                        <Label className={pageFormLabelClassName}>SP</Label>
                        <Input value={row.sp} onChange={(event) => updateRow(index, { sp: event.target.value })} placeholder="Selling price" className="mt-1" />
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div>
                  <Label className={pageFormLabelClassName}>Notes</Label>
                  <Input value={row.notes} onChange={(event) => updateRow(index, { notes: event.target.value })} placeholder="Optional row note" className="mt-1" />
                </div>
              </>
            )}
          </div>
        </Card>
      ))}

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="w-full h-12 rounded-xl" onClick={() => addRow('item')}>
          <Plus className="mr-2 h-4 w-4" />
          {addItemLabel}
        </Button>
        <Button variant="outline" className="w-full h-12 rounded-xl" onClick={() => addRow('section')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Section
        </Button>
      </div>
    </div>
  )
}
