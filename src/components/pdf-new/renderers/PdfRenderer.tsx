import { Document } from '@react-pdf/renderer'
import type { ComponentType } from 'react'

export type PdfTemplateRendererProps = {
  data: unknown
  layout?: {
    size: 'A4'
    orientation: 'portrait' | 'landscape'
  }
}

export type PdfTemplateRenderer = ComponentType<PdfTemplateRendererProps>

type PdfRendererProps = {
  data: unknown
  Template: PdfTemplateRenderer
}

export function PdfRenderer({ data, Template }: PdfRendererProps) {
  const fallbackLayout: NonNullable<PdfTemplateRendererProps['layout']> = {
    size: 'A4',
    orientation: 'portrait',
  }
  const templateLayout =
    typeof data === 'object' &&
    data !== null &&
    'template' in data &&
    typeof data.template === 'object' &&
    data.template !== null &&
    'pageLayout' in data.template &&
    data.template.pageLayout &&
    typeof data.template.pageLayout === 'object'
      ? data.template.pageLayout
      : null
  const layout: NonNullable<PdfTemplateRendererProps['layout']> =
    templateLayout &&
    'size' in templateLayout &&
    templateLayout.size === 'A4' &&
    'orientation' in templateLayout &&
    (templateLayout.orientation === 'portrait' || templateLayout.orientation === 'landscape')
      ? {
          size: 'A4',
          orientation: templateLayout.orientation,
        }
      : fallbackLayout

  return (
    <Document>
      <Template data={data} layout={layout} />
    </Document>
  )
}
