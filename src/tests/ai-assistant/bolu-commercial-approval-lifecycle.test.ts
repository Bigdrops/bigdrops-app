import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

import {
  approveBoluProposal,
  buildInvoiceCreateProposal,
  buildInvoiceModifyProposal,
  decideBoluCommercialRecommendation,
  mergeDocumentCreateProposal,
  type BoluProposal,
  type BoluDocumentCreateProposal,
  type BoluDocumentModifyProposal,
} from '../../lib/ai-assistant/bolu-operations'
import {
  applyApprovedCommercialRecommendations,
  buildCommercialRecommendations,
  standardizeDescription,
} from '../../lib/ai-assistant/bolu-commercial-language'

const here = dirname(fileURLToPath(import.meta.url))
const srcRoot = resolve(here, '../../..')
const readSource = (relative: string) => readFileSync(resolve(srcRoot, relative), 'utf8')

function proposalWith(descriptions: string[], overrides: Record<string, unknown> = {}): BoluDocumentCreateProposal {
  return buildInvoiceCreateProposal({
    client_name: 'Tunde',
    items: descriptions.map((description) => ({ description, quantity: 1, unit_price: 32000 })),
    global_vat_percent: 0,
    ...overrides,
  }) as BoluDocumentCreateProposal
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. DETECTION DOES NOT CHANGE THE DRAFT
// ─────────────────────────────────────────────────────────────────────────────

test('A spelling recommendation is shown without changing the draft', () => {
  const proposal = proposalWith(['2 inch elbo'])
  const [recommendation] = proposal.commercialRecommendations ?? []

  assert.equal(proposal.payload.items[0].description, '2 inch elbo', 'the draft keeps the supplied wording')
  assert.equal(recommendation.original, '2 inch elbo')
  assert.equal(recommendation.recommendation, '2 inch elbow')
  assert.match(recommendation.reason, /spelling|compound/i)
  assert.equal(recommendation.decision, 'pending')
  assert.equal(proposal.status, 'pending_approval')
})

test('A sufficient description produces no recommendation at all', () => {
  const proposal = proposalWith(['Salt'])
  assert.deepEqual(proposal.commercialRecommendations, [])
})

test('Safe unit normalisation is a recommendation, not a silent rewrite', () => {
  const proposal = proposalWith(['1.5mm green cable'])
  const [recommendation] = proposal.commercialRecommendations ?? []

  assert.equal(proposal.payload.items[0].description, '1.5mm green cable')
  assert.equal(recommendation.recommendation, '1.5mm² green cable')
  assert.match(recommendation.reason, /cross-section/i)
})

test('1.5mm green is never converted, because a colour is not a conductor', () => {
  const proposal = proposalWith(['1.5mm green'])
  assert.deepEqual(proposal.commercialRecommendations, [])
  assert.equal(proposal.payload.items[0].description, '1.5mm green')
})

test('No recommendation introduces a product attribute nobody supplied', () => {
  for (const supplied of ['1.5mm green', '1.5mm green cable', '2 inch elbo', 'change over switch 40A']) {
    const [recommendation] = buildCommercialRecommendations([{ description: supplied }])
    // `1.5mm green` is ambiguous: nothing is recommended for it at all.
    if (!recommendation) continue
    assert.doesNotMatch(recommendation.recommendation, /single[- ]?core|voltage|grade|brand|model/i)
    assert.doesNotMatch(recommendation.recommendation, /\b\d+\s*(?:core|cores)\b/i)
    // Nothing is added or removed: the same words, corrected.
    const words = (value: string) =>
      value
        .toLowerCase()
        .replace(/²/g, '')
        .replace(/elbo\b/, 'elbow')
        .replace(/change over switch/, 'changeover switch')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
    assert.equal(words(recommendation.recommendation), words(recommendation.original))
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. THE DECISION IS THE USER'S, EXACT AND PER LINE
// ─────────────────────────────────────────────────────────────────────────────

test('Accepting applies the exact proposed wording on Gate 1 approval', () => {
  const proposal = proposalWith(['2 inch elbo'])
  const decided = decideBoluCommercialRecommendation(
    proposal,
    proposal.commercialRecommendations![0].id,
    'accepted',
  )
  assert.equal(decided.payload.items[0].description, '2 inch elbo', 'accepting alone changes nothing')

  const approved = approveBoluProposal(decided)
  assert.equal(approved.status, 'approved_pending_save')
  assert.equal(approved.payload.items[0].description, '2 inch elbow')
  assert.equal(approved.commercialRecommendations?.[0].applied, true)
  assert.equal(approved.commercialRecommendations?.[0].recommendation, '2 inch elbow')
})

test('Keeping the original leaves it unchanged through Gate 1', () => {
  const proposal = proposalWith(['2 inch elbo'])
  const decided = decideBoluCommercialRecommendation(
    proposal,
    proposal.commercialRecommendations![0].id,
    'kept',
  )
  const approved = approveBoluProposal(decided)

  assert.equal(approved.status, 'approved_pending_save')
  assert.equal(approved.payload.items[0].description, '2 inch elbo')
  assert.equal(approved.commercialRecommendations?.[0].applied, false)
})

test('A rejection is not applied, and the same improvement may be offered again later', () => {
  const first = proposalWith(['2 inch elbo'])
  const rejected = approveBoluProposal(
    decideBoluCommercialRecommendation(first, first.commercialRecommendations![0].id, 'kept'),
  )
  assert.equal(rejected.payload.items[0].description, '2 inch elbo')
  assert.equal(rejected.commercialRecommendations?.[0].decision, 'kept')

  // D-11 = B: no persistent suppression. A later turn recommends it again.
  const later = proposalWith(['2 inch elbo'])
  assert.equal(later.commercialRecommendations?.length, 1)
  assert.equal(later.commercialRecommendations?.[0].decision, 'pending')
})

test('Silence is not approval: a pending recommendation is never applied', () => {
  const proposal = proposalWith(['2 inch elbo'])
  const approved = approveBoluProposal(proposal)

  assert.equal(approved.status, 'approved_pending_save')
  assert.equal(approved.payload.items[0].description, '2 inch elbo')
  assert.equal(approved.commercialRecommendations?.[0].applied, false)
})

test('One line does not approve another; multiple lines decide independently', () => {
  const proposal = proposalWith(['2 inch elbo', 'change over switch 40A'])
  const [first, second] = proposal.commercialRecommendations ?? []
  assert.equal(proposal.commercialRecommendations?.length, 2)

  const afterFirst = decideBoluCommercialRecommendation(proposal, first.id, 'accepted')
  assert.equal(afterFirst.commercialRecommendations?.[0].decision, 'accepted')
  assert.equal(afterFirst.commercialRecommendations?.[1].decision, 'pending')

  const mixed = decideBoluCommercialRecommendation(afterFirst, second.id, 'kept')
  const approved = approveBoluProposal(mixed)

  assert.equal(approved.payload.items[0].description, '2 inch elbow')
  assert.equal(approved.payload.items[1].description, 'change over switch 40A')
})

test('An unknown or foreign recommendation id changes nothing', () => {
  const proposal = proposalWith(['2 inch elbo'])
  const unchanged = decideBoluCommercialRecommendation(proposal, 'line-99', 'accepted')
  assert.equal(unchanged, proposal)
  assert.equal(unchanged.commercialRecommendations?.[0].decision, 'pending')
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. STALE APPROVALS CANNOT AUTHORISE A CHANGED RECOMMENDATION
// ─────────────────────────────────────────────────────────────────────────────

test('Changing the original invalidates a stale recommendation', () => {
  const proposal = proposalWith(['2 inch elbo'])
  const accepted = decideBoluCommercialRecommendation(
    proposal,
    proposal.commercialRecommendations![0].id,
    'accepted',
  )

  // The boss corrects the line before approving: the old recommendation is stale.
  const edited: BoluDocumentCreateProposal = {
    ...accepted,
    payload: {
      ...accepted.payload,
      items: [{ ...accepted.payload.items[0], description: '2 inch elbow joint' }],
    },
  }
  const approved = approveBoluProposal(edited)

  assert.equal(approved.payload.items[0].description, '2 inch elbow joint')
  assert.equal(approved.commercialRecommendations?.[0].applied, false)
  assert.equal(approved.commercialRecommendations?.[0].invalidated, true)
})

test('A changed recommendation requires fresh approval', () => {
  const items = [{ description: '2 inch elbo', quantity: 1, unit_price: 1000 }]
  const [recommendation] = buildCommercialRecommendations(items)
  const decided = {
    ...recommendation,
    recommendation: '2-inch Elbow (heavy duty)',
    decision: 'accepted' as const,
  }

  const result = applyApprovedCommercialRecommendations(items, [decided])
  assert.equal(result.items[0].description, '2 inch elbo', 'only the exact offered wording may apply')
  assert.deepEqual(result.applied, [])
  assert.equal(result.recommendations[0].invalidated, true)
})

test('A rejected recommendation is not reapplied on retry', () => {
  const proposal = proposalWith(['1.5mm green cable'])
  const [recommendation] = proposal.commercialRecommendations ?? []
  const kept = decideBoluCommercialRecommendation(proposal, recommendation.id, 'kept')

  const retried = approveBoluProposal(approveBoluProposal(kept))
  assert.equal(retried.payload.items[0].description, '1.5mm green cable')
  assert.equal(retried.commercialRecommendations?.[0].applied, false)
})

test('A regenerated proposal cannot inherit an earlier approval', () => {
  const first = proposalWith(['2 inch elbo'])
  const approved = approveBoluProposal(
    decideBoluCommercialRecommendation(first, first.commercialRecommendations![0].id, 'accepted'),
  )
  assert.equal(approved.payload.items[0].description, '2 inch elbow')

  const regenerated = mergeDocumentCreateProposal(approved, {
    client_name: 'Tunde',
    items: [{ description: '3 inch elbo', quantity: 1, unit_price: 32000 }],
    global_vat_percent: 0,
  })

  assert.equal(regenerated.status, 'pending_approval', 'the new wording needs fresh approval')
  assert.equal(regenerated.payload.items[0].description, '3 inch elbo')
  assert.equal(regenerated.commercialRecommendations?.[0].decision, 'pending')
  assert.equal(regenerated.commercialRecommendations?.[0].applied, undefined)
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. MODIFICATION PATH, GATE 2 AND CALCULATIONS
// ─────────────────────────────────────────────────────────────────────────────

test('A modification proposal recommends wording and cannot bypass approval', () => {
  const proposal = buildInvoiceModifyProposal({
    targetDocumentId: 'inv-1',
    targetDocumentNumber: 'INV-000123',
    itemsChange: {
      oldItems: [{ description: 'Salt', quantity: 1, unit_price: 15000 }],
      newItems: [
        { description: 'Salt', quantity: 1, unit_price: 15000 },
        { description: '2 inch elbo', quantity: 1, unit_price: 32000 },
      ],
    },
  })
  assert.equal(proposal.itemsChange?.newItems[1].description, '2 inch elbo')
  assert.equal(proposal.commercialRecommendations?.[0].original, '2 inch elbo')

  const approved = approveBoluProposal(
    decideBoluCommercialRecommendation(
      proposal,
      proposal.commercialRecommendations![0].id,
      'accepted',
    ),
  )
  assert.equal(approved.itemsChange?.newItems[1].description, '2 inch elbow')
  assert.equal(approved.itemsChange?.newItems[0].description, 'Salt')
})

test('Gate 2 stays separate: approval never persists and persisting needs approval', () => {
  const proposal = proposalWith(['2 inch elbo'])
  const approved = approveBoluProposal(proposal)
  assert.equal(approved.status, 'approved_pending_save')
  assert.equal(approved.persistedId, undefined)
  assert.equal(approved.gate2Required, true)

  // A pending proposal is not an approved one.
  assert.equal(approveBoluProposal(proposal).status, 'approved_pending_save')
  assert.equal(approveBoluProposal({ ...proposal, status: 'rejected' }).status, 'rejected')
})

test('Wording changes leave quantities, prices and authoritative totals untouched', () => {
  const proposal = proposalWith(['1.5mm green cable'], { global_vat_percent: 7.5 })
  const approved = approveBoluProposal(
    decideBoluCommercialRecommendation(
      proposal,
      proposal.commercialRecommendations![0].id,
      'accepted',
    ),
  )

  assert.equal(approved.payload.items[0].description, '1.5mm² green cable')
  assert.equal(approved.payload.items[0].quantity, proposal.payload.items[0].quantity)
  assert.equal(approved.payload.items[0].unit_price, proposal.payload.items[0].unit_price)
  assert.deepEqual(approved.computedTotals, proposal.computedTotals)
})

// ─────────────────────────────────────────────────────────────────────────────
// 5. THE ENGINE AND UI USE THIS FLOW
// ─────────────────────────────────────────────────────────────────────────────

test('The proposal engine no longer standardises the payload before Gate 1', () => {
  const engine = readSource('src/lib/ai-assistant/bolu-proposal-engine.ts')
  assert.doesNotMatch(engine, /standardizeCommercialItems\(/)
  assert.doesNotMatch(engine, /commercialRecommendations\s*=/)

  // Detection lives in the proposal builders, so every proposal path attaches
  // it: create, correction/merge and modify.
  const operations = readSource('src/lib/ai-assistant/bolu-operations.ts')
  assert.match(
    operations,
    /commercialRecommendations: buildCommercialRecommendations\(payload\.items\)/,
  )
  assert.match(
    operations,
    /commercialRecommendations: buildCommercialRecommendations\(params\.itemsChange\?\.newItems \?\? \[\]\)/,
  )
})

test('Gate 1 approval applies accepted wording in the reducer and the live hook', () => {
  const reducer = readSource('src/lib/ai-assistant/bolu-reducer.ts')
  const hook = readSource('src/lib/ai-assistant/hooks/useBoluThread.ts')

  assert.match(reducer, /approveBoluProposal\(state\.activeProposal\)/)
  assert.doesNotMatch(reducer, /status: 'approved_pending_save',\s*\n\s*\}/)
  assert.match(hook, /approveBoluProposal\(effectiveProposal\)/)
  assert.match(hook, /decideBoluCommercialRecommendation\(/)
})

test('The Gate 1 card shows original, recommendation and reason with both decisions', () => {
  const parts = readSource('src/components/ai-assistant/chat/assistant-chat-parts.tsx')
  assert.match(parts, /Wording recommendations/)
  assert.match(parts, /Original:/)
  assert.match(parts, /Recommendation:/)
  assert.match(parts, /Reason:/)
  assert.match(parts, /Accept wording/)
  assert.match(parts, /Keep original/)
})

test('Detection helpers still produce the approved safe wording', () => {
  assert.equal(standardizeDescription('1.5mm green'), '1.5mm green')
  assert.equal(standardizeDescription('1.5mm green cable'), '1.5mm² green cable')
  assert.equal(standardizeDescription('1.5mm 2 core'), '1.5mm 2 core')
  assert.equal(standardizeDescription('50mm bolt'), '50mm bolt')
})
