import test from 'node:test'
import assert from 'node:assert/strict'

import {
  synchronizedCompanySave,
} from '../../domain/tenant/companyIdentity.ts'

test('synchronizedCompanySave rejects empty or whitespace-only company names', async () => {
  let persistCalled = false
  let refreshCalled = false

  await assert.rejects(
    async () => {
      await synchronizedCompanySave({
        entityId: 'ent-1',
        workspaceId: 'ws-1',
        currentDisplayName: 'Jig',
        newCompanyName: '   ',
        settingsPayload: {},
        tenantClient: {},
        persistSettings: async () => { persistCalled = true },
        refreshEntity: () => { refreshCalled = true },
      })
    },
    /Company name cannot be empty or whitespace only/,
  )

  assert.equal(persistCalled, false, 'Tenant settings must not be written on empty name')
  assert.equal(refreshCalled, false, 'EntityProvider must not be refreshed on failure')
})

test('synchronizedCompanySave executes settings update without entity write when name is unchanged', async () => {
  let persistCalled = false
  let refreshCalled = false

  const result = await synchronizedCompanySave({
    entityId: 'ent-1',
    workspaceId: 'ws-1',
    currentDisplayName: 'THANKGOD TECHNICAL SERVICES & CONTRACTORS',
    newCompanyName: 'THANKGOD TECHNICAL SERVICES & CONTRACTORS',
    settingsPayload: { company_address: 'No 50 college road' },
    tenantClient: {},
    persistSettings: async (payload) => {
      persistCalled = true
      assert.equal(payload.company_name, 'THANKGOD TECHNICAL SERVICES & CONTRACTORS')
      assert.equal(payload.company_address, 'No 50 college road')
    },
    refreshEntity: () => { refreshCalled = true },
  })

  assert.equal(persistCalled, true)
  assert.equal(refreshCalled, true)
  assert.equal(result.displayNameUpdated, false)
  assert.equal(result.settingsUpdated, true)
})

test('Settings, Sidebars, and CompanySelectionSheet resolve company_name over stale entity slug', async () => {
  const fs = await import('node:fs')
  const path = await import('node:path')
  const read = (p) => fs.readFileSync(path.resolve(p), 'utf8')

  const settingsSource = read('src/pages/Settings.tsx')
  const desktopSidebarSource = read('src/components/layout/DesktopSidebar.tsx')
  const mobileSidebarSource = read('src/components/layout/MobileSidebar.tsx')
  const companySheetSource = read('src/components/layout/CompanySelectionSheet.tsx')
  const companySectionSource = read('src/pages/settings/CompanySettingsSection.tsx')
  const contextsSource = read('src/lib/tenant/contexts.tsx')

  // Settings resolves company name from settings first
  assert.match(settingsSource, /import \{ useSettings \} from '@\/hooks\/useSettings'/)
  assert.match(settingsSource, /settings\?\.company_name\?\.trim\(\)\s*\|\|\s*entity\?\.name/)

  // DesktopSidebar resolves company name from settings first
  assert.match(desktopSidebarSource, /import \{ useSettings \} from '@\/hooks\/useSettings'/)
  assert.match(desktopSidebarSource, /settings\?\.company_name\?\.trim\(\)\s*\|\|\s*entity\?\.name/)

  // MobileSidebar resolves company name from settings first
  assert.match(mobileSidebarSource, /import \{ useSettings \} from '@\/hooks\/useSettings'/)
  assert.match(mobileSidebarSource, /settings\?\.company_name\?\.trim\(\)\s*\|\|\s*entity\?\.name/)

  // CompanySelectionSheet displays company name from settings for active entity
  assert.match(companySheetSource, /import \{ useSettings \} from '@\/hooks\/useSettings'/)
  assert.match(companySheetSource, /settings\?\.company_name\?\.trim\(\)/)

  // CompanySettingsSection wires syncEntityName
  assert.match(companySectionSource, /syncEntityName/)
  assert.match(companySectionSource, /syncEntityName\?\.\(form\.company_name\)/)

  // contexts.tsx defines and exposes syncEntityName
  assert.match(contextsSource, /syncEntityName/)
})
