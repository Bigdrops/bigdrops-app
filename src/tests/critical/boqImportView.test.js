import test from 'node:test'
import assert from 'node:assert/strict'

import { createEmptyBoq } from '../../domain/boq/factories.ts'
import { applyBoqImport, boqImportSchema } from '../../domain/boq/importAdapter.ts'
import { denormalizeToDbBoqRow, normalizeDbBoq } from '../../domain/boq/normalize.ts'
import { buildBoqViewData } from '../../domain/boq/viewData.ts'

test('CPS JSON import preserves groups, CP, SP, photos, and custom fields', () => {
  const parsed = boqImportSchema.parse({
    title: 'Generator pricing',
    client_name: 'Acme Limited',
    site: 'Lekki site',
    groups: [{ id: 'g1', name: 'Power', itemIds: ['i1'] }],
    items: [
      {
        id: 'i1',
        description: 'Generator',
        sub_description: '50kVA silent type',
        make: 'Mikano',
        quantity: 2,
        unit: 'set',
        cost_price: 100,
        unit_price: 150,
        image_url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        notes: 'Indoor install',
        custom_fields: { warranty: '12 months' },
      },
      {
        id: 'i2',
        description: 'Cable',
        quantity: 4,
        unit: 'm',
        cp: 10,
        sp: 14,
      },
    ],
  })

  const boq = applyBoqImport(parsed, createEmptyBoq())
  assert.equal(boq.title, 'Generator pricing')
  assert.equal(boq.vendor_name, 'Acme Limited')
  assert.equal(boq.vendor_contact, 'Lekki site')
  assert.equal(boq.table_rows[0].row_type, 'section')
  assert.equal(boq.table_rows[0].section_title, 'Power')
  assert.equal(boq.table_rows[1].description, 'Generator')
  assert.equal(boq.table_rows[1].cp, '100')
  assert.equal(boq.table_rows[1].sp, '150')
  assert.equal(boq.table_rows[1].image_url, 'https://res.cloudinary.com/demo/image/upload/sample.jpg')
  assert.deepEqual(boq.table_rows[1].custom_data, { custom_warranty: '12 months' })
  assert.equal(boq.custom_fields.columnConfig.some((column) => column.key === 'custom_warranty'), true)
  assert.equal(boq.table_rows[2].description, 'Cable')
})

test('BOQ row normalization preserves photo metadata round trip', () => {
  const row = applyBoqImport(
    boqImportSchema.parse({
      items: [{
        description: 'Panel',
        quantity: 1,
        unit: 'ea',
        cost_price: 25,
        unit_price: 30,
        image_url: 'https://res.cloudinary.com/demo/image/upload/panel.jpg',
      }],
    }),
    createEmptyBoq(),
  ).table_rows[0]

  const dbRow = denormalizeToDbBoqRow(row, 'b1')
  const normalized = normalizeDbBoq({ id: 'b1', custom_fields: {} }, [dbRow]).table_rows[0]
  assert.equal(normalized.image_url, 'https://res.cloudinary.com/demo/image/upload/panel.jpg')
  assert.equal(normalized.cp, '25')
  assert.equal(normalized.sp, '30')
})

test('CPS view data uses authoritative totals and continuous numbering', () => {
  const boq = applyBoqImport(
    boqImportSchema.parse({
      groups: [{ id: 'g1', name: 'Mechanical', itemIds: ['i1'] }],
      items: [
        { id: 'i1', description: 'Pump', quantity: 2, unit: 'ea', cost_price: 100, unit_price: 130 },
        { id: 'i2', description: 'Valve', quantity: 3, unit: 'ea', cost_price: 10, unit_price: 15 },
      ],
    }),
    createEmptyBoq(),
  )

  const view = buildBoqViewData(boq)
  const items = view.rows.filter((row) => row.type === 'item')
  assert.equal(items[0].number, '01')
  assert.equal(items[1].number, '02')
  assert.equal(view.totals.total_cost, 230)
  assert.equal(view.totals.total_selling_price, 305)
  assert.equal(view.totals.gross_profit, 75)
})
