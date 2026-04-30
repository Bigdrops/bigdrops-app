import * as React from 'react'
import { ChevronRight } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { salesPicker } from './navData'

interface MobileSalesSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  handleSalesPick: (key: string) => void
}

export function MobileSalesSheet({
  open,
  onOpenChange,
  handleSalesPick,
}: MobileSalesSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="h-[min(640px,84vh)] max-h-[84vh] overflow-hidden rounded-t-[32px] border-0 bg-[hsl(var(--bd-layout-nav))] p-0 shadow-2xl backdrop-blur-xl"
      >
        <div className="flex h-full flex-col">
          <div className="shrink-0 px-5 pb-3 pt-4">
            <div className="mx-auto h-1.5 w-12 rounded-full bg-[hsl(var(--bd-border))]/60" />
            <div className="mt-4 px-1">
              <div className="text-[22px] font-black tracking-[-0.04em] text-[hsl(var(--bd-text))]">
                Quick Create
              </div>
              <div className="text-[13px] font-medium text-[hsl(var(--bd-text-muted))]">
                Start a new sales or dispatch record
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-2 bd-custom-scrollbar">
            <div className="space-y-3">
              {salesPicker.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleSalesPick(item.key)}
                    className="grid w-full grid-cols-[56px,1fr,auto] items-center gap-4 rounded-[24px] border border-[hsl(var(--bd-surface-action-border))] bg-[hsl(var(--bd-surface-action))] px-4 py-4 text-left transition-all hover:bg-[hsl(var(--bd-surface-action-hover))] active:scale-[0.98] shadow-sm"
                  >
                    <span className={cn('grid h-14 w-14 place-items-center rounded-[20px] shadow-sm ring-1 ring-black/5', item.iconBg)}>
                      <Icon className="h-6 w-6" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-[16px] font-bold tracking-tight text-[hsl(var(--bd-surface-action-text))]">
                        {item.label}
                      </div>
                      <div className="text-[12px] font-medium leading-relaxed text-[hsl(var(--bd-surface-action-muted))]">
                        {item.description}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-[hsl(var(--bd-surface-action-muted))]" />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
