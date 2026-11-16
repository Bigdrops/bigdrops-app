import { maskKey } from '@/lib/ai-assistant/protocol'
import {
  AI_PROVIDER_REGISTRY,
  type AIProviderModel,
  type CustomProvider,
} from '@/lib/ai-assistant/providerRegistry'
import {
  boluProviderApi,
  type ProviderStatusResponse,
} from '@/pages/settings/bolu-provider/api'

export type ProviderEntry = {
  id: string
  label: string
  short: string
  baseUrl: string
  keyHint: string
  signupUrl: string
  note: string
  models: AIProviderModel[]
  model: string
  key: string
  keyPrefix?: string
  custom: boolean
  extraHeaders?: Record<string, string>
  contextWindow?: number | null
  tested: TestResult
  discovering: boolean
}

export type TestResult =
  | { status: 'idle'; message: string }
  | { status: 'testing'; message: string }
  | { status: 'ok'; message: string }
  | { status: 'fail'; message: string }

export type ProviderStatus = 'active' | 'configured' | 'needs-key'

export const IDLE_TEST: TestResult = { status: 'idle', message: 'Not tested in this session.' }

export function initialProviderEntries(): ProviderEntry[] {
  return AI_PROVIDER_REGISTRY.map((row) => ({
    id: row.id,
    label: row.label,
    short: row.short,
    baseUrl: row.baseUrl,
    keyHint: row.keyHint,
    signupUrl: row.signupUrl,
    note: row.note,
    models: row.models,
    model: row.defaultModel,
    key: '',
    keyPrefix: row.keyPrefix,
    custom: false,
    tested: IDLE_TEST,
    discovering: false,
  }))
}

/** Clean production initialization with no mock keys */
export function seedProviderEntries(): ProviderEntry[] {
  return initialProviderEntries()
}

export function providerStatus(entry: ProviderEntry, activeId: string): ProviderStatus {
  if (entry.id === activeId && entry.key) return 'active'
  if (entry.key) return 'configured'
  return 'needs-key'
}

export function maskedKey(key: string): string {
  return maskKey(key)
}

export function pickActiveProvider(entries: ProviderEntry[], current: string): string {
  if (entries.some((entry) => entry.id === current && entry.key)) return current
  return entries.find((entry) => entry.key)?.id ?? current
}

/**
 * Reconciles static catalog entries with live backend pool status from `boluProviderApi.getStatus()`.
 */
export function syncEntriesWithBackend(
  entries: ProviderEntry[],
  status: ProviderStatusResponse,
): { entries: ProviderEntry[]; activeId: string } {
  const connections = status.connections ?? []
  const primaryConnId = status.routing?.primaryConnectionId ?? status.runtime?.primaryConnectionId

  let activeId = 'openrouter'

  if (primaryConnId) {
    const primary = connections.find((c) => c.id === primaryConnId)
    if (primary) {
      activeId = primary.providerId
    }
  } else if (status.runtime?.provider) {
    activeId = status.runtime.provider
  }

  const updatedEntries = entries.map((entry) => {
    const conn = connections.find((c) => c.providerId === entry.id)
    if (!conn) return entry

    const models =
      conn.discoveredModels && conn.discoveredModels.length > 0
        ? conn.discoveredModels.map((m) => ({ id: m.id, label: m.label || m.id, note: 'Discovered model' }))
        : entry.models

    return {
      ...entry,
      key: conn.maskedKey || 'configured',
      model: conn.model || entry.model,
      models,
      tested: {
        status: conn.verificationStatus === 'verified' ? ('ok' as const) : conn.verificationStatus === 'failed' ? ('fail' as const) : ('idle' as const),
        message: conn.lastTestMessage || (conn.verificationStatus === 'verified' ? 'Connected & verified.' : 'Not tested in this session.'),
      },
    }
  })

  // If activeId has no key in updated entries, pick first configured entry
  if (!updatedEntries.some((e) => e.id === activeId && e.key)) {
    const firstConfigured = updatedEntries.find((e) => e.key)
    if (firstConfigured) {
      activeId = firstConfigured.id
    }
  }

  return { entries: updatedEntries, activeId }
}

export function upsertCustomProvider(
  entries: ProviderEntry[],
  custom: CustomProvider,
  key: string,
): ProviderEntry[] {
  const models = custom.modelIds.map((id) => ({ id, label: id, note: 'Custom model id' }))
  const entry: ProviderEntry = {
    id: custom.id,
    label: custom.label,
    short: custom.label.slice(0, 2).toUpperCase(),
    baseUrl: custom.baseUrl,
    keyHint: 'Key for this endpoint',
    signupUrl: '',
    note: custom.contextWindow
      ? `Custom endpoint · ${Number(custom.contextWindow || 0).toLocaleString('en-NG')} token window`
      : 'Custom OpenAI compatible endpoint',
    models,
    model: models[0]?.id ?? '',
    key,
    custom: true,
    extraHeaders: custom.extraHeaders,
    contextWindow: custom.contextWindow,
    tested: { status: 'ok', message: 'Saved to session.' },
    discovering: false,
  }

  const rest = entries.filter((item) => item.id !== custom.id)
  return [...rest, entry]
}

/** Real backend connection test via /api/bolu-provider-config */
export async function testProviderConnection(entry: ProviderEntry, key?: string): Promise<TestResult> {
  const effectiveKey = key?.trim() || entry.key
  if (!effectiveKey) return { status: 'fail', message: 'No API key provided.' }

  try {
    const res = await boluProviderApi.test({
      providerId: entry.id,
      apiKey: effectiveKey,
      baseUrl: entry.baseUrl,
      model: entry.model,
    })
    if (res.ok) {
      return { status: 'ok', message: res.diagnostics.message || 'Connection verified successfully.' }
    } else {
      return { status: 'fail', message: res.diagnostics.message || 'Connection test failed.' }
    }
  } catch (err) {
    return { status: 'fail', message: err instanceof Error ? err.message : 'Connection test failed.' }
  }
}

/** Real backend model discovery via /api/bolu-provider-config */
export async function discoverProviderModels(entry: ProviderEntry, key?: string): Promise<AIProviderModel[]> {
  const effectiveKey = key?.trim() || entry.key
  if (!effectiveKey) return entry.models

  try {
    const res = await boluProviderApi.discover({
      providerId: entry.id,
      apiKey: effectiveKey,
      baseUrl: entry.baseUrl,
      model: entry.model,
    })
    if (res.ok && res.models && res.models.length > 0) {
      return res.models.map((m) => ({ id: m.id, label: m.label || m.id, note: 'Discovered model' }))
    }
  } catch (err) {
    console.warn('[assistant-chat-providers] Model discovery fallback:', err)
  }
  return entry.models
}

export type { AIProviderModel }
