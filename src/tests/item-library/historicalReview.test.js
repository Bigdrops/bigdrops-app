import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  buildHistoricalReviewCaseMembershipHash,
  buildHistoricalReviewCandidateEvidence,
  buildHistoricalReviewCases,
  extractHistoricalReviewSpecs,
} from '../../modules/item-library/domain/historicalReview.ts'
import { normalizeSuggestionQuery } from '../../modules/item-library/domain/suggestionRanking.ts'
import {
  getHistoricalReviewCases,
  linkHistoricalReviewCaseToItem,
  createItemFromHistoricalReviewCase,
  keepHistoricalReviewCandidateSeparate,
} from '../../modules/item-library/repositories/historicalReviewRepository.ts'

const tenantMain = 'entity_bigdrops-main_main'

function row(overrides) {
  const description = overrides.description ?? 'Primary Air Filter'
  return {
    row_id: overrides.row_id,
    tenant_schema: overrides.tenant_schema ?? tenantMain,
    source_type: overrides.source_type ?? 'invoice',
    source_document_id: overrides.source_document_id ?? `doc-${overrides.row_id}`,
    source_document_number: overrides.source_document_number ?? `DOC-${overrides.row_id}`,
    document_date: overrides.document_date ?? '2025-10-14',
    client_name: overrides.client_name ?? 'Bigdrops Client',
    item_id: overrides.item_id ?? null,
    row_type: overrides.row_type ?? 'standard',
    description,
    normalized_description: normalizeSuggestionQuery(description),
    unit: overrides.unit ?? 'pcs',
    make: overrides.make ?? null,
    quantity: overrides.quantity ?? 1,
    unit_price: overrides.unit_price ?? 14000,
    group_name: overrides.group_name ?? null,
    group_id: overrides.group_id ?? null,
    updated_at: overrides.updated_at ?? '2025-10-14T10:00:00.000Z',
  }
}

function catalogRef(overrides) {
  const name = overrides.name
  return {
    ref_kind: overrides.ref_kind ?? 'catalog',
    item_id: overrides.item_id,
    name,
    normalized_text: overrides.normalized_text ?? normalizeSuggestionQuery(overrides.matched_text ?? name),
    matched_text: overrides.matched_text ?? name,
    is_active: overrides.is_active ?? true,
    is_retired: overrides.is_retired ?? false,
    standard_price: overrides.standard_price ?? 0,
    usage_count: overrides.usage_count ?? 0,
    last_sold_price: overrides.last_sold_price ?? null,
    last_used_at: overrides.last_used_at ?? null,
  }
}

test('historical review groups only tenant plus exact normalized Tier C descriptions', () => {
  const result = buildHistoricalReviewCases({
    tenantSchema: tenantMain,
    occurrences: [
      row({ row_id: 'inv-1', source_type: 'invoice', description: 'Primary Engine Air Filter', unit_price: 12000 }),
      row({ row_id: 'quo-1', source_type: 'quotation', description: ' primary   engine air filter ', unit_price: 13000 }),
      row({ row_id: 'inv-2', tenant_schema: 'entity_other_main', description: 'Primary Engine Air Filter' }),
      row({ row_id: 'quo-2', source_type: 'quotation', description: 'Secondary Engine Air Filter' }),
    ],
    catalogRefs: [
      catalogRef({ item_id: 'catalog-secondary-filter', name: 'Secondary Engine Air Filter', usage_count: 4 }),
    ],
  })

  assert.equal(result.summary.case_count, 2)
  assert.equal(result.summary.occurrence_count, 3)

  const mainPrimary = result.cases.find((entry) => entry.tenant_schema === tenantMain && entry.normalized_description === 'primary engine air filter')
  assert.equal(mainPrimary?.occurrence_count, 2)
  assert.equal(mainPrimary?.invoice_count, 1)
  assert.equal(mainPrimary?.quotation_count, 1)
  assert.equal(mainPrimary?.unit_price_min, 12000)
  assert.equal(mainPrimary?.unit_price_max, 13000)
  assert.equal(
    mainPrimary?.case_membership_hash,
    'hr-v1-invoice_items:inv-1|quotation_items:quo-1',
  )
  assert.deepEqual(mainPrimary?.invoice_row_ids, ['inv-1'])
  assert.deepEqual(mainPrimary?.quotation_row_ids, ['quo-1'])
  assert.match(mainPrimary?.case_id || '', /hr-v1-invoice_items:inv-1\|quotation_items:quo-1$/)

  const otherPrimary = result.cases.find((entry) => entry.tenant_schema === 'entity_other_main')
  assert.equal(otherPrimary?.occurrence_count, 1)
  assert.notEqual(otherPrimary?.case_id, mainPrimary?.case_id)
})

test('historical review excludes linked rows, group headers, empty descriptions, exact matches, and Tier B rows', () => {
  const result = buildHistoricalReviewCases({
    tenantSchema: tenantMain,
    occurrences: [
      row({ row_id: 'tier-c', description: 'Charging Alternator 24V' }),
      row({ row_id: 'linked', description: 'Charging Alternator 24V', item_id: 'catalog-alt-24v' }),
      row({ row_id: 'group', description: 'Mechanical Works', row_type: 'group_header' }),
      row({ row_id: 'empty', description: '   ' }),
      row({ row_id: 'exact', description: '20mm pvc pipe' }),
      row({ row_id: 'tier-b', description: 'Standalone new workmanship service' }),
    ],
    catalogRefs: [
      catalogRef({ item_id: 'catalog-alt', name: 'Charging Alternator' }),
      catalogRef({ item_id: 'catalog-pvc', name: '20mm pvc pipe' }),
    ],
  })

  assert.deepEqual(result.cases.map((entry) => entry.normalized_description), ['charging alternator 24v'])
  assert.equal(result.summary.tier_d_excluded_count, 2)
  assert.equal(result.summary.tier_b_excluded_count, 1)
})

test('candidate evidence separates deterministic exact evidence from advisory similarity', () => {
  const exact = buildHistoricalReviewCandidateEvidence('pvc pipe 20mm', [
    catalogRef({
      ref_kind: 'alias',
      item_id: 'catalog-pvc',
      name: '20mm pvc pipe',
      matched_text: 'PVC Pipe 20mm',
      normalized_text: 'pvc pipe 20mm',
    }),
  ])
  assert.equal(exact[0].evidence_strength, 'deterministic')
  assert.equal(exact[0].evidence_label, 'Existing alias')

  const advisory = buildHistoricalReviewCandidateEvidence('charging alternator 24v', [
    catalogRef({ item_id: 'catalog-alt', name: 'Charging Alternator' }),
  ])
  assert.equal(advisory[0].evidence_strength, 'advisory')
  assert.equal(advisory[0].evidence_label, 'Similar catalog item')
  assert.ok(advisory[0].shared_terms.includes('charging'))
})

test('specification-sensitive values stay visible for review and candidate comparison', () => {
  const specs = extractHistoricalReviewSpecs('Fuse Blade 15A P/N 2527-1017, 24V copper SWG 17.5')
  const values = specs.map((spec) => spec.value)

  assert.ok(values.includes('15A'))
  assert.ok(values.includes('P/N 2527-1017'))
  assert.ok(values.includes('24V'))
  assert.ok(values.some((value) => value.includes('SWG') && value.includes('17.5')))
  assert.ok(values.includes('COPPER'))
})

test('square millimetre cable sizes are cross-section evidence, not diameter', () => {
  const specs = extractHistoricalReviewSpecs('Green Earth Cable 6 mm² Copper Insulated and phase cable 16 mm2')

  assert.ok(specs.some((spec) => spec.kind === 'cross_section' && spec.label === 'Cross-section' && spec.value === '6 MM²'))
  assert.ok(specs.some((spec) => spec.kind === 'cross_section' && spec.label === 'Cross-section' && spec.value === '16 MM2'))
  assert.ok(!specs.some((spec) => spec.kind === 'diameter' && (spec.value === '6 MM' || spec.value === '16 MM')))
  assert.ok(specs.some((spec) => spec.kind === 'material' && spec.value === 'COPPER'))
})

test('plain linear millimetre dimensions remain diameter evidence', () => {
  const specs = extractHistoricalReviewSpecs('PVC pipe 20 mm with 6 mm wall note')

  assert.ok(specs.some((spec) => spec.kind === 'diameter' && spec.value === '20 MM'))
  assert.ok(specs.some((spec) => spec.kind === 'diameter' && spec.value === '6 MM'))
  assert.ok(!specs.some((spec) => spec.kind === 'cross_section'))
})

test('historical review case membership hash is deterministic and changes with row membership', () => {
  const rows = [
    row({ row_id: 'quo-2', source_type: 'quotation', description: 'Primary Air Filter' }),
    row({ row_id: 'inv-1', source_type: 'invoice', description: 'Primary Air Filter' }),
  ]

  assert.equal(
    buildHistoricalReviewCaseMembershipHash(rows),
    'hr-v1-invoice_items:inv-1|quotation_items:quo-2',
  )
  assert.equal(
    buildHistoricalReviewCaseMembershipHash([...rows].reverse()),
    'hr-v1-invoice_items:inv-1|quotation_items:quo-2',
  )
  assert.notEqual(
    buildHistoricalReviewCaseMembershipHash([
      ...rows,
      row({ row_id: 'inv-3', source_type: 'invoice', description: 'Primary Air Filter' }),
    ]),
    'hr-v1-invoice_items:inv-1|quotation_items:quo-2',
  )
})

test('membership hash sorts row ids by code unit to match Postgres uuid ordering', () => {
  // ponytail: localeCompare uses ICU collation and can order hyphenated ids
  // differently from Postgres. The server compares submitted row arrays with
  // ORDER BY id (uuid memcmp), so the client must use code-unit order.
  const rows = [
    row({ row_id: 'bac', source_type: 'invoice', description: 'Primary Air Filter' }),
    row({ row_id: 'b-c', source_type: 'invoice', description: 'Primary Air Filter' }),
  ]

  assert.equal(
    buildHistoricalReviewCaseMembershipHash(rows),
    'hr-v1-invoice_items:b-c|invoice_items:bac',
  )
})

test('identity-sensitive descriptions stay separate with visible specification evidence', () => {
  const result = buildHistoricalReviewCases({
    tenantSchema: tenantMain,
    occurrences: [
      row({ row_id: 'p1', description: 'Primary Air Filter' }),
      row({ row_id: 's1', description: 'Secondary Air Filter' }),
      row({ row_id: 'v12', description: '12V 75AH Battery' }),
      row({ row_id: 'v24', description: '24V 75AH Battery' }),
    ],
    catalogRefs: [
      catalogRef({ item_id: 'catalog-air-filter', name: 'Air Filter' }),
      catalogRef({ item_id: 'catalog-battery', name: '75AH Battery' }),
    ],
  })

  assert.equal(result.summary.case_count, 4)

  const primaryCase = result.cases.find((entry) => entry.normalized_description === 'primary air filter')
  const secondaryCase = result.cases.find((entry) => entry.normalized_description === 'secondary air filter')
  assert.ok(primaryCase)
  assert.ok(secondaryCase)
  assert.notEqual(primaryCase.case_id, secondaryCase.case_id)
  assert.ok(primaryCase.specifications.some((spec) => spec.value === 'PRIMARY'))
  assert.ok(secondaryCase.specifications.some((spec) => spec.value === 'SECONDARY'))

  const battery12 = result.cases.find((entry) => entry.normalized_description === '12v 75ah battery')
  const battery24 = result.cases.find((entry) => entry.normalized_description === '24v 75ah battery')
  assert.ok(battery12)
  assert.ok(battery24)
  assert.notEqual(battery12.case_id, battery24.case_id)
  assert.ok(battery12.specifications.some((spec) => spec.value === '12V'))
  assert.ok(battery24.specifications.some((spec) => spec.value === '24V'))

  result.cases.forEach((entry) => {
    entry.candidates.forEach((candidate) => {
      assert.equal(candidate.evidence_strength, 'advisory')
    })
    entry.occurrences.forEach((occurrence) => {
      assert.ok(!('item_id' in occurrence))
    })
  })
})

test('Unlinked Items surfaces loading, empty, and error states with retry', () => {
  const panelSource = fs.readFileSync(
    path.resolve('src/modules/item-library/components/ItemLibraryHistoricalReviewPanel.tsx'),
    'utf8',
  )

  assert.match(panelSource, /if \(loading\) return <LoadingState/)
  assert.match(panelSource, /Skeleton/)
  assert.match(panelSource, /if \(!data\.cases\.length\) return <EmptyState/)
  assert.match(panelSource, /No unlinked items/)
  assert.match(panelSource, /if \(error\) return <ErrorState/)
  assert.match(panelSource, /Unlinked Items could not load/)
  assert.match(panelSource, /onRetry=\{reload\}/)
  assert.match(panelSource, /No unlinked items match this filter/)

  const hookSource = fs.readFileSync(
    path.resolve('src/modules/item-library/hooks/useHistoricalReviewCases.ts'),
    'utf8',
  )

  assert.match(hookSource, /loading/)
  assert.match(hookSource, /setError/)
  assert.match(hookSource, /reload/)
})

test('Unlinked Items UI exposes explicit identity actions without catalog merge controls', () => {
  const source = fs.readFileSync(
    path.resolve('src/modules/item-library/components/ItemLibraryHistoricalReviewPanel.tsx'),
    'utf8',
  )

  assert.match(source, /Link to existing/)
  assert.match(source, /Create separate item/)
  assert.match(source, /Keep separate/)
  assert.match(source, /Leave unresolved stores no decision/)
  assert.match(source, /Historical prices, quantities, units, taxes, and descriptions will not change/)
  assert.match(source, /do not merge catalog items/)
  assert.doesNotMatch(source, /Confirm merge/)
  assert.doesNotMatch(source, /mergeCatalogItems/)
})

test('historical review mutation repository sends only identity fields to tenant RPCs', async () => {
  const calls = []
  const client = {
    isReady: true,
    schemaName: tenantMain,
    rpc: (fn, params) => {
      calls.push({ fn, params })
      return Promise.resolve({ data: { status: 'applied', linked_invoice_rows: 1, linked_quotation_rows: 0 }, error: null })
    },
  }
  const base = {
    normalizedDescription: 'primary air filter',
    caseMembershipHash: 'hr-v1-invoice_items:inv-1',
    invoiceRowIds: ['inv-1'],
    quotationRowIds: [],
  }

  await linkHistoricalReviewCaseToItem({ ...base, targetItemId: 'cat-1' }, client)
  await createItemFromHistoricalReviewCase({ ...base, canonicalName: 'Primary Air Filter' }, client)
  await keepHistoricalReviewCandidateSeparate({ ...base, candidateItemId: 'cat-2' }, client)

  assert.deepEqual(calls.map((call) => call.fn), [
    'link_historical_review_case_to_item',
    'create_item_from_historical_review_case',
    'keep_historical_review_case_candidate_separate',
  ])

  calls.forEach((call) => {
    assert.equal(call.params.p_normalized_description, 'primary air filter')
    assert.equal(call.params.p_case_membership_hash, 'hr-v1-invoice_items:inv-1')
    assert.deepEqual(call.params.p_invoice_row_ids, ['inv-1'])
    assert.deepEqual(call.params.p_quotation_row_ids, [])
    assert.ok(!('unit_price' in call.params))
    assert.ok(!('quantity' in call.params))
    assert.ok(!('tax' in call.params))
    assert.ok(!('description' in call.params))
  })
})

function stubTenantClient(fixtures, failTables = []) {
  const calls = []
  const tableRows = (table) => fixtures[table] || []

  const builderFor = (table) => {
    const state = { range: null }
    const builder = {
      select: (columns) => {
        calls.push({ table, select: columns })
        return builder
      },
      is: () => builder,
      eq: () => builder,
      order: () => builder,
      limit: () => builder,
      in: () => builder,
      range: (from, to) => {
        state.range = [from, to]
        return builder
      },
      then: (resolve, reject) => {
        if (failTables.includes(table)) {
          return Promise.resolve({ data: null, error: { message: `stub failure on ${table}` } }).then(resolve, reject)
        }
        let rows = tableRows(table)
        if (state.range) rows = rows.slice(state.range[0], state.range[1] + 1)
        return Promise.resolve({ data: rows, error: null }).then(resolve, reject)
      },
    }
    return builder
  }

  return {
    calls,
    client: {
      isReady: true,
      schemaName: tenantMain,
      from: (table) => builderFor(table),
    },
  }
}

function dbRow(overrides) {
  return {
    id: overrides.id,
    invoice_id: overrides.invoice_id || null,
    quotation_id: overrides.quotation_id || null,
    item_id: overrides.item_id || null,
    description: overrides.description,
    row_type: overrides.row_type || 'standard',
    unit: 'pcs',
    make: null,
    quantity: 1,
    unit_price: 12000,
    group_name: null,
    group_id: null,
    updated_at: '2026-06-04T10:00:00.000Z',
  }
}

test('repository joins parent documents without embed syntax and keeps failures distinct from empty', async () => {
  const { calls, client } = stubTenantClient({
    invoice_items: [
      dbRow({ id: 'row-inv-1', invoice_id: 'inv-1', description: 'Primary Air Filter' }),
      dbRow({ id: 'row-orphan', invoice_id: 'missing-doc', description: 'Primary Air Filter' }),
      dbRow({ id: 'row-linked', invoice_id: 'inv-1', item_id: 'cat-1', description: 'Primary Air Filter' }),
      dbRow({ id: 'row-header', invoice_id: 'inv-1', row_type: 'group_header', description: 'Mechanical Works' }),
    ],
    quotation_items: [
      dbRow({ id: 'row-quo-1', quotation_id: 'quo-1', description: 'Primary Air Filter' }),
    ],
    invoices: [
      { id: 'inv-1', invoice_number: 'INV-1', issue_date: '2026-06-04', client_name: 'Client A' },
    ],
    quotations: [
      { id: 'quo-1', quotation_number: 'Q-1', issue_date: '2026-06-09', client_name: 'Client B' },
    ],
    item_catalog: [
      { id: 'cat-1', name: 'Air Filter', normalized_name: 'air filter', standard_price: 100, is_active: true },
    ],
    item_aliases: [],
    item_price_summary_v: [
      { item_id: 'cat-1', usage_count: 3, last_sold_price: 120, last_used_at: '2026-06-01' },
    ],
  })

  const result = await getHistoricalReviewCases(client)

  assert.equal(result.summary.case_count, 1)
  assert.equal(result.summary.occurrence_count, 3)
  assert.equal(result.cases[0].invoice_count, 2)
  assert.equal(result.cases[0].quotation_count, 1)

  const numbers = result.cases[0].occurrences.map((entry) => entry.source_document_number)
  assert.ok(numbers.includes('INV-1'))
  assert.ok(numbers.includes('Q-1'))
  assert.ok(numbers.includes(null))

  result.cases[0].candidates.forEach((candidate) => {
    assert.equal(candidate.evidence_strength, 'advisory')
  })

  const tables = calls.map((call) => call.table)
  assert.ok(tables.includes('invoices'))
  assert.ok(tables.includes('quotations'))
  calls.forEach((call) => {
    if (call.table === 'invoice_items' || call.table === 'quotation_items') {
      assert.ok(!call.select.includes('('), `select on ${call.table} must not use embed syntax`)
    }
  })
})

test('repository surfaces query failure instead of an empty queue', async () => {
  const { client } = stubTenantClient({ invoice_items: [] }, ['invoice_items'])
  await assert.rejects(() => getHistoricalReviewCases(client), (thrown) => {
    assert.equal(thrown?.message, 'stub failure on invoice_items')
    return true
  })
})
