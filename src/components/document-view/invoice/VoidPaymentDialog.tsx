import * as React from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface VoidPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (reason: string) => void
  loading?: boolean
}

export default function VoidPaymentDialog({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
}: VoidPaymentDialogProps) {
  const [reason, setReason] = React.useState('')

  React.useEffect(() => {
    if (open) {
      setReason('')
    }
  }, [open])

  const handleConfirm = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!reason.trim()) return
    onConfirm(reason.trim())
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[400px] rounded-3xl border border-bd-border bg-bd-surface p-6 shadow-2xl">
        <AlertDialogHeader className="sm:text-left">
          <AlertDialogTitle className="text-xl font-bold tracking-tight text-bd-text">
            Void Payment?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed text-bd-text-muted">
            This will remove the payment from balance calculations. This action cannot be undone, though the payment record will remain in history as voided.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="mt-4 space-y-2">
          <Label htmlFor="void-reason" className="text-xs font-bold uppercase tracking-wider text-bd-text-muted">
            Reason for voiding
          </Label>
          <Input
            id="void-reason"
            placeholder="e.g. Mistaken entry, test payment..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="h-12 rounded-2xl border-bd-border bg-bd-surface-muted px-4 text-sm focus-visible:ring-1"
            autoFocus
          />
        </div>

        <AlertDialogFooter className="mt-6 flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <AlertDialogCancel
            disabled={loading}
            className="h-12 rounded-2xl border-bd-border bg-bd-surface-muted px-6 text-sm font-bold text-bd-text hover:bg-bd-surface transition-colors"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading || !reason.trim()}
            className="h-12 rounded-2xl bg-bd-status-danger-bg px-8 text-sm font-bold text-bd-status-danger-text transition-all hover:opacity-90 border border-bd-status-danger-border"
          >
            {loading ? 'Voiding...' : 'Confirm Void'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
