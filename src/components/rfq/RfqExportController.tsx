import React from 'react'

import { TableDocumentExportController } from '@/components/table-document/TableDocumentExportController'
import type { TableDocumentColumn, TableDocumentRow } from '@/domain/table-document/types'
import type { Rfq } from '@/domain/rfq/types'

interface RfqExportControllerProps {
  rfq: Rfq | null
  rows: TableDocumentRow[]
  columns: TableDocumentColumn[]
  onDone: (images: string[]) => void
  onCancel: () => void
}

export const RfqExportController: React.FC<RfqExportControllerProps> = ({ rfq, rows, columns, onDone, onCancel }) => {
  return (
    <TableDocumentExportController
      documentType="rfq"
      templateId={rfq?.template_id || 'modern'}
      document={rfq}
      rows={rows}
      columns={columns}
      onDone={onDone}
      onCancel={onCancel}
    />
  )
}
