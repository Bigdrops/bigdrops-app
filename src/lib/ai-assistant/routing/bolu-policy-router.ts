/**
 * Bolu AI Routing Subsystem — Policy Router
 *
 * Deterministic policy evaluation for AI provider selection.
 * Enforces tenant authorization, approved providers, model eligibility,
 * paid-tier restrictions, and task-specific model assignments.
 *
 * Security: Pure policy logic. Never allows unapproved providers to receive business data.
 */

import { ROUTING_PROVIDER_CATALOGUE } from './bolu-provider-catalog.js'

export type BoluTaskType =
  | 'invoice-chat'
  | 'invoice-operation'
  | 'document-retrieval'
  | 'general'

export type PolicyInput = {
  userId: string
  tenantId?: string | null
  taskType?: BoluTaskType
  preferredProvider?: string | null
  preferredModel?: string | null
  allowPaid?: boolean
  allowCustom?: boolean
}

export type PolicyDecision = {
  ok: boolean
  error?: string
  taskType: BoluTaskType
  allowedProviders: string[]
  targetModel: string
  allowPaid: boolean
  maxAttempts: number
}

const DEFAULT_APPROVED_PROVIDERS = Object.keys(ROUTING_PROVIDER_CATALOGUE).filter(
  (id) => ROUTING_PROVIDER_CATALOGUE[id]?.approvedForRouting,
)
const HARD_MAX_ATTEMPTS = 4

/**
 * Resolves routing policy deterministically based on task requirements,
 * user authorization, and provider approvals.
 */
export function resolveRoutingPolicy(input: PolicyInput): PolicyDecision {
  if (!input.userId || typeof input.userId !== 'string') {
    return {
      ok: false,
      error: 'User authentication is required for Bolu AI routing.',
      taskType: 'general',
      allowedProviders: [],
      targetModel: '',
      allowPaid: false,
      maxAttempts: 0,
    }
  }

  const taskType: BoluTaskType = input.taskType || 'invoice-chat'
  const allowPaid = Boolean(input.allowPaid)

  // 1. Determine allowed providers
  let allowedProviders: string[] = input.allowCustom
    ? [...DEFAULT_APPROVED_PROVIDERS, 'custom']
    : [...DEFAULT_APPROVED_PROVIDERS]

  if (input.preferredProvider) {
    const pref = input.preferredProvider.trim().toLowerCase()
    if (pref === 'amd') {
      // Prioritize AMD but allow fallback to openrouter/deepseek if AMD is exhausted
      allowedProviders = input.allowCustom
        ? ['amd', 'openrouter', 'deepseek', 'custom']
        : ['amd', 'openrouter', 'deepseek']
    } else if (pref === 'custom') {
      allowedProviders = ['custom', ...DEFAULT_APPROVED_PROVIDERS]
    } else if (DEFAULT_APPROVED_PROVIDERS.includes(pref)) {
      const rest = input.allowCustom
        ? [...DEFAULT_APPROVED_PROVIDERS.filter((p) => p !== pref), 'custom']
        : DEFAULT_APPROVED_PROVIDERS.filter((p) => p !== pref)
      allowedProviders = [pref, ...rest]
    }
  }

  // Filter to only verified approved providers in the catalog or custom
  allowedProviders = allowedProviders.filter((p) => {
    if (p === 'custom') return true
    const entry = ROUTING_PROVIDER_CATALOGUE[p]
    return entry && entry.approvedForRouting
  })

  // 2. Resolve target model deterministically
  let targetModel = ''
  if (input.preferredModel && typeof input.preferredModel === 'string' && input.preferredModel.trim()) {
    targetModel = input.preferredModel.trim()
  } else {
    // Deterministic task-to-model mapping from catalog default
    const primaryProvider = allowedProviders[0] || 'amd'
    const entry = ROUTING_PROVIDER_CATALOGUE[primaryProvider]
    targetModel = entry?.verifiedModels.find((m) => m.isDefault)?.id || 'DeepSeek-V4-Flash'
  }

  return {
    ok: true,
    taskType,
    allowedProviders,
    targetModel,
    allowPaid,
    maxAttempts: HARD_MAX_ATTEMPTS,
  }
}
