import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

type VoidPaymentDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  reason: string
  onReasonChange: (value: string) => void
  submitting: boolean
  onConfirm: () => void
  onCancel?: () => void
}

export default function VoidPaymentDialog({
  open,
  onOpenChange,
  reason,
  onReasonChange,
  submitting,
  onConfirm,
  onCancel,
}: VoidPaymentDialogProps) {
  const handleCancel = () => {
    if (onCancel) {
      onCancel()
      return
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Void payment</DialogTitle>
          <DialogDescription>Enter a reason for voiding this payment:</DialogDescription>
        </DialogHeader>
        <Input value={reason} onChange={(e) => onReasonChange(e.target.value)} placeholder="Reason for voiding" autoFocus />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>
          <Button type="button" variant="destructive" disabled={!reason.trim() || submitting} onClick={onConfirm}>
            {submitting ? 'Voiding...' : 'Void Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
