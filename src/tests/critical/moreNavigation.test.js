import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { getActiveTab, tabs, moreGroups, mobileDrawerUtilityNav } from '../../components/layout/navData.ts'

test('bottom navigation keeps exactly five tabs', () => {
  assert.deepEqual(
    tabs.map((tab) => tab.key),
    ['home', 'projects', 'sales', 'clients', 'more'],
  )
})

test('more destination keeps the more tab selected', () => {
  assert.equal(getActiveTab('/more'), 'more')
})

test('settings landing and sub-routes keep the more tab selected', () => {
  // Main Settings landing and all Settings sub-routes share one route owner
  // (/settings) and one shared bottom navigation, so MORE stays selected.
  for (const path of ['/settings', '/settings/notifications']) {
    assert.equal(getActiveTab(path), 'more', `${path} must map to the more tab`)
  }
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
    '/tax',
    '/cold-launch-preview',
    '/photohero-preview',
  ])
  const pathByKey = {
    letters: '/letters',
    reports: '/reports',
    compliance: '/compliance',
    receipts: '/receipts',
    'item-library': '/item-library',
    settings: '/settings',
    tax: '/tax',
    'cold-launch-preview': '/cold-launch-preview',
    'photohero-preview': '/photohero-preview',
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

test('preview gateways keep their restored labels and route targets', () => {
  const workspaceItems = moreGroups.flatMap((group) => group.items)
  const coldLaunchMore = workspaceItems.find((item) => item.key === 'cold-launch-preview')
  const onboardingMore = workspaceItems.find((item) => item.key === 'photohero-preview')
  const coldLaunchDrawer = mobileDrawerUtilityNav.find((item) => item.key === 'cold-launch-preview')
  const onboardingDrawer = mobileDrawerUtilityNav.find((item) => item.key === 'photohero-preview')
  const moreOptionsSource = readFileSync(resolve('src/pages/MoreOptions.tsx'), 'utf8')
  const appShellSource = readFileSync(resolve('src/components/app/AppShell.tsx'), 'utf8')

  assert.equal(coldLaunchMore?.label, 'Cold Launch Preview')
  assert.equal(onboardingMore?.label, 'Onboarding Preview')
  assert.equal(coldLaunchDrawer?.label, 'Cold Launch Preview')
  assert.equal(coldLaunchDrawer?.path, '/cold-launch-preview')
  assert.equal(onboardingDrawer?.label, 'Onboarding Preview')
  assert.equal(onboardingDrawer?.path, '/photohero-preview')
  assert.match(moreOptionsSource, /label: 'Cold Launch Preview'[\s\S]*path: '\/cold-launch-preview'/)
  assert.match(moreOptionsSource, /label: 'Onboarding Preview'[\s\S]*path: '\/photohero-preview'/)
  assert.doesNotMatch(moreOptionsSource, /Design Previews/)
  assert.doesNotMatch(moreOptionsSource, /PhotoHero Preview/)
  assert.match(appShellSource, /<Route path="\/cold-launch-preview"/)
  assert.match(appShellSource, /<Route path="\/photohero-preview"/)
})
