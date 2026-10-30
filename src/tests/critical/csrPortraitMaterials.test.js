import test from 'node:test'
import assert from 'node:assert/strict'

import { distributePortraitMaterialColumns } from '../../components/pdf/pdfcn'

const makeItems = (n) =>
  Array.from({ length: n }, (_, i) => ({
    no: String(i + 1).padStart(2, '0'),
    description: `Part ${i + 1}`,
    qty: '1',
    unit: 'pcs',
  }))

const shape = (n) => distributePortraitMaterialColumns(makeItems(n)).map((column) => column.length)

const flatNumbers = (columns) => columns.flat().map((item) => item.no)

test('Portrait materials: six-row maximum drives the column count', () => {
  assert.deepEqual(shape(0), [])
  assert.deepEqual(shape(1), [1])
  assert.deepEqual(shape(5), [5])
  assert.deepEqual(shape(6), [6])
  assert.deepEqual(shape(7), [4, 3])
  assert.deepEqual(shape(8), [4, 4])
  assert.deepEqual(shape(9), [5, 4])
  assert.deepEqual(shape(10), [5, 5])
  assert.deepEqual(shape(11), [6, 5])
  assert.deepEqual(shape(12), [6, 6])
  assert.deepEqual(shape(13), [5, 4, 4])
  assert.deepEqual(shape(18), [6, 6, 6])
  assert.deepEqual(shape(24), [6, 6, 6, 6])
})

test('Portrait materials: no column exceeds six rows and order is preserved', () => {
  for (let n = 1; n <= 40; n += 1) {
    const columns = distributePortraitMaterialColumns(makeItems(n))
    assert.equal(columns.length, Math.ceil(n / 6), `column count for ${n} items`)
    for (const column of columns) {
      assert.ok(column.length <= 6, `column with ${column.length} rows for ${n} items`)
    }

    const numbers = flatNumbers(columns)
    assert.equal(numbers.length, n, `all ${n} items present`)
    assert.deepEqual(
      numbers,
      Array.from({ length: n }, (_, i) => String(i + 1).padStart(2, '0')),
      `source order preserved for ${n} items`,
    )
  }
})

test('Portrait materials: earlier columns absorb the remainder', () => {
  assert.deepEqual(
    distributePortraitMaterialColumns(makeItems(7)).map((column) => column.map((item) => item.no)),
    [
      ['01', '02', '03', '04'],
      ['05', '06', '07'],
    ],
  )
  assert.deepEqual(
    distributePortraitMaterialColumns(makeItems(13)).map((column) => column.map((item) => item.no)),
    [
      ['01', '02', '03', '04', '05'],
      ['06', '07', '08', '09'],
      ['10', '11', '12', '13'],
    ],
  )
})
