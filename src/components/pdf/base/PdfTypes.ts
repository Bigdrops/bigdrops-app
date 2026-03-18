import type { DocumentResult } from '@/lib/Calculations'

export interface PdfDocumentProps<TDocument, TItem, TClient, TSettings> {
  document: TDocument
  items: TItem[]
  client: TClient
  settings: TSettings
  result: DocumentResult
}
