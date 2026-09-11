import { isNativePlatform } from './capacitor'

// ---------------------------------------------------------------------------
// Canonical user-file persistence.
//
// This module is the single native persistence path for user-requested
// downloads. On native Android it writes to the public Documents folder
// (Directory.Documents -> shared Documents, visible in the Files app).
// App-private cache must never be presented as a completed Download.
// ---------------------------------------------------------------------------

export const USER_DOWNLOAD_ROOT = 'BigDrops'

export const USER_DOWNLOAD_LOCATION_LABEL = 'Documents'

export type SavedUserFile = {
  fileName: string
  /** Path relative to the user-visible root (e.g. BigDrops/waybill/WB-001.pdf). */
  path: string
  /** Usable URI for Open/Share actions. */
  uri: string
  sizeBytes: number
}

/** User-facing location name for success feedback. */
export function userDownloadLocationLabel(): string {
  return isNativePlatform() ? USER_DOWNLOAD_LOCATION_LABEL : 'Downloads'
}

function base64FromBytes(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as number[])
  }
  return btoa(binary)
}

export function textToBase64(text: string): string {
  return base64FromBytes(new TextEncoder().encode(text))
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onloadend = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('Could not convert file blob to base64.'))
        return
      }

      const commaIndex = result.indexOf(',')
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result)
    }

    reader.onerror = () => {
      reject(reader.error || new Error('Failed reading file blob.'))
    }

    reader.readAsDataURL(blob)
  })
}

function triggerBrowserDownload(blob: Blob, fileName: string): SavedUserFile {
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

export type SaveUserFileOptions = {
  fileName: string
  /** Raw base64 payload (no data-URL prefix), as Filesystem.writeFile expects. */
  base64Data: string
  /** Grouping folder inside BigDrops (e.g. 'waybill'). Preserves existing groupings. */
  subdirectory?: string
}

/**
 * Persist a file to user-visible Android storage (Documents/BigDrops).
 * Returns the URI so callers can Open/Share the persisted file.
 * Throws on write failure — callers must report failure, never false success.
 */
export async function saveUserFile({
  fileName,
  base64Data,
  subdirectory,
}: SaveUserFileOptions): Promise<SavedUserFile> {
  const { Directory, Filesystem } = await import('@capacitor/filesystem')

  const folder = subdirectory ? `${USER_DOWNLOAD_ROOT}/${subdirectory}` : USER_DOWNLOAD_ROOT
  const relativePath = `${folder}/${fileName}`

  await Filesystem.mkdir({
    path: folder,
    directory: Directory.Documents,
    recursive: true,
  }).catch(() => {
    // folder may already exist
  })

  await Filesystem.writeFile({
    path: relativePath,
    directory: Directory.Documents,
    data: base64Data,
    recursive: true,
  })

  const uriResult = await Filesystem.getUri({
    path: relativePath,
    directory: Directory.Documents,
  })

  return {
    fileName,
    path: relativePath,
    uri: uriResult.uri,
    sizeBytes: Math.floor(base64Data.length * 0.75),
  }
}

export type DownloadTextFileOptions = {
  fileName: string
  text: string
  subdirectory?: string
}

/** Native branch persists to Documents; web keeps the browser download. */
export async function downloadTextFile({
  fileName,
  text,
  subdirectory,
}: DownloadTextFileOptions): Promise<SavedUserFile> {
  if (!isNativePlatform()) {
    return triggerBrowserDownload(new Blob([text], { type: 'text/plain;charset=utf-8' }), fileName)
  }

  return saveUserFile({ fileName, base64Data: textToBase64(text), subdirectory })
}

export type DownloadBlobFileOptions = {
  fileName: string
  blob: Blob
  subdirectory?: string
}

/** Native branch persists to Documents; web keeps the browser download. */
export async function downloadBlobFile({
  fileName,
  blob,
  subdirectory,
}: DownloadBlobFileOptions): Promise<SavedUserFile> {
  if (!isNativePlatform()) {
    return triggerBrowserDownload(blob, fileName)
  }

  return saveUserFile({ fileName, base64Data: await blobToBase64(blob), subdirectory })
}
