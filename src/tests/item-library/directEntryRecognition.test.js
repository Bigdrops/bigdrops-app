import test from 'node:test'
import assert from 'node:assert/strict'

import { findExactItemSuggestionMatch } from '../../modules/item-library/domain/invoiceSuggestionSelection.ts'
import { getRecognizedHistoryPriceActionValue } from '../../modules/item-library/domain/invoiceSuggestionPriceContext.ts'
import { normalizeSuggestionQuery } from '../../modules/item-library/domain/suggestionRanking.ts'
import { getExactItemSuggestionMatch } from '../../modules/item-library/repositories/itemLibraryRepository.ts'

function createQueryBuilder(rows) {
  const filters = []
  let limitValue = null

  const execute = () => {
    let data = [...rows]
    filters.forEach((filter) => {
      if (filter.type === 'eq') {
        data = data.filter((row) => row[filter.column] === filter.value)
      }
      if (filter.type === 'in') {
        const allowed = new Set(filter.values)
        data = data.filter((row) => allowed.has(row[filter.column]))
      }
    })

    if (limitValue !== null) data = data.slice(0, limitValue)
    return Promise.resolve({ data, error: null })
  }

  const builder = {
    select() {
      return builder
    },
    eq(column, value) {
      filters.push({ type: 'eq', column, value })
      return builder
    },
    in(column, values) {
      filters.push({ type: 'in', column, values })
      return builder
    },
    limit(value) {
      limitValue = value
      return builder
    },
    then(resolve, reject) {
      return execute().then(resolve, reject)
    },
  }

  return builder
}

function createTenantClient({ catalog = [], aliases = [] }) {
  return {
    schemaName: 'tenant_test',
    version: 'test',
    isReady: true,
    from(tableName) {
      if (tableName === 'item_catalog') return createQueryBuilder(catalog)
      if (tableName === 'item_aliases') return createQueryBuilder(aliases)
      throw new Error(`Unexpected table: ${tableName}`)
    },
    rpc() {
      throw new Error('RPC should not be used by direct exact recognition tests')
    },
  }
}

test('direct recognition exact lookup returns one active canonical item', async () => {
  const client = createTenantClient({
    catalog: [
      {
        id: 'item-20mm-pvc',
        name: '20mm pvc pipe',
        normalized_name: '20mm pvc pipe',
        standard_price: 0,
        is_active: true,
      },
    ],
  })

  const match = await getExactItemSuggestionMatch(normalizeSuggestionQuery(' 20MM   PVC pipe '), client)

  assert.equal(match?.item_id, 'item-20mm-pvc')
  assert.equal(match?.name, '20mm pvc pipe')
  assert.equal(match?.match_source, 'catalog')
})

test('direct recognition exact lookup returns an active alias target without rewriting the alias text', async () => {
  const client = createTenantClient({
    catalog: [
      {
        id: 'item-20mm-pvc',
        name: '20mm pvc pipe',
        normalized_name: '20mm pvc pipe',
        standard_price: 0,
        is_active: true,
      },
    ],
    aliases: [
      {
        id: 'alias-20mm-pvc',
        item_id: 'item-20mm-pvc',
        alias_text: 'PVC Pipe 20mm',
        normalized_alias_text: 'pvc pipe 20mm',
        is_active: true,
        is_retired: false,
      },
    ],
  })

  const match = await getExactItemSuggestionMatch(normalizeSuggestionQuery('pvc pipe 20mm'), client)

  assert.equal(match?.item_id, 'item-20mm-pvc')
  assert.equal(match?.name, '20mm pvc pipe')
  assert.equal(match?.matched_text, 'PVC Pipe 20mm')
  assert.equal(match?.match_source, 'alias')
})

test('direct recognition exact lookup rejects ambiguous canonical and alias identities', async () => {
  const client = createTenantClient({
    catalog: [
      {
        id: 'item-20mm-pvc',
        name: '20mm pvc pipe',
        normalized_name: '20mm pvc pipe',
        standard_price: 0,
        is_active: true,
      },
      {
        id: 'item-different',
        name: 'Different Item',
        normalized_name: 'different item',
        standard_price: 0,
        is_active: true,
      },
    ],
    aliases: [
      {
        id: 'alias-ambiguous',
        item_id: 'item-different',
        alias_text: '20mm pvc pipe',
        normalized_alias_text: '20mm pvc pipe',
        is_active: true,
        is_retired: false,
      },
    ],
  })

  const match = await getExactItemSuggestionMatch('20mm pvc pipe', client)

  assert.equal(match, null)
})

test('fuzzy, prefix, and identity-significant variants are not exact matches', () => {
  const suggestions = [
    {
      item_id: 'item-20mm-pvc',
      name: '20mm pvc pipe',
      matched_text: '20mm pvc pipe',
      match_source: 'catalog',
      standard_price: 0,
    },
    {
      item_id: 'charging-alternator',
      name: 'Charging alternator',
      matched_text: 'Charging alternator',
      match_source: 'catalog',
      standard_price: 0,
    },
    {
      item_id: 'pot-light-6w',
      name: '6 Watts pot lights',
      matched_text: '6 Watts pot lights',
      match_source: 'catalog',
      standard_price: 0,
    },
  ]

  assert.equal(findExactItemSuggestionMatch('20mm pvc pipe heavy duty', suggestions), null)
  assert.equal(findExactItemSuggestionMatch('20mm pvc', suggestions), null)
  assert.equal(findExactItemSuggestionMatch('charging alternator 24volts', suggestions), null)
  assert.equal(findExactItemSuggestionMatch('18 watts pot lights', suggestions), null)
})

test('direct recognition price action requires recognized identity and preserves non-zero rates', () => {
  const priceContext = {
    item_id: 'item-20mm-pvc',
    last_price_for_client: null,
    last_price_global: 14000,
  }

  assert.equal(
    getRecognizedHistoryPriceActionValue({
      itemId: 'item-20mm-pvc',
      priceContext,
      selectionSource: 'recognized',
      unitPrice: 0,
    }),
    14000,
  )

  assert.equal(
    getRecognizedHistoryPriceActionValue({
      itemId: 'item-20mm-pvc',
      priceContext,
      selectionSource: 'recognized',
      unitPrice: 15000,
    }),
    null,
  )

  assert.equal(
    getRecognizedHistoryPriceActionValue({
      itemId: 'item-20mm-pvc',
      priceContext,
      selectionSource: 'explicit',
      unitPrice: 0,
    }),
    null,
  )
})
