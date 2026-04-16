import { Document } from '@react-pdf/renderer'
import type { ComponentType } from 'react'
import type { PdfDocumentModel, PdfPageLayout } from '../types'

export type PdfTemplateRendererProps = {
  data: PdfDocumentModel
  layout: PdfPageLayout
}

export type PdfTemplateRenderer = ComponentType<PdfTemplateRendererProps>

type PdfRendererProps = {
  data: PdfDocumentModel
  layout: PdfPageLayout
  Template: PdfTemplateRenderer
}

export function PdfRenderer({ data, layout, Template }: PdfRendererProps) {
  return (
    <Document>
      <Template data={data} layout={layout} />
    </Document>
  )
}
