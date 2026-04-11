import React from 'react'

import { TableDocumentPreview } from '@/components/table-document/TableDocumentPreview'
import type { TableDocumentColumn, TableDocumentRow } from '@/domain/table-document/types'
import type { Rfq, RfqItem } from '@/domain/rfq/types'

interface RfqPreviewProps {
  rfq: Rfq
  items?: RfqItem[]
  rows?: TableDocumentRow[]
  columns?: TableDocumentColumn[]
}

function mapItemsToRows(items: RfqItem[] = []): TableDocumentRow[] {
  return items.map((item, index) => ({
    id: item.id,
    _uiKey: item._uiKey,
    row_type: 'item',
    sort_order: item.sort_order ?? index,
    section_title: '',
    description: item.description || '',
    specification: item.specification || '',
    quantity: Number(item.quantity || 0),
    unit: item.unit || '',
    notes: item.notes || '',
    make_brand: '',
    cp: '',
    sp: '',
  }))
}

export const RfqPreview: React.FC<RfqPreviewProps> = ({ rfq, items = [], rows, columns }) => {
  return (
    <TableDocumentPreview
      documentType="rfq"
      templateId={rfq.template_id || 'modern'}
      document={rfq}
      rows={rows || rfq.table_rows || mapItemsToRows(items)}
      columns={columns || rfq.table_columns || []}
    />
  )
}
