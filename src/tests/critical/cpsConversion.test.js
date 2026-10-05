import test from 'node:test'
import assert from 'node:assert/strict'

import { mapCpsToQuotation } from '../../domain/cps/conversion.ts'
import { computeDocument } from '../../lib/Calculations.ts'
import { BUILTIN_COLUMNS } from '../../domain/invoice/columns.ts'
import { getNextQuotationNumber } from '../../domain/quotation/normalize.ts'
import { resolvePrefix } from '../../domain/prefixConstants.ts'
import { readFileSync } from 'node:fs'

// Regression fixture mirroring the failed production payload shape:
// populated title, selected client snapshot, grouped and ungrouped items,
// multiple quantities and units, sub-descriptions, make/brand, non-zero
// CP and SP, and non-contiguous group membership.
function buildFixtureCps() {
  const groupA = 'grp-a'
  const groupB = 'grp-b'
  const row = (patch) => ({
    id: patch._key,
    _uiKey: patch._key,
    row_type: 'item',
    sort_order: 0,
    section_title: '',
    description: '',
    specification: '',
    quantity: 1,
    unit: 'pcs',
    notes: '',
    make_brand: '',
    cp: 0,
    sp: 0,
    image_url: null,
    group_id: null,
    vat_rate: null,
    discount_rate: null,
    install_rate: null,
    install_rate_override: null,
    install_rate_taxable: null,
    custom_data: {},
    ...patch,
  })
  const section = (key, groupId, title) => ({
    ...row({ _key: key, description: title }),
    row_type: 'section',
    section_title: title,
    group_id: groupId,
    quantity: 0,
  })

  return {
    id: 'cps-fixture-1',
    cps_number: 'SASBOQ-000007',
    title: 'Duplex Build',
    client_name: 'Wellspring Homes Ltd',
    project_name: 'Lekki Phase 1',
    issue_date: '2026-10-04',
    notes: 'Internal margin notes must not cross.',
    custom_fields: {
      client_id: 'client-1',
      client_snapshot: {
        id: 'client-1',
        name: 'Wellspring Homes Ltd',
        contact_person: 'Adaeze Okonkwo',
        phone: '0803 555 0192',
        email: 'adaeze@wellspring.ng',
        city: 'Lagos',
        state: 'Lagos',
      },
    },
    table_columns: [],
    table_rows: [
      row({ _key: 'prelim', description: 'Preliminaries and supervision', quantity: 1, unit: 'lot', cp: 150000, sp: 185000 }),
      section('sec-a', groupA, 'Group A — Civil Works'),
      row({ _key: 'cement', description: 'Portland cement 42.5R', specification: 'Grade 42.5R, per engineer spec', quantity: 400, unit: 'bags', make_brand: 'Dangote 3X', cp: 5200, sp: 6100, group_id: groupA }),
      row({ _key: 'mid', description: 'Provisional sum — drainage', quantity: 1, unit: 'sum', cp: 0, sp: 0 }),
      row({ _key: 'steel', description: 'Reinforcement steel T12', quantity: 120, unit: 'lengths', make_brand: 'African Foundries', cp: 9800.75, sp: 11500, group_id: groupA }),
      section('sec-b', groupB, 'Group B — Finishes'),
      row({ _key: 'paint', description: 'Emulsion paint 20L', specification: 'Two coats', quantity: 18, unit: 'pails', make_brand: 'Dulux', cp: 41000, sp: 48500, group_id: groupB }),
    ],
  }
}

// quotation_items columns per migration 20260520090002_quotations.sql
const QUOTATION_ITEM_COLUMNS = new Set([
  'id',
  'quotation_id',
  'description',
  'sub_description',
  'make',
  'quantity',
  'unit',
  'unit_price',
  'amount',
  'install_rate',
  'vat_rate',
  'discount_rate',
  'row_type',
  'group_id',
  'group_name',
  'sort_order',
  'image_url',
  'custom_data',
  'created_at',
  'updated_at',
  'formula',
  'install_rate_override',
  'install_rate_taxable',
  'show_install_rate',
  'item_id',
  // Phase 2 CPS row-level lineage columns
  // (migration 20261005130000_cps_row_lineage_and_authority.sql).
  'source_cps_id',
  'source_cps_row_id',
  'source_quotation_id',
  'source_quotation_item_id',
])

test('conversion maps a populated CPS into populated quotation rows', () => {
  const { items } = mapCpsToQuotation(buildFixtureCps(), 'SASQUO-000411')
  const standards = items.filter((item) => item.row_type === 'standard')
  assert.equal(standards.length, 5)

  const cement = standards.find((item) => item.description === 'Portland cement 42.5R')
  assert.ok(cement)
  assert.equal(cement.quantity, 400)
  assert.equal(cement.unit, 'bags')
  assert.equal(cement.unit_price, 6100)
  assert.equal(cement.sub_description, 'Grade 42.5R, per engineer spec')
  assert.equal(cement.make, 'Dangote 3X')
})

test('conversion emits only quotation_items columns', () => {
  const { items } = mapCpsToQuotation(buildFixtureCps(), 'SASQUO-000411')
  for (const item of items) {
    for (const key of Object.keys(item)) {
      assert.ok(
        QUOTATION_ITEM_COLUMNS.has(key),
        `converted row carries non-quotation column ${key}`,
      )
    }
  }
})

test('conversion preserves group headers and membership in source order', () => {
  const { items } = mapCpsToQuotation(buildFixtureCps(), 'SASQUO-000411')
  const headers = items.filter((item) => item.row_type === 'group_header')
  assert.equal(headers.length, 2)
  assert.equal(headers[0].group_name, 'Group A — Civil Works')
  assert.equal(headers[1].group_name, 'Group B — Finishes')

  const byDescription = new Map(items.map((item) => [item.description, item]))
  assert.equal(byDescription.get('Portland cement 42.5R').group_id, 'grp-a')
  assert.equal(byDescription.get('Reinforcement steel T12').group_id, 'grp-a')
  assert.equal(byDescription.get('Emulsion paint 20L').group_id, 'grp-b')
  assert.equal(byDescription.get('Preliminaries and supervision').group_id, null)
  assert.equal(byDescription.get('Provisional sum — drainage').group_id, null)

  const order = items.map((item) => item.description)
  assert.ok(order.indexOf('Reinforcement steel T12') > order.indexOf('Provisional sum — drainage'))
})

test('conversion maps SP to unit price and derives totals through quotation authority', () => {
  const cps = buildFixtureCps()
  const { payload, items } = mapCpsToQuotation(cps, 'SASQUO-000411')
  assert.equal(payload.quotation_title, 'Duplex Build')
  assert.equal(payload.client_id, 'client-1')
  assert.equal(payload.client_name, 'Wellspring Homes Ltd')

  const expected = computeDocument({
    items: items.map((item, idx) => ({
      id: `temp-${idx}`,
      row_type: item.row_type,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      amount: item.amount,
      group_id: item.group_id,
      group_name: item.group_name,
      vat_rate: item.vat_rate,
      discount_rate: item.discount_rate,
      install_rate: item.install_rate,
      install_rate_override: item.install_rate_override,
    })),
    columns: BUILTIN_COLUMNS,
    document: { status: 'open' },
    cf: {},
  })
  assert.equal(payload.subtotal, Number(expected.subtotal || 0))
  assert.equal(payload.total, Number(expected.totalPayable || 0))
  assert.ok(payload.total > 0)
})

test('conversion excludes CP, notes, and site from every channel', () => {
  const { payload, items } = mapCpsToQuotation(buildFixtureCps(), 'SASQUO-000411')
  assert.equal(payload.notes, null)
  assert.equal(payload.project_id, null)

  const serialized = JSON.stringify({ payload, items })
  assert.doesNotMatch(serialized, /"cp":/)
  assert.doesNotMatch(serialized, /Lekki Phase 1/)
  assert.doesNotMatch(serialized, /Internal margin notes must not cross/)
  for (const item of items) {
    const custom = JSON.parse(item.custom_data)
    assert.ok(!('cp' in custom))
    assert.ok(!('site' in custom))
  }
})

test('populated source rows never collapse to Untitled defaults', () => {
  const { items } = mapCpsToQuotation(buildFixtureCps(), 'SASQUO-000011')
  for (const item of items.filter((entry) => entry.row_type === 'standard')) {
    assert.ok(item.description.trim().length > 0)
    assert.ok(item.quantity > 0 || item.unit_price >= 0)
  }
  const cement = items.find((item) => item.description === 'Portland cement 42.5R')
  assert.ok(cement && cement.unit_price > 0 && cement.quantity > 0)
})

test('conversion numbering uses the tenant quotation prefix authority', () => {
  const prefixes = { quotation: 'SASQUO' }
  const prefix = resolvePrefix(prefixes, 'quotation')
  assert.equal(prefix, 'SASQUO')
  const next = getNextQuotationNumber(
    [{ quotation_number: 'SASQUO-000411' }],
    prefix,
    412,
  )
  assert.equal(next, 'SASQUO-000412')
  assert.equal(resolvePrefix(null, 'quotation'), 'QTN')
})

test('ViewCps threads tenant prefixes into conversion', () => {
  const viewSource = readFileSync(
    new URL('../../pages/ViewCps.tsx', import.meta.url),
    'utf8',
  )
  assert.ok(
    viewSource.includes('prefixes: settings?.document_prefixes'),
    'conversion must receive tenant prefixes so it shares normal quotation numbering',
  )
})

test('conversion defaults apply no commercial adjustment', () => {
  const plain = mapCpsToQuotation(buildFixtureCps(), 'SASQUO-000411')
  const explicit = mapCpsToQuotation(buildFixtureCps(), 'SASQUO-000411', {
    vatRate: 0,
    discountValue: 0,
    discountType: 'fixed',
    discountTiming: 'after',
    extraCharges: [],
  })
  assert.equal(explicit.payload.vat, 0)
  assert.equal(explicit.payload.discount, 0)
  assert.equal(explicit.payload.subtotal, plain.payload.subtotal)
  assert.equal(explicit.payload.total, plain.payload.total)
})

test('conversion VAT option raises the quotation total', () => {
  const plain = mapCpsToQuotation(buildFixtureCps(), 'SASQUO-000411')
  const withVat = mapCpsToQuotation(buildFixtureCps(), 'SASQUO-000411', {
    vatRate: 7.5,
    discountValue: 0,
    discountType: 'fixed',
    discountTiming: 'after',
    extraCharges: [],
  })
  assert.equal(withVat.payload.vat, 7.5)
  assert.ok(withVat.payload.total > plain.payload.total)
})

test('conversion discount fixed and percent options reduce the total', () => {
  const plainTotal = mapCpsToQuotation(buildFixtureCps(), 'SASQUO-000411').payload.total
  const fixed = mapCpsToQuotation(buildFixtureCps(), 'SASQUO-000411', {
    vatRate: 0,
    discountValue: 1000,
    discountType: 'fixed',
    discountTiming: 'after',
    extraCharges: [],
  })
  const percent = mapCpsToQuotation(buildFixtureCps(), 'SASQUO-000411', {
    vatRate: 0,
    discountValue: 10,
    discountType: 'percent',
    discountTiming: 'after',
    extraCharges: [],
  })
  assert.equal(fixed.payload.discount, 1000)
  assert.ok(fixed.payload.total < plainTotal)
  assert.ok(percent.payload.total < plainTotal)
  assert.notEqual(fixed.payload.total, percent.payload.total)
})

test('conversion extra charges persist through the quotation contract', () => {
  const { payload } = mapCpsToQuotation(buildFixtureCps(), 'SASQUO-000411', {
    vatRate: 0,
    discountValue: 0,
    discountType: 'fixed',
    discountTiming: 'after',
    extraCharges: [{ label: 'Delivery', value: 5000, withTax: false }],
  })
  const custom = JSON.parse(payload.custom_fields)
  assert.ok(Array.isArray(custom.extraCharges))
  assert.equal(custom.extraCharges[0].label, 'Delivery')
  assert.equal(Number(custom.extraCharges[0].value), 5000)
})

test('conversion mapping never allocates numbers or touch CPS state', () => {
  const cps = buildFixtureCps()
  const before = JSON.stringify(cps.table_rows)
  mapCpsToQuotation(cps, 'SASQUO-000411', {
    vatRate: 7.5,
    discountValue: 5,
    discountType: 'percent',
    discountTiming: 'before',
    extraCharges: [{ label: 'Haulage', value: 2000, withTax: true }],
  })
  assert.equal(JSON.stringify(cps.table_rows), before)
})

test('conversion options keep CP, notes, and site excluded', () => {
  const { payload, items } = mapCpsToQuotation(buildFixtureCps(), 'SASQUO-000411', {
    vatRate: 7.5,
    discountValue: 5,
    discountType: 'percent',
    discountTiming: 'before',
    extraCharges: [{ label: 'Haulage', value: 2000, withTax: true }],
  })
  assert.equal(payload.notes, null)
  assert.equal(payload.project_id, null)
  const serialized = JSON.stringify({ payload, items })
  assert.doesNotMatch(serialized, /"cp":/)
})
