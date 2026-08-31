import * as React from 'react'
import { Check, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEntity } from '@/lib/tenant/contexts'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'

interface CompanySelectionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function CompanyRow({
  name,
  isSelected,
  onClick,
}: {
  name: string
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
      <span
        className={cn(
          'flex-1 truncate text-[11px] font-[800] tracking-[-0.025em]',
          isSelected ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--ink))]',
        )}
      >
        {name}
      </span>
      {isSelected ? (
        <Check className="h-[13px] w-[13px] shrink-0 text-[hsl(var(--primary))]" />
      ) : null}
    </button>
  )
}

export function CompanySelectionSheet({
  open,
  onOpenChange,
}: CompanySelectionSheetProps) {
  const { entity, entities, selectEntity } = useEntity()

  const handleSelect = React.useCallback(
    (id: string) => {
      selectEntity(id)
      // Small delay so the selected state is visible before sheet closes
      setTimeout(() => onOpenChange(false), 150)
    },
    [selectEntity, onOpenChange],
  )

  // Do not show the sheet if there is only one or zero entities.
  // The drawer row itself handles the non-interactive single-entity state.
  if (entities.length <= 1) return null

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
              Switch Company
            </SheetTitle>
            <SheetDescription className="mt-0.5 text-[9px] font-[700] text-[hsl(var(--ink-3))]">
              Select the company to work in.
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

        {/* Company list */}
        <div className="space-y-0.5 overflow-y-auto px-4 pb-6 pt-1">
          {entities.map((ent, index) => (
            <React.Fragment key={ent.id}>
              <CompanyRow
                name={ent.name || 'Unnamed company'}
                isSelected={ent.id === entity?.id}
                onClick={() => handleSelect(ent.id)}
              />
              {index < entities.length - 1 ? (
                <div className="mx-2.5 border-b border-[hsl(var(--line))]" />
              ) : null}
            </React.Fragment>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
