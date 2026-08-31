import * as React from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/lib/tenant/contexts'
import { WorkspaceSelectionSheet } from './WorkspaceSelectionSheet'

export function WorkspaceSwitcherRow() {
  const { workspace, activeWorkspaces, isLoading } = useWorkspace()
  const [sheetOpen, setSheetOpen] = React.useState(false)

  const workspaceName =
    String(workspace?.name || '').trim() ||
    (isLoading ? 'Loading…' : 'No workspace')
  const hasMultiple = activeWorkspaces.length > 1

  return (
    <>
      <button
        type="button"
        onClick={hasMultiple ? () => setSheetOpen(true) : undefined}
        className={cn(
          'flex w-full items-center gap-2 rounded-[12px] px-3 py-2.5 transition active:scale-[0.985]',
          hasMultiple
            ? 'bg-[hsl(var(--surface-muted))] hover:bg-[hsl(var(--surface-muted))]/80 cursor-pointer'
            : 'cursor-default',
        )}
        aria-label={`Current workspace: ${workspaceName}. ${hasMultiple ? 'Tap to switch.' : ''}`}
      >
        <div className="min-w-0 flex-1">
          <div className="text-[7px] font-[800] uppercase tracking-[0.075em] text-[hsl(var(--ink-3))]">
            Workspace
          </div>
          <div className="mt-0.5 truncate text-[13px] font-[800] tracking-[-0.045em] text-[hsl(var(--ink))]">
            {workspaceName}
          </div>
        </div>
        {hasMultiple ? (
          <ChevronRight className="h-[17px] w-[17px] shrink-0 text-[hsl(var(--ink-3))]" />
        ) : null}
      </button>

      <WorkspaceSelectionSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  )
}
