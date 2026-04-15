import { Document, Page } from '@react-pdf/renderer'
import type { ComponentType } from 'react'
import type { PdfDocumentModel } from '../types'

export type PdfTemplateRendererProps = {
  model: PdfDocumentModel
}

export type PdfTemplateRenderer = ComponentType<PdfTemplateRendererProps>

type PdfRendererProps = {
  model: PdfDocumentModel
  template?: PdfTemplateRenderer | null
}

export function PdfRenderer({ model, template: Template }: PdfRendererProps) {
  return (
    <Document>
      <Page>
        {Template ? <Template model={model} /> : null}
      </Page>
    </Document>
  )
}
