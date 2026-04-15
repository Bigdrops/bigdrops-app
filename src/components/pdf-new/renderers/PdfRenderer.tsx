import type { PdfDocumentModel } from '../types'
import { MinimalPdfTemplate } from '../templates/minimal'

type PdfRendererProps = {
  model: PdfDocumentModel
}

export function PdfRenderer({ model }: PdfRendererProps) {
  return <MinimalPdfTemplate model={model} />
}
