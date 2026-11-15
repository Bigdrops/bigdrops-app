/**
 * OpenRouter Model Price Classification & Sorting Authority
 *
 * Classifies model pricing into standard BOURXE cost bands:
 * - FREE: 0 cost for prompt, completion and request
 * - CHEAP: Highest token price > $0 and <= $1.00 per million tokens
 * - MEDIUM: Highest token price > $1.00 and <= $5.00 per million tokens
 * - PREMIUM: Highest token price > $5.00 per million tokens
 * - UNKNOWN: Pricing missing, invalid or uninterpretable
 *
 * Converts raw USD/token to USD/million tokens (MTok).
 * Node and browser safe. No external dependencies.
 */

export type PriceCategory = 'free' | 'cheap' | 'medium' | 'premium' | 'unknown'

export const PRICE_THRESHOLDS = {
  FREE_MAX: 0,
  CHEAP_MAX: 1.0, // <= $1.00 per million tokens
  MEDIUM_MAX: 5.0, // <= $5.00 per million tokens
} as const

export const CATEGORY_ORDER: Record<PriceCategory, number> = {
  free: 0,
  cheap: 1,
  medium: 2,
  premium: 3,
  unknown: 4,
}

export const CATEGORY_LABELS: Record<PriceCategory, string> = {
  free: 'FREE',
  cheap: 'CHEAP',
  medium: 'MEDIUM',
  premium: 'PREMIUM',
  unknown: 'UNKNOWN PRICING',
}

export interface ModelPricingDetails {
  category: PriceCategory
  promptPricePerM: number | null
  completionPricePerM: number | null
  requestPrice: number | null
  imagePrice: number | null
  maxTokenPricePerM: number | null
  formattedInputPrice: string | null
  formattedOutputPrice: string | null
  formattedSummary: string
  hasAdditionalCharges: boolean
  isFreeVariant: boolean
  rateLimitNote?: string
}

function parseNumericPrice(val: unknown): number | null {
  if (val === undefined || val === null || val === '') return null
  const num = typeof val === 'number' ? val : parseFloat(String(val))
  if (Number.isNaN(num) || num < 0) return null
  return num
}

function formatRatePerM(perM: number): string {
  if (perM === 0) return '$0.00'
  if (perM < 0.01) return `$${perM.toFixed(4)}`
  if (perM < 1) return `$${perM.toFixed(2)}`
  return `$${perM.toFixed(2)}`
}

/**
 * Helper to determine if a model is Free based on ID suffix or pricing metadata.
 */
export function isFreeModel(modelId: string, metadata?: Record<string, unknown>): boolean {
  const lower = modelId.toLowerCase()
  if (
    lower.includes(':free') ||
    lower.includes('/free') ||
    lower.endsWith('-free') ||
    lower.includes('-free-') ||
    lower.includes('free-router')
  ) {
    return true
  }
  const classification = classifyModelPricing(modelId, metadata?.pricing)
  return classification.category === 'free'
}

/**
 * Classifies and parses raw provider pricing metadata.
 */
export function classifyModelPricing(
  modelId: string,
  rawPricing?: unknown,
): ModelPricingDetails {
  const isFreeVariant = modelId.toLowerCase().includes(':free')
  const rateLimitNote = isFreeVariant
    ? 'Free variant with upstream usage limits and rate throttling.'
    : undefined

  if (!rawPricing || typeof rawPricing !== 'object') {
    return {
      category: isFreeVariant ? 'free' : 'unknown',
      promptPricePerM: isFreeVariant ? 0 : null,
      completionPricePerM: isFreeVariant ? 0 : null,
      requestPrice: null,
      imagePrice: null,
      maxTokenPricePerM: isFreeVariant ? 0 : null,
      formattedInputPrice: isFreeVariant ? '$0.00/M' : null,
      formattedOutputPrice: isFreeVariant ? '$0.00/M' : null,
      formattedSummary: isFreeVariant ? 'Free (rate-limited)' : 'Pricing unavailable',
      hasAdditionalCharges: false,
      isFreeVariant,
      rateLimitNote,
    }
  }

  const p = rawPricing as Record<string, unknown>
  const rawPrompt = parseNumericPrice(p.prompt)
  const rawCompletion = parseNumericPrice(p.completion)
  const rawRequest = parseNumericPrice(p.request)
  const rawImage = parseNumericPrice(p.image)

  // Token prices are required for valid classification
  if (rawPrompt === null || rawCompletion === null) {
    return {
      category: isFreeVariant ? 'free' : 'unknown',
      promptPricePerM: isFreeVariant ? 0 : null,
      completionPricePerM: isFreeVariant ? 0 : null,
      requestPrice: rawRequest,
      imagePrice: rawImage,
      maxTokenPricePerM: isFreeVariant ? 0 : null,
      formattedInputPrice: isFreeVariant ? '$0.00/M' : null,
      formattedOutputPrice: isFreeVariant ? '$0.00/M' : null,
      formattedSummary: isFreeVariant ? 'Free (rate-limited)' : 'Pricing incomplete',
      hasAdditionalCharges: (rawRequest ?? 0) > 0 || (rawImage ?? 0) > 0,
      isFreeVariant,
      rateLimitNote,
    }
  }

  // Convert to USD per million tokens (1M tokens)
  const promptPerM = rawPrompt * 1_000_000
  const completionPerM = rawCompletion * 1_000_000
  const maxTokenPerM = Math.max(promptPerM, completionPerM)
  const hasAdditionalCharges = (rawRequest ?? 0) > 0 || (rawImage ?? 0) > 0

  let category: PriceCategory

  // 1. FREE: Both prompt and completion are 0 AND no extra request charges
  if (promptPerM === 0 && completionPerM === 0 && !hasAdditionalCharges) {
    category = 'free'
  } else if (maxTokenPerM <= PRICE_THRESHOLDS.CHEAP_MAX) {
    // 2. CHEAP: <= $1.00 / M
    category = 'cheap'
  } else if (maxTokenPerM <= PRICE_THRESHOLDS.MEDIUM_MAX) {
    // 3. MEDIUM: <= $5.00 / M
    category = 'medium'
  } else {
    // 4. PREMIUM: > $5.00 / M
    category = 'premium'
  }

  const formattedInputPrice = `${formatRatePerM(promptPerM)}/M`
  const formattedOutputPrice = `${formatRatePerM(completionPerM)}/M`

  let formattedSummary: string
  if (category === 'free') {
    formattedSummary = isFreeVariant ? 'Free (rate-limited)' : '100% Free'
  } else {
    formattedSummary = `${formattedInputPrice} in · ${formattedOutputPrice} out`
    if (rawRequest && rawRequest > 0) {
      formattedSummary += ` · +$${rawRequest.toFixed(4)}/req`
    }
  }

  return {
    category,
    promptPricePerM: promptPerM,
    completionPricePerM: completionPerM,
    requestPrice: rawRequest,
    imagePrice: rawImage,
    maxTokenPricePerM: maxTokenPerM,
    formattedInputPrice,
    formattedOutputPrice,
    formattedSummary,
    hasAdditionalCharges,
    isFreeVariant,
    rateLimitNote,
  }
}

/**
 * Deterministically sorts models by:
 * 1. Price Category (Free -> Cheap -> Medium -> Premium -> Unknown)
 * 2. Ascending token price within category
 * 3. Secondary alphabetical tie-break by label or ID
 */
export function sortModelsByPrice<T extends { id: string; label?: string; pricingDetails?: ModelPricingDetails }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    const catA = a.pricingDetails?.category ?? 'unknown'
    const catB = b.pricingDetails?.category ?? 'unknown'

    // 1. Category Rank
    const rankDiff = CATEGORY_ORDER[catA] - CATEGORY_ORDER[catB]
    if (rankDiff !== 0) return rankDiff

    // 2. Cost within category (cheapest first)
    const costA = a.pricingDetails?.maxTokenPricePerM ?? 999999
    const costB = b.pricingDetails?.maxTokenPricePerM ?? 999999
    const costDiff = costA - costB
    if (Math.abs(costDiff) > 0.000001) return costDiff

    // 3. Secondary deterministic ordering
    const nameA = a.label || a.id
    const nameB = b.label || b.id
    return nameA.localeCompare(nameB)
  })
}
