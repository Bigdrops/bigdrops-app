// Tenancy creation + provisioning domain ops. Business rules live here
// (per lifecycle-ownership-standard): create workspace, create entity,
// kick off provisioning, and read provisioning status. UI stays thin.

import { supabase } from '@/supabase'
import type { ProvisioningStatus } from './tenantGate'
import { slugify } from './tenantGate'
export { slugify }

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
  return (data ?? { status: 'creating' }) as { status: string }
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
