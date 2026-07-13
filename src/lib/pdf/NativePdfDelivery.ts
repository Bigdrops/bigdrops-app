import type { PdfDelivery, PdfDeliveryRequest } from './PdfDelivery'
import type { PdfDeliveryResult } from './types'

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result
      if (typeof result !== 'string') { reject(new Error('Failed to convert blob to base64')); return }
      const idx = result.indexOf(',')
      resolve(idx >= 0 ? result.slice(idx + 1) : result)
    }
    reader.onerror = () => reject(reader.error ?? new Error('Failed reading blob'))
    reader.readAsDataURL(blob)
  })
}

export class NativePdfDelivery implements PdfDelivery {
  async deliver({ asset, mode }: PdfDeliveryRequest): Promise<PdfDeliveryResult> {
    try {
      const { Directory, Filesystem } = await import('@capacitor/filesystem')
      const data = await toBase64(asset.blob)
      const path = `exports/${asset.filename}`
      await Filesystem.mkdir({ path: 'exports', directory: Directory.Cache, recursive: true }).catch(() => {})
      await Filesystem.writeFile({ path, directory: Directory.Cache, data, recursive: true })
      const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache })
      return { success: true, uri, path, platform: 'android', method: mode }
    } catch (err) {
      return { success: false, method: mode, error: String(err) }
    }
  }
}
