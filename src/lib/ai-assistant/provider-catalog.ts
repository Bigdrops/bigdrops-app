/**
 * Production provider catalogue for the Bolu AI infrastructure subsystem.
 *
 * Unlike providerRegistry.ts (Design Lab simulation), every entry here maps to
 * a verified, generally available API contract: endpoint, authentication
 * scheme, request protocol and model-discovery capability. Curated model lists
 * are suggested starting points only — live discovery is the source of truth.
 * No capability, pricing or performance claims are made here.
 *
 * This module is client-safe (no Node imports) so the Settings UI and the
 * serverless API share one catalogue.
 */

export type ProviderProtocol = 'openai' | 'anthropic'
export type ProviderAuthScheme = 'bearer' | 'x-api-key'

export type CatalogueModel = {
  id: string
  label: string
}

export type ProviderCatalogueEntry = {
  id: string
  name: string
  description: string
  protocol: ProviderProtocol
  authScheme: ProviderAuthScheme
  baseUrl: string
  /** A GET models endpoint exists per the provider's documented contract. */
  supportsDiscovery: boolean
  docsUrl: string
  keyHint: string
  defaultModel: string
  curatedModels: CatalogueModel[]
  /** Data-routing note shown to administrators before they connect. */
  regionNote?: string
}

export const CUSTOM_PROVIDER_ID = 'custom'

const M = (id: string, label: string): CatalogueModel => ({ id, label })

export const PROVIDER_CATALOGUE: ProviderCatalogueEntry[] = [
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'One key routes to many models. OpenAI-compatible aggregator.',
    protocol: 'openai',
    authScheme: 'bearer',
    baseUrl: 'https://openrouter.ai/api/v1',
    supportsDiscovery: true,
    docsUrl: 'https://openrouter.ai/docs',
    keyHint: 'sk-or-…',
    defaultModel: 'openrouter/free',
    curatedModels: [
      M('openrouter/free', 'Free router'),
      M('deepseek/deepseek-chat', 'DeepSeek Chat'),
      M('meta-llama/llama-3.3-70b-instruct', 'Llama 3.3 70B Instruct'),
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Native OpenAI chat completions API.',
    protocol: 'openai',
    authScheme: 'bearer',
    baseUrl: 'https://api.openai.com/v1',
    supportsDiscovery: true,
    docsUrl: 'https://platform.openai.com/docs/api-reference',
    keyHint: 'sk-…',
    defaultModel: 'gpt-4o-mini',
    curatedModels: [
      M('gpt-4o-mini', 'GPT-4o mini'),
      M('gpt-4o', 'GPT-4o'),
      M('o4-mini', 'o4 mini'),
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Native Anthropic messages API. Uses x-api-key authentication.',
    protocol: 'anthropic',
    authScheme: 'x-api-key',
    baseUrl: 'https://api.anthropic.com/v1',
    supportsDiscovery: true,
    docsUrl: 'https://docs.anthropic.com/en/api',
    keyHint: 'sk-ant-…',
    defaultModel: 'claude-sonnet-4-5',
    curatedModels: [
      M('claude-sonnet-4-5', 'Claude Sonnet 4.5'),
      M('claude-haiku-4-5', 'Claude Haiku 4.5'),
      M('claude-opus-4-1', 'Claude Opus 4.1'),
    ],
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Gemini via the Google AI OpenAI-compatible endpoint.',
    protocol: 'openai',
    authScheme: 'bearer',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    supportsDiscovery: true,
    docsUrl: 'https://ai.google.dev/gemini-api/docs/openai',
    keyHint: 'AIza…',
    defaultModel: 'gemini-2.5-flash',
    curatedModels: [
      M('gemini-2.5-flash', 'Gemini 2.5 Flash'),
      M('gemini-2.5-pro', 'Gemini 2.5 Pro'),
      M('gemini-2.0-flash', 'Gemini 2.0 Flash'),
    ],
  },
  {
    id: 'groq',
    name: 'Groq',
    description: 'Low-latency open-model inference. OpenAI-compatible.',
    protocol: 'openai',
    authScheme: 'bearer',
    baseUrl: 'https://api.groq.com/openai/v1',
    supportsDiscovery: true,
    docsUrl: 'https://console.groq.com/docs',
    keyHint: 'gsk_…',
    defaultModel: 'llama-3.3-70b-versatile',
    curatedModels: [
      M('llama-3.3-70b-versatile', 'Llama 3.3 70B Versatile'),
      M('openai/gpt-oss-120b', 'GPT-OSS 120B'),
      M('qwen/qwen3-32b', 'Qwen 3 32B'),
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'DeepSeek chat and reasoner models. OpenAI-compatible.',
    protocol: 'openai',
    authScheme: 'bearer',
    baseUrl: 'https://api.deepseek.com/v1',
    supportsDiscovery: true,
    docsUrl: 'https://api-docs.deepseek.com',
    keyHint: 'sk-…',
    defaultModel: 'deepseek-chat',
    curatedModels: [
      M('deepseek-chat', 'DeepSeek Chat'),
      M('deepseek-reasoner', 'DeepSeek Reasoner'),
    ],
  },
  {
    id: 'mistral',
    name: 'Mistral',
    description: 'Mistral models. OpenAI-compatible.',
    protocol: 'openai',
    authScheme: 'bearer',
    baseUrl: 'https://api.mistral.ai/v1',
    supportsDiscovery: true,
    docsUrl: 'https://docs.mistral.ai',
    keyHint: 'Key from console.mistral.ai',
    defaultModel: 'mistral-small-latest',
    curatedModels: [
      M('mistral-small-latest', 'Mistral Small'),
      M('mistral-large-latest', 'Mistral Large'),
    ],
  },
  {
    id: 'amd',
    name: 'AMD Token Factory',
    description: 'OpenAI-compatible inference on AMD Radeon Cloud. Accepts rc- developer keys.',
    protocol: 'openai',
    authScheme: 'bearer',
    baseUrl: 'https://developer.amd.com.cn/radeon/api/v1',
    supportsDiscovery: true,
    docsUrl: 'https://developer.amd.com.cn/radeon/tokenfactory',
    keyHint: 'rc-…',
    defaultModel: 'DeepSeek-V4-Flash',
    curatedModels: [M('DeepSeek-V4-Flash', 'DeepSeek V4 Flash')],
    regionNote: 'Endpoint hosted on the AMD China developer site (developer.amd.com.cn).',
  },
  {
    id: 'qwen',
    name: 'Qwen / Alibaba Cloud',
    description: 'Qwen via Alibaba Cloud Model Studio (DashScope) compatible mode.',
    protocol: 'openai',
    authScheme: 'bearer',
    baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    supportsDiscovery: true,
    docsUrl: 'https://www.alibabacloud.com/help/en/model-studio/',
    keyHint: 'sk-…',
    defaultModel: 'qwen-plus',
    curatedModels: [
      M('qwen-plus', 'Qwen Plus'),
      M('qwen-turbo', 'Qwen Turbo'),
      M('qwen-max', 'Qwen Max'),
    ],
    regionNote: 'International DashScope endpoint. A China endpoint (dashscope.aliyuncs.com) also exists.',
  },
  {
    id: 'together',
    name: 'Together AI',
    description: 'Open-model host. Model ids keep the vendor prefix.',
    protocol: 'openai',
    authScheme: 'bearer',
    baseUrl: 'https://api.together.xyz/v1',
    supportsDiscovery: true,
    docsUrl: 'https://docs.together.ai',
    keyHint: 'tgp_v1_…',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    curatedModels: [M('meta-llama/Llama-3.3-70B-Instruct-Turbo', 'Llama 3.3 70B Turbo')],
  },
  {
    id: 'fireworks',
    name: 'Fireworks AI',
    description: 'Serverless inference. Model ids carry the account path.',
    protocol: 'openai',
    authScheme: 'bearer',
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    supportsDiscovery: true,
    docsUrl: 'https://docs.fireworks.ai',
    keyHint: 'Key from fireworks.ai',
    defaultModel: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
    curatedModels: [M('accounts/fireworks/models/llama-v3p3-70b-instruct', 'Llama 3.3 70B')],
  },
  {
    id: 'cerebras',
    name: 'Cerebras',
    description: 'Wafer-scale inference. OpenAI-compatible.',
    protocol: 'openai',
    authScheme: 'bearer',
    baseUrl: 'https://api.cerebras.ai/v1',
    supportsDiscovery: true,
    docsUrl: 'https://inference-docs.cerebras.ai',
    keyHint: 'csk-…',
    defaultModel: 'llama-3.3-70b',
    curatedModels: [M('llama-3.3-70b', 'Llama 3.3 70B')],
  },
  {
    id: 'xai',
    name: 'xAI Grok',
    description: 'Grok models. OpenAI-compatible.',
    protocol: 'openai',
    authScheme: 'bearer',
    baseUrl: 'https://api.x.ai/v1',
    supportsDiscovery: true,
    docsUrl: 'https://docs.x.ai',
    keyHint: 'xai-…',
    defaultModel: 'grok-3-mini',
    curatedModels: [
      M('grok-3-mini', 'Grok 3 mini'),
      M('grok-3', 'Grok 3'),
    ],
  },
  {
    id: 'cohere',
    name: 'Cohere',
    description: 'Command models via the Cohere compatibility API.',
    protocol: 'openai',
    authScheme: 'bearer',
    baseUrl: 'https://api.cohere.ai/compatibility/v1',
    supportsDiscovery: true,
    docsUrl: 'https://docs.cohere.com/docs/compatibility-api',
    keyHint: 'Key from dashboard.cohere.com',
    defaultModel: 'command-r-plus',
    curatedModels: [
      M('command-r-plus', 'Command R+'),
      M('command-r', 'Command R'),
    ],
  },
  {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    description: 'NVIDIA-hosted open models. OpenAI-compatible.',
    protocol: 'openai',
    authScheme: 'bearer',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    supportsDiscovery: true,
    docsUrl: 'https://docs.api.nvidia.com',
    keyHint: 'nvapi-…',
    defaultModel: 'meta/llama-3.3-70b-instruct',
    curatedModels: [M('meta/llama-3.3-70b-instruct', 'Llama 3.3 70B Instruct')],
  },
]

export function getCatalogueEntry(id: string): ProviderCatalogueEntry | undefined {
  return PROVIDER_CATALOGUE.find((entry) => entry.id === id)
}

export function isCustomProvider(id: string): boolean {
  return id === CUSTOM_PROVIDER_ID
}

/** Resolves the effective protocol/auth/endpoint for a catalogue or custom provider. */
export function resolveProviderDefaults(
  providerId: string,
  overrides?: { protocol?: ProviderProtocol; authScheme?: ProviderAuthScheme; baseUrl?: string },
): { protocol: ProviderProtocol; authScheme: ProviderAuthScheme; baseUrl: string } | null {
  if (isCustomProvider(providerId)) {
    if (!overrides?.baseUrl || !overrides.protocol || !overrides.authScheme) return null
    return { protocol: overrides.protocol, authScheme: overrides.authScheme, baseUrl: overrides.baseUrl }
  }
  const entry = getCatalogueEntry(providerId)
  if (!entry) return null
  return {
    protocol: overrides?.protocol ?? entry.protocol,
    authScheme: overrides?.authScheme ?? entry.authScheme,
    baseUrl: overrides?.baseUrl?.trim() || entry.baseUrl,
  }
}