import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/supabase'
import {
  useWorkspace,
  useEntity,
  useAuthorization,
  TENANT_RESOLUTION_STARTED,
} from '@/lib/tenant/contexts'

const PLATFORM_ROLES = ['owner', 'support', 'auditor', 'operations'] as const
type PlatformRole = (typeof PLATFORM_ROLES)[number]

type PlatformProbe = {
  isOperator: boolean | null
  role: PlatformRole | null
  error: string | null
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border rounded p-3">
      <h2 className="text-xs font-bold uppercase tracking-wide pb-2">{title}</h2>
      <div className="text-xs space-y-1">{children}</div>
    </section>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-0.5">
      <span className="opacity-60">{label}</span>
      <span className="text-right font-medium break-all">{value ?? '—'}</span>
    </div>
  )
}

export default function TenantDebug({ session }: { session: Session }) {
  const workspace = useWorkspace()
  const entity = useEntity()
  const authorization = useAuthorization()

  const [platformProbe, setPlatformProbe] = useState<PlatformProbe>({
    isOperator: null,
    role: null,
    error: null,
  })

  useEffect(() => {
    const userId = session.user.id
    let cancelled = false

    async function probePlatform() {
      try {
        const { data: isOperator, error } = await supabase.rpc('is_platform_operator', {
          p_user_id: userId,
        })
        if (cancelled) return
        if (error) throw error

        if (!isOperator) {
          setPlatformProbe({ isOperator: false, role: null, error: null })
          return
        }

        let foundRole: PlatformRole | null = null
        let probeError: string | null = null
        for (const role of PLATFORM_ROLES) {
          const { data: hasRole, error: roleError } = await supabase.rpc(
            'is_platform_operator',
            { p_user_id: userId, p_required_role: role },
          )
          if (cancelled) return
          if (!roleError && hasRole) {
            foundRole = role
            break
          }
          if (roleError) probeError = String((roleError as Error)?.message ?? roleError)
        }

        setPlatformProbe({ isOperator: true, role: foundRole, error: probeError })
      } catch (e) {
        if (!cancelled) {
          setPlatformProbe({
            isOperator: null,
            role: null,
            error: String((e as Error)?.message ?? e),
          })
        }
      }
    }

    void probePlatform()
    return () => {
      cancelled = true
    }
  }, [session.user.id])

  const resolutionMs = useMemo(() => {
    if (workspace.isLoading || entity.isLoading) return null
    return Math.max(0, Date.now() - TENANT_RESOLUTION_STARTED)
  }, [workspace.isLoading, entity.isLoading])

  return (
    <div className="min-h-screen w-full bg-white text-black p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 pb-4">
          <h1 className="font-bold text-sm">Tenant Debug</h1>
          <span className="text-[10px] border rounded px-1.5 py-0.5 opacity-60">
            {entity.tenantClient.version}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* AUTHENTICATION */}
          <Section title="Authentication">
            <Row label="User" value={session.user.email ?? session.user.phone ?? session.user.id} />
            <Row label="Auth UID" value={session.user.id} />
            <Row label="Session status" value={session.expires_at ? 'authenticated' : 'unknown'} />
            <div className="pt-1 opacity-50 text-[10px]">
              auth.uid() is only meaningful in authenticated app requests. SQL Editor sessions
              contain no JWT claims and return NULL.
            </div>
          </Section>

          {/* PLATFORM */}
          <Section title="Platform">
            <Row
              label="Platform Operator"
              value={
                platformProbe.isOperator === null
                  ? 'checking…'
                  : platformProbe.isOperator
                    ? 'yes'
                    : 'no'
              }
            />
            <Row label="Operator Role" value={platformProbe.role ?? '—'} />
            {platformProbe.error && (
              <Row label="Probe Error" value={platformProbe.error} />
            )}
          </Section>

          {/* WORKSPACE */}
          <Section title="Workspace">
            <Row label="Workspace ID" value={workspace.workspace?.id} />
            <Row label="Workspace Name" value={workspace.workspace?.name} />
            <Row label="Workspace Status" value={workspace.workspace?.status ?? 'none'} />
            <Row
              label="Active Count"
              value={`${workspace.workspaceCount}${workspace.workspaceCount > 1 ? ' (selector deferred)' : ''}`}
            />
            {workspace.error && <Row label="Error" value={workspace.error} />}
          </Section>

          {/* MEMBERSHIP */}
          <Section title="Membership">
            <Row label="Workspace Role" value={workspace.workspace?.role} />
            <Row label="Effective Permission Count" value={authorization.permissionCount} />
            <Row label="hasAuthorization('invoice','read')" value={authorization.hasAuthorization('invoice', 'read') ? 'yes' : 'no'} />
            {authorization.error && <Row label="Error" value={authorization.error} />}
          </Section>

          {/* ENTITY */}
          <Section title="Entity">
            <Row label="Entity ID" value={entity.entity?.id} />
            <Row label="Entity Name" value={entity.entity?.name} />
            <Row label="Schema Name" value={entity.schemaName} />
            <Row label="Expected Schema" value={entity.expectedSchema} />
            <Row label="Schema Resolution Source" value={entity.schemaName ? 'Startup' : '—'} />
            <Row label="Active Count" value={`${entity.entityCount}${entity.entityCount > 1 ? ' (selector deferred)' : ''}`} />
            {entity.error && <Row label="Error" value={entity.error} />}
          </Section>

          {/* PROVISIONING */}
          <Section title="Provisioning">
            <Row label="Provisioning Status" value={entity.provisioningStatus} />
            <Row label="Last Error" value={entity.provisioningError} />
            {entity.provisioningStatus === 'failed' && (
              <button
                onClick={entity.recheckProvisioning}
                className="mt-1 text-xs underline underline-offset-2"
              >
                Retry Provisioning
              </button>
            )}
          </Section>

          {/* DATABASE */}
          <Section title="Database">
            <Row label="Active Schema" value={entity.schemaName} />
            <Row label="Tenant Client Ready" value={entity.tenantClient.isReady ? 'yes' : 'no'} />
            <Row label="Tenant Client Version" value={entity.tenantClient.version} />
          </Section>

          {/* PERFORMANCE */}
          <Section title="Performance">
            <Row label="Resolution Time" value={resolutionMs === null ? '…' : `${resolutionMs} ms`} />
          </Section>
        </div>
      </div>
    </div>
  )
}