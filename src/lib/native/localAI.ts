import { Capacitor, registerPlugin } from '@capacitor/core'

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
  message?: string
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
  loadModel(options: { modelId: string }): Promise<LocalAILoadModelResult>
  analyzeCleanupTask(options: { task: CleanupLocalAITask; prompt: string }): Promise<LocalAIAnalyzeResult>
  cancelGeneration(): Promise<{ cancelled: boolean }>
  unloadModel(): Promise<{ unloaded: boolean }>
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
