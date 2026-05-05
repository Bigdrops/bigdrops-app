import type { CleanupApplyProposal } from '../types'

const IMPORTED_ITEM_PREFIX = 'imported-desc:'

export function isImportedDescriptionItemId(itemId: string) {
  return String(itemId || '').startsWith(IMPORTED_ITEM_PREFIX)
}

export function hasSyntheticCleanupItemIds(proposal: CleanupApplyProposal) {
  return (
    isImportedDescriptionItemId(proposal.winner_item_id) ||
    proposal.merged_item_ids.some((itemId) => isImportedDescriptionItemId(itemId))
  )
}

export function getSyntheticCleanupItemIdFailure(proposal: CleanupApplyProposal) {
  if (!hasSyntheticCleanupItemIds(proposal)) return null

  return 'This proposal includes imported fallback items that are not saved catalog records yet. Link or backfill these items before merging.'
}
