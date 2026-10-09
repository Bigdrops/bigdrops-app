import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Download, RefreshCw, Trash2, XCircle } from 'lucide-react'

import { SettingsSummaryCard } from '@/components/settings/SettingsSummaryCard'
import { Button } from '@/components/ui/button'
import { LOCAL_AI_MODEL_CATALOG } from '@/lib/local-ai/modelManifest'
import {
  formatLocalAIModelBytes,
  getLocalAIModelProgress,
  localAIModelStatusLabel,
  type LocalAIModelProgressEvent,
  type LocalAIModelStatus,
} from '@/lib/local-ai/modelStatus'
import {
  getSelectedLocalAIModelId,
  listLocalAIModelChoices,
  recommendLocalAIModel,
  setSelectedLocalAIModelId,
} from '@/lib/local-ai/modelSelection'
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
  const [modelStatuses, setModelStatuses] = useState<Record<string, LocalAIModelStatus | null>>({})
  const [selectedModelId, setSelectedModelId] = useState<string | null>(() => getSelectedLocalAIModelId())
  const [busyModelId, setBusyModelId] = useState<string | null>(null)
  const [busyAction, setBusyAction] = useState<'refresh' | 'download' | 'verify' | 'delete' | 'cancel' | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const recommendedModel = recommendLocalAIModel(runtimeInfo?.totalMemoryBytes)
  const choices = listLocalAIModelChoices(modelStatuses, selectedModelId, recommendedModel.modelId)
  const installedBytes = choices.reduce((total, choice) => total + (choice.status?.installedBytes || 0), 0)
  const busy = busyAction !== null

  const refreshStatuses = useCallback(async () => {
    const entries = await Promise.all(
      LOCAL_AI_MODEL_CATALOG.filter((manifest) => manifest.enabled).map(async (manifest) => {
        try {
          return [manifest.modelId, await getLocalAIModelStatus(manifest.modelId)] as const
        } catch {
          return [manifest.modelId, null] as const
        }
      }),
    )
    const next: Record<string, LocalAIModelStatus | null> = {}
    entries.forEach(([modelId, status]) => {
      next[modelId] = status
    })
    return next
  }, [])

  const refresh = useCallback(async () => {
    setBusyAction((current) => current || 'refresh')
    try {
      const [runtime, statuses] = await Promise.all([getLocalAIRuntimeInfo(), refreshStatuses()])
      setRuntimeInfo(runtime)
      setModelStatuses(statuses)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Local AI status could not be loaded.')
    } finally {
      setBusyAction((current) => (current === 'refresh' ? null : current))
    }
  }, [refreshStatuses])

  useEffect(() => {
    void refresh()

    let removed = false
    let handle: { remove: () => Promise<void> } | null = null
    void addLocalAIModelDownloadListener((event: LocalAIModelProgressEvent) => {
      setModelStatuses((current) => ({
        ...current,
        [event.modelId]: {
          modelId: event.modelId,
          state: event.state,
          verified: event.state === 'installed',
          expectedBytes: current[event.modelId]?.expectedBytes ?? 0,
          expectedSha256: current[event.modelId]?.expectedSha256 ?? '',
          installedBytes: event.state === 'installed' ? event.totalBytes : current[event.modelId]?.installedBytes,
          downloadedBytes: event.downloadedBytes,
          totalBytes: event.totalBytes,
          message: event.message,
        },
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

  const runModelAction = async (
    modelId: string,
    action: Exclude<typeof busyAction, null>,
    task: () => Promise<unknown>,
  ) => {
    setBusyModelId(modelId)
    setBusyAction(action)
    setMessage(null)
    try {
      await task()
      const statuses = await refreshStatuses()
      setModelStatuses(statuses)
      if (action === 'delete' && modelId === getSelectedLocalAIModelId()) {
        setSelectedLocalAIModelId(null)
        setSelectedModelId(null)
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Local AI model action failed.')
    } finally {
      setBusyModelId(null)
      setBusyAction(null)
    }
  }

  const handleSelectModel = (modelId: string) => {
    setSelectedModelId(modelId)
    setSelectedLocalAIModelId(modelId)
    setMessage(null)
  }

  const handleDeleteModel = (modelId: string, displayName: string, loaded: boolean) => {
    if (loaded) {
      setMessage(`Unload "${displayName}" before deleting it. Deletion during active use is not allowed.`)
      return
    }
    const confirmed =
      typeof window === 'undefined'
        ? false
        : window.confirm(`Delete "${displayName}" from this device? This removes the model file and its verification record.`)
    if (!confirmed) return
    void runModelAction(modelId, 'delete', () => deleteLocalAIModel(modelId))
  }

  const runtimeLinked = runtimeInfo?.runtimeLinked === true

  return (
    <div className="space-y-4">
      <SettingsSummaryCard
        title="Local AI Models"
        description="Install device-local review models. Analysis runs only on this device and never uploads Cleanup content."
      >
        <div className="flex items-center justify-between gap-3 text-[12px]">
          <span className="font-semibold text-bd-text-muted">Runtime</span>
          {runtimeInfo ? (
            runtimeLinked ? (
              <span className="flex items-center gap-1.5 text-bd-status-success-text">
                <CheckCircle2 className="size-3.5" /> llama.cpp linked
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-bd-status-warning-text">
                <AlertCircle className="size-3.5" /> Native runtime unavailable
              </span>
            )
          ) : (
            <span className="text-bd-text-muted">Checking...</span>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-[12px]">
          <span className="font-semibold text-bd-text-muted">Installed models use</span>
          <span className="font-bold text-bd-text">{formatLocalAIModelBytes(installedBytes)}</span>
        </div>
        <div className="mt-3 flex gap-2">
          <Button type="button" variant="outline" onClick={() => void refresh()} disabled={busy}>
            <RefreshCw className={['size-4', busyAction === 'refresh' ? 'animate-spin' : ''].join(' ')} data-icon="inline-start" />
            Refresh
          </Button>
        </div>
      </SettingsSummaryCard>

      {choices.map((choice) => {
        const status = choice.status
        const downloading = status?.state === 'downloading' || status?.state === 'verifying'
        const progress = status ? getLocalAIModelProgress(status) : 0
        const loaded = runtimeInfo?.loadedModelId === choice.manifest.modelId
        const busyThis = busyModelId === choice.manifest.modelId
        return (
          <div key={choice.manifest.modelId} className="rounded-lg border border-bd-border bg-bd-card-bg p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-extrabold text-bd-text">{choice.manifest.displayName}</span>
                  <span className="rounded-full border border-bd-border bg-bd-surface-muted px-2 py-0.5 text-[10px] font-bold capitalize text-bd-text-muted">
                    {choice.manifest.tier}
                  </span>
                  {choice.selected ? (
                    <span className="rounded-full bg-bd-button-primary-bg px-2 py-0.5 text-[10px] font-bold text-bd-button-primary-text">
                      Selected
                    </span>
                  ) : null}
                  {choice.recommended && !choice.selected ? (
                    <span className="rounded-full border border-bd-border bg-bd-surface-muted px-2 py-0.5 text-[10px] font-bold text-bd-text-muted">
                      Recommended
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-bd-text-muted">{choice.manifest.description}</p>
                <div className="mt-1 text-[11px] font-semibold text-bd-text-muted">
                  {formatLocalAIModelBytes(choice.manifest.expectedBytes)} · {localAIModelStatusLabel(status)}
                  {loaded ? ' · Loaded in memory' : null}
                </div>
              </div>
            </div>

            {downloading ? (
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] font-bold text-bd-text">
                  <span>{status?.state === 'verifying' ? 'Verifying checksum' : 'Downloading model'}</span>
                  <span>{progress}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-bd-surface-muted">
                  <div className="h-full rounded-full bg-bd-button-primary-bg transition-all" style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-1 text-[10px] font-semibold text-bd-text-muted">
                  {formatLocalAIModelBytes(status?.downloadedBytes)} of {formatLocalAIModelBytes(status?.totalBytes || choice.manifest.expectedBytes)}
                </div>
              </div>
            ) : null}

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {!choice.installed ? (
                <Button
                  type="button"
                  onClick={() => void runModelAction(choice.manifest.modelId, 'download', () => downloadLocalAIModel(choice.manifest.modelId))}
                  disabled={busy || !runtimeLinked}
                >
                  <Download className="size-4" data-icon="inline-start" />
                  {busyThis && busyAction === 'download' ? 'Downloading...' : 'Download and verify'}
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={() => void runModelAction(choice.manifest.modelId, 'verify', () => verifyLocalAIModel(choice.manifest.modelId))} disabled={busy}>
                  <CheckCircle2 className="size-4" data-icon="inline-start" />
                  Verify installed model
                </Button>
              )}

              {choice.installed && !choice.selected ? (
                <Button type="button" variant="outline" onClick={() => handleSelectModel(choice.manifest.modelId)} disabled={busy}>
                  Use model
                </Button>
              ) : null}

              {status?.state === 'downloading' ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void runModelAction(choice.manifest.modelId, 'cancel', () => cancelLocalAIModelDownload(choice.manifest.modelId))}
                  disabled={busyThis && busyAction === 'cancel'}
                >
                  <XCircle className="size-4" data-icon="inline-start" />
                  Cancel download
                </Button>
              ) : null}

              {status && status.state !== 'not_installed' && status.state !== 'unsupported' ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDeleteModel(choice.manifest.modelId, choice.manifest.displayName, loaded)}
                  disabled={busy || loaded}
                >
                  <Trash2 className="size-4" data-icon="inline-start" />
                  Delete local model
                </Button>
              ) : null}
            </div>

            <details className="mt-3 text-[11px] font-semibold text-bd-text-muted">
              <summary className="cursor-pointer">Technical details</summary>
              <div className="mt-1 break-all font-mono text-[10px]">
                {choice.manifest.sourceRepository}@{choice.manifest.sourceRevision.slice(0, 8)}
              </div>
              <div className="mt-0.5">{choice.manifest.sourceFilename}</div>
              <div className="mt-0.5">License: {choice.manifest.license}</div>
              <div className="mt-0.5">Quantization: {choice.manifest.quantization}</div>
              <div className="mt-0.5">{choice.manifest.runtime}</div>
            </details>
          </div>
        )
      })}

      {message ? (
        <div className="rounded-lg border border-bd-border bg-bd-surface-muted px-4 py-3 text-[12px] font-semibold text-bd-text-muted">
          {message}
        </div>
      ) : null}

      <div className="rounded-lg border border-bd-border bg-bd-surface-muted p-4 text-[12px] leading-relaxed text-bd-text-muted">
        Local AI is read-only. It can suggest Same, Different, or Unsure for Cleanup Hub duplicate review. It cannot
        merge items, create aliases, change history, or apply Item Library decisions. Model files stay in app-private
        storage across normal app updates.
      </div>
    </div>
  )
}
