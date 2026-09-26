import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { ItemLibraryAdvancedCleanupPanel } from '../../modules/item-library/components/ItemLibraryAdvancedCleanupPanel.tsx'

const componentPath = 'src/modules/item-library/components/ItemLibraryAdvancedCleanupPanel.tsx'

const items = Array.from({ length: 175 }, (_, index) => ({
  item_id: `item-${String(index + 1).padStart(3, '0')}`,
  name: `Catalog Item ${index + 1}`,
  standard_price: null,
  last_sold_price: null,
  usage_count: index + 1,
  appears_in_invoice: true,
  appears_in_quotation: index % 2 === 0,
  is_active: true,
}))

const duplicateGroups = [
  {
    group_id: 'item-001::item-002',
    label: 'Catalog Item 1',
    reason: 'Similar wording',
    normalized_label: 'catalog item 1',
    members: [
      { item_id: 'item-001', name: 'Catalog Item 1', usage_count: 1, last_sold_price: null },
      { item_id: 'item-002', name: 'Catalog Item 2', usage_count: 2, last_sold_price: null },
    ],
  },
  {
    group_id: 'item-051::item-052',
    label: 'Catalog Item 51',
    reason: 'Similar wording',
    normalized_label: 'catalog item 51',
    members: [
      { item_id: 'item-051', name: 'Catalog Item 51', usage_count: 51, last_sold_price: null },
      { item_id: 'item-052', name: 'Catalog Item 52', usage_count: 52, last_sold_price: null },
    ],
  },
]

function renderPanel(props = {}) {
  return renderToStaticMarkup(
    createElement(ItemLibraryAdvancedCleanupPanel, {
      workflow: 'full_catalog',
      applyLoading: false,
      items,
      aliases: [],
      duplicateGroups,
      onApplyProposals: async () => [],
      ...props,
    }),
  )
}

test('cleanup setup renders the 50 item session estimate', () => {
  const html = renderPanel()

  assert.match(html, /Clean &amp; Standardize Catalog/)
  assert.match(html, /50 items per batch selected/)
  assert.match(html, /Duplicate groups will stay together/)
})

test('cleanup duplicate review branch renders after the shared hook block', () => {
  const html = renderPanel({ workflow: 'duplicates' })

  assert.match(html, /Outsource Duplicate Review/)
  assert.match(html, /Export All Duplicates/)
})

test('cleanup setup early-return branch does not declare React hooks', () => {
  const source = readFileSync(componentPath, 'utf8')
  const setupBranchStart = source.indexOf('if (!lockedSession && !isDuplicates)')
  const duplicateBranchStart = source.indexOf('if (isDuplicates)', setupBranchStart)
  const sessionEstimateHook = source.indexOf('const sessionEstimate = useMemo')

  assert.notEqual(setupBranchStart, -1, 'setup early-return branch must exist')
  assert.notEqual(duplicateBranchStart, -1, 'duplicate branch must follow setup branch')
  assert.notEqual(sessionEstimateHook, -1, 'session estimate hook must exist')
  assert.equal(
    sessionEstimateHook < setupBranchStart,
    true,
    'session estimate useMemo must run before the setup early return to keep hook order stable',
  )

  const setupBranchSource = source.slice(setupBranchStart, duplicateBranchStart)
  assert.doesNotMatch(
    setupBranchSource,
    /\buse(?:State|Effect|Memo|Callback|Ref|Reducer|Context|SyncExternalStore)\s*\(/,
    'setup branch must not declare hooks that disappear after Start Cleanup Session',
  )
})
