import type { ReactElement } from 'react'

import { exportPdfToDevice, openExportedPdf, shareExportedPdf } from '@/lib/native/pdfexport'
import { isNativePlatform } from '@/lib/native/capacitor'
import { emitFeedback } from '@/lib/NativeFeedbackBus'

type DownloadPdfFromElementOptions = {
  element: ReactElement
  fileName: string
  subdirectory?: string
}

export async function downloadPdfFromElement({
  element,
  fileName,
  subdirectory = 'exports',
}: DownloadPdfFromElementOptions) {
  emitFeedback({ type: 'download:start', payload: { fileName } })

  try {
    const result = await exportPdfToDevice({
      fileName,
      subdirectory,
      buildBlob: async () => {
        const { pdf } = await import('@react-pdf/renderer')
        return pdf(element).toBlob()
      },
    })

    if (isNativePlatform()) {
      try {
        await openExportedPdf(result)
      } catch {
        try {
          await shareExportedPdf(result)
        } catch {
          // both open and share failed — file is still saved
        }
      }
    }

    emitFeedback({
      type: 'download:success',
      payload: { fileName: result.fileName, path: result.path },
    })

    return result
  } catch (err) {
    const message = err instanceof Error ? err.message : 'PDF download failed'
    emitFeedback({ type: 'download:fail', payload: { fileName, error: message } })
    throw err
  }
}
