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
