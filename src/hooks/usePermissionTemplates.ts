import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/supabase'

const WILDCARD = '*'
// Sorts first so the dedicated Company Admin control stays prominent.
const COMPANY_ADMIN_TEMPLATE_NAME = 'Company Admin'

export type PermissionTemplateItem = {
  resource: string
  action: string
}

export type PermissionTemplate = {
  id: string
  name: string
  description: string | null
  items: PermissionTemplateItem[]
}

export type EffectivePermissionPair = {
  resource: string
  action: string
}

type TemplateQueryRow = {
  id: string
  name: string
  description: string | null
  permission_template_items: PermissionTemplateItem[] | null
}

type EntityPermissionRow = {
  user_id: string
  resource: string
  action: string
}

/**
 * True when a stored permission row satisfies a required (resource, action)
 * pair. Mirrors has_entity_permission(): exact match, or wildcard on either
 * side.
 */
function rowCovers(row: EffectivePermissionPair, item: PermissionTemplateItem): boolean {
  const resourceMatch = row.resource === WILDCARD || row.resource === item.resource
  const actionMatch = row.action === WILDCARD || row.action === item.action
  return resourceMatch && actionMatch
}

/**
 * True when a member's effective permission pairs cover every ability of a
 * template. This is EFFECTIVE ACCESS ONLY. The database has no grant-source
 * column, so coverage does not prove the template was ever assigned — grants
 * from different roles or sources can overlap.
 */
export function coversTemplate(
  pairs: EffectivePermissionPair[] | undefined,
  template: PermissionTemplate
): boolean {
  if (!template.items.length) return false
  const rows = pairs ?? []
  return template.items.every((item) => rows.some((row) => rowCovers(row, item)))
}

/**
 * Workspace-scoped role templates plus each member's effective permissions on
 * the ACTIVE entity.
 *
 * Read boundary:
 * 1. permission_templates + items for the workspace. RLS scopes these to
 *    workspaces the caller belongs to, so templates from other workspaces
 *    never appear.
 * 2. entity_permissions for the active entity. RLS limits rows to those
 *    granted BY the caller or held BY the caller.
 * 3. entity_role_assignments for assignment display, never authorization.
 *
 * The SECURITY DEFINER assignment RPCs stay authoritative for authorization;
 * this hook is display state only.
 */
export function usePermissionTemplates(workspaceId: string | null, entityId: string | null) {
  const [templates, setTemplates] = useState<PermissionTemplate[]>([])
  const [effectiveByUser, setEffectiveByUser] = useState<Map<string, EffectivePermissionPair[]>>(new Map())
  const [assignmentsByUser, setAssignmentsByUser] = useState<Map<string, Set<string>>>(new Map())
  const requestId = useRef(0)
  const [loadedScope, setLoadedScope] = useState<string | null>(null)
  const scope = `${workspaceId}:${entityId}`
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const request = ++requestId.current
    if (!workspaceId) {
      setTemplates([])
      setEffectiveByUser(new Map())
      setAssignmentsByUser(new Map())
      setLoadedScope(scope)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const { data: tplRows, error: tErr } = await supabase
        .from('permission_templates')
        .select('id, name, description, permission_template_items(resource, action)')
        .eq('workspace_id', workspaceId)

      if (tErr) throw tErr

      const nextTemplates = ((tplRows as unknown as TemplateQueryRow[]) || [])
        .filter((t) => !!t.id && !!t.name)
        .map((t) => ({ id: t.id, name: t.name, description: t.description, items: t.permission_template_items ?? [] }))
      nextTemplates.sort((a, b) => {
        if (a.name === COMPANY_ADMIN_TEMPLATE_NAME) return -1
        if (b.name === COMPANY_ADMIN_TEMPLATE_NAME) return 1
        return a.name.localeCompare(b.name)
      })

      const nextAccess = new Map<string, EffectivePermissionPair[]>()
      const nextAssignments = new Map<string, Set<string>>()
      if (entityId) {
        const { data: permRows, error: pErr } = await supabase
          .from('entity_permissions')
          .select('user_id, resource, action')
          .eq('entity_id', entityId)

        if (pErr) throw pErr

        for (const row of ((permRows as unknown as EntityPermissionRow[]) || []).filter((r) => !!r.user_id)) {
          const list = nextAccess.get(row.user_id)
          if (list) list.push({ resource: row.resource, action: row.action })
          else nextAccess.set(row.user_id, [{ resource: row.resource, action: row.action }])
        }
        const { data: assignmentRows, error: assignmentError } = await supabase
          .from('entity_role_assignments')
          .select('user_id, template_id')
          .eq('entity_id', entityId)
        if (assignmentError) throw assignmentError
        for (const row of assignmentRows ?? []) {
          const roles = nextAssignments.get(row.user_id) ?? new Set<string>()
          roles.add(row.template_id)
          nextAssignments.set(row.user_id, roles)
        }
      }

      if (request !== requestId.current) return
      setTemplates(nextTemplates)
      setEffectiveByUser(nextAccess)
      setAssignmentsByUser(nextAssignments)
      setLoadedScope(scope)
    } catch (e) {
      if (request !== requestId.current) return
      setError(String((e as Error)?.message ?? e))
      setTemplates([])
      setEffectiveByUser(new Map())
      setAssignmentsByUser(new Map())
      setLoadedScope(scope)
    } finally {
      if (request === requestId.current) setLoading(false)
    }
  }, [workspaceId, entityId, scope])

  useEffect(() => {
    void refresh()
    return () => { requestId.current += 1 }
  }, [refresh])

  const current = loadedScope === scope
  return {
    templates: current ? templates : [],
    effectiveByUser: current ? effectiveByUser : new Map<string, EffectivePermissionPair[]>(),
    assignmentsByUser: current ? assignmentsByUser : new Map<string, Set<string>>(),
    loading: loading || !current, error: current ? error : null, refresh,
  }
}
