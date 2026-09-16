import { supabase } from '@/supabase'
import type { PermissionPair } from './role-permissions'

type RoleDefinition = { name: string; description: string; items: PermissionPair[] }

export async function createPermissionTemplate(workspaceId: string, role: RoleDefinition): Promise<string> {
  const { data, error } = await supabase.rpc('create_permission_template', {
    p_workspace_id: workspaceId, p_name: role.name.trim(),
    p_description: role.description, p_items: role.items,
  })
  if (error) throw error
  return data as string
}

export async function updatePermissionTemplate(templateId: string, role: RoleDefinition): Promise<void> {
  // The RPC propagates additions. Never enforce synchronization as part of Save.
  const { error } = await supabase.rpc('update_permission_template', {
    p_template_id: templateId, p_name: role.name.trim(),
    p_description: role.description, p_items: role.items,
  })
  if (error) throw error
}

export async function duplicatePermissionTemplate(templateId: string, name: string): Promise<string> {
  const { data, error } = await supabase.rpc('duplicate_permission_template', {
    p_template_id: templateId, p_new_name: name.trim(),
  })
  if (error) throw error
  return data as string
}

export async function deletePermissionTemplate(templateId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_permission_template', { p_template_id: templateId })
  if (error) throw error
}

export async function enforcePermissionTemplate(templateId: string): Promise<number> {
  const { data, error } = await supabase.rpc('sync_permission_template_assignments', {
    p_template_id: templateId, p_mode: 'enforce',
  })
  if (error) throw error
  return Number(data)
}
