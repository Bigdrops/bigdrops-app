import type { ComponentType } from 'react'
import type { PdfDocumentModel } from '../types'

export type PdfTemplateRendererProps = {
  data: PdfDocumentModel
}

export type PdfTemplateRenderer = ComponentType<PdfTemplateRendererProps>

type PdfRendererProps = {
  data: PdfDocumentModel
  Template: PdfTemplateRenderer
}

export function PdfRenderer({ data, Template }: PdfRendererProps) {
  return <Template data={data} />
}
