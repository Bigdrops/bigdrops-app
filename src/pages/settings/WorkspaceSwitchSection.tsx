import * as React from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/lib/tenant/contexts'
import { hasActionableInvitation } from '@/domain/tenant/tenantGate'
import { acceptWorkspaceInvitation } from '@/domain/tenant/tenantCreation'
import { WorkspaceSelectionSheet } from '@/components/layout/WorkspaceSelectionSheet'

export function WorkspaceSwitchSection() {
  const { workspace, activeWorkspaces, pendingInvitation, invitationDismissed, dismissInvitation, refresh } =
    useWorkspace()
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [accepting, setAccepting] = React.useState(false)
  const [acceptError, setAcceptError] = React.useState<string | null>(null)

  const wsName = String(workspace?.name || '').trim() || '—'
  const hasMultiple = activeWorkspaces.length > 1
  const initials = wsName.charAt(0).toUpperCase()
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
      {/* Current workspace row — tappable when multiple workspaces exist */}
      <button
        type="button"
        onClick={hasMultiple ? () => setSheetOpen(true) : undefined}
        aria-label={`Current workspace: ${wsName}. ${hasMultiple ? 'Tap to switch.' : ''}`}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition active:scale-[0.985]',
          hasMultiple
            ? 'hover:bg-[hsl(var(--surface-muted))]/50'
            : 'cursor-default',
        )}
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[hsl(var(--primary-soft))] text-[hsl(var(--primary))] text-[11px] font-[800]">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] font-[800] text-bd-text">{wsName}</div>
          <div className="truncate text-[10px] text-bd-text-muted">
            {hasMultiple ? `${activeWorkspaces.length} workspaces available` : 'Active workspace'}
          </div>
        </div>
        {hasMultiple ? (
          <ChevronRight className="h-4 w-4 shrink-0 text-bd-text-muted" aria-hidden="true" />
        ) : null}
      </button>

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

      {/* Canonical workspace selection sheet */}
      <WorkspaceSelectionSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  )
}
