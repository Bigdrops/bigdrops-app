import * as React from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/supabase'
import { createTenantClient, type TenantClient } from '@/lib/tenantClient'
import {
  type ProvisioningStatus,
  isProvisioningStatus,
} from '@/domain/tenant/tenantGate'
import { getEntityProvisioningStatus as readProvisioningStatus } from '@/domain/tenant/tenantCreation'

export { type ProvisioningStatus, isProvisioningStatus } from '@/domain/tenant/tenantGate'

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

export interface PendingInvitation {
  id: string
  workspaceId: string
  workspaceRole: string | null
  invitedById: string | null
}

export type SchemaResolutionSource = 'startup' | 'cache' | 'refresh' | 'workspace-change' | 'entity-change'

/* ------------------------------------------------------------------ */
/* Workspace Provider                                                 */
/* ------------------------------------------------------------------ */

type WorkspaceContextValue = {
  workspace: ActiveWorkspace | null
  workspaceCount: number
  activeWorkspaces: ActiveWorkspace[]
  pendingWorkspace: ActiveWorkspace | null
  pendingInvitation: PendingInvitation | null
  selectWorkspace: (id: string) => void
  invitationDismissed: boolean
  dismissInvitation: () => void
  isLoading: boolean
  error: string | null
  refresh: () => void
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
  const [activeWorkspaces, setActiveWorkspaces] = useState<ActiveWorkspace[]>([])
  const [pendingWorkspace, setPendingWorkspace] = useState<ActiveWorkspace | null>(null)
  const [pendingInvitation, setPendingInvitation] = useState<PendingInvitation | null>(null)
  const [invitationDismissed, setInvitationDismissed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  // Session-only workspace pick. Resets on a full reload (sign-in/sign-out).
  const selectedWorkspaceId = useRef<string | null>(null)

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  const selectWorkspace = useCallback(
    (id: string) => {
      selectedWorkspaceId.current = id
      setWorkspace(activeWorkspaces.find((w) => w.id === id) ?? null)
    },
    [activeWorkspaces],
  )

  const dismissInvitation = useCallback(() => setInvitationDismissed(true), [])

  useEffect(() => {
    let cancelled = false

    async function resolve() {
      setWorkspace(null)
      setWorkspaceCount(0)
      setPendingWorkspace(null)
      setPendingInvitation(null)
      setError(null)
      setIsLoading(true)

      try {
        // Own workspace created via the onboarding flow but not yet approved.
        // Legal pre-membership read: workspaces_select_member includes
        // created_by = auth.uid(); the unique pending index guarantees at most one.
        const { data: pendingRows, error: pendingError } = await supabase
          .from('workspaces')
          .select('id, slug, name, status')
          .eq('created_by', userId)
          .eq('status', 'pending_approval')
          .limit(1)

        if (cancelled) return
        if (pendingError) throw pendingError

        const pending = (pendingRows ?? [])[0] as
          | { id: string; slug: string | null; name: string | null; status: string | null }
          | undefined
        setPendingWorkspace(pending ? { id: pending.id, slug: pending.slug, name: pending.name, status: pending.status, role: null } : null)

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
        const activeList: ActiveWorkspace[] = active.map((row) => {
          const w = row.workspace!
          return { id: w.id, slug: w.slug, name: w.name, status: w.status ?? 'active', role: row.role }
        })
        setWorkspaceCount(activeList.length)
        setActiveWorkspaces(activeList)

        const remembered = activeList.find((w) => w.id === selectedWorkspaceId.current)
        if (activeList.length === 1) {
          selectedWorkspaceId.current = activeList[0].id
          setWorkspace(activeList[0])
        } else if (activeList.length > 1 && remembered) {
          // Session pick survives refreshes but never persists across sign-ins.
          setWorkspace(remembered)
        } else {
          if (activeList.length === 0) selectedWorkspaceId.current = null
          setWorkspace(null)
        }

        // A user with no active membership may still hold a pending invitation.
        // RLS (workspace_invitations_select_member) already restricts rows to the
        // caller's own email, so no email filter is needed on the client.
        if (active.length === 0) {
          const { data: inviteRows, error: inviteError } = await supabase
            .from('workspace_invitations')
            .select('id, workspace_id, workspace_role, invited_by')
            .eq('status', 'pending')
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)

          if (cancelled) return
          if (inviteError) throw inviteError

          const invite = (inviteRows ?? [])[0] as
            | { id: string; workspace_id: string; workspace_role: string | null; invited_by: string | null }
            | undefined
          setPendingInvitation(
            invite
              ? {
                  id: invite.id,
                  workspaceId: invite.workspace_id,
                  workspaceRole: invite.workspace_role,
                  invitedById: invite.invited_by,
                }
              : null,
          )
        } else {
          setPendingInvitation(null)
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
  }, [userId, refreshKey])

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      workspace,
      workspaceCount,
      activeWorkspaces,
      pendingWorkspace,
      pendingInvitation,
      selectWorkspace,
      invitationDismissed,
      dismissInvitation,
      isLoading,
      error,
      refresh,
    }),
    [
      workspace,
      workspaceCount,
      activeWorkspaces,
      pendingWorkspace,
      pendingInvitation,
      selectWorkspace,
      invitationDismissed,
      dismissInvitation,
      isLoading,
      error,
      refresh,
    ],
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
  schemaSource: SchemaResolutionSource | null
  provisioningStatus: ProvisioningStatus | null
  provisioningError: string | null
  tenantClient: TenantClient
  recheckProvisioning: () => void
  refresh: () => void
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
  const [schemaSource, setSchemaSource] = useState<SchemaResolutionSource | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

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
  }, [workspace, workspaceLoading, refreshKey])

  const checkProvisioning = useCallback(async (entityId: string) => {
    setProvisioningStatus(null)
    setProvisioningError(null)

    try {
      const { status, lastError } = await readProvisioningStatus(entityId)

      if (status) {
        if (isProvisioningStatus(status)) {
          setProvisioningStatus(status)
        } else {
          setProvisioningStatus(null)
          setProvisioningError(`Invalid backend provisioning status: ${status}`)
        }
      }
      if (lastError) setProvisioningError(lastError)
    } catch (e) {
      setProvisioningError(String((e as Error)?.message ?? e))
    }
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

  // Phase 1 resolves the schema exactly once, at provider start. The source is
  // recorded on that first resolution and later phases (cache/refresh re-checks,
  // workspace/entity switching) will record their own source values.
  useEffect(() => {
    if (schemaName) setSchemaSource('startup')
  }, [schemaName])

  const value = useMemo<EntityContextValue>(
    () => ({
      entity,
      entityCount,
      isLoading,
      error,
      expectedSchema,
      schemaName,
      schemaSource,
      provisioningStatus,
      provisioningError,
      tenantClient,
      recheckProvisioning,
      refresh,
    }),
    [
      entity,
      entityCount,
      isLoading,
      error,
      expectedSchema,
      schemaName,
      schemaSource,
      provisioningStatus,
      provisioningError,
      tenantClient,
      recheckProvisioning,
      refresh,
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