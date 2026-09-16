import { useRef, useState, type ReactNode } from 'react'
import { Dialog as SheetPrimitive } from 'radix-ui'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLayoutMode } from '@/hooks/useLayoutMode'
import { cn } from '@/lib/utils'

/** Settings action sheet: bottom on mobile/tablet, side panel on desktop. */
export default function SettingsSheet({ open, onClose, title, subtitle, children }: {
  open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode
}) {
  const { isDesktop } = useLayoutMode()
  const dragStart = useRef<number | null>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const [dragOffset, setDragOffset] = useState(0)
  return <SheetPrimitive.Root open={open} onOpenChange={next => { if (!next) onClose() }}>
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay data-slot="sheet-overlay" className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70" />
      <SheetPrimitive.Content data-slot="sheet-content"
        onOpenAutoFocus={() => { returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null }}
        onCloseAutoFocus={event => { event.preventDefault(); returnFocus.current?.focus() }}
        className={cn('bd-settings-surface fixed z-50 flex flex-col border border-bd-overlay-border bg-bd-overlay-bg text-bd-overlay-text shadow-2xl outline-none',
          isDesktop ? 'inset-y-0 right-0 w-full max-w-xl' : 'inset-x-0 bottom-0 max-h-[var(--bd-overlay-sheet-max-height,90dvh)] rounded-t-[var(--bd-overlay-radius)]')}
        style={!isDesktop && dragOffset ? { transform: `translateY(${dragOffset}px)` } : undefined}>
        {!isDesktop && <div className="flex min-h-11 touch-none items-center justify-center" aria-hidden="true"
          onPointerDown={event => { dragStart.current = event.clientY; event.currentTarget.setPointerCapture(event.pointerId) }}
          onPointerMove={event => { if (dragStart.current !== null) setDragOffset(Math.max(0, event.clientY - dragStart.current)) }}
          onPointerCancel={() => { dragStart.current = null; setDragOffset(0) }}
          onPointerUp={event => {
            const distance = dragStart.current === null ? 0 : event.clientY - dragStart.current
            dragStart.current = null
            setDragOffset(0)
            if (distance > 80) onClose()
          }}>
          <span className="h-1 w-9 rounded-full bg-bd-overlay-muted/40" />
        </div>}
        <div className="relative border-b border-bd-overlay-border px-4 py-3 pr-16">
          <SheetPrimitive.Title className="text-[17px] font-extrabold tracking-tight">{title}</SheetPrimitive.Title>
          <SheetPrimitive.Description className="mt-1 text-xs text-bd-overlay-muted">{subtitle || 'Manage settings'}</SheetPrimitive.Description>
          <Button type="button" variant="ghost" aria-label="Close" className="absolute right-2 top-1 h-11 w-11" onClick={onClose}><X size={18} /></Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-3 pl-[max(0.875rem,env(safe-area-inset-left))] pr-[max(0.875rem,env(safe-area-inset-right))] pb-[calc(1rem+env(safe-area-inset-bottom))]">{children}</div>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  </SheetPrimitive.Root>
}
