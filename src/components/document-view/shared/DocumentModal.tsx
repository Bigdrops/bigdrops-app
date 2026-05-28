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
        className="max-w-[min(32rem,calc(100%-1.5rem))] gap-0 rounded-[var(--bd-overlay-radius)] border border-bd-border bg-bd-card-bg p-0 text-bd-text shadow-2xl"
      >
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full border-bd-border bg-bd-surface-muted text-bd-text hover:bg-bd-surface hover:text-bd-text"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
        <DialogHeader className="border-b border-bd-border px-5 py-4 pr-12 sm:px-6">
          <DialogTitle className="text-base font-black tracking-tight text-bd-text">
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription className="pt-1 text-sm leading-relaxed text-bd-text-muted">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="px-5 py-5 sm:px-6">{children}</div>

        {footer ? (
          <DialogFooter className="border-t border-bd-border bg-bd-surface-muted px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6">
            {footer}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
