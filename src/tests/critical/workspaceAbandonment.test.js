import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { resolveGatePhase, hasActionableInvitation } from '../../domain/tenant/tenantGate.ts'

// Pending-workspace abandonment contract. The escape RPC itself runs
// against the database, so these tests pin (a) the gate states the UI
// must reach after abandonment and (b) the static safety guards inside
// the migration that backs the RPC. Live database behavior is out of
// scope for unit tests by project policy.

const base = {
  workspaceLoading: false,
  workspaceError: null,
  workspace: null,
  workspaceCount: 0,
  pendingWorkspace: null,
  pendingInvitation: null,
  invitationDismissed: false,
  entityLoading: false,
  entityError: null,
  entityCount: 0,
  provisioningStatus: null,
}

test('TEST 1 — abandoned pending workspace returns to Create/Join flow', () => {
  // After abandonment there is no pending row, no membership, no invite:
  // the gate must offer workspace creation, never the pending screen.
  assert.equal(resolveGatePhase({ ...base }), 'create-workspace')
})

test('TEST 2 — invitation takes precedence after abandonment', () => {
  // Pending row gone, actionable invitation present: invitation flow wins.
  assert.equal(
    resolveGatePhase({ ...base, pendingInvitation: { id: 'inv' } }),
    'pending-invitation',
  )
  assert.equal(hasActionableInvitation({ id: 'inv' }, false), true)
})

test('TEST 3 — active membership is unaffected by abandonment', () => {
  // A resolved workspace proceeds to entity flow even if a stale pending
  // row were still visible to the client.
  assert.equal(
    resolveGatePhase({
      ...base,
      workspace: { id: 'ws-b', status: 'active' },
      workspaceCount: 1,
      pendingWorkspace: { id: 'pw' },
    }),
    'create-company',
  )
})

test('TEST 6 — fresh re-resolution is stateless, never stuck on old pending', () => {
  const before = resolveGatePhase({ ...base, pendingWorkspace: { id: 'pw' } })
  assert.equal(before, 'pending-approval')
  // Same inputs after abandonment (pending row gone) resolve cleanly.
  const after = resolveGatePhase({ ...base })
  assert.equal(after, 'create-workspace')
  // Repeating the resolved inputs is stable (idempotent outcome).
  assert.equal(resolveGatePhase({ ...base }), after)
})

const here = path.dirname(fileURLToPath(import.meta.url))
const migrationPath = path.join(
  here,
  '../../../supabase/migrations/20260910013020_abandon_pending_workspace.sql',
)
const migrationSql = readFileSync(migrationPath, 'utf8')

test('abandon RPC is SECURITY DEFINER with pinned search_path', () => {
  assert.match(migrationSql, /SECURITY DEFINER/)
  assert.match(migrationSql, /SET search_path TO 'public'/)
})

test('abandon RPC authorizes the creator and requires pending status', () => {
  // TEST 4 — approved/active rows cannot pass through this path.
  assert.match(migrationSql, /created_by/)
  assert.match(migrationSql, /auth\.uid\(\)/)
  assert.match(migrationSql, /pending_approval/)
  assert.match(migrationSql, /insufficient_privilege/)
  assert.match(migrationSql, /Only a pending workspace request can be abandoned/)
})

test('abandon RPC refuses workspaces that grew business data', () => {
  assert.match(migrationSql, /FROM public\.entities WHERE workspace_id/)
  assert.match(migrationSql, /FROM public\.workspace_members WHERE workspace_id/)
  assert.match(migrationSql, /FROM public\.workspace_invitations WHERE workspace_id/)
})

test('abandon RPC is idempotent and locked down', () => {
  // Absent row succeeds (retry/double-click safe).
  assert.match(migrationSql, /IF NOT FOUND THEN\s+RETURN;/)
  assert.match(migrationSql, /DELETE FROM public\.workspaces WHERE id = p_workspace_id/)
  assert.match(migrationSql, /REVOKE ALL ON FUNCTION public\.abandon_pending_workspace\(uuid\) FROM PUBLIC/)
  assert.match(migrationSql, /GRANT EXECUTE ON FUNCTION public\.abandon_pending_workspace\(uuid\) TO authenticated/)
})
