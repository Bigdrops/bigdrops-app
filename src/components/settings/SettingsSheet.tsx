import { useRef, useState, type ReactNode } from 'react'
import { Dialog as SheetPrimitive } from 'radix-ui'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Candidate bottom sheet with modal focus and dismissal semantics. */
export default function SettingsSheet({ open, onClose, title, subtitle, children }: {
  open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode
}) {
  const dragStart = useRef<number | null>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const [dragOffset, setDragOffset] = useState(0)
  return <SheetPrimitive.Root open={open} onOpenChange={next => { if (!next) onClose() }}>
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay data-slot="sheet-overlay" className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70" />
      <SheetPrimitive.Content data-slot="sheet-content"
        onOpenAutoFocus={() => { returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null }}
        onCloseAutoFocus={event => { event.preventDefault(); returnFocus.current?.focus() }}
        className="bd-settings-surface su-dialog fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-[1180px] flex-col outline-none"
        style={dragOffset ? { transform: `translateY(${dragOffset}px)` } : undefined}>
        <div className="su-dialog-grab touch-none" aria-hidden="true"
          onPointerDown={event => { dragStart.current = event.clientY; event.currentTarget.setPointerCapture(event.pointerId) }}
          onPointerMove={event => { if (dragStart.current !== null) setDragOffset(Math.max(0, event.clientY - dragStart.current)) }}
          onPointerCancel={() => { dragStart.current = null; setDragOffset(0) }}
          onPointerUp={event => {
            const distance = dragStart.current === null ? 0 : event.clientY - dragStart.current
            dragStart.current = null
            setDragOffset(0)
            if (distance > 80) onClose()
          }}>
          <span className="su-grab" />
        </div>
        <div className="su-sheet-head">
          <div className="min-w-0"><SheetPrimitive.Title className="su-sheet-title">{title}</SheetPrimitive.Title>
          <SheetPrimitive.Description className="su-sheet-desc">{subtitle || 'Manage settings'}</SheetPrimitive.Description></div>
          <Button type="button" variant="ghost" aria-label="Close" className="su-dialog-close" onClick={onClose}><X size={13} /></Button>
        </div>
        <div className="su-sheet-body min-h-0 flex-1 overscroll-contain">{children}</div>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  </SheetPrimitive.Root>
}
