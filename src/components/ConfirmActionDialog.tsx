import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ConfirmActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  loading?: boolean
}

export default function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  variant = 'destructive',
  loading = false,
}: ConfirmActionDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[400px] rounded-3xl border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] p-6 shadow-2xl">
        <AlertDialogHeader className="sm:text-left">
          <AlertDialogTitle className="text-xl font-bold tracking-tight text-[hsl(var(--bd-text))]">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed text-[hsl(var(--bd-text-muted))]">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <AlertDialogCancel 
            disabled={loading}
            className="h-12 rounded-2xl border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] px-6 text-sm font-bold text-[hsl(var(--bd-text))] hover:bg-[hsl(var(--bd-surface))] transition-colors"
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction 
            variant={variant as any} 
            onClick={onConfirm} 
            loading={loading}
            className={cn(
              "h-12 rounded-2xl px-8 text-sm font-bold transition-all shadow-sm",
              variant === 'destructive' 
                ? "bg-[hsl(var(--bd-status-danger-bg))] text-[hsl(var(--bd-status-danger-text))] hover:opacity-90 border border-[hsl(var(--bd-status-danger-border))]" 
                : "bg-[hsl(var(--bd-button-primary-bg))] text-[hsl(var(--bd-button-primary-text))] hover:opacity-90"
            )}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
