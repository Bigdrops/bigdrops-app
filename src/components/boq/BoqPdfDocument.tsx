import React from 'react'

import { TableDocumentPdfDocument } from '@/components/table-document/TableDocumentPdfDocument'
import type { Boq } from '@/domain/boq/types'

export function BoqPdfDocument({ boq }: { boq: Boq }) {
  return (
    <TableDocumentPdfDocument
      documentType="boq"
      templateId={boq.template_id}
      document={boq}
      rows={boq.table_rows}
      columns={boq.table_columns}
    />
  )
}
