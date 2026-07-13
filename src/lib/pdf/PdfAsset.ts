import type { PdfDocumentType } from './types'

export type PdfAssetMetadata = Record<string, unknown>

export type PdfAsset = {
  blob: Blob
  filename: string
  mimeType: string
  sizeBytes: number
  documentType: PdfDocumentType
  metadata: PdfAssetMetadata
}
