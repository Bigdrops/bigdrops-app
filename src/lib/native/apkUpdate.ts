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

/** Emitted once when a native APK download reaches a verified terminal state. */
export interface ApkDownloadCompletedEvent {
  /** FileProvider content:// URI for the downloaded APK. */
  uri: string
  /** File name inside the app cache updates/ directory. */
  fileName: string
  /** Verified downloaded size in bytes. */
  sizeBytes: number
}

export interface ApkInstallOptions {
  /** Absolute content:// URI from downloadApk(). */
  uri: string
}

/**
 * Durable download record owned by the native plugin. It survives process
 * death, so the web layer can rehydrate a background transfer on mount.
 */
export interface ApkDownloadState {
  status: 'idle' | 'downloading' | 'downloaded' | 'failed'
  downloadedBytes: number
  /** 0 when DownloadManager has not reported a size yet. */
  totalBytes: number
  /** Target versionCode stored with the record; 0 when it was not supplied. */
  versionCode: number
  fileName?: string
  /** FileProvider content:// URI, present only when status is downloaded. */
  uri?: string
}

export interface ApkUpdatePlugin {
  downloadApk(options: {
    url: string
    expectedPrefix?: string
    versionCode: number
  }): Promise<ApkDownloadResult>
  installApk(options: ApkInstallOptions): Promise<void>
  cancelDownload(): Promise<void>
  deleteDownload(options: { fileName: string }): Promise<void>
  getDownloadState(): Promise<ApkDownloadState>
  logDiagnostic(options: { message: string }): Promise<void>
  addListener(
    eventName: 'apkDownloadProgress',
    listenerFunc: (event: ApkDownloadProgressEvent) => void,
  ): Promise<PluginListenerHandle>
  addListener(
    eventName: 'apkDownloadCompleted',
    listenerFunc: (event: ApkDownloadCompletedEvent) => void,
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
  versionCode: number
}): Promise<ApkDownloadResult> {
  return ApkUpdate.downloadApk(options)
}

/**
 * Reads the durable native download record. Returns null when the plugin is
 * unavailable or the bridge call fails, so callers can treat it as "no
 * recoverable download" without error handling.
 */
export async function getDownloadStateNative(): Promise<ApkDownloadState | null> {
  if (!hasApkUpdatePlugin()) return null
  try {
    return await ApkUpdate.getDownloadState()
  } catch {
    return null
  }
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

/**
 * Emits one sanitized diagnostic line to logcat via android.util.Log,
 * bypassing Capacitor's release logging gate. The message must already be
 * sanitized by the caller. Rejects when the native plugin is unavailable
 * so the caller can fall back to console output.
 */
export async function logUpdateDiagnosticNative(message: string): Promise<void> {
  if (!hasApkUpdatePlugin()) throw new Error('ApkUpdate plugin unavailable')
  await ApkUpdate.logDiagnostic({ message })
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

/**
 * Listens for the one-shot native completion event. Kept separate from the
 * downloadApk() promise so a missed/late promise resolution cannot leave the
 * UI stuck in "downloading" after the file is actually ready.
 */
export async function onApkDownloadCompleted(
  listener: (event: ApkDownloadCompletedEvent) => void,
): Promise<PluginListenerHandle | null> {
  if (!hasApkUpdatePlugin()) return null
  try {
    return await ApkUpdate.addListener('apkDownloadCompleted', listener)
  } catch {
    return null
  }
}
