import type { ReactElement } from 'react'

import { exportPdfToDevice } from '@/lib/native/pdfexport'

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
  return exportPdfToDevice({
    fileName,
    subdirectory,
    buildBlob: async () => {
      const { pdf } = await import('@react-pdf/renderer')
      return pdf(element).toBlob()
    },
  })
}
