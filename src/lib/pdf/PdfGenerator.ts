import type { PdfAsset } from './PdfAsset'
import type { PdfDocumentType } from './types'

export type PdfGenerationOptions = {
  compact?: boolean
  signature?: boolean
  copies?: number
}

export type PdfGenerationRequest<T = unknown> = {
  template: string
  model: T
  filename: string
  documentType: PdfDocumentType
  options?: PdfGenerationOptions
}

export interface PdfGenerator {
  generate<T>(request: PdfGenerationRequest<T>): Promise<PdfAsset>
}
