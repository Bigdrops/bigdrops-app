import type { ReactElement } from 'react'

import { pdf } from '@react-pdf/renderer'

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
    buildBlob: () => pdf(element).toBlob(),
  })
}
