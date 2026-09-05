import test from 'node:test'
import assert from 'node:assert/strict'

import { getActiveTab, tabs, moreGroups } from '../../components/layout/navData.ts'

test('bottom navigation keeps exactly five tabs', () => {
  assert.deepEqual(
    tabs.map((tab) => tab.key),
    ['home', 'projects', 'sales', 'clients', 'more'],
  )
})

test('more destination keeps the more tab selected', () => {
  assert.equal(getActiveTab('/more'), 'more')
})

test('accounting destinations keep the more tab selected', () => {
  for (const path of [
    '/accounting',
    '/accounting/accounts',
    '/accounting/periods',
    '/accounting/journal',
    '/accounting/journal/new',
  ]) {
    assert.equal(getActiveTab(path), 'more', `${path} must map to the more tab`)
  }
})

test('existing primary destinations keep their tabs', () => {
  assert.equal(getActiveTab('/'), 'home')
  assert.equal(getActiveTab('/projects'), 'projects')
  assert.equal(getActiveTab('/clients'), 'clients')
  assert.equal(getActiveTab('/invoices'), 'sales')
  assert.equal(getActiveTab('/letters'), 'more')
})

test('more sheet groups still resolve to real routes', () => {
  const knownRoutes = new Set([
    '/letters',
    '/reports',
    '/compliance',
    '/receipts',
    '/item-library',
    '/settings',
  ])
  const pathByKey = {
    letters: '/letters',
    reports: '/reports',
    compliance: '/compliance',
    receipts: '/receipts',
    'item-library': '/item-library',
    settings: '/settings',
  }
  for (const group of moreGroups) {
    for (const item of group.items) {
      if (item.key === 'signout') continue
      assert.ok(
        knownRoutes.has(pathByKey[item.key]),
        `more item ${item.key} must resolve to a real route`,
      )
    }
  }
})
