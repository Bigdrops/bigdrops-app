import React from 'react'
import { FileText, Layout, List } from 'lucide-react'

import type { Boq } from '@/domain/boq/types'
import { BoqCustomizationPanel } from './BoqCustomizationPanel'
import { TableRowsEditor } from '@/components/table-document/TableRowsEditor'
import { Input } from '@/components/ui/input'
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
              <Input type="date" value={boq.issue_date} onChange={(event) => onChange({ issue_date: event.target.value })} className="mt-1" />
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
      </TabsContent>
    </Tabs>
  )
}
