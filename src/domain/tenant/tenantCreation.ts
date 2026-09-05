// Tenancy creation + provisioning domain ops. Business rules live here
// (per lifecycle-ownership-standard): create workspace, create entity,
// kick off provisioning, and read provisioning status. UI stays thin.

import { supabase } from '@/supabase'
import type { ProvisioningStatus } from './tenantGate'
import { slugify, buildInitialCompanyInput, buildInitialWorkspaceInput } from './tenantGate'
export { slugify, buildInitialCompanyInput, buildInitialWorkspaceInput }

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/postgrest-schema-exposure`

export interface CreatedWorkspace {
  id: string
  slug: string | null
  name: string | null
  status: string | null
}

export interface CreatedEntity {
  id: string
  slug: string | null
  display_name: string | null
}

export interface ProvisioningState {
  status: ProvisioningStatus | null
  lastError: string | null
}

/** Insert a workspace. Status defaults to pending_approval on the DB side. */
export async function createWorkspace(input: { name: string; slug: string }): Promise<CreatedWorkspace> {
  const { data, error } = await supabase
    .from('workspaces')
    .insert({ name: input.name, slug: input.slug })
    .select('id, slug, name, status')
    .single()

  if (error) throw error
  return data as CreatedWorkspace
}

/** Insert an entity under the active workspace. Caller must be a member. */
export async function createEntity(input: {
  workspaceId: string
  displayName: string
  slug: string
  entityType?: string
}): Promise<CreatedEntity> {
  const { data, error } = await supabase
    .from('entities')
    .insert({
      workspace_id: input.workspaceId,
      display_name: input.displayName,
      slug: input.slug,
      entity_type: input.entityType ?? 'company',
    })
    .select('id, slug, display_name')
    .single()

  if (error) throw error
  return data as CreatedEntity
}

/** Kick off schema provisioning for an entity. Returns {'status': 'creating'|'ready'}. */
export async function provisionEntity(entityId: string): Promise<{ status: string }> {
  const { data, error } = await supabase.rpc('provision_entity', { p_entity_id: entityId })

  if (error) throw error
  const result = (data ?? { status: 'creating' }) as { status: string }

  // If ready, trigger PostgREST schema exposure (fire-and-forget)
  if (result.status === 'ready') {
    triggerPostgrestExposure().catch(() => {
      // Non-blocking: external cron will pick up any missed schemas
    })
  }

  return result
}

/**
 * Trigger PostgREST schema exposure via Edge Function.
 * Called immediately after provisioning + on app open for recovery.
 * Non-blocking: failures are silent, queue persists for external cron.
 */
export async function triggerPostgrestExposure(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return

    await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: '{}',
    })
  } catch {
    // Non-blocking: external cron will retry
  }
}

/**
 * Accept a workspace invitation. The RPC is SECURITY DEFINER and validates that
 * the JWT email matches the invite, so the client never writes membership rows.
 */
export async function acceptWorkspaceInvitation(inviteId: string): Promise<void> {
  const { error } = await supabase.rpc('accept_workspace_invitation', { p_invite_id: inviteId })
  if (error) throw error
}

/**
 * Create a workspace invitation. The RPC is SECURITY DEFINER and enforces
 * owner OR invite_members toggle, lowercases the email, and defaults expiry to
 * 7 days. Passing entityId associates the invite with one company of the
 * workspace: acceptance then seeds a baseline ('*', 'view') entity grant,
 * which is the company-membership signal required before a company role can
 * be assigned. The client never writes workspace_invitations rows directly.
 */
export async function createWorkspaceInvitation(input: {
  workspaceId: string
  email: string
  entityId?: string
}): Promise<string> {
  const { data, error } = await supabase.rpc('create_workspace_invitation', {
    p_workspace_id: input.workspaceId,
    p_email: input.email.trim().toLowerCase(),
    p_role: 'member',
    ...(input.entityId ? { p_entity_id: input.entityId } : {}),
  })
  if (error) throw error
  return String(data ?? '')
}

/**
 * Revoke a pending workspace invitation. The RPC is SECURITY DEFINER and
 * enforces owner OR invite_members toggle; it refuses non-pending status.
 */
export async function revokeWorkspaceInvitation(inviteId: string): Promise<void> {
  const { error } = await supabase.rpc('revoke_workspace_invitation', { p_invite_id: inviteId })
  if (error) throw error
}

/**
 * Grant a role template to a member on ONE entity. The RPC is SECURITY
 * DEFINER and enforces the delegation ceiling (workspace owner, or caller
 * already holds every ability of the template on that entity). The client
 * never writes entity_permissions rows directly and never calls
 * apply_permission_template.
 */
export async function assignRoleToCompanyMember(input: {
  templateId: string
  entityId: string
  userId: string
}): Promise<void> {
  const { error } = await supabase.rpc('assign_role_to_company_member', {
    p_template_id: input.templateId,
    p_entity_id: input.entityId,
    p_user_id: input.userId,
  })
  if (error) throw error
}

/**
 * Remove a role template from a member on ONE entity. Same authorization
 * contract as assignRoleToCompanyMember. The backend remains authoritative;
 * the UI only offers this action to workspace owners.
 */
export async function removeRoleFromCompanyMember(input: {
  templateId: string
  entityId: string
  userId: string
}): Promise<void> {
  const { error } = await supabase.rpc('remove_role_from_company_member', {
    p_template_id: input.templateId,
    p_entity_id: input.entityId,
    p_user_id: input.userId,
  })
  if (error) throw error
}

/**
 * Transfer workspace ownership. The RPC is SECURITY DEFINER and validates
 * that the caller is the current owner. Atomically demotes the old owner
 * to member and promotes the target — never a two-owner or zero-owner state.
 */
export async function transferWorkspaceOwnership(input: {
  workspaceId: string
  newOwnerId: string
}): Promise<void> {
  const { error } = await supabase.rpc('transfer_workspace_ownership', {
    p_workspace_id: input.workspaceId,
    p_new_owner_id: input.newOwnerId,
  })
  if (error) throw error
}

/**
 * Read provisioning status. The RPC is SECURITY DEFINER and returns zero rows
 * to callers without permission, so normalize array/empty into a nullable row.
 */
export async function getEntityProvisioningStatus(entityId: string): Promise<ProvisioningState> {
  const { data, error } = await supabase.rpc('get_entity_provisioning_status', {
    p_entity_id: entityId,
  })

  if (error) throw error

  const rows = Array.isArray(data) ? data : []
  const row = (rows[0] ?? {}) as { status?: string | null; last_error?: string | null }

  // Validation of the status string happens in contexts.tsx; here we only
  // normalize the shape and carry the raw value through.
  return { status: (row.status ?? null) as ProvisioningStatus | null, lastError: row.last_error ?? null }
}

/**
 * Archive an entity. Sets status=archived, archived_at=now().
 * §8A.2: caller must be workspace owner or hold archive_entity permission.
 */
export async function archiveEntity(entityId: string): Promise<void> {
  const { error } = await supabase.rpc('archive_entity', { p_entity_id: entityId })
  if (error) throw error
}

/**
 * Restore an archived entity. Sets status=active, archived_at=NULL.
 * §8A.3: caller must be workspace owner or hold archive_entity permission.
 */
export async function restoreEntity(entityId: string): Promise<void> {
  const { error } = await supabase.rpc('restore_entity', { p_entity_id: entityId })
  if (error) throw error
}

/**
 * Purge an entity. Irreversible: DROP SCHEMA CASCADE, delete permissions.
 * §8A.4: caller must be workspace owner or platform operator.
 */
export async function purgeEntity(entityId: string): Promise<void> {
  const { error } = await supabase.rpc('purge_entity', { p_entity_id: entityId })
  if (error) throw error
}

/* ------------------------------------------------------------------ */
/* First-company bootstrap (entity-only automatic creation)           */
/* ------------------------------------------------------------------ */
// Orchestration around the existing primitives above: reuse an active
// entity when one exists, otherwise create + provision the deterministic
// initial company. No workspace lifecycle change, no PostgREST handling
// here (provisionEntity already triggers the hardened exposure path).

export type InitialCompanyOutcome = 'created' | 'reused' | 'provisioning-failed'

export interface InitialCompanyResult {
  outcome: InitialCompanyOutcome
  entity: CreatedEntity
  lastError: string | null
}

export type InitialCompanyErrorCode =
  | 'auth/unavailable'
  | 'workspace/unavailable'
  | 'entity/creation-failure'
  | 'provisioning/failure'
  | 'permission/failure'
  | 'tenant/resolution-failure'

export class InitialCompanyError extends Error {
  code: InitialCompanyErrorCode
  constructor(code: InitialCompanyErrorCode, message: string) {
    super(message)
    this.name = 'InitialCompanyError'
    this.code = code
  }
}

function initialCompanyMessage(error: unknown): string {
  return String((error as Error)?.message ?? error)
}

function isPermissionError(error: unknown): boolean {
  const code = String((error as { code?: unknown })?.code ?? '')
  const message = initialCompanyMessage(error).toLowerCase()
  return (
    code === '42501' ||
    message.includes('row-level security') ||
    message.includes('permission denied') ||
    message.includes('insufficient permissions')
  )
}

function isUniqueViolation(error: unknown): boolean {
  const code = String((error as { code?: unknown })?.code ?? '')
  const message = initialCompanyMessage(error).toLowerCase()
  return code === '23505' || message.includes('duplicate key')
}

async function listActiveEntities(
  workspaceId: string,
): Promise<Array<{ id: string; slug: string | null; display_name: string | null }>> {
  const { data, error } = await supabase
    .from('entities')
    .select('id, slug, display_name')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
  if (error) throw error
  return (data ?? []) as Array<{ id: string; slug: string | null; display_name: string | null }>
}

/**
 * Idempotent first-company bootstrap for one active workspace.
 *
 * - Database state is authoritative: every call re-reads active entities.
 * - Existing active entity → reused, zero writes.
 * - Concurrent calls converge: deterministic slug + UNIQUE (workspace_id,
 *   slug) means the loser of a race re-reads and reuses the winner's row.
 * - A provisioning failure is reported, never masked by creating another row.
 * - Archived entities are never resurrected; a new row needs insert
 *   permission (owner or create_entity toggle) or a permission error results.
 */
export async function ensureInitialCompany(input: {
  workspaceId: string
  workspaceName?: string | null
}): Promise<InitialCompanyResult> {
  const workspaceId = (input.workspaceId ?? '').trim()
  if (!workspaceId) {
    throw new InitialCompanyError('workspace/unavailable', 'No active workspace.')
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) {
    throw new InitialCompanyError('auth/unavailable', 'No authenticated session.')
  }

  let current: Awaited<ReturnType<typeof listActiveEntities>>
  try {
    current = await listActiveEntities(workspaceId)
  } catch (error) {
    throw new InitialCompanyError(
      isPermissionError(error) ? 'permission/failure' : 'tenant/resolution-failure',
      initialCompanyMessage(error),
    )
  }
  if (current.length > 0) {
    const first = current[0]
    return {
      outcome: 'reused',
      entity: { id: first.id, slug: first.slug, display_name: first.display_name },
      lastError: null,
    }
  }

  const base = buildInitialCompanyInput(input.workspaceName)
  let created: CreatedEntity | null = null
  let lastInsertError: unknown = null

  // ponytail: bounded suffix retries cover archived-row slug collisions
  // (the unique index ignores status). Active-row races converge via re-read.
  for (let attempt = 0; attempt < 5 && !created; attempt += 1) {
    const displayName = attempt === 0 ? base.displayName : `${base.displayName} ${attempt + 1}`
    const slug = attempt === 0 ? base.slug : `${base.slug}-${attempt + 1}`
    try {
      created = await createEntity({ workspaceId, displayName, slug })
    } catch (error) {
      lastInsertError = error
      if (!isUniqueViolation(error)) {
        throw new InitialCompanyError(
          isPermissionError(error) ? 'permission/failure' : 'entity/creation-failure',
          initialCompanyMessage(error),
        )
      }
      try {
        const reread = await listActiveEntities(workspaceId)
        if (reread.length > 0) {
          const first = reread[0]
          return {
            outcome: 'reused',
            entity: { id: first.id, slug: first.slug, display_name: first.display_name },
            lastError: null,
          }
        }
      } catch (rereadError) {
        throw new InitialCompanyError(
          'tenant/resolution-failure',
          initialCompanyMessage(rereadError),
        )
      }
    }
  }

  if (!created) {
    throw new InitialCompanyError(
      isPermissionError(lastInsertError) ? 'permission/failure' : 'entity/creation-failure',
      initialCompanyMessage(lastInsertError),
    )
  }

  let provisionStatus: string
  try {
    provisionStatus = (await provisionEntity(created.id)).status
  } catch (error) {
    throw new InitialCompanyError(
      isPermissionError(error) ? 'permission/failure' : 'provisioning/failure',
      initialCompanyMessage(error),
    )
  }

  if (provisionStatus === 'failed') {
    let lastError: string | null = null
    try {
      lastError = (await getEntityProvisioningStatus(created.id)).lastError
    } catch {
      lastError = null
    }
    return { outcome: 'provisioning-failed', entity: created, lastError }
  }

  return { outcome: 'created', entity: created, lastError: null }
}

/* ------------------------------------------------------------------ */
/* First-workspace bootstrap (automatic creation, approval-preserving) */
/* ------------------------------------------------------------------ */
// Authoritative creation path is the direct workspaces insert reused below
// (createWorkspace): new rows land in pending_approval and only the
// external Platform Office approval (approve_workspace) flips them to
// active and inserts the owner membership. This bootstrap never activates
// a workspace and never writes workspace_members itself.

export type InitialWorkspaceOutcome = 'reused' | 'created-pending' | 'pending'

export interface InitialWorkspaceResult {
  outcome: InitialWorkspaceOutcome
  workspace: CreatedWorkspace
  /** Active membership count, so callers keep existing selection semantics. */
  workspaceCount: number
}

export type InitialWorkspaceErrorCode =
  | 'auth/unavailable'
  | 'workspace/creation-failure'
  | 'permission/failure'
  | 'tenant/resolution-failure'

export class InitialWorkspaceError extends Error {
  code: InitialWorkspaceErrorCode
  constructor(code: InitialWorkspaceErrorCode, message: string) {
    super(message)
    this.name = 'InitialWorkspaceError'
    this.code = code
  }
}

interface WorkspaceState {
  active: CreatedWorkspace[]
  pending: CreatedWorkspace | null
}

async function resolveWorkspaceState(userId: string): Promise<WorkspaceState> {
  const { data: pendingRows, error: pendingError } = await supabase
    .from('workspaces')
    .select('id, slug, name, status')
    .eq('created_by', userId)
    .eq('status', 'pending_approval')
    .limit(1)
  if (pendingError) throw pendingError

  const { data: memberRows, error: memberError } = await supabase
    .from('workspace_members')
    .select('role, workspace:workspaces(id, slug, name, status)')
    .eq('user_id', userId)
  if (memberError) throw memberError

  const rows = (memberRows ?? []) as unknown as Array<{
    role: string | null
    workspace: { id: string; slug: string | null; name: string | null; status: string | null } | null
  }>
  const active = rows
    .filter((row) => row.workspace && row.workspace.status === 'active')
    .map((row) => ({
      id: row.workspace!.id,
      slug: row.workspace!.slug,
      name: row.workspace!.name,
      status: row.workspace!.status,
    }))
  const pendingRow = (pendingRows ?? [])[0] as
    | { id: string; slug: string | null; name: string | null; status: string | null }
    | undefined
  return {
    active,
    pending: pendingRow
      ? { id: pendingRow.id, slug: pendingRow.slug, name: pendingRow.name, status: pendingRow.status }
      : null,
  }
}

/**
 * Idempotent first-workspace bootstrap for an authenticated user.
 *
 * - Database state is authoritative: every call re-reads memberships and
 *   the own pending workspace. Existing users get zero writes.
 * - Multiple active memberships are never collapsed: outcome 'reused'
 *   carries the count so the existing selection UI keeps working.
 * - A new workspace is created through the existing createWorkspace insert
 *   and therefore lands in pending_approval. The outcome is status-driven:
 *   only an 'active' row counts as usable ('reused'); anything else stays
 *   pending and the existing pending-approval UI/approval flow continues.
 * - Concurrent calls converge: deterministic per-user slug + UNIQUE slug
 *   and the unique pending-per-creator index reject duplicates; the loser
 *   re-reads and reuses the winner's row.
 */
export async function ensureInitialWorkspace(): Promise<InitialWorkspaceResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const userId = session?.user?.id ?? null
  if (!userId) {
    throw new InitialWorkspaceError('auth/unavailable', 'No authenticated session.')
  }

  let state: WorkspaceState
  try {
    state = await resolveWorkspaceState(userId)
  } catch (error) {
    throw new InitialWorkspaceError(
      isPermissionError(error) ? 'permission/failure' : 'tenant/resolution-failure',
      initialCompanyMessage(error),
    )
  }

  if (state.active.length > 0) {
    return { outcome: 'reused', workspace: state.active[0], workspaceCount: state.active.length }
  }
  if (state.pending) {
    return { outcome: 'pending', workspace: state.pending, workspaceCount: 0 }
  }

  const seed = buildInitialWorkspaceInput(session.user.email ?? null, userId)
  let created: CreatedWorkspace
  try {
    created = await createWorkspace({ name: seed.name, slug: seed.slug })
  } catch (error) {
    if (!isUniqueViolation(error)) {
      throw new InitialWorkspaceError(
        isPermissionError(error) ? 'permission/failure' : 'workspace/creation-failure',
        initialCompanyMessage(error),
      )
    }
    // Lost a creation race (slug or pending-per-creator uniqueness):
    // re-read and converge on the winner instead of retrying a new row.
    try {
      state = await resolveWorkspaceState(userId)
    } catch (rereadError) {
      throw new InitialWorkspaceError(
        'tenant/resolution-failure',
        initialCompanyMessage(rereadError),
      )
    }
    if (state.active.length > 0) {
      return { outcome: 'reused', workspace: state.active[0], workspaceCount: state.active.length }
    }
    if (state.pending) {
      return { outcome: 'pending', workspace: state.pending, workspaceCount: 0 }
    }
    throw new InitialWorkspaceError(
      'workspace/creation-failure',
      initialCompanyMessage(error),
    )
  }

  // Status-driven outcome: only 'active' is usable. A fresh insert is
  // pending_approval by DB default; if that ever changes, this follows the
  // database rather than assuming pending.
  if (created.status === 'active') {
    return { outcome: 'reused', workspace: created, workspaceCount: 1 }
  }
  return { outcome: 'created-pending', workspace: created, workspaceCount: 0 }
}
