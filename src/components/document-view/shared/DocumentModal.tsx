import type { ReactNode } from 'react'
import { X } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface DocumentModalProps {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  footer?: ReactNode
  children: ReactNode
}

export default function DocumentModal({
  open,
  title,
  description,
  onClose,
  footer,
  children,
}: DocumentModalProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-w-[min(32rem,calc(100%-1.5rem))] gap-0 rounded-[var(--bd-overlay-radius)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] p-0 text-[hsl(var(--bd-text))] shadow-2xl"
      >
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] text-[hsl(var(--bd-text))] hover:bg-[hsl(var(--bd-surface))] hover:text-[hsl(var(--bd-text))]"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
        <DialogHeader className="border-b border-[hsl(var(--bd-border))] px-5 py-4 pr-12 sm:px-6">
          <DialogTitle className="text-base font-black tracking-tight text-[hsl(var(--bd-text))]">
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription className="pt-1 text-sm leading-relaxed text-[hsl(var(--bd-text-muted))]">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="px-5 py-5 sm:px-6">{children}</div>

        {footer ? (
          <DialogFooter className="border-t border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6">
            {footer}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
