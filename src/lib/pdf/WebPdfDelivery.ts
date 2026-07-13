import type { PdfDelivery, PdfDeliveryRequest } from './PdfDelivery'
import type { PdfDeliveryResult } from './types'

export class WebPdfDelivery implements PdfDelivery {
  async deliver({ asset, mode }: PdfDeliveryRequest): Promise<PdfDeliveryResult> {
    try {
      const url = URL.createObjectURL(asset.blob)
      const a = document.createElement('a')
      a.href = url; a.download = asset.filename
      document.body.appendChild(a); a.click()
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url) }, 100)
      return { success: true, uri: url, path: asset.filename, platform: 'web', method: mode }
    } catch (err) {
      return { success: false, method: mode, error: String(err) }
    }
  }
}
