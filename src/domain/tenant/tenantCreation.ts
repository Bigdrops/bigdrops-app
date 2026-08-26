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
