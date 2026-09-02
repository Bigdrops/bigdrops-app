import * as React from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/lib/tenant/contexts'
import { WorkspaceSelectionSheet } from '@/components/layout/WorkspaceSelectionSheet'

export function WorkspaceSwitchSection() {
  const { workspace, activeWorkspaces } = useWorkspace()
  const [sheetOpen, setSheetOpen] = React.useState(false)

  const wsName = String(workspace?.name || '').trim() || '—'
  const hasMultiple = activeWorkspaces.length > 1
  const initials = wsName.charAt(0).toUpperCase()

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

      {/* Canonical workspace selection sheet */}
      <WorkspaceSelectionSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  )
}
