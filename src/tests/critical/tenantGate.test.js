import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveGatePhase, isProvisioningStatus, slugify, buildTenantSchemaName } from '../../domain/tenant/tenantGate.ts'

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
  // A valid pending invitation outranks a pending workspace: the invitee
  // must reach the invitation flow first. The pending workspace is never
  // deleted; it simply waits while the invitation is handled.
  assert.equal(
    resolveGatePhase({
      ...base,
      workspace: null,
      pendingWorkspace: { id: 'pw' },
      pendingInvitation: { id: 'inv' },
    }),
    'pending-invitation',
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
  // ...but a dismissed invitation yields to an existing pending workspace.
  assert.equal(
    resolveGatePhase({
      ...base,
      workspace: null,
      pendingWorkspace: { id: 'pw' },
      pendingInvitation: { id: 'inv' },
      invitationDismissed: true,
    }),
    'pending-approval',
  )
})

test('gate routes multiple active workspaces to selection', () => {
  assert.equal(resolveGatePhase({ ...base, workspace: null, workspaceCount: 2 }), 'select-workspace')
  assert.equal(resolveGatePhase({ ...base, workspace: null, workspaceCount: 0 }), 'create-workspace')
})

test('active memberships are never trapped behind a pending workspace', () => {
  // Fresh sign-in with two usable memberships and a stale pending row:
  // selection wins, not the pending screen.
  assert.equal(
    resolveGatePhase({ ...base, workspace: null, workspaceCount: 2, pendingWorkspace: { id: 'pw' } }),
    'select-workspace',
  )
  // Same when a dismissed invitation is also present.
  assert.equal(
    resolveGatePhase({
      ...base,
      workspace: null,
      workspaceCount: 2,
      pendingWorkspace: { id: 'pw' },
      pendingInvitation: { id: 'inv' },
      invitationDismissed: true,
    }),
    'select-workspace',
  )
  // A resolved workspace plus a stale pending row proceeds to entity flow.
  assert.equal(
    resolveGatePhase({
      ...base,
      workspace: { id: 'ws-b', status: 'active' },
      pendingWorkspace: { id: 'pw' },
      entityCount: 0,
    }),
    'create-company',
  )
  // Gate output depends only on current input: the same pending row that
  // routed to pending-approval releases as soon as a workspace resolves.
  assert.equal(
    resolveGatePhase({ ...base, workspace: null, workspaceCount: 0, pendingWorkspace: { id: 'pw' } }),
    'pending-approval',
  )
  assert.equal(
    resolveGatePhase({
      ...base,
      workspace: { id: 'ws-b', status: 'active' },
      workspaceCount: 1,
      pendingWorkspace: { id: 'pw' },
      entityCount: 0,
    }),
    'create-company',
  )
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

test('gate holds provisioning-ready on provisioning until exposure is confirmed', () => {
  // provisioning ready alone is NOT usable: PostgREST exposure completes
  // asynchronously. Unconfirmed (false) or unchecked (null) holds the gate.
  assert.equal(resolveGatePhase({ ...base, provisioningStatus: 'ready', schemaExposed: true }), 'ready')
  assert.equal(resolveGatePhase({ ...base, provisioningStatus: 'ready', schemaExposed: false }), 'provisioning')
  assert.equal(resolveGatePhase({ ...base, provisioningStatus: 'ready', schemaExposed: null }), 'provisioning')
  // Callers that do not probe yet keep the legacy provisioning-only behavior.
  assert.equal(resolveGatePhase({ ...base, provisioningStatus: 'ready', schemaExposed: undefined }), 'ready')
  assert.equal(resolveGatePhase({ ...base, provisioningStatus: 'ready' }), 'ready')
  // Exposure never overrides a failed provisioning terminal state.
  assert.equal(resolveGatePhase({ ...base, provisioningStatus: 'failed', schemaExposed: true }), 'provisioning-failed')
  assert.equal(resolveGatePhase({ ...base, provisioningStatus: 'failed', schemaExposed: false }), 'provisioning-failed')
})

test('buildTenantSchemaName derives the provisioning schema name', () => {
  assert.equal(buildTenantSchemaName('bigdrops-main', 'adel'), 'entity_bigdrops-main_adel')
  assert.equal(buildTenantSchemaName(null, 'adel'), null)
  assert.equal(buildTenantSchemaName('bigdrops-main', null), null)
  assert.equal(buildTenantSchemaName('', ''), null)
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
