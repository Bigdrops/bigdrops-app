import type { PdfDelivery, PdfDeliveryRequest } from './PdfDelivery'
import type { PdfDeliveryResult } from './types'
import { saveUserFile, blobToBase64 } from '@/lib/native/fileDownload'

export class NativePdfDelivery implements PdfDelivery {
  async deliver({ asset, mode }: PdfDeliveryRequest): Promise<PdfDeliveryResult> {
    try {
      const data = await blobToBase64(asset.blob)
      // Canonical persistence: user-visible Documents storage, never app cache.
      const saved = await saveUserFile({ fileName: asset.filename, base64Data: data, subdirectory: 'exports' })
      return { success: true, uri: saved.uri, path: saved.path, platform: 'android', method: mode }
    } catch (err) {
      return { success: false, method: mode, error: String(err) }
    }
  }
}
