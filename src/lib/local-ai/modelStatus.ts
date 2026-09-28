import { BIGDROPS_LOCAL_AI_POC_MODEL, type LocalAIModelManifest } from './modelManifest'

export type LocalAIModelInstallState =
  | 'unsupported'
  | 'not_installed'
  | 'downloading'
  | 'verifying'
  | 'installed'
  | 'failed'

export type LocalAIModelStatus = {
  modelId: string
  state: LocalAIModelInstallState
  verified: boolean
  expectedBytes: number
  expectedSha256: string
  installedBytes?: number
  downloadedBytes?: number
  totalBytes?: number
  message?: string
}

export type LocalAIModelProgressEvent = {
  modelId: string
  state: Extract<LocalAIModelInstallState, 'downloading' | 'verifying' | 'installed' | 'failed'>
  downloadedBytes: number
  totalBytes: number
  message?: string
}

export function formatLocalAIModelBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '0 MB'
  const mib = bytes / (1024 * 1024)
  return `${mib.toFixed(mib >= 100 ? 0 : 1)} MB`
}

export function getLocalAIModelProgress(status: Pick<LocalAIModelStatus, 'downloadedBytes' | 'totalBytes' | 'expectedBytes'>): number {
  const total = status.totalBytes || status.expectedBytes
  if (!total || total <= 0) return 0
  const downloaded = Math.max(0, Math.min(status.downloadedBytes || 0, total))
  return Math.round((downloaded / total) * 100)
}

export function verifyLocalAIModelDigest(params: {
  manifest?: LocalAIModelManifest
  actualBytes: number
  actualSha256: string
}): { ok: true } | { ok: false; reason: string } {
  const manifest = params.manifest || BIGDROPS_LOCAL_AI_POC_MODEL
  if (params.actualBytes !== manifest.expectedBytes) {
    return { ok: false, reason: 'Model size does not match the pinned manifest.' }
  }
  if (params.actualSha256.toLowerCase() !== manifest.expectedSha256.toLowerCase()) {
    return { ok: false, reason: 'Model SHA-256 does not match the pinned manifest.' }
  }
  return { ok: true }
}

export function isLocalAIModelReady(status: Pick<LocalAIModelStatus, 'state' | 'verified'> | null | undefined): boolean {
  return status?.state === 'installed' && status.verified === true
}

export function localAIModelStatusLabel(status: Pick<LocalAIModelStatus, 'state' | 'verified'> | null | undefined): string {
  if (!status) return 'Not checked'
  if (status.state === 'installed' && status.verified) return 'Installed and verified'
  if (status.state === 'downloading') return 'Downloading'
  if (status.state === 'verifying') return 'Verifying'
  if (status.state === 'failed') return 'Needs attention'
  if (status.state === 'unsupported') return 'Unsupported on this device'
  return 'Not installed'
}

