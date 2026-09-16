import * as React from 'react'
import { Building2, Check, Info } from 'lucide-react'
import { useWorkspace } from '@/lib/tenant/contexts'
import { hasActionableInvitation } from '@/domain/tenant/tenantGate'
import { acceptWorkspaceInvitation } from '@/domain/tenant/tenantCreation'

export function WorkspaceSwitchSection() {
  const { workspace, activeWorkspaces, selectWorkspace, isLoading, error, pendingInvitation, invitationDismissed, dismissInvitation, refresh } =
    useWorkspace()
  const [accepting, setAccepting] = React.useState(false)
  const [acceptError, setAcceptError] = React.useState<string | null>(null)

  const showInvitation = hasActionableInvitation(pendingInvitation, invitationDismissed)

  const handleAccept = async () => {
    if (!pendingInvitation) return
    setAccepting(true)
    setAcceptError(null)
    try {
      // Server-authoritative: the RPC validates pending status, expiry,
      // and email match. Acceptance only adds membership; selection stays.
      await acceptWorkspaceInvitation(pendingInvitation.id)
      refresh()
    } catch (e) {
      setAcceptError(String((e as Error)?.message ?? e))
    } finally {
      setAccepting(false)
    }
  }

  return (
    <>
      <div className="su-sechead"><h2>Switch Workspace</h2></div>
      {isLoading ? <p role="status">Loading workspaces…</p> : error ? <p role="alert" className="su-error">{error}</p> : <div className="su-scope-card mt-2">
        {activeWorkspaces.map(ws => {
          const current = ws.id === workspace?.id
          return <div key={ws.id} className={`su-irow${current ? ' su-ws-current' : ''}`}>
            <span className="su-irow-icon"><Building2 size={15} aria-hidden="true" /></span>
            <div className="min-w-0 flex-1">
              <div className="su-who-name su-ws-name">{ws.name ?? ws.slug ?? '—'}{current && <span className="su-pill you">Current</span>}</div>
              <div className="su-irow-when">{ws.slug}{ws.role ? ` · ${ws.role}` : ''}</div>
            </div>
            {current ? <span className="su-ghostbtn su-ws-actions"><Check size={11} />Active</span> : <button type="button" className="su-ghostbtn su-ws-actions" onClick={() => selectWorkspace(ws.id)}>Switch</button>}
          </div>
        })}
        {!activeWorkspaces.length && <p className="su-ia-note">No active workspaces available.</p>}
      </div>}
      <p className="su-ia-note"><Info aria-hidden="true" /><span>Switching workspace changes your active workspace. Your memberships stay.</span></p>

      {/* Pending workspace invitation — visible to members, not just onboarding */}
      {showInvitation ? (
        <div className="mt-2 rounded-xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] px-3 py-3">
          <div className="text-[12px] font-[800] text-bd-text">Workspace invitation</div>
          <p className="mt-0.5 text-[10px] text-bd-text-muted">
            You have been invited to join another workspace. Accepting adds it to your workspaces.
          </p>
          {acceptError ? (
            <p role="alert" className="mt-1.5 break-words text-[10px] font-[600] text-red-600">
              {acceptError}
            </p>
          ) : null}
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={handleAccept}
              disabled={accepting}
              className="h-11 flex-1 rounded-xl bg-[hsl(var(--primary))] text-[12px] font-[800] text-white transition active:scale-[0.985] disabled:opacity-50"
            >
              {accepting ? 'Accepting…' : 'Accept invitation'}
            </button>
            <button
              type="button"
              onClick={dismissInvitation}
              disabled={accepting}
              className="h-11 flex-1 rounded-xl border border-[hsl(var(--line))] bg-[hsl(var(--surface))] text-[12px] font-[700] text-[hsl(var(--ink))] transition active:scale-[0.985] disabled:opacity-50"
            >
              Pass for now
            </button>
          </div>
        </div>
      ) : null}

    </>
  )
}
