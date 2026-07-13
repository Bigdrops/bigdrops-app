import type { PdfDelivery, PdfDeliveryRequest } from './PdfDelivery'
import type { PdfDeliveryResult } from './types'

export class CompositePdfDelivery implements PdfDelivery {
  constructor(private web: PdfDelivery, private native: PdfDelivery) {}

  async deliver(request: PdfDeliveryRequest): Promise<PdfDeliveryResult> {
    const { isNativePlatform } = await import('@/lib/native/capacitor')
    const delivery = isNativePlatform() ? this.native : this.web
    return delivery.deliver(request)
  }
}
