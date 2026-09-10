import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveGatePhase, hasActionableInvitation } from '../../domain/tenant/tenantGate.ts'

const base = {
  workspaceLoading: false,
  workspaceError: null,
  workspace: { id: 'ws-a', status: 'active' },
  workspaceCount: 1,
  pendingWorkspace: null,
  pendingInvitation: null,
  invitationDismissed: false,
  entityLoading: false,
  entityError: null,
  entityCount: 1,
  provisioningStatus: 'ready',
}

test('hasActionableInvitation is true only for a present, non-dismissed invite', () => {
  assert.equal(hasActionableInvitation({ id: 'inv' }, false), true)
  assert.equal(hasActionableInvitation(null, false), false)
  assert.equal(hasActionableInvitation(undefined, false), false)
  assert.equal(hasActionableInvitation({ id: 'inv' }, true), false)
  assert.equal(hasActionableInvitation(null, true), false)
})

test('active member with invitation is never forced into onboarding', () => {
  // Workspace set: gate proceeds on entity state, invitation ignored.
  assert.equal(
    resolveGatePhase({ ...base, pendingInvitation: { id: 'inv' }, entityCount: 0 }),
    'create-company',
  )
  assert.equal(resolveGatePhase({ ...base, pendingInvitation: { id: 'inv' } }), 'ready')
})

test('multiple memberships stay intact when an invitation is present', () => {
  assert.equal(
    resolveGatePhase({ ...base, workspaceCount: 2, pendingInvitation: { id: 'inv' } }),
    'ready',
  )
  // No remembered pick yet: selection screen, not the invitation flow.
  assert.equal(
    resolveGatePhase({ ...base, workspace: null, workspaceCount: 2, pendingInvitation: { id: 'inv' }, invitationDismissed: true }),
    'select-workspace',
  )
})

test('no-membership invitation onboarding still works', () => {
  assert.equal(
    resolveGatePhase({ ...base, workspace: null, workspaceCount: 0, pendingInvitation: { id: 'inv' } }),
    'pending-invitation',
  )
  assert.equal(
    resolveGatePhase({ ...base, workspace: null, workspaceCount: 0 }),
    'create-workspace',
  )
})

test('pending workspace plus invitation still routes to the invitation first', () => {
  assert.equal(
    resolveGatePhase({
      ...base,
      workspace: null,
      workspaceCount: 0,
      pendingWorkspace: { id: 'pw' },
      pendingInvitation: { id: 'inv' },
    }),
    'pending-invitation',
  )
})
