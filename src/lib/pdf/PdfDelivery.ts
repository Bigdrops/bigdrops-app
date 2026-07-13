import type { PdfAsset } from './PdfAsset'
import type { PdfDeliveryMode, PdfDeliveryResult } from './types'

export type PdfDeliveryRequest = {
  asset: PdfAsset
  mode: PdfDeliveryMode
}

export interface PdfDelivery {
  deliver(request: PdfDeliveryRequest): Promise<PdfDeliveryResult>
}
