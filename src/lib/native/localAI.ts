import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'

import { BIGDROPS_LOCAL_AI_POC_MODEL } from '@/lib/local-ai/modelManifest'
import type { LocalAIModelProgressEvent, LocalAIModelStatus } from '@/lib/local-ai/modelStatus'
import type { CleanupLocalAITask } from '@/modules/item-library/domain/cleanupLocalAI'

export type LocalAIRuntimeInfo = {
  available: boolean
  platform: 'android' | 'web' | string
  pluginVersion: string
  runtime: 'llama.cpp'
  runtimeLinked: boolean
  llamaCppCommit?: string | null
  runtimeVersion?: string | null
  supportedAbis: string[]
  selectedAbi: string | null
  modelDirectoryReady: boolean
  loadedModelId: string | null
  loadedModelDescription?: string | null
  isGenerating: boolean
  lastLoadMs?: number
  lastGenerationMs?: number
  lastPromptTokens?: number
  lastOutputTokens?: number
  lastTokensPerSecond?: number
  memoryBeforeLoadBytes?: number
  memoryAfterLoadBytes?: number
  memoryAfterUnloadBytes?: number
  totalMemoryBytes?: number
  message?: string
}

export type LocalAINativeStage =
  | 'start'
  | 'context_init'
  | 'vocab'
  | 'tokenize'
  | 'prompt_decode'
  | 'sampler_init'
  | 'grammar_init'
  | 'generate'
  | 'unknown'

export type LocalAINativeError = Error & { stage: LocalAINativeStage }

const NATIVE_STAGE_PATTERN = /\[stage=([a-z_]+)\]/

export function getLocalAINativeStage(error: unknown): LocalAINativeStage {
  const message = error instanceof Error ? error.message : String(error || '')
  const match = NATIVE_STAGE_PATTERN.exec(message)
  const stage = match?.[1]
  switch (stage) {
    case 'start':
    case 'context_init':
    case 'vocab':
    case 'tokenize':
    case 'prompt_decode':
    case 'sampler_init':
    case 'grammar_init':
    case 'generate':
      return stage
    default:
      return 'unknown'
  }
}

export function withLocalAINativeStage(error: unknown): LocalAINativeError {
  const stage = getLocalAINativeStage(error)
  const message = error instanceof Error ? error.message : String(error || 'Local AI generation failed.')
  const typed = new Error(message) as LocalAINativeError
  typed.stage = stage
  return typed
}
export type LocalAILoadModelResult = {
  loaded: boolean
  modelId: string
  loadMs?: number
  modelDescription?: string | null
  modelSizeBytes?: number
  modelParameterCount?: number
  message?: string
}

export type LocalAIAnalyzeResult = {
  rawText: string
  modelId: string
  elapsedMs: number
  promptTokens?: number
  outputTokens?: number
  tokensPerSecond?: number
  peakMemoryBytes?: number | null
}

type LocalAIPlugin = {
  getRuntimeInfo(): Promise<LocalAIRuntimeInfo>
  getModelStatus(options: { modelId: string }): Promise<LocalAIModelStatus>
  downloadModel(options: { modelId: string }): Promise<LocalAIModelStatus>
  cancelModelDownload(options: { modelId: string }): Promise<{ cancelled: boolean }>
  verifyModel(options: { modelId: string }): Promise<LocalAIModelStatus>
  deleteModel(options: { modelId: string }): Promise<LocalAIModelStatus>
  loadModel(options: { modelId: string }): Promise<LocalAILoadModelResult>
  analyzeCleanupTask(options: { task: CleanupLocalAITask; prompt: string }): Promise<LocalAIAnalyzeResult>
  cancelGeneration(): Promise<{ cancelled: boolean }>
  unloadModel(): Promise<{ unloaded: boolean }>
  addListener(eventName: 'localAIModelDownloadProgress', listenerFunc: (event: LocalAIModelProgressEvent) => void): Promise<PluginListenerHandle>
}

const LocalAI = registerPlugin<LocalAIPlugin>('LocalAI')

export function hasLocalAIPlugin(): boolean {
  return Capacitor.isPluginAvailable('LocalAI')
}

export async function getLocalAIRuntimeInfo(): Promise<LocalAIRuntimeInfo> {
  if (!hasLocalAIPlugin()) {
    return {
      available: false,
      platform: Capacitor.getPlatform(),
      pluginVersion: 'unavailable',
      runtime: 'llama.cpp',
      runtimeLinked: false,
      supportedAbis: [],
      selectedAbi: null,
      modelDirectoryReady: false,
      loadedModelId: null,
      isGenerating: false,
      message: 'Local AI is available only inside the Android native app.',
    }
  }

  return LocalAI.getRuntimeInfo()
}

export async function getLocalAIModelStatus(modelId = BIGDROPS_LOCAL_AI_POC_MODEL.modelId): Promise<LocalAIModelStatus> {
  if (!hasLocalAIPlugin()) {
    return {
      modelId,
      state: 'unsupported',
      verified: false,
      expectedBytes: BIGDROPS_LOCAL_AI_POC_MODEL.expectedBytes,
      expectedSha256: BIGDROPS_LOCAL_AI_POC_MODEL.expectedSha256,
      message: 'Local AI model management is available only inside the Android native app.',
    }
  }

  return LocalAI.getModelStatus({ modelId })
}

export async function downloadLocalAIModel(modelId = BIGDROPS_LOCAL_AI_POC_MODEL.modelId): Promise<LocalAIModelStatus> {
  if (!hasLocalAIPlugin()) throw new Error('Local AI model download is available only inside the Android native app.')
  return LocalAI.downloadModel({ modelId })
}

export async function cancelLocalAIModelDownload(modelId = BIGDROPS_LOCAL_AI_POC_MODEL.modelId): Promise<boolean> {
  if (!hasLocalAIPlugin()) return false
  const result = await LocalAI.cancelModelDownload({ modelId })
  return result.cancelled === true
}

export async function verifyLocalAIModel(modelId = BIGDROPS_LOCAL_AI_POC_MODEL.modelId): Promise<LocalAIModelStatus> {
  if (!hasLocalAIPlugin()) throw new Error('Local AI model verification is available only inside the Android native app.')
  return LocalAI.verifyModel({ modelId })
}

export async function deleteLocalAIModel(modelId = BIGDROPS_LOCAL_AI_POC_MODEL.modelId): Promise<LocalAIModelStatus> {
  if (!hasLocalAIPlugin()) throw new Error('Local AI model removal is available only inside the Android native app.')
  return LocalAI.deleteModel({ modelId })
}

export async function addLocalAIModelDownloadListener(
  listener: (event: LocalAIModelProgressEvent) => void,
): Promise<PluginListenerHandle | null> {
  if (!hasLocalAIPlugin()) return null
  return LocalAI.addListener('localAIModelDownloadProgress', listener)
}

export async function loadLocalAIModel(modelId: string): Promise<LocalAILoadModelResult> {
  if (!hasLocalAIPlugin()) throw new Error('Local AI is available only inside the Android native app.')
  return LocalAI.loadModel({ modelId })
}

export async function analyzeCleanupTaskWithLocalAI(params: {
  task: CleanupLocalAITask
  prompt: string
}): Promise<LocalAIAnalyzeResult> {
  if (!hasLocalAIPlugin()) throw new Error('Local AI is available only inside the Android native app.')
  return LocalAI.analyzeCleanupTask(params)
}

export async function cancelLocalAIGeneration(): Promise<boolean> {
  if (!hasLocalAIPlugin()) return false
  const result = await LocalAI.cancelGeneration()
  return result.cancelled === true
}

export async function unloadLocalAIModel(): Promise<boolean> {
  if (!hasLocalAIPlugin()) return false
  const result = await LocalAI.unloadModel()
  return result.unloaded === true
}
