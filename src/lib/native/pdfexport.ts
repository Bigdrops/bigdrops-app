import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { FileOpener } from '@capacitor-community/file-opener'
import { isNativePlatform } from './capacitor'

export type ExportedPdfFile = {
  fileName: string
  path: string
  uri: string
  sizeBytes: number
}

type ExportPdfOptions = {
  fileName: string
  subdirectory?: string
  buildBlob: () => Promise<Blob>
}

function sanitizeFileName(fileName: string): string {
  const trimmed = (fileName || 'document.pdf').trim()
  const withPdf = trimmed.toLowerCase().endsWith('.pdf') ? trimmed : `${trimmed}.pdf`
  return withPdf.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
}

function toBase64FromBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onloadend = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('Could not convert PDF blob to base64.'))
        return
      }

      const commaIndex = result.indexOf(',')
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result)
    }

    reader.onerror = () => {
      reject(reader.error || new Error('Failed reading PDF blob.'))
    }

    reader.readAsDataURL(blob)
  })
}

async function downloadBlobOnWeb(blob: Blob, fileName: string): Promise<ExportedPdfFile> {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()

  window.setTimeout(() => {
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }, 100)

  return {
    fileName,
    path: fileName,
    uri: url,
    sizeBytes: blob.size,
  }
}

export async function exportPdfToDevice({
  fileName,
  subdirectory = 'exports',
  buildBlob,
}: ExportPdfOptions): Promise<ExportedPdfFile> {
  const safeFileName = sanitizeFileName(fileName)
  const blob = await buildBlob()

  if (!isNativePlatform()) {
    return downloadBlobOnWeb(blob, safeFileName)
  }

  const relativePath = `${subdirectory}/${safeFileName}`
  const data = await toBase64FromBlob(blob)

  await Filesystem.mkdir({
    path: subdirectory,
    directory: Directory.Cache,
    recursive: true,
  }).catch(() => {
    // folder may already exist
  })

  await Filesystem.writeFile({
    path: relativePath,
    directory: Directory.Cache,
    data,
    recursive: true,
  })

  const uriResult = await Filesystem.getUri({
    path: relativePath,
    directory: Directory.Cache,
  })

  return {
    fileName: safeFileName,
    path: relativePath,
    uri: uriResult.uri,
    sizeBytes: blob.size,
  }
}

export async function shareExportedPdf(file: ExportedPdfFile, title?: string): Promise<void> {
  const support = await Share.canShare()

  if (!support.value) {
    throw new Error('Sharing is not supported on this device.')
  }

  await Share.share({
    title: title || file.fileName,
    files: [file.uri],
    dialogTitle: 'Share PDF',
  })
}

export async function openExportedPdf(file: ExportedPdfFile): Promise<void> {
  await FileOpener.open({
    filePath: file.uri,
    contentType: 'application/pdf',
    openWithDefault: true,
  })
}

type ExportAndPresentOptions = ExportPdfOptions & {
  title?: string
  mode?: 'share' | 'open' | 'save'
}

export async function exportAndPresentPdf({
  title,
  mode = 'share',
  ...rest
}: ExportAndPresentOptions): Promise<ExportedPdfFile> {
  const file = await exportPdfToDevice(rest)

  if (!isNativePlatform()) {
    return file
  }

  if (mode === 'share') {
    await shareExportedPdf(file, title)
  } else if (mode === 'open') {
    await openExportedPdf(file)
  }

  return file
}