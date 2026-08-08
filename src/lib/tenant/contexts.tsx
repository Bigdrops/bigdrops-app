import * as React from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/supabase'
import { createTenantClient, type TenantClient } from '@/lib/tenantClient'

// Captured at module load (~app start) so the diagnostic page can show
// end-to-end resolution time for the Phase 1 startup resolution flow.
export const TENANT_RESOLUTION_STARTED = Date.now()

export interface ActiveWorkspace {
  id: string
  slug: string | null
  name: string | null
  status: string | null
  role: string | null
}

export interface ActiveEntity {
  id: string
  slug: string | null
  name: string | null
}

export type ProvisioningStatus = 'pending' | 'creating' | 'ready' | 'failed' | 'purging' | 'purged'

/* ------------------------------------------------------------------ */
/* Workspace Provider                                                 */
/* ------------------------------------------------------------------ */

type WorkspaceContextValue = {
  workspace: ActiveWorkspace | null
  workspaceCount: number
  isLoading: boolean
  error: string | null
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({
  userId,
  children,
}: {
  userId: string
  children: React.ReactNode
}) {
  const [workspace, setWorkspace] = useState<ActiveWorkspace | null>(null)
  const [workspaceCount, setWorkspaceCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function resolve() {
      setWorkspace(null)
      setWorkspaceCount(0)
      setError(null)
      setIsLoading(true)

      try {
        const { data, error } = await supabase
          .from('workspace_members')
          .select('role, workspace:workspaces(id, slug, name, status)')
          .eq('user_id', userId)

        if (cancelled) return
        if (error) throw error

        const rows = (data ?? []) as unknown as Array<{
          role: string | null
          workspace: { id: string; slug: string | null; name: string | null; status: string | null } | null
        }>

        const active = rows.filter((row) => row.workspace && row.workspace.status === 'active')
        setWorkspaceCount(active.length)

        if (active.length === 1) {
          const w = active[0].workspace
          setWorkspace({
            id: w.id,
            slug: w.slug,
            name: w.name,
            status: w.status ?? 'active',
            role: active[0].role,
          })
        } else {
          // 0 workspaces or multiple: selection is deferred to a future phase.
          setWorkspace(null)
        }
      } catch (e) {
        if (!cancelled) setError(String((e as Error)?.message ?? e))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    resolve()
    return () => {
      cancelled = true
    }
  }, [userId])

  const value = useMemo<WorkspaceContextValue>(
    () => ({ workspace, workspaceCount, isLoading, error }),
    [workspace, workspaceCount, isLoading, error],
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used within a WorkspaceProvider')
  return ctx
}

/* ------------------------------------------------------------------ */
/* Entity Provider                                                    */
/* ------------------------------------------------------------------ */

type EntityContextValue = {
  entity: ActiveEntity | null
  entityCount: number
  isLoading: boolean
  error: string | null
  expectedSchema: string | null
  schemaName: string | null
  provisioningStatus: ProvisioningStatus | null
  provisioningError: string | null
  tenantClient: TenantClient
  recheckProvisioning: () => void
}

const EntityContext = createContext<EntityContextValue | null>(null)

export function EntityProvider({ children }: { children: React.ReactNode }) {
  const { workspace, isLoading: workspaceLoading } = useWorkspace()
  const [entity, setEntity] = useState<ActiveEntity | null>(null)
  const [entityCount, setEntityCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [provisioningStatus, setProvisioningStatus] = useState<ProvisioningStatus | null>(null)
  const [provisioningError, setProvisioningError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function resolve() {
      setEntity(null)
      setEntityCount(0)
      setError(null)
      setIsLoading(workspaceLoading)
      if (!workspace) return

      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from('entities')
          .select('id, slug, display_name')
          .eq('workspace_id', workspace.id)
          .eq('is_active', true)

        if (cancelled) return
        if (error) throw error

        const rows = (data ?? []) as Array<{ id: string; slug: string | null; display_name: string | null }>
        setEntityCount(rows.length)

        if (rows.length === 1) {
          setEntity({ id: rows[0].id, slug: rows[0].slug, name: rows[0].display_name ?? rows[0].slug })
        } else {
          // 0 entities or multiple: an entity selector is a future phase.
          setEntity(null)
        }
      } catch (e) {
        if (!cancelled) setError(String((e as Error)?.message ?? e))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    resolve()
    return () => {
      cancelled = true
    }
  }, [workspace, workspaceLoading])

  const checkProvisioning = useCallback(async (entityId: string) => {
    setProvisioningStatus(null)
    setProvisioningError(null)

    const { data, error } = await supabase.rpc('get_entity_provisioning_status', {
      p_entity_id: entityId,
    })

    if (error) {
      setProvisioningError(String((error as Error)?.message ?? error))
      return
    }

    const row = Array.isArray(data) ? data[0] : data
    const status = (row as { status?: string } | undefined)?.status
    const lastError = (row as { last_error?: string | null } | undefined)?.last_error

    if (status) setProvisioningStatus(status as ProvisioningStatus)
    if (lastError) setProvisioningError(lastError)
  }, [])

  const recheckProvisioning = useCallback(() => {
    if (entity) void checkProvisioning(entity.id)
  }, [entity, checkProvisioning])

  useEffect(() => {
    if (entity) void checkProvisioning(entity.id)
  }, [entity, checkProvisioning])

  const expectedSchema =
    workspace && entity ? `entity_${workspace.slug}_${entity.slug}` : null

  const schemaName = provisioningStatus === 'ready' ? expectedSchema : null

  const tenantClient = useMemo(() => createTenantClient(supabase, schemaName), [schemaName])

  const value = useMemo<EntityContextValue>(
    () => ({
      entity,
      entityCount,
      isLoading,
      error,
      expectedSchema,
      schemaName,
      provisioningStatus,
      provisioningError,
      tenantClient,
      recheckProvisioning,
    }),
    [
      entity,
      entityCount,
      isLoading,
      error,
      expectedSchema,
      schemaName,
      provisioningStatus,
      provisioningError,
      tenantClient,
      recheckProvisioning,
    ],
  )

  return <EntityContext.Provider value={value}>{children}</EntityContext.Provider>
}

export function useEntity() {
  const ctx = useContext(EntityContext)
  if (!ctx) throw new Error('useEntity must be used within an EntityProvider')
  return ctx
}

/* ------------------------------------------------------------------ */
/* Authorization Provider                                             */
/* ------------------------------------------------------------------ */

const WILDCARD = '*'

type AuthorizationContextValue = {
  permissionCount: number
  isLoading: boolean
  error: string | null
  hasAuthorization: (resource: string, action: string) => boolean
}

const AuthorizationContext = createContext<AuthorizationContextValue | null>(null)

export function AuthorizationProvider({
  userId,
  children,
}: {
  userId: string
  children: React.ReactNode
}) {
  const { entity } = useEntity()
  const [permissions, setPermissions] = useState<Array<{ resource: string; action: string }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setPermissions([])
      setError(null)
      if (!entity) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from('entity_permissions')
          .select('resource, action')
          .eq('entity_id', entity.id)
          .eq('user_id', userId)

        if (cancelled) return
        if (error) throw error

        const rows = (data ?? []) as Array<{ resource: string; action: string }>
        setPermissions(rows)
      } catch (e) {
        if (!cancelled) setError(String((e as Error)?.message ?? e))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [entity, userId])

  // Mirrors has_entity_permission(p_entity_id, p_user_id, p_resource, p_action)
  // semantics: exact match OR wildcard resource OR wildcard action OR both.
  const hasAuthorization = useCallback(
    (resource: string, action: string) =>
      permissions.some(
        (p) =>
          (p.resource === resource || p.resource === WILDCARD) &&
          (p.action === action || p.action === WILDCARD),
      ),
    [permissions],
  )

  const value = useMemo<AuthorizationContextValue>(
    () => ({ permissionCount: permissions.length, isLoading, error, hasAuthorization }),
    [permissions, isLoading, error, hasAuthorization],
  )

  return <AuthorizationContext.Provider value={value}>{children}</AuthorizationContext.Provider>
}

export function useAuthorization() {
  const ctx = useContext(AuthorizationContext)
  if (!ctx) throw new Error('useAuthorization must be used within an AuthorizationProvider')
  return ctx
}