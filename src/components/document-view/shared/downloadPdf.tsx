import { exportPdfToDevice, openExportedPdf, shareExportedPdf } from '@/lib/native/pdfexport'
import { userDownloadLocationLabel } from '@/lib/native/fileDownload'
import { isNativePlatform } from '@/lib/native/capacitor'
import { emitFeedback } from '@/lib/NativeFeedbackBus'
import { uiSound } from '@/lib/uiSoundEvent'

type DownloadPdfFromElementOptions = {
  /** Engine-agnostic blob builder (e.g. a Forme document). */
  buildBlob: () => Promise<Blob>
  fileName: string
  subdirectory?: string
}

export async function downloadPdfFromElement({
  buildBlob,
  fileName,
  subdirectory = 'exports',
}: DownloadPdfFromElementOptions) {
  emitFeedback({ type: 'download:start', payload: { fileName } })

  try {
    const result = await exportPdfToDevice({
      fileName,
      subdirectory,
      buildBlob,
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
      payload: { fileName: result.fileName, path: result.path, location: userDownloadLocationLabel() },
    })
    uiSound('hero.complete')

    return result
  } catch (err) {
    const message = err instanceof Error ? err.message : 'PDF download failed'
    emitFeedback({ type: 'download:fail', payload: { fileName, error: message } })
    throw err
  }
}
