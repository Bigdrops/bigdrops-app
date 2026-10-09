import test from 'node:test'
import assert from 'node:assert/strict'

import { createEmptyCps } from '../../domain/cps/factories.ts'
import { applyCpsImport, buildCpsImportPrompt, cpsImportSchema } from '../../domain/cps/importAdapter.ts'
import { createEmptyTableRow } from '../../domain/table-document/rows.ts'
import { denormalizeToDbCpsRow, normalizeDbCps } from '../../domain/cps/normalize.ts'
import { buildCpsViewData } from '../../domain/cps/viewData.ts'
import { computeCpsRowEconomics, computeCpsTotals } from '../../domain/cps/calculateCpsTotals.ts'

function itemRows(cps) {
  return cps.table_rows.filter((row) => row.row_type === 'item')
}

function sectionRows(cps) {
  return cps.table_rows.filter((row) => row.row_type === 'section')
}

function cpsGroupedItem(ref, groupId, description = ref) {
  return {
    temp_ref: ref,
    group_id: groupId,
    description,
    cost_price: 1,
    selling_price: 2,
  }
}

function cpsStandaloneItem(ref, description = ref) {
  return {
    temp_ref: ref,
    group_id: '',
    description,
    cost_price: 1,
    selling_price: 2,
  }
}

test('cost_price maps only to CPS cp', () => {
  const cps = applyCpsImport(
    cpsImportSchema.parse({ items: [{ description: 'Cement', quantity: 10, cost_price: 100 }] }),
    createEmptyCps(),
  )

  const row = itemRows(cps)[0]
  assert.equal(row.cp, '100')
  assert.equal(row.sp, '')
})

test('selling_price maps only to CPS sp', () => {
  const cps = applyCpsImport(
    cpsImportSchema.parse({ items: [{ description: 'Cement', quantity: 10, selling_price: 150 }] }),
    createEmptyCps(),
  )

  const row = itemRows(cps)[0]
  assert.equal(row.sp, '150')
  assert.equal(row.cp, '')
})

test('cost_price and selling_price never copy into each other', () => {
  const cps = applyCpsImport(
    cpsImportSchema.parse({ items: [{ description: 'Cement', quantity: 10, cost_price: 100, selling_price: 150 }] }),
    createEmptyCps(),
  )

  const row = itemRows(cps)[0]
  assert.equal(row.cp, '100')
  assert.equal(row.sp, '150')
})

test('the canonical schema rejects non-canonical extraction fields', () => {
  const forbiddenKeys = [
    'unit_price',
    'cp',
    'sp',
    'id',
    'gid',
    'image_url',
    'specification',
    'qty',
    'make_brand',
  ]
  for (const key of forbiddenKeys) {
    assert.throws(
      () => cpsImportSchema.parse({ items: [{ description: 'Row', [key]: 1 }] }),
      `expected the schema to reject item key "${key}"`,
    )
  }

  for (const key of ['site', 'client_name', 'vendor_name', 'vendor_contact']) {
    assert.throws(
      () => cpsImportSchema.parse({ [key]: 'Value', items: [{ description: 'Row' }] }),
      `expected the schema to reject top-level key "${key}"`,
    )
  }

  assert.throws(() => cpsImportSchema.parse({ items: [{ description: 'Row', warranty: '12 months' }] }))
})

test('client fields cannot assign or overwrite the selected CPS client', () => {
  const cps = createEmptyCps()
  cps.client_name = 'Existing Client'
  cps.custom_fields = {
    client_id: 'client-1',
    client_snapshot: { id: 'client-1', name: 'Existing Client' },
  }

  const next = applyCpsImport(
    cpsImportSchema.parse({ title: 'Imported', items: [{ description: 'Cement', cost_price: 100, selling_price: 150 }] }),
    cps,
  )

  assert.equal(next.client_name, 'Existing Client')
  assert.equal(next.custom_fields.client_id, 'client-1')
  assert.equal(next.custom_fields.client_snapshot.name, 'Existing Client')
})

test('importing before a client is selected leaves the Client Picker empty', () => {
  const next = applyCpsImport(
    cpsImportSchema.parse({ items: [{ description: 'Cement', cost_price: 100, selling_price: 150 }] }),
    createEmptyCps(),
  )

  assert.equal(next.client_name, '')
  assert.equal(next.custom_fields?.client_id, undefined)
})

test('site is not imported into Site / Project', () => {
  const cps = createEmptyCps()
  cps.project_name = 'Original Site'

  const next = applyCpsImport(
    cpsImportSchema.parse({ items: [{ description: 'Cement', cost_price: 100, selling_price: 150 }] }),
    cps,
  )

  assert.equal(next.project_name, 'Original Site')
})

test('image_url does not create or replace an item photo through JSON import', () => {
  const next = applyCpsImport(
    cpsImportSchema.parse({ items: [{ description: 'Cement', cost_price: 100, selling_price: 150 }] }),
    createEmptyCps(),
  )

  assert.equal(itemRows(next)[0].image_url ?? null, null)
})

test('custom_fields reuse existing CPS custom columns and populate row custom data', () => {
  const cps = createEmptyCps()
  cps.custom_fields = { columnConfig: [{ key: 'custom_warranty', label: 'Warranty' }] }

  const next = applyCpsImport(
    cpsImportSchema.parse({
      items: [{
        description: 'Cement',
        cost_price: 100,
        selling_price: 150,
        custom_fields: { Warranty: '12 months' },
      }],
    }),
    cps,
  )

  const customColumns = next.custom_fields.columnConfig.filter((column) => column.key.startsWith('custom_'))
  assert.equal(customColumns.length, 1)
  assert.equal(customColumns[0].key, 'custom_warranty')
  assert.deepEqual(itemRows(next)[0].custom_data ?? {}, { custom_warranty: '12 months' })
})

test('custom_fields create one CPS custom column for superficial label variants', () => {
  const cps = createEmptyCps()
  const next = applyCpsImport(
    cpsImportSchema.parse({
      items: [
        { description: 'A', custom_fields: { 'Part no ': 'DT04-2P' } },
        { description: 'B', custom_fields: { 'PART NO': 'DT04-3P' } },
      ],
    }),
    cps,
  )

  const customColumns = next.custom_fields.columnConfig.filter((column) => column.key.startsWith('custom_'))
  assert.equal(customColumns.length, 1)
  assert.equal(customColumns[0].label, 'Part no')
  assert.equal(itemRows(next)[0].custom_data[customColumns[0].key], 'DT04-2P')
  assert.equal(itemRows(next)[1].custom_data[customColumns[0].key], 'DT04-3P')
})

test('custom_fields matching built-in CPS columns do not create custom duplicates', () => {
  const cps = createEmptyCps()
  const next = applyCpsImport(
    cpsImportSchema.parse({
      items: [{ description: 'Cable', custom_fields: { Unit: 'pcs', CP: 50, SP: 80 } }],
    }),
    cps,
  )

  const row = itemRows(next)[0]
  assert.equal(row.unit, 'pcs')
  assert.equal(row.cp, '50')
  assert.equal(row.sp, '80')
  assert.equal(next.custom_fields.columnConfig.some((column) => column.key.startsWith('custom_')), false)
})

test('CPS import prompt reflects visible custom columns through custom_fields', () => {
  const cps = createEmptyCps()
  cps.custom_fields = {
    columnConfig: [
      { key: 'custom_part_no', label: 'Part no', visible: true, visibilityMode: 'show' },
      { key: 'custom_hidden', label: 'Hidden', visible: false, visibilityMode: 'hide_full' },
    ],
  }

  const prompt = buildCpsImportPrompt(cps)
  assert.match(prompt, /custom_fields/)
  assert.match(prompt, /Part no/)
  assert.doesNotMatch(prompt, /Hidden/)
})

test('explicit contiguous source groups produce deterministic grp_N and item_N references', () => {
  const cps = applyCpsImport(
    cpsImportSchema.parse({
      groups: [
        { id: 'grp_1', name: 'Electrical Works', itemIds: ['item_1', 'item_2'] },
        { id: 'grp_2', name: 'Mechanical Works', itemIds: ['item_3'] },
      ],
      items: [
        { temp_ref: 'item_1', group_id: 'grp_1', description: 'Cable', quantity: 1, cost_price: 10, selling_price: 14 },
        { temp_ref: 'item_2', group_id: 'grp_1', description: 'Panel', quantity: 1, cost_price: 300, selling_price: 380 },
        { temp_ref: 'item_3', group_id: 'grp_2', description: 'Pump', quantity: 1, cost_price: 200, selling_price: 260 },
      ],
    }),
    createEmptyCps(),
  )

  const sections = sectionRows(cps)
  assert.deepEqual(sections.map((row) => row.group_id), ['grp_1', 'grp_2'])
  assert.deepEqual(sections.map((row) => row._uiKey), ['grp_1', 'grp_2'])
  assert.deepEqual(sections.map((row) => row.section_title), ['Electrical Works', 'Mechanical Works'])

  const items = itemRows(cps)
  assert.equal(items.find((row) => row.description === 'Cable').group_id, 'grp_1')
  assert.equal(items.find((row) => row.description === 'Panel').group_id, 'grp_1')
  assert.equal(items.find((row) => row.description === 'Pump').group_id, 'grp_2')
})

test('source or database identifiers do not determine synthetic relationship ids', () => {
  const cps = applyCpsImport(
    cpsImportSchema.parse({
      groups: [
        { id: 'S1', name: 'Section One', itemIds: ['A1'] },
        { id: 'S2', name: 'Section Two', itemIds: ['A2'] },
      ],
      items: [
        { temp_ref: 'A1', group_id: 'S1', description: 'Cable', cost_price: 10, selling_price: 14 },
        { temp_ref: 'A2', group_id: 'S2', description: 'Pump', cost_price: 20, selling_price: 26 },
      ],
    }),
    createEmptyCps(),
  )

  const sections = sectionRows(cps)
  assert.deepEqual(sections.map((row) => row.group_id), ['grp_1', 'grp_2'])
  assert.equal(sections.some((row) => String(row.group_id).includes('S1')), false)

  const items = itemRows(cps)
  assert.equal(items.find((row) => row.description === 'Cable').group_id, 'grp_1')
  assert.equal(items.find((row) => row.description === 'Pump').group_id, 'grp_2')
})

test('an ungrouped source does not infer or manufacture a group', () => {
  const cps = applyCpsImport(
    cpsImportSchema.parse({
      items: [
        { description: 'Cable', quantity: 1, cost_price: 10, selling_price: 14 },
        { description: 'Pump', quantity: 1, cost_price: 20, selling_price: 26 },
      ],
    }),
    createEmptyCps(),
  )

  assert.equal(sectionRows(cps).length, 0)
  assert.equal(cps.table_rows.some((row) => row.section_title === 'Items'), false)
  assert.deepEqual(itemRows(cps).map((row) => row.description), ['Cable', 'Pump'])
  assert.deepEqual(itemRows(cps).map((row) => row.group_id ?? null), [null, null])
})

test('CPS import rejects scattered source group membership before application', () => {
  const result = cpsImportSchema.safeParse({
    groups: [
      { id: 'grp_1', name: 'Electrical Materials', itemIds: ['item_2', 'item_6'] },
      { id: 'grp_2', name: 'Generator Parts', itemIds: ['item_4', 'item_9', 'item_13'] },
      { id: 'grp_3', name: 'Tools and Accessories', itemIds: ['item_8', 'item_12', 'item_15'] },
    ],
    items: [
      cpsStandaloneItem('item_1'),
      cpsGroupedItem('item_2', 'grp_1'),
      cpsStandaloneItem('item_3'),
      cpsGroupedItem('item_4', 'grp_2'),
      cpsStandaloneItem('item_5'),
      cpsGroupedItem('item_6', 'grp_1'),
      cpsStandaloneItem('item_7'),
      cpsGroupedItem('item_8', 'grp_3'),
      cpsGroupedItem('item_9', 'grp_2'),
      cpsStandaloneItem('item_10'),
      cpsStandaloneItem('item_11'),
      cpsGroupedItem('item_12', 'grp_3'),
      cpsGroupedItem('item_13', 'grp_2'),
      cpsStandaloneItem('item_14'),
      cpsGroupedItem('item_15', 'grp_3'),
    ],
  })

  assert.equal(result.success, false)
  assert.match(result.error.issues[0].message, /Electrical Materials|grp_1|contiguous|reopened|split/i)
})

test('CPS import accepts valid mixed standalone and grouped blocks without reordering items', () => {
  const cps = applyCpsImport(
    cpsImportSchema.parse({
      groups: [
        { id: 'grp_1', name: 'Electrical', itemIds: ['item_2', 'item_3'] },
        { id: 'grp_2', name: 'Mechanical', itemIds: ['item_5', 'item_6'] },
      ],
      items: [
        cpsStandaloneItem('item_1', 'A'),
        cpsGroupedItem('item_2', 'grp_1', 'B'),
        cpsGroupedItem('item_3', 'grp_1', 'C'),
        cpsStandaloneItem('item_4', 'D'),
        cpsGroupedItem('item_5', 'grp_2', 'E'),
        cpsGroupedItem('item_6', 'grp_2', 'F'),
        cpsStandaloneItem('item_7', 'G'),
      ],
    }),
    createEmptyCps(),
  )

  assert.deepEqual(itemRows(cps).map((row) => row.description), ['A', 'B', 'C', 'D', 'E', 'F', 'G'])
})

test('CPS import rejects group itemIds order that contradicts source item order', () => {
  const result = cpsImportSchema.safeParse({
    groups: [{ id: 'grp_1', name: 'Electrical', itemIds: ['item_3', 'item_1', 'item_2'] }],
    items: [
      cpsGroupedItem('item_1', 'grp_1'),
      cpsGroupedItem('item_2', 'grp_1'),
      cpsGroupedItem('item_3', 'grp_1'),
    ],
  })

  assert.equal(result.success, false)
  assert.match(result.error.issues[0].message, /order|itemIds|source/i)
})

test('inactive CPS columns are not populated through import', () => {
  const cps = createEmptyCps()
  cps.table_columns = cps.table_columns.map((column) =>
    column.key === 'cp' || column.key === 'unit' ? { ...column, visible: false } : column,
  )

  const next = applyCpsImport(
    cpsImportSchema.parse({
      items: [{ description: 'Cement', quantity: 10, unit: 'bag', cost_price: 100, selling_price: 150 }],
    }),
    cps,
  )

  const row = itemRows(next)[0]
  assert.equal(row.cp, '')
  assert.equal(row.unit, '')
  assert.equal(row.sp, '150')
})

test('the live column configuration also gates import', () => {
  const cps = createEmptyCps()
  cps.custom_fields = {
    columnConfig: [{ key: 'cp', visible: false }, { key: 'sp', visible: true }],
  }

  const next = applyCpsImport(
    cpsImportSchema.parse({
      items: [{ description: 'Cement', quantity: 10, cost_price: 100, selling_price: 150 }],
    }),
    cps,
  )

  const row = itemRows(next)[0]
  assert.equal(row.cp, '')
  assert.equal(row.sp, '150')
})

test('unknown fields do not create CPS custom columns', () => {
  const cps = createEmptyCps()
  const next = applyCpsImport(
    cpsImportSchema.parse({ items: [{ description: 'Cement', cost_price: 100, selling_price: 150 }] }),
    cps,
  )

  assert.equal(next.custom_fields?.columnConfig, undefined)
})

test('calculated values are not accepted as imported financial truth', () => {
  const derivedKeys = ['tcp', 'tsp', 'profit', 'margin', 'margin_percent', 'total', 'amount', 'line_total']
  for (const key of derivedKeys) {
    assert.throws(
      () => cpsImportSchema.parse({ items: [{ description: 'Row', [key]: 10 }] }),
      `expected the schema to reject derived key "${key}"`,
    )
  }

  const cps = applyCpsImport(
    cpsImportSchema.parse({ items: [{ description: 'Cement', quantity: 10, cost_price: 100, selling_price: 150 }] }),
    createEmptyCps(),
  )
  const line = computeCpsRowEconomics(itemRows(cps)[0])
  assert.equal(line.total_cost_price, 1000)
  assert.equal(line.total_selling_price, 1500)
})

test('CPS row normalization preserves photo metadata round trip', () => {
  const row = {
    ...createEmptyTableRow(0, 'item'),
    description: 'Panel',
    quantity: 1,
    unit: 'ea',
    cp: '25',
    sp: '30',
    image_url: 'https://res.cloudinary.com/demo/image/upload/panel.jpg',
  }

  const dbRow = denormalizeToDbCpsRow(row, 'b1')
  const normalized = normalizeDbCps({ id: 'b1', custom_fields: {} }, [dbRow]).table_rows[0]
  assert.equal(normalized.image_url, 'https://res.cloudinary.com/demo/image/upload/panel.jpg')
  assert.equal(normalized.cp, '25')
  assert.equal(normalized.sp, '30')
})

test('CPS view data uses authoritative totals and continuous numbering', () => {
  const cps = applyCpsImport(
    cpsImportSchema.parse({
      groups: [{ id: 'grp_1', name: 'Mechanical', itemIds: ['item_1'] }],
      items: [
        { temp_ref: 'item_1', group_id: 'grp_1', description: 'Pump', quantity: 2, unit: 'ea', cost_price: 100, selling_price: 130 },
        { temp_ref: 'item_2', description: 'Valve', quantity: 3, unit: 'ea', cost_price: 10, selling_price: 15 },
      ],
    }),
    createEmptyCps(),
  )

  const view = buildCpsViewData(cps)
  const items = view.rows.filter((row) => row.type === 'item')
  assert.equal(items[0].number, '01')
  assert.equal(items[1].number, '02')
  assert.equal(view.totals.total_cost, 230)
  assert.equal(view.totals.total_selling_price, 305)
  assert.equal(view.totals.gross_profit, 75)
})

test('CPS row TCP, TSP, Profit, and Margin stay authoritative', () => {
  const cps = applyCpsImport(
    cpsImportSchema.parse({
      items: [
        { description: 'A', quantity: 2, cost_price: 100, selling_price: 130 },
        { description: 'B', quantity: 3, cost_price: 10, selling_price: 15 },
      ],
    }),
    createEmptyCps(),
  )

  const rows = itemRows(cps)
  const first = computeCpsRowEconomics(rows[0])
  assert.equal(first.total_cost_price, 200)
  assert.equal(first.total_selling_price, 260)
  assert.equal(first.profit, 60)
  assert.equal(first.margin_percent, (60 / 260) * 100)

  const economics = rows.map(computeCpsRowEconomics)
  const totals = computeCpsTotals(rows)
  assert.equal(economics.reduce((sum, line) => sum + line.total_cost_price, 0), totals.total_cost)
  assert.equal(economics.reduce((sum, line) => sum + line.total_selling_price, 0), totals.total_selling_price)
  assert.equal(economics.reduce((sum, line) => sum + line.profit, 0), totals.gross_profit)
})
