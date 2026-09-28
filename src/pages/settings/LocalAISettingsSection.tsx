import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Download, RefreshCw, Trash2, XCircle } from 'lucide-react'

import { SettingsSummaryCard, SettingsSummaryRow } from '@/components/settings/SettingsSummaryCard'
import { Button } from '@/components/ui/button'
import { BIGDROPS_LOCAL_AI_POC_MODEL } from '@/lib/local-ai/modelManifest'
import {
  formatLocalAIModelBytes,
  getLocalAIModelProgress,
  isLocalAIModelReady,
  localAIModelStatusLabel,
  type LocalAIModelProgressEvent,
  type LocalAIModelStatus,
} from '@/lib/local-ai/modelStatus'
import {
  addLocalAIModelDownloadListener,
  cancelLocalAIModelDownload,
  deleteLocalAIModel,
  downloadLocalAIModel,
  getLocalAIModelStatus,
  getLocalAIRuntimeInfo,
  verifyLocalAIModel,
  type LocalAIRuntimeInfo,
} from '@/lib/native/localAI'

export function LocalAISettingsSection() {
  const [runtimeInfo, setRuntimeInfo] = useState<LocalAIRuntimeInfo | null>(null)
  const [modelStatus, setModelStatus] = useState<LocalAIModelStatus | null>(null)
  const [busy, setBusy] = useState<'refresh' | 'download' | 'verify' | 'delete' | 'cancel' | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setBusy((current) => current || 'refresh')
    try {
      const [runtime, status] = await Promise.all([
        getLocalAIRuntimeInfo(),
        getLocalAIModelStatus(BIGDROPS_LOCAL_AI_POC_MODEL.modelId),
      ])
      setRuntimeInfo(runtime)
      setModelStatus(status)
      setMessage(status.message || runtime.message || null)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Local AI status could not be loaded.')
    } finally {
      setBusy((current) => (current === 'refresh' ? null : current))
    }
  }, [])

  useEffect(() => {
    void refresh()

    let removed = false
    let handle: { remove: () => Promise<void> } | null = null
    void addLocalAIModelDownloadListener((event: LocalAIModelProgressEvent) => {
      if (event.modelId !== BIGDROPS_LOCAL_AI_POC_MODEL.modelId) return
      setModelStatus((current) => ({
        modelId: event.modelId,
        state: event.state,
        verified: event.state === 'installed',
        expectedBytes: current?.expectedBytes ?? BIGDROPS_LOCAL_AI_POC_MODEL.expectedBytes,
        expectedSha256: current?.expectedSha256 ?? BIGDROPS_LOCAL_AI_POC_MODEL.expectedSha256,
        installedBytes: event.state === 'installed' ? event.totalBytes : current?.installedBytes,
        downloadedBytes: event.downloadedBytes,
        totalBytes: event.totalBytes,
        message: event.message,
      }))
      setMessage(event.message || null)
    }).then((listener) => {
      if (removed) {
        void listener?.remove()
        return
      }
      handle = listener
    })

    return () => {
      removed = true
      void handle?.remove()
    }
  }, [refresh])

  const runAction = async (action: typeof busy, task: () => Promise<LocalAIModelStatus | boolean | void>) => {
    setBusy(action)
    setMessage(null)
    try {
      const result = await task()
      if (result && typeof result === 'object' && 'state' in result) {
        setModelStatus(result)
        setMessage(result.message || null)
      } else {
        await refresh()
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Local AI model action failed.')
    } finally {
      setBusy(null)
    }
  }

  const ready = isLocalAIModelReady(modelStatus)
  const progress = modelStatus ? getLocalAIModelProgress(modelStatus) : 0
  const runtimeLinked = runtimeInfo?.runtimeLinked === true
  const disabled = busy !== null

  return (
    <div className="space-y-4">
      <SettingsSummaryCard
        title="Local AI Model"
        description="Install the app-private model used for read-only Cleanup Hub duplicate review."
      >
        <SettingsSummaryRow
          label="Runtime"
          value={
            runtimeInfo ? (
              runtimeLinked ? (
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5" /> llama.cpp linked
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="size-3.5" /> Native runtime unavailable
                </span>
              )
            ) : (
              'Checking...'
            )
          }
        />
        <SettingsSummaryRow label="Model" value={BIGDROPS_LOCAL_AI_POC_MODEL.displayName} />
        <SettingsSummaryRow label="Status" value={localAIModelStatusLabel(modelStatus)} />
        <SettingsSummaryRow
          label="Size"
          value={`${formatLocalAIModelBytes(modelStatus?.installedBytes || BIGDROPS_LOCAL_AI_POC_MODEL.expectedBytes)} expected`}
        />
        <SettingsSummaryRow label="Source" value={`${BIGDROPS_LOCAL_AI_POC_MODEL.sourceRepository}@${BIGDROPS_LOCAL_AI_POC_MODEL.sourceRevision.slice(0, 8)}`} />
      </SettingsSummaryCard>

      {modelStatus?.state === 'downloading' || modelStatus?.state === 'verifying' ? (
        <div className="rounded-lg border border-bd-border bg-bd-surface-muted p-4">
          <div className="flex items-center justify-between text-[12px] font-bold text-bd-text">
            <span>{modelStatus.state === 'verifying' ? 'Verifying checksum' : 'Downloading model'}</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-bd-surface">
            <div className="h-full rounded-full bg-bd-button-primary-bg transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-2 text-[11px] text-bd-text-muted">
            {formatLocalAIModelBytes(modelStatus.downloadedBytes)} of {formatLocalAIModelBytes(modelStatus.totalBytes || modelStatus.expectedBytes)}
          </div>
        </div>
      ) : null}

      {message ? (
        <div className="rounded-lg border border-bd-border bg-bd-surface-muted px-4 py-3 text-[12px] font-semibold text-bd-text-muted">
          {message}
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <Button type="button" variant="outline" onClick={() => void refresh()} disabled={disabled}>
          <RefreshCw className={['size-4', busy === 'refresh' ? 'animate-spin' : ''].join(' ')} data-icon="inline-start" />
          Refresh
        </Button>

        {ready ? (
          <Button type="button" variant="outline" onClick={() => void runAction('verify', () => verifyLocalAIModel())} disabled={disabled}>
            <CheckCircle2 className="size-4" data-icon="inline-start" />
            Verify installed model
          </Button>
        ) : (
          <Button type="button" onClick={() => void runAction('download', () => downloadLocalAIModel())} disabled={disabled || !runtimeLinked}>
            <Download className="size-4" data-icon="inline-start" />
            {busy === 'download' ? 'Downloading...' : 'Download and verify model'}
          </Button>
        )}

        {modelStatus?.state === 'downloading' ? (
          <Button type="button" variant="outline" onClick={() => void runAction('cancel', () => cancelLocalAIModelDownload())} disabled={busy === 'cancel'}>
            <XCircle className="size-4" data-icon="inline-start" />
            Cancel download
          </Button>
        ) : null}

        {modelStatus && modelStatus.state !== 'not_installed' && modelStatus.state !== 'unsupported' ? (
          <Button type="button" variant="outline" onClick={() => void runAction('delete', () => deleteLocalAIModel())} disabled={disabled}>
            <Trash2 className="size-4" data-icon="inline-start" />
            Delete local model
          </Button>
        ) : null}
      </div>

      <div className="rounded-lg border border-bd-border bg-bd-surface-muted p-4 text-[12px] leading-relaxed text-bd-text-muted">
        Local AI is read-only. It can suggest Same, Different, or Unsure for Cleanup Hub duplicate review. It cannot
        merge items, create aliases, change history, or apply Item Library decisions.
      </div>
    </div>
  )
}

