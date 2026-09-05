import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveGatePhase, isProvisioningStatus, slugify } from '../../domain/tenant/tenantGate.ts'

const base = {
  workspaceLoading: false,
  workspaceError: null,
  workspace: { id: 'ws', status: 'active' },
  workspaceCount: 1,
  pendingWorkspace: null,
  pendingInvitation: null,
  invitationDismissed: false,
  entityLoading: false,
  entityError: null,
  entityCount: 1,
  provisioningStatus: 'ready',
}

test('gate short-circuits workspace loading and errors before entity state', () => {
  assert.equal(resolveGatePhase({ ...base, workspaceLoading: true }), 'loading')
  assert.equal(resolveGatePhase({ ...base, workspaceError: 'boom' }), 'error')
})

test('gate routes a missing workspace to creation or pending approval', () => {
  assert.equal(resolveGatePhase({ ...base, workspace: null }), 'create-workspace')
  assert.equal(
    resolveGatePhase({ ...base, workspace: null, pendingWorkspace: { id: 'pw' } }),
    'pending-approval',
  )
})

test('gate routes a pending invitation ahead of workspace creation', () => {
  assert.equal(
    resolveGatePhase({ ...base, workspace: null, pendingInvitation: { id: 'inv' } }),
    'pending-invitation',
  )
  // Own pending workspace outranks an invitation: the user already started onboarding.
  assert.equal(
    resolveGatePhase({
      ...base,
      workspace: null,
      pendingWorkspace: { id: 'pw' },
      pendingInvitation: { id: 'inv' },
    }),
    'pending-approval',
  )
  // "Pass for now" suppresses the invitation for the session.
  assert.equal(
    resolveGatePhase({
      ...base,
      workspace: null,
      pendingInvitation: { id: 'inv' },
      invitationDismissed: true,
    }),
    'create-workspace',
  )
})

test('gate routes multiple active workspaces to selection', () => {
  assert.equal(resolveGatePhase({ ...base, workspace: null, workspaceCount: 2 }), 'select-workspace')
  assert.equal(resolveGatePhase({ ...base, workspace: null, workspaceCount: 0 }), 'create-workspace')
})

test('gate routes entity loading, errors, and counts once a workspace exists', () => {
  assert.equal(resolveGatePhase({ ...base, entityLoading: true }), 'loading')
  assert.equal(resolveGatePhase({ ...base, entityError: 'boom' }), 'error')
  assert.equal(resolveGatePhase({ ...base, entityCount: 0 }), 'create-company')
})

test('gate maps provisioning status onto provisioning phases', () => {
  assert.equal(resolveGatePhase({ ...base, provisioningStatus: 'creating' }), 'provisioning')
  assert.equal(resolveGatePhase({ ...base, provisioningStatus: 'pending' }), 'provisioning')
  assert.equal(resolveGatePhase({ ...base, provisioningStatus: 'ready' }), 'ready')
  assert.equal(resolveGatePhase({ ...base, provisioningStatus: 'failed' }), 'provisioning-failed')
  assert.equal(resolveGatePhase({ ...base, provisioningStatus: 'purging' }), 'blocked')
  assert.equal(resolveGatePhase({ ...base, provisioningStatus: 'purged' }), 'unavailable')
})

test('isProvisioningStatus rejects unknown values', () => {
  assert.equal(isProvisioningStatus('ready'), true)
  assert.equal(isProvisioningStatus('bogus'), false)
  assert.equal(isProvisioningStatus(null), false)
  assert.equal(isProvisioningStatus(undefined), false)
})

test('slugify normalizes free text into a url-safe slug', () => {
  assert.equal(slugify('Acme Corp Ltd'), 'acme-corp-ltd')
  assert.equal(slugify('  Multiple   Spaces  '), 'multiple-spaces')
  assert.equal(slugify('Café & Co.'), 'caf-co')
  assert.equal(slugify('---hello---'), 'hello')
  assert.equal(slugify(''), '')
})
