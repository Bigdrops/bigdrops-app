import * as React from 'react'
import { Check, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/lib/tenant/contexts'
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'

export function WorkspaceSwitchSection() {
  const { workspace, activeWorkspaces, selectWorkspace } = useWorkspace()
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
          <ChevronRight className="h-4 w-4 shrink-0 text-bd-text-muted" />
        ) : null}
      </button>

      {/* Selection sheet */}
      {hasMultiple ? (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent
            side="bottom"
            className="max-h-[60vh] rounded-t-[20px] border-0 p-0"
            showCloseButton={false}
          >
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="h-[3px] w-[34px] rounded-full bg-[hsl(var(--surface-strong))]" />
            </div>
            <div className="px-5 pb-3">
              <SheetTitle className="text-[15px] font-[800] tracking-[-0.04em] text-bd-text">
                Switch Workspace
              </SheetTitle>
            </div>
            <div className="px-3 pb-5 space-y-0.5">
              {activeWorkspaces.map((ws) => {
                const isActive = ws.id === workspace?.id
                const wsInitials = (ws.name || '?').charAt(0).toUpperCase()
                return (
                  <button
                    key={ws.id}
                    type="button"
                    onClick={() => {
                      selectWorkspace(ws.id)
                      setTimeout(() => setSheetOpen(false), 120)
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition active:scale-[0.985]',
                      isActive
                        ? 'bg-[hsl(var(--primary-soft))]'
                        : 'hover:bg-[hsl(var(--surface-muted))]/50',
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[10px] font-[800]',
                        isActive
                          ? 'bg-[hsl(var(--primary))] text-white'
                          : 'bg-[hsl(var(--primary-soft))] text-[hsl(var(--primary))]',
                      )}
                    >
                      {wsInitials}
                    </span>
                    <span
                      className={cn(
                        'flex-1 truncate text-[12px] font-[800]',
                        isActive ? 'text-[hsl(var(--primary))]' : 'text-bd-text',
                      )}
                    >
                      {ws.name || 'Unnamed'}
                    </span>
                    {isActive ? (
                      <Check className="h-4 w-4 shrink-0 text-[hsl(var(--primary))]" />
                    ) : null}
                  </button>
                )
              })}
            </div>
          </SheetContent>
        </Sheet>
      ) : null}
    </>
  )
}
