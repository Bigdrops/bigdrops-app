import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { getNextCpsNumber } from '../../domain/cps/normalize.ts'
import { DEFAULT_PREFIXES, resolvePrefix } from '../../domain/prefixConstants.ts'

test('CPS canonical default prefix is CPS', () => {
  assert.equal(DEFAULT_PREFIXES.cps_sheets, 'CPS')
  assert.equal(resolvePrefix(null, 'cps_sheets'), 'CPS')
  assert.equal(resolvePrefix({}, 'cps_sheets'), 'CPS')
  assert.equal(resolvePrefix({ cps_sheets: '' }, 'cps_sheets'), 'CPS')
})

test('CPS reset preview starts a fresh CPS sequence', () => {
  assert.equal(getNextCpsNumber([], 'CPS'), 'CPS-000001')
})

test('tenant custom CPS prefix is authoritative', () => {
  assert.equal(resolvePrefix({ cps_sheets: 'SASCPS' }, 'cps_sheets'), 'SASCPS')
  assert.equal(getNextCpsNumber([{ cps_number: 'SASCPS-000001' }], 'SASCPS', 2), 'SASCPS-000002')
})

test('historical BOQ and SASBOQ numbers keep allocating within their own families', () => {
  assert.equal(getNextCpsNumber([{ cps_number: 'SASBOQ-000006' }], 'SASBOQ', 8), 'SASBOQ-000008')
  assert.equal(
    getNextCpsNumber([{ cps_number: 'BOQ-000001' }, { cps_number: 'BOQ-000004' }], 'BOQ'),
    'BOQ-000005',
  )
})

test('no active fallback manufactures BOQ for unset CPS configuration', () => {
  const normalizeSource = readFileSync(
    new URL('../../domain/cps/normalize.ts', import.meta.url),
    'utf8',
  )
  const fallback = normalizeSource.match(/prefix = '([A-Z0-9]+)'/)
  assert.ok(fallback, 'getNextCpsNumber fallback not found')
  assert.equal(fallback[1], 'CPS')
})
