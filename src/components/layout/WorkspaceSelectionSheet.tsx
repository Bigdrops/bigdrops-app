import * as React from 'react'
import { Check, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/lib/tenant/contexts'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'

interface WorkspaceSelectionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function WorkspaceRow({
  name,
  companyCount,
  isSelected,
  onClick,
}: {
  name: string
  companyCount?: number
  isSelected: boolean
  onClick: () => void
}) {
  const initials = (name || '?').charAt(0).toUpperCase()

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-[14px] px-2.5 py-2.5 text-left transition active:scale-[0.985]',
        isSelected
          ? 'bg-[hsl(var(--primary-soft))]'
          : 'hover:bg-[hsl(var(--surface-muted))]/50',
      )}
    >
      <span
        className={cn(
          'grid h-[34px] w-[34px] shrink-0 place-items-center rounded-2xl text-[11px] font-[800]',
          isSelected
            ? 'bg-[hsl(var(--primary))] text-white'
            : 'bg-[hsl(var(--primary-soft))] text-[hsl(var(--primary))]',
        )}
      >
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-[11px] font-[800] tracking-[-0.025em]',
            isSelected ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--ink))]',
          )}
        >
          {name}
        </span>
        {companyCount != null && companyCount > 0 ? (
          <span className="block text-[8px] font-[500] text-[hsl(var(--ink-3))]">
            {companyCount} {companyCount === 1 ? 'company' : 'companies'}
          </span>
        ) : null}
      </div>
      {isSelected ? (
        <Check className="h-[13px] w-[13px] shrink-0 text-[hsl(var(--primary))]" />
      ) : null}
    </button>
  )
}

export function WorkspaceSelectionSheet({
  open,
  onOpenChange,
}: WorkspaceSelectionSheetProps) {
  const { workspace, activeWorkspaces, selectWorkspace } = useWorkspace()

  const handleSelect = React.useCallback(
    (id: string) => {
      selectWorkspace(id)
      setTimeout(() => onOpenChange(false), 150)
    },
    [selectWorkspace, onOpenChange],
  )

  if (activeWorkspaces.length <= 1) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[78vh] rounded-t-[24px] border-0 p-0"
        showCloseButton={false}
      >
        {/* Grab handle */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="h-[3px] w-[34px] rounded-full bg-[hsl(var(--surface-strong))]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <div>
            <SheetTitle className="text-[17px] font-[800] tracking-[-0.05em] text-[hsl(var(--ink))]">
              Switch Workspace
            </SheetTitle>
            <SheetDescription className="mt-0.5 text-[9px] font-[700] text-[hsl(var(--ink-3))]">
              Select the workspace to operate in.
            </SheetDescription>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="grid h-7 w-7 place-items-center rounded-full bg-[hsl(var(--surface-muted))] text-[hsl(var(--ink-3))]"
          >
            <span className="text-[11px] font-[800]">×</span>
          </button>
        </div>

        {/* Workspace list */}
        <div className="space-y-0.5 overflow-y-auto px-4 pb-6 pt-1">
          {activeWorkspaces.map((ws, index) => (
            <React.Fragment key={ws.id}>
              <WorkspaceRow
                name={ws.name || 'Unnamed workspace'}
                isSelected={ws.id === workspace?.id}
                onClick={() => handleSelect(ws.id)}
              />
              {index < activeWorkspaces.length - 1 ? (
                <div className="mx-2.5 border-b border-[hsl(var(--line))]" />
              ) : null}
            </React.Fragment>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
