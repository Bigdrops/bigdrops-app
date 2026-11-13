/**
 * Provider and model catalog for the conversational assistant.
 *
 * The shape follows the Hermes provider entries: every provider is a base URL,
 * a key, a declared model list, and an optional live `/models` discovery. The
 * user pastes one key. The model list is already populated.
 *
 * `providerCatalog.ts` stays the runtime chain for the shipped assistant. This
 * file is the wider catalog that the settings UI reads. The two share the same
 * OpenAI compatible request shape, so a row here can move into the chain
 * without a new client.
 */

export type AIProviderTier = 'first-party' | 'aggregator' | 'custom'

export type AIProviderModel = {
  id: string
  label: string
  note?: string
}

export type AIProviderDefinition = {
  id: string
  label: string
  short: string
  tier: AIProviderTier
  baseUrl: string
  keyHint: string
  keyPrefix?: string
  signupUrl: string
  defaultModel: string
  models: AIProviderModel[]
  note: string
  /** Some gateways accept `api-key` instead of a bearer token. */
  authScheme?: 'bearer' | 'x-api-key' | 'query'
  /** A model list endpoint exists, so "Fetch models" can refresh the dropdown. */
  supportsModelList: boolean
}

const M = (id: string, label: string, note?: string): AIProviderModel => ({ id, label, note })

/**
 * Tier 1 rows are preconfigured: one paste, no form to fill. Order follows the
 * free-tier preference in the PRD, not the vendor alphabet.
 */
export const AI_PROVIDER_REGISTRY: AIProviderDefinition[] = [
  {
    id: 'openrouter',
    label: 'OpenRouter',
    short: 'OR',
    tier: 'aggregator',
    baseUrl: 'https://openrouter.ai/api/v1',
    keyHint: 'Starts with sk-or-',
    keyPrefix: 'sk-or-',
    signupUrl: 'https://openrouter.ai/keys',
    defaultModel: 'openrouter/free',
    models: [
      M('openrouter/free', 'Free router', 'Picks a free model'),
      M('anthropic/claude-sonnet-4.5', 'Claude Sonnet 4.5'),
      M('google/gemini-3.5-flash', 'Gemini 3.5 Flash'),
      M('deepseek/deepseek-v4', 'DeepSeek V4'),
      M('meta-llama/llama-4.1-70b', 'Llama 4.1 70B'),
    ],
    note: 'One key, many models. Free models only under 10 US dollars of lifetime credit.',
    supportsModelList: true,
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    short: 'AN',
    tier: 'first-party',
    baseUrl: 'https://api.anthropic.com/v1',
    keyHint: 'Starts with sk-ant-',
    keyPrefix: 'sk-ant-',
    signupUrl: 'https://console.anthropic.com/settings/keys',
    defaultModel: 'claude-sonnet-4-5',
    models: [
      M('claude-sonnet-4-5', 'Claude Sonnet 4.5', 'Best balance'),
      M('claude-haiku-4-5', 'Claude Haiku 4.5', 'Fastest'),
      M('claude-opus-4-1', 'Claude Opus 4.1', 'Deepest'),
    ],
    note: 'Native API. The app sends the same chat shape through the OpenAI compatibility layer.',
    supportsModelList: true,
  },
  {
    id: 'openai',
    label: 'OpenAI',
    short: 'OA',
    tier: 'first-party',
    baseUrl: 'https://api.openai.com/v1',
    keyHint: 'Starts with sk-',
    keyPrefix: 'sk-',
    signupUrl: 'https://platform.openai.com/api-keys',
    defaultModel: 'gpt-5.2-mini',
    models: [
      M('gpt-5.2-mini', 'GPT-5.2 mini', 'Low cost'),
      M('gpt-5.2', 'GPT-5.2'),
      M('o4-mini', 'o4 mini', 'Reasoning'),
    ],
    note: 'Paid. Use a project key with a spending cap.',
    supportsModelList: true,
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    short: 'GE',
    tier: 'first-party',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    keyHint: 'Starts with AIza',
    keyPrefix: 'AIza',
    signupUrl: 'https://aistudio.google.com/apikey',
    defaultModel: 'gemini-3.5-flash-lite',
    models: [
      M('gemini-3.5-flash-lite', 'Gemini 3.5 Flash Lite', '500 requests a day free'),
      M('gemini-3.5-flash', 'Gemini 3.5 Flash'),
      M('gemini-3.5-pro', 'Gemini 3.5 Pro'),
    ],
    note: 'The free tier may use content to improve its products.',
    supportsModelList: true,
  },
  {
    id: 'groq',
    label: 'Groq',
    short: 'GQ',
    tier: 'first-party',
    baseUrl: 'https://api.groq.com/openai/v1',
    keyHint: 'Starts with gsk_',
    keyPrefix: 'gsk_',
    signupUrl: 'https://console.groq.com/keys',
    defaultModel: 'llama-4.1-70b-versatile',
    models: [
      M('llama-4.1-70b-versatile', 'Llama 4.1 70B'),
      M('gpt-oss-120b', 'GPT-OSS 120B'),
      M('qwen-3-32b', 'Qwen 3 32B'),
    ],
    note: 'Very low latency. A free tier is available with a daily limit.',
    supportsModelList: true,
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    short: 'DS',
    tier: 'first-party',
    baseUrl: 'https://api.deepseek.com/v1',
    keyHint: 'Starts with sk-',
    keyPrefix: 'sk-',
    signupUrl: 'https://platform.deepseek.com/api_keys',
    defaultModel: 'deepseek-v4-chat',
    models: [
      M('deepseek-v4-chat', 'DeepSeek V4 Chat'),
      M('deepseek-v4-reasoner', 'DeepSeek V4 Reasoner'),
    ],
    note: 'Low cost per token. Good at structured extraction.',
    supportsModelList: true,
  },
  {
    id: 'mistral',
    label: 'Mistral',
    short: 'MI',
    tier: 'first-party',
    baseUrl: 'https://api.mistral.ai/v1',
    keyHint: 'From the Mistral console',
    signupUrl: 'https://console.mistral.ai/api-keys',
    defaultModel: 'mistral-small-4',
    models: [
      M('mistral-small-4', 'Mistral Small 4'),
      M('mistral-large-3', 'Mistral Large 3'),
      M('devstral-2', 'Devstral 2'),
    ],
    note: 'A free experiment tier exists. Rate limits are low.',
    supportsModelList: true,
  },
  {
    id: 'together',
    label: 'Together AI',
    short: 'TG',
    tier: 'aggregator',
    baseUrl: 'https://api.together.xyz/v1',
    keyHint: 'Starts with tgp_v1_',
    keyPrefix: 'tgp_v1_',
    signupUrl: 'https://api.together.ai/settings/api-keys',
    defaultModel: 'meta-llama/Llama-4.1-70B-Instruct-Turbo',
    models: [
      M('meta-llama/Llama-4.1-70B-Instruct-Turbo', 'Llama 4.1 70B Turbo'),
      M('Qwen/Qwen3-32B-Turbo', 'Qwen 3 32B Turbo'),
      M('deepseek-ai/DeepSeek-V4', 'DeepSeek V4'),
    ],
    note: 'Open model host. Model ids keep the vendor prefix.',
    supportsModelList: true,
  },
  {
    id: 'fireworks',
    label: 'Fireworks AI',
    short: 'FW',
    tier: 'aggregator',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    keyHint: 'From the Fireworks dashboard',
    signupUrl: 'https://fireworks.ai/account/api-keys',
    defaultModel: 'accounts/fireworks/models/llama-v4-70b-instruct',
    models: [
      M('accounts/fireworks/models/llama-v4-70b-instruct', 'Llama 4 70B'),
      M('accounts/fireworks/models/deepseek-v4', 'DeepSeek V4'),
      M('accounts/fireworks/models/qwen3-32b', 'Qwen 3 32B'),
    ],
    note: 'Serverless and dedicated endpoints. Model ids carry the account path.',
    supportsModelList: true,
  },
  {
    id: 'cerebras',
    label: 'Cerebras',
    short: 'CB',
    tier: 'first-party',
    baseUrl: 'https://api.cerebras.ai/v1',
    keyHint: 'Starts with csk-',
    keyPrefix: 'csk-',
    signupUrl: 'https://cloud.cerebras.ai/platform',
    defaultModel: 'llama-4.1-70b',
    models: [
      M('llama-4.1-70b', 'Llama 4.1 70B'),
      M('gpt-oss-120b', 'GPT-OSS 120B'),
      M('qwen-3-32b', 'Qwen 3 32B'),
    ],
    note: 'Fastest token rate in this list. A free developer tier is available.',
    supportsModelList: true,
  },
  {
    id: 'xai',
    label: 'xAI Grok',
    short: 'XA',
    tier: 'first-party',
    baseUrl: 'https://api.x.ai/v1',
    keyHint: 'Starts with xai-',
    keyPrefix: 'xai-',
    signupUrl: 'https://console.x.ai',
    defaultModel: 'grok-4.1-fast',
    models: [
      M('grok-4.1-fast', 'Grok 4.1 Fast'),
      M('grok-4.1', 'Grok 4.1'),
      M('grok-3-mini', 'Grok 3 mini'),
    ],
    note: 'Paid. Free credits are offered at signup.',
    supportsModelList: true,
  },
  {
    id: 'cohere',
    label: 'Cohere',
    short: 'CO',
    tier: 'first-party',
    baseUrl: 'https://api.cohere.ai/compatibility/v1',
    keyHint: 'From the Cohere dashboard',
    signupUrl: 'https://dashboard.cohere.com/api-keys',
    defaultModel: 'command-a',
    models: [
      M('command-a', 'Command A'),
      M('command-r-plus', 'Command R+'),
      M('command-r7b', 'Command R7B'),
    ],
    note: 'The compatibility base URL accepts the OpenAI chat shape. A trial key is free.',
    supportsModelList: true,
  },
  {
    id: 'nvidia',
    label: 'NVIDIA NIM',
    short: 'NV',
    tier: 'first-party',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    keyHint: 'Starts with nvapi-',
    keyPrefix: 'nvapi-',
    signupUrl: 'https://build.nvidia.com/models',
    defaultModel: 'nvidia/nemotron-3.5-lightning-30b-a3b',
    models: [M('nvidia/nemotron-3.5-lightning-30b-a3b', 'Nemotron 3.5 Lightning 30B')],
    note: 'Rate limited, no daily token cap on the free developer tier.',
    supportsModelList: true,
  },
  {
    id: 'amd',
    label: 'AMD Token Factory',
    short: 'AM',
    tier: 'first-party',
    baseUrl: 'https://developer.amd.com.cn/radeon/api/v1',
    keyHint: 'From the AMD AI Developer Program',
    signupUrl: 'https://developer.amd.com.cn',
    defaultModel: 'DeepSeek-V4-Flash',
    models: [M('DeepSeek-V4-Flash', 'DeepSeek V4 Flash')],
    note: 'Largest daily allowance. The endpoint is on the China site, so it can be slow here.',
    supportsModelList: true,
  },
]

export function getProviderDefinition(id: string): AIProviderDefinition | undefined {
  return AI_PROVIDER_REGISTRY.find((row) => row.id === id)
}

/** A user supplied OpenAI compatible endpoint. Hermes calls this a named provider. */
export type CustomProviderDraft = {
  name: string
  baseUrl: string
  key: string
  modelIds: string
  extraHeaders: string
  contextWindow: string
}

export type CustomProvider = {
  id: string
  label: string
  baseUrl: string
  modelIds: string[]
  extraHeaders: Record<string, string>
  contextWindow: number | null
}

export const EMPTY_CUSTOM_PROVIDER: CustomProviderDraft = {
  name: '',
  baseUrl: '',
  key: '',
  modelIds: '',
  extraHeaders: '',
  contextWindow: '',
}

export function slugifyProviderName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
}

export function parseModelIds(raw: string): string[] {
  const seen = new Set<string>()
  return raw
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter((value) => {
      if (!value || seen.has(value)) return false
      seen.add(value)
      return true
    })
}

export function parseExtraHeaders(raw: string): { headers: Record<string, string>; error: string | null } {
  const text = raw.trim()
  if (!text) return { headers: {}, error: null }
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { headers: {}, error: 'Headers must be a JSON object.' }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { headers: {}, error: 'Headers must be a JSON object.' }
  }
  const headers: Record<string, string> = {}
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value !== 'string') return { headers: {}, error: 'Every header value must be a string.' }
    headers[key] = value
  }
  return { headers, error: null }
}

/**
 * Validation mirrors Hermes: a named endpoint needs a name, an OpenAI style base
 * URL, a key, and at least one declared model. A failed `/models` discovery
 * never removes a declared model, so the declared list is the floor.
 */
export function validateCustomProvider(draft: CustomProviderDraft): {
  provider: CustomProvider | null
  errors: Partial<Record<keyof CustomProviderDraft, string>>
} {
  const errors: Partial<Record<keyof CustomProviderDraft, string>> = {}
  const name = draft.name.trim()
  const baseUrl = draft.baseUrl.trim().replace(/\/+$/, '')
  const key = draft.key.trim()
  const modelIds = parseModelIds(draft.modelIds)
  const { headers, error: headerError } = parseExtraHeaders(draft.extraHeaders)

  if (!name) errors.name = 'Add a display name.'
  if (!/^https:\/\/[^\s]+\/v1$/.test(baseUrl)) errors.baseUrl = 'Use an https URL that ends in /v1.'
  if (!key) errors.key = 'Paste the API key.'
  if (modelIds.length === 0) errors.modelIds = 'Add at least one model id.'
  if (headerError) errors.extraHeaders = headerError

  const rawWindow = draft.contextWindow.trim()
  let contextWindow: number | null = null
  if (rawWindow) {
    const parsed = Number(rawWindow)
    if (!Number.isFinite(parsed) || parsed < 1000) {
      errors.contextWindow = 'Context window must be 1000 tokens or more.'
    } else {
      contextWindow = Math.round(parsed)
    }
  }

  if (Object.keys(errors).length > 0) return { provider: null, errors }

  return {
    provider: {
      id: `custom:${slugifyProviderName(name)}`,
      label: name,
      baseUrl,
      modelIds,
      extraHeaders: headers,
      contextWindow,
    },
    errors,
  }
}
