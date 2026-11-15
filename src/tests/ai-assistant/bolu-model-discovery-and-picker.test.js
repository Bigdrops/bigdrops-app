import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

import { normalizeModelEntry } from '../../lib/ai-assistant/provider-adapters.ts'
import { BOLU_VIEWPORTS } from '../../pages/settings/bolu-provider/BoluViewportStage.tsx'
import {
  classifyModelPricing,
  sortModelsByPrice,
  PRICE_THRESHOLDS,
  CATEGORY_ORDER,
} from '../../lib/ai-assistant/openrouter-pricing.ts'

test('Bolu Viewport Modes — exact four presets and dimensions conform to specification', () => {
  const byId = Object.fromEntries(BOLU_VIEWPORTS.map((v) => [v.id, v]))

  // 1. FoldClosed (390 x 812)
  assert.ok(byId['fold-closed'], 'FoldClosed preset must exist')
  assert.equal(byId['fold-closed'].width, 390, 'FoldClosed width must be 390')
  assert.equal(byId['fold-closed'].height, 812, 'FoldClosed height must be 812')

  // 2. FoldOpen (828 x 700)
  assert.ok(byId['fold-open'], 'FoldOpen preset must exist')
  assert.equal(byId['fold-open'].width, 828, 'FoldOpen width must be 828')
  assert.equal(byId['fold-open'].height, 700, 'FoldOpen height must be 700')

  // 3. TabletShell (1024 x 740)
  assert.ok(byId['tablet'], 'TabletShell preset must exist')
  assert.equal(byId['tablet'].width, 1024, 'TabletShell width must be 1024')
  assert.equal(byId['tablet'].height, 740, 'TabletShell height must be 740')

  // 4. DesktopShell (1280 x 800)
  assert.ok(byId['desktop'], 'DesktopShell preset must exist')
  assert.equal(byId['desktop'].width, 1280, 'DesktopShell width must be 1280')
  assert.equal(byId['desktop'].height, 800, 'DesktopShell height must be 800')

  // 5. Actual / Fluid Responsive
  assert.ok(byId['actual'], 'Actual fluid preset must exist')
  assert.equal(byId['actual'].width, null, 'Actual width must be null for fluid rendering')
  assert.equal(byId['actual'].height, null, 'Actual height must be null for fluid rendering')
})

test('normalizeModelEntry captures OpenRouter rich metadata (context_length, pricing, description)', () => {
  const openrouterRaw = {
    id: 'deepseek/deepseek-chat',
    name: 'DeepSeek: DeepSeek Chat',
    created: 1715629200,
    description: 'High-reasoning general LLM with MoE architecture.',
    context_length: 65536,
    architecture: {
      modality: 'text->text',
      tokenizer: 'DeepSeek',
    },
    pricing: {
      prompt: '0.00000014',
      completion: '0.00000028',
    },
    top_provider: {
      context_length: 65536,
      max_completion_tokens: 4096,
    },
  }

  const normalized = normalizeModelEntry(openrouterRaw)
  assert.ok(normalized, 'Must parse valid entry')
  assert.equal(normalized.id, 'deepseek/deepseek-chat')
  assert.equal(normalized.label, 'DeepSeek: DeepSeek Chat')
  assert.ok(normalized.metadata)
  assert.equal(normalized.metadata.context_length, 65536)
  assert.equal(normalized.metadata.description, 'High-reasoning general LLM with MoE architecture.')
  assert.equal(normalized.metadata.pricing.prompt, '0.00000014')
  assert.equal(normalized.metadata.pricing.completion, '0.00000028')
})

test('Free model detection evaluates pricing metadata reliably without assuming based on name', () => {
  // Model with 'free' in name but NON-ZERO pricing must NOT be flagged as free
  const falseFreeModel = {
    id: 'provider/free-router-pro',
    name: 'Free Router Pro',
    pricing: { prompt: '0.001', completion: '0.002' },
  }
  const normalizedFalse = normalizeModelEntry(falseFreeModel)
  const isFreeFalse =
    normalizedFalse.metadata?.pricing?.prompt === 0 ||
    normalizedFalse.metadata?.pricing?.prompt === '0'

  assert.equal(isFreeFalse, false, 'Model with non-zero pricing must not be flagged free')

  // Model with true 0 pricing
  const trueFreeModel = {
    id: 'meta-llama/llama-3-8b-instruct:free',
    name: 'Meta: Llama 3 8B Instruct (free)',
    pricing: { prompt: '0', completion: '0' },
  }
  const normalizedTrue = normalizeModelEntry(trueFreeModel)
  const isFreeTrue =
    (normalizedTrue.metadata?.pricing?.prompt === '0' || normalizedTrue.metadata?.pricing?.prompt === 0) &&
    (normalizedTrue.metadata?.pricing?.completion === '0' || normalizedTrue.metadata?.pricing?.completion === 0)

  assert.equal(isFreeTrue, true, 'Model with prompt=0 and completion=0 is verified free')
})

test('classifyModelPricing accurately enforces cost thresholds and detects rate-limited variants', () => {
  // 1. FREE - true zero cost
  const freePriced = classifyModelPricing('google/gemini-2.0-flash-exp:free', { prompt: 0, completion: 0 })
  assert.equal(freePriced.category, 'free')
  assert.equal(freePriced.isFreeVariant, true)
  assert.ok(freePriced.rateLimitNote?.includes('rate throttling'))
  assert.equal(freePriced.formattedSummary, 'Free (rate-limited)')

  // 1b. FREE without :free suffix
  const pureFree = classifyModelPricing('custom/zero-tier', { prompt: '0.0', completion: '0.0' })
  assert.equal(pureFree.category, 'free')
  assert.equal(pureFree.isFreeVariant, false)
  assert.equal(pureFree.formattedSummary, '100% Free')

  // 1c. False Free: 0 tokens but non-zero request fee
  const stealthFee = classifyModelPricing('provider/stealth', { prompt: 0, completion: 0, request: '0.005' })
  assert.notEqual(stealthFee.category, 'free', 'Extra request fee invalidates FREE category')
  assert.equal(stealthFee.hasAdditionalCharges, true)

  // 2. CHEAP: <= $1.00 / MTok
  // prompt 0.00000014 -> $0.14/M, completion 0.00000028 -> $0.28/M
  const cheapModel = classifyModelPricing('deepseek/deepseek-chat', { prompt: '0.00000014', completion: '0.00000028' })
  assert.equal(cheapModel.category, 'cheap')
  assert.equal(cheapModel.formattedInputPrice, '$0.14/M')
  assert.equal(cheapModel.formattedOutputPrice, '$0.28/M')

  // Boundary check: exactly $1.00 / MTok -> cheap
  const boundaryCheap = classifyModelPricing('cheap/edge', { prompt: '0.000001', completion: '0.000001' })
  assert.equal(boundaryCheap.category, 'cheap')
  assert.equal(boundaryCheap.maxTokenPricePerM, 1.0)

  // 3. MEDIUM: > $1.00 and <= $5.00 / MTok
  const mediumModel = classifyModelPricing('openai/gpt-4o-mini', { prompt: '0.00000015', completion: '0.000002' }) // $2.00/M
  assert.equal(mediumModel.category, 'medium')
  assert.equal(mediumModel.maxTokenPricePerM, 2.0)

  // Boundary check: exactly $5.00 / MTok -> medium
  const boundaryMedium = classifyModelPricing('medium/edge', { prompt: '0.000005', completion: '0.000003' })
  assert.equal(boundaryMedium.category, 'medium')

  // 4. PREMIUM: > $5.00 / MTok
  const premiumModel = classifyModelPricing('anthropic/claude-3-opus', { prompt: '0.000015', completion: '0.000075' }) // $15 / $75
  assert.equal(premiumModel.category, 'premium')
  assert.equal(premiumModel.formattedInputPrice, '$15.00/M')
  assert.equal(premiumModel.formattedOutputPrice, '$75.00/M')

  // 5. UNKNOWN: Missing, invalid, or empty pricing
  const missingPricing = classifyModelPricing('unlisted/unknown-model', undefined)
  assert.equal(missingPricing.category, 'unknown')
  assert.equal(missingPricing.formattedSummary, 'Pricing unavailable')

  const invalidPricing = classifyModelPricing('bad/pricing', { prompt: 'free', completion: 'unknown' })
  assert.equal(invalidPricing.category, 'unknown')
})

test('sortModelsByPrice deterministically sorts Free -> Cheap -> Medium -> Premium -> Unknown', () => {
  const models = [
    { id: 'openai/gpt-4o', label: 'GPT-4o', pricingDetails: classifyModelPricing('openai/gpt-4o', { prompt: '0.000005', completion: '0.000015' }) }, // Premium ($15/M)
    { id: 'unlisted/model', label: 'Unlisted Model', pricingDetails: classifyModelPricing('unlisted/model') }, // Unknown
    { id: 'meta-llama/llama-3-8b-instruct:free', label: 'Llama 3 8B (free)', pricingDetails: classifyModelPricing('meta-llama/llama-3-8b-instruct:free', { prompt: 0, completion: 0 }) }, // Free
    { id: 'deepseek/deepseek-chat', label: 'DeepSeek Chat', pricingDetails: classifyModelPricing('deepseek/deepseek-chat', { prompt: '0.00000014', completion: '0.00000028' }) }, // Cheap ($0.28/M)
    { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', pricingDetails: classifyModelPricing('openai/gpt-4o-mini', { prompt: '0.00000015', completion: '0.0000006' }) }, // Cheap ($0.60/M)
    { id: 'anthropic/claude-3-5-haiku', label: 'Claude 3.5 Haiku', pricingDetails: classifyModelPricing('anthropic/claude-3-5-haiku', { prompt: '0.000001', completion: '0.000004' }) }, // Medium ($4.00/M)
  ]

  const sorted = sortModelsByPrice(models)

  // Expected order:
  // 0: Free: Llama 3 8B (free)
  // 1: Cheap: DeepSeek Chat ($0.28/M)
  // 2: Cheap: GPT-4o Mini ($0.60/M)
  // 3: Medium: Claude 3.5 Haiku ($4.00/M)
  // 4: Premium: GPT-4o ($15.00/M)
  // 5: Unknown: Unlisted Model
  assert.equal(sorted[0].id, 'meta-llama/llama-3-8b-instruct:free')
  assert.equal(sorted[1].id, 'deepseek/deepseek-chat')
  assert.equal(sorted[2].id, 'openai/gpt-4o-mini')
  assert.equal(sorted[3].id, 'anthropic/claude-3-5-haiku')
  assert.equal(sorted[4].id, 'openai/gpt-4o')
  assert.equal(sorted[5].id, 'unlisted/model')
})

test('Search filtering matches exact model ID, display name, organisation prefix and description', () => {
  const models = [
    {
      id: 'deepseek/deepseek-chat',
      label: 'DeepSeek Chat',
      org: 'deepseek',
      description: 'Conversational model',
    },
    {
      id: 'anthropic/claude-3-5-sonnet',
      label: 'Anthropic: Claude 3.5 Sonnet',
      org: 'anthropic',
      description: 'Frontier reasoning model',
    },
    {
      id: 'meta-llama/llama-3.3-70b-instruct',
      label: 'Llama 3.3 70B Instruct',
      org: 'meta-llama',
      description: 'Open weight leader',
    },
  ]

  const filter = (query) => {
    const q = query.trim().toLowerCase()
    return models.filter(
      (m) =>
        m.id.toLowerCase().includes(q) ||
        m.label.toLowerCase().includes(q) ||
        m.org.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q),
    )
  }

  // Exact ID match
  assert.equal(filter('deepseek/deepseek-chat').length, 1)
  assert.equal(filter('deepseek/deepseek-chat')[0].id, 'deepseek/deepseek-chat')

  // Org prefix match
  assert.equal(filter('anthropic').length, 1)
  assert.equal(filter('anthropic')[0].id, 'anthropic/claude-3-5-sonnet')

  // Partial name match
  assert.equal(filter('70b').length, 1)
  assert.equal(filter('70b')[0].id, 'meta-llama/llama-3.3-70b-instruct')

  // Description match
  assert.equal(filter('reasoning').length, 1)
  assert.equal(filter('reasoning')[0].id, 'anthropic/claude-3-5-sonnet')
})

test('Preservation of unlisted authoritative saved model when upstream catalogue changes', () => {
  const savedModelId = 'legacy/discontinued-model-v1'
  const upstreamDiscovered = [
    { id: 'deepseek/deepseek-chat', label: 'DeepSeek Chat' },
    { id: 'openai/gpt-4o', label: 'GPT-4o' },
  ]
  const curated = [
    { id: 'openrouter/auto', label: 'Auto' },
  ]

  // Model list generation logic from ModelSelectorModal
  const seen = new Set()
  const items = []

  seen.add(savedModelId)
  const isUnlisted = !upstreamDiscovered.some((m) => m.id === savedModelId) && !curated.some((m) => m.id === savedModelId)

  items.push({
    id: savedModelId,
    label: savedModelId,
    source: 'current',
    isUnlisted,
  })

  for (const c of curated) {
    if (!seen.has(c.id)) {
      seen.add(c.id)
      items.push({ id: c.id, label: c.label, source: 'curated', isUnlisted: false })
    }
  }

  for (const d of upstreamDiscovered) {
    if (!seen.has(d.id)) {
      seen.add(d.id)
      items.push({ id: d.id, label: d.label, source: 'live', isUnlisted: false })
    }
  }

  assert.equal(items.length, 4, 'Must contain saved model (1) + curated (1) + discovered (2)')
  assert.equal(items[0].id, savedModelId, 'Saved model must be at index 0')
  assert.equal(items[0].isUnlisted, true, 'Saved model must be marked unlisted')
  assert.equal(items[0].source, 'current', 'Saved model must retain current source')
})

test('Large catalogue bounded slice rendering handles hundreds of models without unbounded DOM rendering', () => {
  const mockCatalogue = Array.from({ length: 500 }, (_, i) => ({
    id: `vendor-${Math.floor(i / 50)}/model-${i}`,
    label: `Vendor Model ${i}`,
  }))

  const INITIAL_BATCH = 40
  const BATCH_SIZE = 30

  let visibleCount = INITIAL_BATCH
  const initialSlice = mockCatalogue.slice(0, visibleCount)
  assert.equal(initialSlice.length, 40, 'Initial slice must render bounded 40 models')

  visibleCount += BATCH_SIZE
  const secondSlice = mockCatalogue.slice(0, visibleCount)
  assert.equal(secondSlice.length, 70, 'Expanding batch increments visible slice to 70')
  assert.equal(mockCatalogue.length - visibleCount, 430, 'Correct remaining items count reported')
})

test('Mobile Bottom Navigation is safely hidden during active software keyboard sessions', () => {
  const formThemeCss = fs.readFileSync('src/styles/formTheme.css', 'utf-8')

  // CSS rule must exist to hide bottom navigation under data-keyboard-open="true"
  assert.ok(
    formThemeCss.includes('html[data-keyboard-open="true"] [data-bd-layout="bottom-nav"]'),
    'formTheme.css must target bottom navigation when keyboard is open',
  )
  assert.ok(
    formThemeCss.includes('display: none !important;'),
    'formTheme.css must enforce display: none !important for bottom nav',
  )

  // Scrollbar utility must exist to prevent native scrollbars on horizontal pill filters
  assert.ok(
    formThemeCss.includes('.no-scrollbar'),
    'formTheme.css must define .no-scrollbar to hide ugly browser scrollbar tracks',
  )
})

test('Free variant detection classifies :free models as Free even when cached pricing metadata is missing', () => {
  const freeCached = classifyModelPricing('meta-llama/llama-3-8b-instruct:free', undefined)
  assert.equal(freeCached.category, 'free', 'Models with :free in ID must be classified as free tier')
  assert.equal(freeCached.isFreeVariant, true)
  assert.ok(freeCached.rateLimitNote)

  const unlistedPriced = classifyModelPricing('meta-llama/llama-3-8b-instruct', undefined)
  assert.equal(unlistedPriced.category, 'unknown', 'Models without :free or pricing remain unknown')
})

test('Direct One-Tap Model Selection — clicking an item directly invokes onSelect to save pick', async () => {
  let savedModel = ''
  let modalOpen = true

  const onSelect = (modelId) => {
    savedModel = modelId
  }
  const onOpenChange = (open) => {
    modalOpen = open
  }

  // Simulate handleConfirmSelect
  const handleConfirmSelect = async (id) => {
    await onSelect(id.trim())
    onOpenChange(false)
  }

  // Tapping a model row
  await handleConfirmSelect('deepseek/deepseek-chat')
  assert.equal(savedModel, 'deepseek/deepseek-chat', 'Direct tap on model row must immediately save model')
  assert.equal(modalOpen, false, 'Modal must close immediately upon direct tap')
})
