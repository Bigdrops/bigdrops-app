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

export default function DocumentSheet({
  open,
  title,
  subtitle,
  onClose,
  children,
}: DocumentSheetProps) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === 'undefined' ? false : window.innerWidth < 768
  )

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
            ? 'flex h-auto max-h-[88vh] w-full max-w-full flex-col overflow-hidden rounded-t-[var(--bd-overlay-radius)] border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] p-0'
            : 'flex h-full w-full max-w-full flex-col overflow-hidden border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] p-0 sm:max-w-xl'
        }
      >
        <SheetHeader className="border-b border-[hsl(var(--bd-border))] px-5 py-4 pr-14 sm:px-6">
          <SheetTitle className="text-base font-black tracking-tight text-[hsl(var(--bd-text))]">
            {title}
          </SheetTitle>
          {subtitle ? (
            <SheetDescription className="pt-1 text-sm leading-relaxed text-[hsl(var(--bd-text-muted))]">
              {subtitle}
            </SheetDescription>
          ) : null}
        </SheetHeader>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          className="absolute right-4 top-4 bg-[hsl(var(--bd-surface-muted))] text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-surface))] hover:text-[hsl(var(--bd-text))]"
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
