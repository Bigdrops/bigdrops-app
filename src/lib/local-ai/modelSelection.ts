import {
  BIGDROPS_LOCAL_AI_LITE_MODEL,
  BIGDROPS_LOCAL_AI_POC_MODEL,
  getLocalAIModelManifest,
  LOCAL_AI_MODEL_CATALOG,
  type LocalAIModelManifest,
} from './modelManifest'
import { isLocalAIModelReady, type LocalAIModelStatus } from './modelStatus'

export const LOCAL_AI_SELECTED_MODEL_KEY = 'bigdrops.local-ai.selected-model-id'

export const LOCAL_AI_STANDARD_MEMORY_BYTES = 2_500_000_000

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function appStorage(): StorageLike | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage
  } catch {
    return null
  }
  return null
}

export function getSelectedLocalAIModelId(storage: StorageLike | null = appStorage()): string | null {
  try {
    const raw = storage?.getItem(LOCAL_AI_SELECTED_MODEL_KEY)
    const normalized = String(raw || '').trim()
    return normalized || null
  } catch {
    return null
  }
}

export function setSelectedLocalAIModelId(modelId: string | null, storage: StorageLike | null = appStorage()): void {
  try {
    if (!modelId) {
      storage?.removeItem(LOCAL_AI_SELECTED_MODEL_KEY)
      return
    }
    storage?.setItem(LOCAL_AI_SELECTED_MODEL_KEY, modelId)
  } catch {
    // Storage unavailable. Selection stays in memory for this session.
  }
}

export function recommendLocalAIModel(totalMemoryBytes?: number | null): LocalAIModelManifest {
  if (typeof totalMemoryBytes === 'number' && totalMemoryBytes > 0 && totalMemoryBytes < LOCAL_AI_STANDARD_MEMORY_BYTES) {
    return BIGDROPS_LOCAL_AI_LITE_MODEL
  }
  return BIGDROPS_LOCAL_AI_POC_MODEL
}

export type LocalAIModelChoice = {
  manifest: LocalAIModelManifest
  status: LocalAIModelStatus | null
  installed: boolean
  selected: boolean
  recommended: boolean
}

export function listLocalAIModelChoices(
  statusesById: Record<string, LocalAIModelStatus | null | undefined>,
  selectedId: string | null,
  recommendedId: string | null,
): LocalAIModelChoice[] {
  return LOCAL_AI_MODEL_CATALOG.filter((manifest) => manifest.enabled).map((manifest) => {
    const status = statusesById[manifest.modelId] || null
    return {
      manifest,
      status,
      installed: isLocalAIModelReady(status),
      selected: selectedId === manifest.modelId,
      recommended: recommendedId === manifest.modelId,
    }
  })
}

export type LocalAIResolvedModel =
  | { kind: 'ready'; manifest: LocalAIModelManifest; status: LocalAIModelStatus; selected: boolean }
  | { kind: 'selected-missing'; manifest: LocalAIModelManifest; status: LocalAIModelStatus | null }
  | { kind: 'no-selection'; recommended: LocalAIModelManifest | null }

export function resolveLocalAIModelForJob(params: {
  selectedId: string | null
  statusesById: Record<string, LocalAIModelStatus | null | undefined>
  recommendedId?: string | null
}): LocalAIResolvedModel {
  const normalizedSelected = String(params.selectedId || '').trim()
  if (normalizedSelected) {
    const manifest = getLocalAIModelManifest(normalizedSelected)
    const status = params.statusesById[normalizedSelected] || null
    if (manifest && isLocalAIModelReady(status) && status) {
      return { kind: 'ready', manifest, status, selected: true }
    }
    if (manifest) {
      return { kind: 'selected-missing', manifest, status }
    }
    return { kind: 'no-selection', recommended: null }
  }

  const recommendedId = String(params.recommendedId || '').trim()
  const recommended = getLocalAIModelManifest(recommendedId)
  if (recommended) {
    const status = params.statusesById[recommended.modelId] || null
    if (isLocalAIModelReady(status) && status) {
      return { kind: 'ready', manifest: recommended, status, selected: false }
    }
  }
  return { kind: 'no-selection', recommended: recommended || null }
}

export type LocalAIModelSelectionSnapshot = {
  selectedId: string | null
  statusesById: Record<string, LocalAIModelStatus | null>
  resolved: LocalAIResolvedModel
}

export async function refreshLocalAIModelSelectionSnapshot(params: {
  readStatus: (modelId: string) => Promise<LocalAIModelStatus | null>
  selectedId?: string | null
  readSelectedId?: () => string | null
  recommendedId?: string | null
}): Promise<LocalAIModelSelectionSnapshot> {
  const selectedId =
    params.selectedId === undefined
      ? params.readSelectedId?.() ?? getSelectedLocalAIModelId()
      : params.selectedId
  const enabledModels = LOCAL_AI_MODEL_CATALOG.filter((manifest) => manifest.enabled)
  const statusEntries = await Promise.all(
    enabledModels.map(async (manifest) => {
      try {
        return [manifest.modelId, await params.readStatus(manifest.modelId)] as const
      } catch {
        return [manifest.modelId, null] as const
      }
    }),
  )
  const statusesById: Record<string, LocalAIModelStatus | null> = {}
  statusEntries.forEach(([modelId, status]) => {
    statusesById[modelId] = status
  })

  return {
    selectedId,
    statusesById,
    resolved: resolveLocalAIModelForJob({
      selectedId,
      statusesById,
      recommendedId: params.recommendedId,
    }),
  }
}
