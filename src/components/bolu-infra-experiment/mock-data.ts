/**
 * MOCK DATA — Design Lab preview only.
 *
 * Strict isolation:
 * - No live API calls.
 * - No secrets or credentials read.
 * - Mock connection states and telemetry for preview purposes only.
 */

export interface MockConnection {
  id: string
  name: string
  providerId: string
  protocol: 'openai' | 'anthropic'
  maskedKey: string
  baseUrl: string
  priority: number
  inPool: boolean
  isEnabled: boolean
  isPrimary: boolean
  healthStatus: 'healthy' | 'cooling_down' | 'exhausted' | 'quarantined' | 'unchecked'
  activeModel: string
  activeModelCount: number
  connected: boolean
}

export interface MockModelItem {
  id: string
  label: string
  isFree: boolean
  isDefault: boolean
  enabled: boolean
}

export interface MockRoutingEvent {
  id: string
  timestamp: string
  eventType: string
  provider: string
  model: string
  reason: string
}

export interface MockUsageStats {
  requests: number
  totalTokens: string
  distinctUsers: number
  costUsd: string
  failedRequests: number
}

export const MOCK_CONNECTIONS: MockConnection[] = [
  {
    id: 'conn-bouxre',
    name: 'Bourxe',
    providerId: 'openrouter',
    protocol: 'openai',
    maskedKey: 'sk-or-v1-••••••••8a95',
    baseUrl: 'https://openrouter.ai/api/v1',
    priority: 1,
    inPool: true,
    isEnabled: true,
    isPrimary: true,
    healthStatus: 'healthy',
    activeModel: 'cohere/north-mini-code:free',
    activeModelCount: 11,
    connected: true,
  },
  {
    id: 'conn-amd',
    name: 'AMD Token Factory',
    providerId: 'custom',
    protocol: 'openai',
    maskedKey: 'sk-amd-••••••••1104',
    baseUrl: 'https://inference.amd.com/v1',
    priority: 10,
    inPool: true,
    isEnabled: true,
    isPrimary: false,
    healthStatus: 'healthy',
    activeModel: 'deepseek-ai/DeepSeek-V3',
    activeModelCount: 1,
    connected: true,
  },
  {
    id: 'conn-openai',
    name: 'OpenAI Direct',
    providerId: 'openai',
    protocol: 'openai',
    maskedKey: 'sk-proj-••••••••4412',
    baseUrl: 'https://api.openai.com/v1',
    priority: 20,
    inPool: true,
    isEnabled: true,
    isPrimary: false,
    healthStatus: 'healthy',
    activeModel: 'gpt-4o-mini',
    activeModelCount: 4,
    connected: true,
  },
  {
    id: 'conn-anthropic',
    name: 'Anthropic Direct',
    providerId: 'anthropic',
    protocol: 'anthropic',
    maskedKey: 'sk-ant-••••••••9931',
    baseUrl: 'https://api.anthropic.com',
    priority: 30,
    inPool: true,
    isEnabled: true,
    isPrimary: false,
    healthStatus: 'cooling_down',
    activeModel: 'claude-3-5-sonnet-20241022',
    activeModelCount: 3,
    connected: true,
  },
  {
    id: 'conn-gemini',
    name: 'Google Gemini',
    providerId: 'gemini',
    protocol: 'openai',
    maskedKey: 'AIzaSy••••••••2208',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    priority: 40,
    inPool: false,
    isEnabled: true,
    isPrimary: false,
    healthStatus: 'healthy',
    activeModel: 'gemini-2.0-flash-exp',
    activeModelCount: 2,
    connected: true,
  },
  {
    id: 'conn-groq',
    name: 'Groq Cloud',
    providerId: 'groq',
    protocol: 'openai',
    maskedKey: 'gsk_••••••••6614',
    baseUrl: 'https://api.groq.com/openai/v1',
    priority: 50,
    inPool: false,
    isEnabled: false,
    isPrimary: false,
    healthStatus: 'unchecked',
    activeModel: 'llama-3.3-70b-versatile',
    activeModelCount: 1,
    connected: false,
  },
]

export const MOCK_MODELS: MockModelItem[] = [
  { id: 'cohere/north-mini-code:free', label: 'Cohere North Mini Code', isFree: true, isDefault: true, enabled: true },
  { id: 'anthropic:claude-fable-latest', label: 'Anthropic: Claude Fable Latest', isFree: false, isDefault: false, enabled: false },
  { id: 'anthropic:claude-haiku-latest', label: 'Anthropic: Claude Haiku Latest', isFree: false, isDefault: false, enabled: true },
  { id: 'anthropic:claude-opus-latest', label: 'Anthropic: Claude Opus Latest', isFree: false, isDefault: false, enabled: false },
  { id: 'anthropic:claude-sonnet-latest', label: 'Anthropic: Claude Sonnet Latest', isFree: false, isDefault: false, enabled: true },
  { id: 'deepseek:deepseek-flash-latest', label: 'DeepSeek: DeepSeek Flash Latest', isFree: false, isDefault: false, enabled: true },
  { id: 'deepseek:deepseek-pro-latest', label: 'DeepSeek: DeepSeek Pro Latest', isFree: false, isDefault: false, enabled: false },
  { id: 'google/gemini-2.0-flash-exp:free', label: 'Google: Gemini 2.0 Flash Exp', isFree: true, isDefault: false, enabled: true },
  { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Meta: Llama 3.3 70B Instruct', isFree: false, isDefault: false, enabled: true },
]

export const MOCK_CATALOGUE_PROVIDERS = [
  { id: 'openrouter', name: 'OpenRouter', connected: true, protocol: 'OpenAI-compatible', discovery: 'Discovery' },
  { id: 'openai', name: 'OpenAI', connected: true, protocol: 'OpenAI-compatible', discovery: 'Discovery' },
  { id: 'anthropic', name: 'Anthropic', connected: true, protocol: 'Anthropic', discovery: 'Discovery' },
  { id: 'gemini', name: 'Google Gemini', connected: true, protocol: 'OpenAI-compatible', discovery: 'Discovery' },
  { id: 'groq', name: 'Groq', connected: false, protocol: 'OpenAI-compatible', discovery: 'Discovery' },
  { id: 'deepseek', name: 'DeepSeek', connected: false, protocol: 'OpenAI-compatible', discovery: 'Discovery' },
  { id: 'mistral', name: 'Mistral', connected: false, protocol: 'OpenAI-compatible', discovery: 'Discovery' },
  { id: 'amd', name: 'AMD Token Factory', connected: true, protocol: 'OpenAI-compatible', discovery: 'Custom' },
]

export const MOCK_USAGE_STATS: MockUsageStats = {
  requests: 46,
  totalTokens: '113.5K',
  distinctUsers: 1,
  costUsd: '$0.18',
  failedRequests: 0,
}

export const MOCK_ROUTING_EVENTS: MockRoutingEvent[] = [
  {
    id: 'evt-1',
    timestamp: '09:12:44',
    eventType: 'ATOMIC_CLAIM',
    provider: 'Bourxe (OpenRouter)',
    model: 'cohere/north-mini-code:free',
    reason: 'Priority rank 1 in active pool healthy',
  },
  {
    id: 'evt-2',
    timestamp: '08:45:10',
    eventType: 'HEALTH_PROBE',
    provider: 'AMD Token Factory',
    model: 'deepseek-ai/DeepSeek-V3',
    reason: 'Periodic ping passed (240ms)',
  },
  {
    id: 'evt-3',
    timestamp: '07:30:19',
    eventType: 'COOLDOWN_RECOVERY',
    provider: 'Anthropic Direct',
    model: 'claude-3-5-sonnet',
    reason: 'Rate limit backoff window elapsed',
  },
]
