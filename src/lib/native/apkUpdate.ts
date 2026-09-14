import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'

/**
 * Native bridge for the in-app APK update path.
 *
 * Download runs natively (HttpURLConnection) so large APKs never cross
 * the bridge as base64 and progress events are real byte counts. Files
 * land in the app-private cache dir (updates/) and are shared with the
 * system package installer through the existing FileProvider
 * (${applicationId}.fileprovider, cache path "updates/"). No storage
 * permissions are needed for app-private cache or MediaStore-style
 * scoped access.
 */
export interface ApkDownloadResult {
  /** Absolute content:// URI for the downloaded APK (FileProvider-scoped). */
  uri: string
  /** File name inside the app cache updates/ directory. */
  fileName: string
  /** Downloaded size in bytes. */
  sizeBytes: number
  /** True when a previous download for the same URL was reused. */
  reusedExisting: boolean
}

export interface ApkDownloadProgressEvent {
  url: string
  downloadedBytes: number
  totalBytes: number | null
}

export interface ApkInstallOptions {
  /** Absolute content:// URI from downloadApk(). */
  uri: string
}

export interface ApkUpdatePlugin {
  downloadApk(options: { url: string; expectedPrefix?: string }): Promise<ApkDownloadResult>
  installApk(options: ApkInstallOptions): Promise<void>
  cancelDownload(): Promise<void>
  deleteDownload(options: { fileName: string }): Promise<void>
  addListener(
    eventName: 'apkDownloadProgress',
    listenerFunc: (event: ApkDownloadProgressEvent) => void,
  ): Promise<PluginListenerHandle>
}

const ApkUpdate = registerPlugin<ApkUpdatePlugin>('ApkUpdate')

export function hasApkUpdatePlugin(): boolean {
  return Capacitor.isPluginAvailable('ApkUpdate')
}

/** Downloads the approved APK natively. Emits apkDownloadProgress events. */
export async function downloadApkNative(options: {
  url: string
  expectedPrefix?: string
}): Promise<ApkDownloadResult> {
  return ApkUpdate.downloadApk(options)
}

/**
 * Hands the APK to Android's package installer (PackageInstaller /
 * ACTION_VIEW-with-fileprovider fallback). The user sees the standard
 * install confirmation; the app never silently self-installs.
 */
export async function installApkNative(options: ApkInstallOptions): Promise<void> {
  return ApkUpdate.installApk(options)
}

export async function cancelDownloadNative(): Promise<void> {
  return ApkUpdate.cancelDownload()
}

/** Removes a no-longer-needed APK from the app cache updates/ directory. */
export async function deleteDownloadNative(options: { fileName: string }): Promise<void> {
  return ApkUpdate.deleteDownload(options)
}

export async function onApkDownloadProgress(
  listener: (event: ApkDownloadProgressEvent) => void,
): Promise<PluginListenerHandle | null> {
  if (!hasApkUpdatePlugin()) return null
  try {
    return await ApkUpdate.addListener('apkDownloadProgress', listener)
  } catch {
    return null
  }
}
