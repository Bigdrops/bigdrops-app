import test from 'node:test'
import assert from 'node:assert/strict'

import {
  resolveWorkspaceBootstrapDecision,
  mapCreatedWorkspaceStatus,
  isPermissionError,
  isUniqueViolation,
  resolveGatePhase,
} from '../../domain/tenant/tenantGate.ts'

test('usable workspace wins: no duplicate is created', () => {
  assert.equal(
    resolveWorkspaceBootstrapDecision({ activeCount: 1, hasPending: false }),
    'reuse-active',
  )
})

test('multiple usable workspaces still reuse: selection stays intact', () => {
  assert.equal(
    resolveWorkspaceBootstrapDecision({ activeCount: 3, hasPending: false }),
    'reuse-active',
  )
})

test('pending workspace is reused: no second pending row', () => {
  assert.equal(
    resolveWorkspaceBootstrapDecision({ activeCount: 0, hasPending: true }),
    'reuse-pending',
  )
})

test('clean zero-state is the only path that creates', () => {
  assert.equal(
    resolveWorkspaceBootstrapDecision({ activeCount: 0, hasPending: false }),
    'create',
  )
})

test('active membership outranks a stale pending row', () => {
  assert.equal(
    resolveWorkspaceBootstrapDecision({ activeCount: 2, hasPending: true }),
    'reuse-active',
  )
})

test('only an active row counts as usable after creation', () => {
  assert.equal(mapCreatedWorkspaceStatus('active'), 'reused')
  assert.equal(mapCreatedWorkspaceStatus('pending_approval'), 'created-pending')
  assert.equal(mapCreatedWorkspaceStatus('suspended'), 'created-pending')
  assert.equal(mapCreatedWorkspaceStatus(null), 'created-pending')
})

test('permission failures classify correctly', () => {
  assert.equal(isPermissionError({ code: '42501', message: 'x' }), true)
  assert.equal(isPermissionError(new Error('violates row-level security')), true)
  assert.equal(isPermissionError(new Error('permission denied for table')), true)
  assert.equal(isPermissionError(new Error('Insufficient permissions: must be owner')), true)
  assert.equal(isPermissionError(new Error('connection reset')), false)
  assert.equal(isPermissionError({ code: '23505', message: 'duplicate key' }), false)
})

test('unique violations classify correctly for race convergence', () => {
  assert.equal(isUniqueViolation({ code: '23505', message: 'x' }), true)
  assert.equal(
    isUniqueViolation(new Error('duplicate key value violates unique constraint')),
    true,
  )
  assert.equal(isUniqueViolation(new Error('connection reset')), false)
  assert.equal(isUniqueViolation({ code: '42501', message: 'x' }), false)
})

test('pending approval never grants tenant access', () => {
  const phase = resolveGatePhase({
    workspaceLoading: false,
    workspaceError: null,
    workspace: null,
    workspaceCount: 0,
    pendingWorkspace: { id: 'pw' },
    pendingInvitation: null,
    invitationDismissed: false,
    entityLoading: false,
    entityError: null,
    entityCount: 0,
    provisioningStatus: null,
  })
  assert.equal(phase, 'pending-approval')
  assert.notEqual(phase, 'ready')
})
