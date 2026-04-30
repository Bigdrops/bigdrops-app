import * as React from 'react'
import { ChevronRight } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { moreGroups } from './navData'

interface MobileMoreSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  handleMorePick: (key: string) => void
}

export function MobileMoreSheet({
  open,
  onOpenChange,
  handleMorePick,
}: MobileMoreSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="h-[min(640px,84vh)] overflow-hidden rounded-t-[32px] border-0 bg-[hsl(var(--bd-layout-nav))] p-0 shadow-2xl backdrop-blur-xl"
      >
        <div className="flex h-full flex-col">
          <div className="shrink-0 border-b border-[hsl(var(--bd-border))]/60 px-6 pb-5 pt-4">
            <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-[hsl(var(--bd-border))]/60" />
            <SheetHeader className="space-y-1 p-0 text-left">
              <SheetTitle className="text-[22px] font-black tracking-[-0.04em] text-[hsl(var(--bd-text))]">
                More
              </SheetTitle>
              <div className="text-[13px] font-medium leading-relaxed text-[hsl(var(--bd-text-muted))]">
                Admin, reporting, and workspace utilities
              </div>
            </SheetHeader>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 bd-custom-scrollbar">
            {moreGroups.map((group, index) => (
              <div key={group.group} className={index === 0 ? '' : 'mt-6'}>
                <div className="mb-3 px-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[hsl(var(--bd-text-muted))]">
                  {group.sheetLabel || group.group}
                </div>
                <div className="space-y-2">
                  {group.items.map((item) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => handleMorePick(item.key)}
                        className="flex w-full items-center justify-between rounded-[22px] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] px-4 py-3.5 text-left transition-all hover:bg-[hsl(var(--bd-surface-muted))] active:scale-[0.98] shadow-sm"
                      >
                        <div className="flex min-w-0 items-center gap-3.5">
                          <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-[14px] shadow-sm ring-1 ring-black/5', item.iconBg)}>
                            <Icon className="h-5 w-5" />
                          </span>
                          <div className="min-w-0">
                            <div className="text-[14px] font-bold tracking-tight text-[hsl(var(--bd-text))]">
                                {item.label}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-4.5 w-4.5 shrink-0 text-[hsl(var(--bd-text-muted))]" />
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
