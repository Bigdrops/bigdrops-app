import React, { useMemo } from 'react'
import { FileText, Layout, List } from 'lucide-react'

import type { Boq } from '@/domain/boq/types'
import { computeBoqTotals } from '@/domain/boq/calculateBoqTotals'
import { numberToWords } from '@/lib/formatters/money'
import { BoqCustomizationPanel } from './BoqCustomizationPanel'
import { TableRowsEditor } from '@/components/table-document/TableRowsEditor'
import { Input } from '@/components/ui/input'
import { DateField } from '@/components/ui/date-field'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { pageFormLabelClassName } from '@/components/ui/form-page-styles'

export function BoqForm({
  boq,
  onChange,
}: {
  boq: Boq
  onChange: (patch: Partial<Boq>) => void
}) {
  const totals = useMemo(() => computeBoqTotals(boq.table_rows || []), [boq.table_rows])
  const totalCost = totals.total_cost
  const totalSellingPrice = totals.total_selling_price
  const grossProfit = totals.gross_profit
  const fmt = (n: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(n)

  return (
    <Tabs defaultValue="details" className="w-full">
      <TabsList className="grid grid-cols-3 mb-6 bg-muted/30">
        <TabsTrigger value="details"><FileText className="h-4 w-4 mr-2" /><span className="hidden sm:inline">Details</span></TabsTrigger>
        <TabsTrigger value="items"><List className="h-4 w-4 mr-2" /><span className="hidden sm:inline">Rows</span></TabsTrigger>
        <TabsTrigger value="output"><Layout className="h-4 w-4 mr-2" /><span className="hidden sm:inline">Output</span></TabsTrigger>
      </TabsList>

      <TabsContent value="details" className="space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className={pageFormLabelClassName}>BOQ Title</Label>
              <Input value={boq.title} onChange={(event) => onChange({ title: event.target.value })} className="mt-1 font-bold h-12 text-lg" />
            </div>
            <div>
              <Label className={pageFormLabelClassName}>BOQ Number</Label>
              <Input value={boq.boq_number} onChange={(event) => onChange({ boq_number: event.target.value })} className="mt-1 font-mono uppercase" />
            </div>
            <div>
              <Label className={pageFormLabelClassName}>Issue Date</Label>
              <DateField label="Issue Date" value={boq.issue_date} onChange={(next) => onChange({ issue_date: next })} className="mt-1" />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border">
            <div>
              <Label className={pageFormLabelClassName}>Project / Vendor</Label>
              <Input value={boq.vendor_name} onChange={(event) => onChange({ vendor_name: event.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className={pageFormLabelClassName}>Contact / Reference</Label>
              <Input value={boq.vendor_contact} onChange={(event) => onChange({ vendor_contact: event.target.value })} className="mt-1" />
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <Label className={pageFormLabelClassName}>Notes</Label>
            <Textarea value={boq.notes} onChange={(event) => onChange({ notes: event.target.value })} className="mt-1 min-h-[100px]" />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="items" className="space-y-4">
        <TableRowsEditor rows={boq.table_rows} columns={boq.table_columns} onChange={(table_rows) => onChange({ table_rows })} addItemLabel="Add BOQ Item" />
      </TabsContent>

      <TabsContent value="output" className="space-y-6">
        <BoqCustomizationPanel boq={boq} onChange={onChange} />

        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
          <div className="text-xs font-bold uppercase tracking-widest opacity-40 mb-3">Totals</div>
          <div className="flex justify-between text-sm"><span className="opacity-70">Total Cost</span><span className="font-mono font-bold">{fmt(totalCost)}</span></div>
          <div className="flex justify-between text-sm"><span className="opacity-70">Total Selling Price</span><span className="font-mono font-bold">{fmt(totalSellingPrice)}</span></div>
          <div className="flex justify-between text-sm pt-2 border-t border-border"><span className="font-bold">Gross Profit</span><span className="font-mono font-black text-green-600">{fmt(grossProfit)}</span></div>
          <div className="text-[11px] font-medium italic leading-relaxed text-muted-foreground pt-2">{numberToWords(totalSellingPrice)}</div>
        </div>
      </TabsContent>
    </Tabs>
  )
}
