import { maskKey } from '@/lib/ai-assistant/protocol'
import {
  AI_PROVIDER_REGISTRY,
  type AIProviderModel,
  type CustomProvider,
} from '@/lib/ai-assistant/providerRegistry'

/**
 * Design Lab provider state. Keys live in component memory for the session and
 * are never written to storage. This mirrors the production rule in
 * `src/lib/ai-assistant/keys.ts`: a browser build keeps keys in memory only.
 */

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

/**
 * A demo key fills two providers so the header is never empty on first load.
 * The value is not a real credential and the settings copy says so.
 */
export function seedProviderEntries(): ProviderEntry[] {
  return initialProviderEntries().map((entry) => {
    if (entry.id === 'openrouter') {
      return {
        ...entry,
        key: 'sk-or-demo-not-a-real-key',
        tested: { status: 'ok' as const, message: 'Connected. 5 models available to this key.' },
      }
    }
    if (entry.id === 'gemini') {
      return {
        ...entry,
        key: 'AIza-demo-not-a-real-key',
        tested: { status: 'ok' as const, message: 'Connected. 3 models available to this key.' },
      }
    }
    return entry
  })
}

export function providerStatus(entry: ProviderEntry, activeId: string): ProviderStatus {
  if (entry.id === activeId && entry.key) return 'active'
  if (entry.key) return 'configured'
  return 'needs-key'
}

export function maskedKey(key: string): string {
  return maskKey(key)
}

/** The first configured provider becomes active, so the header is never empty. */
export function pickActiveProvider(entries: ProviderEntry[], current: string): string {
  if (entries.some((entry) => entry.id === current && entry.key)) return current
  return entries.find((entry) => entry.key)?.id ?? current
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
      ? `Custom endpoint · ${custom.contextWindow.toLocaleString('en-NG')} token window`
      : 'Custom OpenAI compatible endpoint',
    models,
    model: models[0]?.id ?? '',
    key,
    custom: true,
    extraHeaders: custom.extraHeaders,
    contextWindow: custom.contextWindow,
    tested: { status: 'ok', message: 'Saved. The app will test this endpoint before the first request.' },
    discovering: false,
  }

  const rest = entries.filter((item) => item.id !== custom.id)
  return [...rest, entry]
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * A key is checked against the provider prefix, then the endpoint is "dialled".
 * The message never contains the key, in line with FR-12.
 */
export async function simulateConnection(entry: ProviderEntry, key: string): Promise<TestResult> {
  const trimmed = key.trim()
  if (!trimmed) return { status: 'fail', message: 'No key. Paste the key first.' }
  if (trimmed.length < 12) return { status: 'fail', message: 'The key is too short for this provider.' }
  if (entry.keyPrefix && !trimmed.startsWith(entry.keyPrefix)) {
    return { status: 'fail', message: `This key does not start with ${entry.keyPrefix}.` }
  }

  await sleep(700)
  const models = entry.models.length
  return {
    status: 'ok',
    message: `Connected. ${models} model${models === 1 ? '' : 's'} available to this key.`,
  }
}

/** Live `/models` discovery. Declared models always survive a failed refresh. */
export async function simulateModelDiscovery(entry: ProviderEntry): Promise<AIProviderModel[]> {
  await sleep(650)
  const discovered =
    entry.id === 'openrouter'
      ? [
          { id: 'nousresearch/hermes-4-70b', label: 'Hermes 4 70B' },
          { id: 'qwen/qwen3-coder-480b', label: 'Qwen3 Coder 480B' },
        ]
      : entry.custom
        ? entry.models.map((model) => ({ ...model, note: 'Confirmed by /v1/models' }))
        : [
            { id: `${entry.id}-vision-preview`, label: 'Vision preview', note: 'Discovered' },
            { id: `${entry.id}-embed`, label: 'Embedding model', note: 'Discovered' },
          ]

  const known = new Set(entry.models.map((model) => model.id))
  return [...entry.models, ...discovered.filter((model) => !known.has(model.id))]
}

export type { AIProviderModel }
