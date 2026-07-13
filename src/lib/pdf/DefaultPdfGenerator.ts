import type { ReactElement } from 'react'
import type { PdfAsset } from './PdfAsset'
import type { PdfGenerationOptions, PdfGenerationRequest } from './PdfGenerator'
import type { PdfGenerator } from './PdfGenerator'

type ElementFactory = (model: unknown, template: string, options?: PdfGenerationOptions) => ReactElement

export class DefaultPdfGenerator implements PdfGenerator {
  constructor(private renderElement: ElementFactory) {}

  async generate<T>(request: PdfGenerationRequest<T>): Promise<PdfAsset> {
    const element = this.renderElement(request.model, request.template, request.options)
    const { pdf } = await import('@react-pdf/renderer')
    const blob = await pdf(element).toBlob()
    return {
      blob, filename: request.filename, mimeType: 'application/pdf',
      sizeBytes: blob.size, documentType: request.documentType, metadata: {},
    }
  }
}
