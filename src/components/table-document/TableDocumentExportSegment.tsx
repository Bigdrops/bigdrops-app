import React from 'react'

import { TableDocumentPreview } from './TableDocumentPreview'
import type { TableDocumentColumn, TableDocumentRow, TableDocumentType, TableTemplateId } from '@/domain/table-document/types'

type DocumentLike = {
  title?: string
  notes?: string
  issue_date?: string
  rfq_number?: string
  boq_number?: string
  vendor_name?: string
  vendor_contact?: string
  show_vendor_identity?: boolean
  show_brand_name?: boolean
  brand_name_override?: string
  background_color?: string
  text_color?: string
  border_color?: string
  accent_color?: string
}

type Props = {
  documentType: TableDocumentType
  templateId: TableTemplateId
  document: DocumentLike
  rows: TableDocumentRow[]
  columns: TableDocumentColumn[]
  onRef?: (el: HTMLDivElement | null) => void
}

export function TableDocumentExportSegment({ onRef, ...props }: Props) {
  return (
    <div ref={onRef} className="w-[900px]">
      <TableDocumentPreview {...props} />
    </div>
  )
}
