/**
 * Bolu AI Routing Subsystem — Provider Catalogue
 *
 * Typed provider catalogue for multi-account AI routing.
 * Defines verified endpoints, protocols, authentication schemes,
 * verified models, capabilities, and SSRF-safe custom endpoint validation.
 *
 * Security: Node-only or isomorphic. Never expose secrets or permit SSRF.
 */

import { validateEndpointSyntax } from '../provider-security.js'

export type RoutingProtocol = 'openai-compatible' | 'anthropic' | 'gemini'
export type RoutingAuthScheme = 'bearer' | 'x-api-key'

export type VerifiedModel = {
  id: string
  label: string
  contextWindow?: number
  isDefault?: boolean
}

export type RoutingCapability =
  | 'chat-completions'
  | 'streaming'
  | 'tools'
  | 'json-mode'
  | 'system-prompt'

export type RoutingProviderEntry = {
  providerId: string
  displayName: string
  protocol: RoutingProtocol
  verifiedEndpoint: string | null
  authScheme: RoutingAuthScheme
  verifiedModels: VerifiedModel[]
  supportedCapabilities: RoutingCapability[]
  modelDiscoverySupport: boolean
  balanceLookupSupport: boolean
  approvedForRouting: boolean
  notes?: string
}

export type CustomProviderConfig = {
  providerId: string
  displayName: string
  protocol: RoutingProtocol
  endpoint: string
  authScheme: RoutingAuthScheme
  defaultModel: string
  allowedModels?: string[]
}

export const ROUTING_PROVIDER_CATALOGUE: Record<string, RoutingProviderEntry> = {
  amd: {
    providerId: 'amd',
    displayName: 'AMD Token Factory',
    protocol: 'openai-compatible',
    verifiedEndpoint: 'https://developer.amd.com.cn/radeon/api/v1',
    authScheme: 'bearer',
    verifiedModels: [
      { id: 'DeepSeek-V4-Flash', label: 'DeepSeek V4 Flash', isDefault: true },
    ],
    supportedCapabilities: ['chat-completions', 'streaming'],
    modelDiscoverySupport: true,
    balanceLookupSupport: false,
    approvedForRouting: true,
    notes: 'Hosted on developer.amd.com.cn. High-throughput inference for verified keys.',
  },
  openrouter: {
    providerId: 'openrouter',
    displayName: 'OpenRouter',
    protocol: 'openai-compatible',
    verifiedEndpoint: 'https://openrouter.ai/api/v1',
    authScheme: 'bearer',
    verifiedModels: [
      { id: 'openrouter/free', label: 'OpenRouter Free', isDefault: true },
      { id: 'deepseek/deepseek-chat', label: 'DeepSeek Chat' },
      { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B Instruct' },
    ],
    supportedCapabilities: ['chat-completions', 'streaming', 'tools', 'json-mode'],
    modelDiscoverySupport: true,
    balanceLookupSupport: true,
    approvedForRouting: true,
    notes: 'Multi-model aggregator. Supports /api/v1/credits balance inspection.',
  },
  deepseek: {
    providerId: 'deepseek',
    displayName: 'DeepSeek',
    protocol: 'openai-compatible',
    verifiedEndpoint: 'https://api.deepseek.com/v1',
    authScheme: 'bearer',
    verifiedModels: [
      { id: 'deepseek-chat', label: 'DeepSeek Chat', isDefault: true },
      { id: 'deepseek-reasoner', label: 'DeepSeek Reasoner' },
    ],
    supportedCapabilities: ['chat-completions', 'streaming', 'json-mode'],
    modelDiscoverySupport: true,
    balanceLookupSupport: true,
    approvedForRouting: true,
    notes: 'Native DeepSeek API. Supports /user/balance inquiry.',
  },
  openai: {
    providerId: 'openai',
    displayName: 'OpenAI',
    protocol: 'openai-compatible',
    verifiedEndpoint: 'https://api.openai.com/v1',
    authScheme: 'bearer',
    verifiedModels: [
      { id: 'gpt-4o-mini', label: 'GPT-4o mini', isDefault: true },
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'o4-mini', label: 'o4 mini' },
    ],
    supportedCapabilities: ['chat-completions', 'streaming', 'tools', 'json-mode'],
    modelDiscoverySupport: true,
    balanceLookupSupport: false,
    approvedForRouting: true,
    notes: 'OpenAI standard API.',
  },
  anthropic: {
    providerId: 'anthropic',
    displayName: 'Anthropic',
    protocol: 'anthropic',
    verifiedEndpoint: 'https://api.anthropic.com/v1',
    authScheme: 'x-api-key',
    verifiedModels: [
      { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', isDefault: true },
      { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
    ],
    supportedCapabilities: ['chat-completions', 'streaming', 'tools', 'system-prompt'],
    modelDiscoverySupport: true,
    balanceLookupSupport: false,
    approvedForRouting: true,
    notes: 'Native Anthropic messages protocol with x-api-key.',
  },
  groq: {
    providerId: 'groq',
    displayName: 'Groq',
    protocol: 'openai-compatible',
    verifiedEndpoint: 'https://api.groq.com/openai/v1',
    authScheme: 'bearer',
    verifiedModels: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile', isDefault: true },
      { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant' },
    ],
    supportedCapabilities: ['chat-completions', 'streaming', 'tools', 'json-mode'],
    modelDiscoverySupport: true,
    balanceLookupSupport: false,
    approvedForRouting: true,
    notes: 'Ultra-low latency LPU inference.',
  },
  gemini: {
    providerId: 'gemini',
    displayName: 'Google Gemini',
    protocol: 'openai-compatible',
    verifiedEndpoint: 'https://generativelanguage.googleapis.com/v1beta/openai',
    authScheme: 'bearer',
    verifiedModels: [
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', isDefault: true },
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
      { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    ],
    supportedCapabilities: ['chat-completions', 'streaming', 'tools'],
    modelDiscoverySupport: true,
    balanceLookupSupport: false,
    approvedForRouting: true,
    notes: 'Google Gemini OpenAI-compatible endpoint.',
  },
  mistral: {
    providerId: 'mistral',
    displayName: 'Mistral AI',
    protocol: 'openai-compatible',
    verifiedEndpoint: 'https://api.mistral.ai/v1',
    authScheme: 'bearer',
    verifiedModels: [
      { id: 'mistral-small-latest', label: 'Mistral Small', isDefault: true },
      { id: 'mistral-large-latest', label: 'Mistral Large' },
    ],
    supportedCapabilities: ['chat-completions', 'streaming', 'tools', 'json-mode'],
    modelDiscoverySupport: true,
    balanceLookupSupport: false,
    approvedForRouting: true,
    notes: 'Native Mistral AI OpenAI-compatible endpoint.',
  },
  qwen: {
    providerId: 'qwen',
    displayName: 'Qwen / Alibaba Cloud',
    protocol: 'openai-compatible',
    verifiedEndpoint: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    authScheme: 'bearer',
    verifiedModels: [
      { id: 'qwen-plus', label: 'Qwen Plus', isDefault: true },
      { id: 'qwen-turbo', label: 'Qwen Turbo' },
      { id: 'qwen-max', label: 'Qwen Max' },
    ],
    supportedCapabilities: ['chat-completions', 'streaming'],
    modelDiscoverySupport: true,
    balanceLookupSupport: false,
    approvedForRouting: true,
    notes: 'International DashScope OpenAI-compatible endpoint.',
  },
  together: {
    providerId: 'together',
    displayName: 'Together AI',
    protocol: 'openai-compatible',
    verifiedEndpoint: 'https://api.together.xyz/v1',
    authScheme: 'bearer',
    verifiedModels: [
      { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', label: 'Llama 3.3 70B Turbo', isDefault: true },
    ],
    supportedCapabilities: ['chat-completions', 'streaming'],
    modelDiscoverySupport: true,
    balanceLookupSupport: false,
    approvedForRouting: true,
    notes: 'Together AI OpenAI-compatible endpoint.',
  },
  fireworks: {
    providerId: 'fireworks',
    displayName: 'Fireworks AI',
    protocol: 'openai-compatible',
    verifiedEndpoint: 'https://api.fireworks.ai/inference/v1',
    authScheme: 'bearer',
    verifiedModels: [
      { id: 'accounts/fireworks/models/llama-v3p3-70b-instruct', label: 'Llama 3.3 70B', isDefault: true },
    ],
    supportedCapabilities: ['chat-completions', 'streaming'],
    modelDiscoverySupport: true,
    balanceLookupSupport: false,
    approvedForRouting: true,
    notes: 'Fireworks AI serverless inference endpoint.',
  },
  cerebras: {
    providerId: 'cerebras',
    displayName: 'Cerebras',
    protocol: 'openai-compatible',
    verifiedEndpoint: 'https://api.cerebras.ai/v1',
    authScheme: 'bearer',
    verifiedModels: [
      { id: 'llama-3.3-70b', label: 'Llama 3.3 70B', isDefault: true },
    ],
    supportedCapabilities: ['chat-completions', 'streaming'],
    modelDiscoverySupport: true,
    balanceLookupSupport: false,
    approvedForRouting: true,
    notes: 'Cerebras wafer-scale inference endpoint.',
  },
  xai: {
    providerId: 'xai',
    displayName: 'xAI Grok',
    protocol: 'openai-compatible',
    verifiedEndpoint: 'https://api.x.ai/v1',
    authScheme: 'bearer',
    verifiedModels: [
      { id: 'grok-3-mini', label: 'Grok 3 mini', isDefault: true },
      { id: 'grok-3', label: 'Grok 3' },
    ],
    supportedCapabilities: ['chat-completions', 'streaming'],
    modelDiscoverySupport: true,
    balanceLookupSupport: false,
    approvedForRouting: true,
    notes: 'xAI Grok OpenAI-compatible endpoint.',
  },
  cohere: {
    providerId: 'cohere',
    displayName: 'Cohere',
    protocol: 'openai-compatible',
    verifiedEndpoint: 'https://api.cohere.ai/compatibility/v1',
    authScheme: 'bearer',
    verifiedModels: [
      { id: 'command-r-plus', label: 'Command R+', isDefault: true },
      { id: 'command-r', label: 'Command R' },
    ],
    supportedCapabilities: ['chat-completions', 'streaming'],
    modelDiscoverySupport: true,
    balanceLookupSupport: false,
    approvedForRouting: true,
    notes: 'Cohere compatibility API.',
  },
  nvidia: {
    providerId: 'nvidia',
    displayName: 'NVIDIA NIM',
    protocol: 'openai-compatible',
    verifiedEndpoint: 'https://integrate.api.nvidia.com/v1',
    authScheme: 'bearer',
    verifiedModels: [
      { id: 'nvidia/nemotron-3.5-lightning-30b-a3b', label: 'Nemotron 3.5 Lightning 30B A3B', isDefault: true },
      { id: 'nvidia/nemotron-3.5-bolt-e4b', label: 'Nemotron 3.5 Bolt E4B' },
      { id: 'nvidia/nemotron-3-ultra-550b-a55b', label: 'Nemotron 3 Ultra 550B A55B' },
      { id: 'meta/muse-glimmer-30b', label: 'Muse Glimmer 30B' },
      { id: 'mistralai/mistral-large-4-1t-a52b', label: 'Mistral Large 4' },
    ],
    supportedCapabilities: ['chat-completions', 'streaming', 'tools', 'json-mode'],
    modelDiscoverySupport: true,
    balanceLookupSupport: false,
    approvedForRouting: true,
    notes: 'NVIDIA NIM OpenAI-compatible API.',
  },
  '100milionseek': {
    providerId: '100milionseek',
    displayName: '100milionseek',
    protocol: 'openai-compatible',
    verifiedEndpoint: 'https://100milionseek.top/v1',
    authScheme: 'bearer',
    verifiedModels: [
      { id: 'deepseek-v4.1-flash-free', label: 'DeepSeek V4.1 Flash Free', isDefault: true },
    ],
    supportedCapabilities: ['chat-completions', 'streaming', 'tools'],
    modelDiscoverySupport: true,
    balanceLookupSupport: false,
    approvedForRouting: true,
    notes: 'Pooled third-party endpoint running one upstream key for many accounts. High latency and variable uptime. Keep out of tenant traffic.',
  },
  plamo: {
    providerId: 'plamo',
    displayName: 'PLaMo (Preferred Networks)',
    protocol: 'openai-compatible',
    verifiedEndpoint: 'https://api.platform.preferredai.jp/v1',
    authScheme: 'bearer',
    verifiedModels: [
      { id: 'plamo-3.1-prime', label: 'PLaMo 3.1 Prime', isDefault: true },
      { id: 'plamo-3.0-prime', label: 'PLaMo 3.0 Prime' },
      { id: 'plamo-3.0-fin-beta', label: 'PLaMo 3.0 Fin Beta' },
    ],
    supportedCapabilities: ['chat-completions', 'streaming', 'tools'],
    modelDiscoverySupport: true,
    balanceLookupSupport: false,
    approvedForRouting: true,
    notes: 'Preferred Networks PLaMo API. Japan-hosted. Free plan has usage limits. plamo-3.0-prime retires on 2027-01-31.',
  },
}

export function getRoutingProvider(providerId: string): RoutingProviderEntry | undefined {
  return ROUTING_PROVIDER_CATALOGUE[providerId.toLowerCase()]
}

export function isRoutingApproved(providerId: string): boolean {
  const entry = getRoutingProvider(providerId)
  return entry ? entry.approvedForRouting : false
}

export function isProtocolSupported(protocol: string): protocol is RoutingProtocol {
  return protocol === 'openai-compatible' || protocol === 'anthropic' || protocol === 'gemini'
}

export function isAuthSchemeSupported(scheme: string): scheme is RoutingAuthScheme {
  return scheme === 'bearer' || scheme === 'x-api-key'
}

/**
 * Validates a custom provider configuration to ensure security and protocol correctness.
 * Enforces HTTPS, blocks private/internal IP ranges (SSRF defense), and checks model/protocol rules.
 */
export function validateCustomProviderConfig(input: {
  providerId: string
  displayName: string
  protocol: string
  endpoint: string
  authScheme: string
  defaultModel: string
  allowedModels?: string[]
}): { ok: true; config: CustomProviderConfig } | { ok: false; error: string } {
  const providerId = input.providerId?.trim().toLowerCase()
  if (!providerId) {
    return { ok: false, error: 'Provider ID is required.' }
  }

  const displayName = input.displayName?.trim()
  if (!displayName || displayName.length > 80) {
    return { ok: false, error: 'Display name is required and must not exceed 80 characters.' }
  }

  if (!isProtocolSupported(input.protocol)) {
    return { ok: false, error: `Protocol "${input.protocol}" is not supported. Use openai-compatible, anthropic, or gemini.` }
  }

  if (!isAuthSchemeSupported(input.authScheme)) {
    return { ok: false, error: `Authentication scheme "${input.authScheme}" is not supported. Use bearer or x-api-key.` }
  }

  const endpointValidation = validateEndpointSyntax(input.endpoint)
  if (endpointValidation.ok === false) {
    const reason = 'error' in endpointValidation ? endpointValidation.error : 'Endpoint validation failed.'
    return { ok: false, error: reason }
  }

  const defaultModel = input.defaultModel?.trim()
  if (!defaultModel || defaultModel.length > 200 || /[\s<>"]/.test(defaultModel)) {
    return { ok: false, error: 'Default model must be a valid, non-empty model identifier.' }
  }

  const allowedModels: string[] = []
  if (Array.isArray(input.allowedModels)) {
    for (const m of input.allowedModels) {
      if (typeof m === 'string' && m.trim() && !/[\s<>"]/.test(m.trim())) {
        allowedModels.push(m.trim())
      }
    }
  }
  if (!allowedModels.includes(defaultModel)) {
    allowedModels.unshift(defaultModel)
  }

  return {
    ok: true,
    config: {
      providerId,
      displayName,
      protocol: input.protocol,
      endpoint: endpointValidation.url,
      authScheme: input.authScheme,
      defaultModel,
      allowedModels,
    },
  }
}
