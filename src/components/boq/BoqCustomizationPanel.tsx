import React from 'react'

import { DocumentTemplatePicker } from '@/components/document/DocumentViewShell'
import { TableColumnControls } from '@/components/table-document/TableColumnControls'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { pageFormLabelClassName } from '@/components/ui/form-page-styles'
import { SHARED_TABLE_TEMPLATES } from '@/domain/table-document/templateRegistry'
import type { Boq } from '@/domain/boq/types'

export function BoqCustomizationPanel({
  boq,
  onChange,
}: {
  boq: Boq
  onChange: (patch: Partial<Boq>) => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <Label className={pageFormLabelClassName}>Template</Label>
        <div className="mt-2">
          <DocumentTemplatePicker value={boq.template_id} onChange={(template_id) => onChange({ template_id: template_id as any })} templates={SHARED_TABLE_TEMPLATES} />
        </div>
      </div>

      <div>
        <Label className={pageFormLabelClassName}>Columns</Label>
        <div className="mt-2">
          <TableColumnControls columns={boq.table_columns} onChange={(table_columns) => onChange({ table_columns })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className={pageFormLabelClassName}>Border</Label>
          <Input value={boq.border_color} onChange={(event) => onChange({ border_color: event.target.value })} className="mt-1 font-mono" />
        </div>
        <div>
          <Label className={pageFormLabelClassName}>Accent</Label>
          <Input value={boq.accent_color} onChange={(event) => onChange({ accent_color: event.target.value })} className="mt-1 font-mono" />
        </div>
      </div>
    </div>
  )
}
