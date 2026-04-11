import React from 'react'

import { TableDocumentPreview } from '@/components/table-document/TableDocumentPreview'
import type { Boq } from '@/domain/boq/types'

export function BoqPreview({ boq }: { boq: Boq }) {
  return (
    <TableDocumentPreview
      documentType="boq"
      templateId={boq.template_id}
      document={boq}
      rows={boq.table_rows}
      columns={boq.table_columns}
    />
  )
}
