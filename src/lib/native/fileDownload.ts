import { isAndroidNative, isNativePlatform } from './capacitor'

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

function splitFileName(fileName: string): { baseName: string; extension: string } {
  const extensionIndex = fileName.lastIndexOf('.')

  if (extensionIndex <= 0) {
    return { baseName: fileName, extension: '' }
  }

  return {
    baseName: fileName.slice(0, extensionIndex),
    extension: fileName.slice(extensionIndex),
  }
}

async function findAvailableFileName(
  Filesystem: typeof import('@capacitor/filesystem').Filesystem,
  Directory: typeof import('@capacitor/filesystem').Directory,
  folder: string,
  fileName: string,
): Promise<string> {
  const existingEntries = await Filesystem.readdir({
    path: folder,
    directory: Directory.Documents,
  })
  const existingNames = new Set(existingEntries.files.map((entry) => entry.name))

  if (!existingNames.has(fileName)) {
    return fileName
  }

  const { baseName, extension } = splitFileName(fileName)
  let suffix = 1

  while (existingNames.has(`${baseName} (${suffix})${extension}`)) {
    suffix += 1
  }

  return `${baseName} (${suffix})${extension}`
}

/**
 * Persist a file to user-visible Android storage (Documents/BigDrops).
 * Returns the URI so callers can Open/Share the persisted file.
 * Throws on write failure — callers must report failure, never false success.
 *
 * Residual race: the collision check snapshots the folder, so two saves that
 * run at the same instant can pick the same name and the later write wins.
 * The Filesystem API offers no atomic exclusive-create flag, and this utility
 * keeps no global state by design — sequential saves never collide.
 */
export async function saveUserFile({
  fileName,
  base64Data,
  subdirectory,
}: SaveUserFileOptions): Promise<SavedUserFile> {
  const { Directory, Filesystem } = await import('@capacitor/filesystem')

  const folder = subdirectory ? `${USER_DOWNLOAD_ROOT}/${subdirectory}` : USER_DOWNLOAD_ROOT

  // ponytail: MediaStore bridge owns Android 10+ writes; raw Documents writes
  // are OS-blocked there. Older runtimes fall through to the Filesystem flow.
  if (isAndroidNative()) {
    const bridged = await saveViaDownloadBridge(folder, fileName, base64Data).catch(() => null)
    if (bridged) {
      await presentOpenWithChooser(bridged.uri, bridged.fileName)
      return bridged
    }
  }

  await Filesystem.mkdir({
    path: folder,
    directory: Directory.Documents,
    recursive: true,
  }).catch(() => {
    // folder may already exist
  })

  const availableFileName = await findAvailableFileName(Filesystem, Directory, folder, fileName)
  const persistedPath = `${folder}/${availableFileName}`

  await Filesystem.writeFile({
    path: persistedPath,
    directory: Directory.Documents,
    data: base64Data,
    recursive: true,
  })

  const uriResult = await Filesystem.getUri({
    path: persistedPath,
    directory: Directory.Documents,
  })

  const saved: SavedUserFile = {
    fileName: availableFileName,
    path: persistedPath,
    uri: uriResult.uri,
    sizeBytes: Math.floor(base64Data.length * 0.75),
  }

  // ponytail: "Open with" chooser after every native download; a missing
  // viewer must never flip a good download into a failure.
  if (isNativePlatform()) {
    await presentOpenWithChooser(saved.uri, saved.fileName)
  }

  return saved
}

const OPEN_WITH_CONTENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  csv: 'text/csv',
  json: 'application/json',
  txt: 'text/plain',
}

function contentTypeForFileName(fileName: string): string {
  const { extension } = splitFileName(fileName)
  const key = extension.replace(/^\./, '').toLowerCase()
  return OPEN_WITH_CONTENT_TYPES[key] ?? 'application/octet-stream'
}

/** Best-effort system "Open with" chooser. Never throws. */
async function presentOpenWithChooser(uri: string, fileName: string): Promise<void> {
  try {
    const { FileOpener } = await import('@capacitor-community/file-opener')
    await FileOpener.open({
      filePath: uri,
      contentType: contentTypeForFileName(fileName),
      openWithDefault: false,
    })
  } catch {
    // No viewer installed or opener unavailable — the file is still saved.
  }
}

type DownloadBridgeApi = {
  save(options: {
    folder: string
    fileName: string
    base64Data: string
    mimeType: string
  }): Promise<{ fileName: string; uri: string }>
}

/**
 * MediaStore write path for Android 10+. Returns null when the bridge is
 * unavailable (older native shell, e.g. via live update) so callers fall
 * back to the Filesystem flow. Never throws.
 */
async function saveViaDownloadBridge(
  folder: string,
  fileName: string,
  base64Data: string,
): Promise<SavedUserFile | null> {
  try {
    const { registerPlugin } = await import('@capacitor/core')
    const bridge = registerPlugin<DownloadBridgeApi>('DownloadBridge')
    const result = await bridge.save({
      folder,
      fileName,
      base64Data,
      mimeType: contentTypeForFileName(fileName),
    })
    return {
      fileName: result.fileName,
      path: `${folder}/${result.fileName}`,
      uri: result.uri,
      sizeBytes: Math.floor(base64Data.length * 0.75),
    }
  } catch {
    return null
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
