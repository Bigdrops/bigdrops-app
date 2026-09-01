import { useEffect, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'

interface DocumentSheetProps {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
}

/**
 * DocumentSheet — shared sheet primitive for document View pages.
 *
 * Handles:
 * - Responsive bottom (mobile) / right (desktop) presentation
 * - Android keyboard/IME height adjustment via visualViewport
 * - Safe-area inset padding
 * - Stable open/close lifecycle
 */
export default function DocumentSheet({
  open,
  title,
  subtitle,
  onClose,
  children,
}: DocumentSheetProps) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === 'undefined' ? false : window.innerWidth < 768,
  )
  const [keyboardVisible, setKeyboardVisible] = useState(false)

  // Responsive breakpoint detection
  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const lastWidth = { current: window.innerWidth }

    const handleResize = () => {
      const currentWidth = window.innerWidth
      if (currentWidth === lastWidth.current) return
      lastWidth.current = currentWidth
      setIsMobile(currentWidth < 768)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Android keyboard detection via visualViewport.
  // Used only to adjust sheet max-height when keyboard is visible.
  // We do NOT manually scrollIntoView — the browser handles that natively.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return undefined

    const vv = window.visualViewport
    const threshold = 150

    const handleViewportResize = () => {
      const heightDiff = window.innerHeight - (vv.height ?? window.innerHeight)
      setKeyboardVisible(heightDiff > threshold)
    }

    vv.addEventListener('resize', handleViewportResize)
    vv.addEventListener('scroll', handleViewportResize)
    return () => {
      vv.removeEventListener('resize', handleViewportResize)
      vv.removeEventListener('scroll', handleViewportResize)
    }
  }, [])

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
    >
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        showCloseButton={false}
        className={
          isMobile
            ? 'flex h-auto max-h-[var(--bd-overlay-sheet-max-height)] w-full max-w-full flex-col overflow-hidden rounded-t-[var(--bd-overlay-radius)] border-bd-border bg-bd-card-bg p-0'
            : 'flex h-full w-full max-w-full flex-col overflow-hidden border-bd-border bg-bd-card-bg p-0 sm:max-w-xl'
        }
        style={isMobile && keyboardVisible ? { maxHeight: '70vh' } : undefined}
      >
        <SheetHeader className="border-b border-bd-border px-5 py-4 pr-14 sm:px-6">
          <SheetTitle className="text-base font-black tracking-tight text-bd-text">
            {title}
          </SheetTitle>
          {subtitle ? (
            <SheetDescription className="pt-1 text-sm leading-relaxed text-bd-text-muted">
              {subtitle}
            </SheetDescription>
          ) : null}
        </SheetHeader>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          className="absolute right-4 top-4 bg-bd-surface-muted text-bd-text-muted hover:bg-bd-surface hover:text-bd-text"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>

        <div className="flex-1 overflow-y-auto px-5 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-6">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  )
}
