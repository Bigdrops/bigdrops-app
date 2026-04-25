import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface RevertInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoiceNumber: string | number | undefined
  paymentCount: number | string
  paymentTotal: string
  submitting: boolean
  onConfirm: () => void | Promise<void>
}

export default function RevertInvoiceDialog({
  open,
  onOpenChange,
  invoiceNumber,
  paymentCount,
  paymentTotal,
  submitting,
  onConfirm,
}: RevertInvoiceDialogProps) {
  const [confirmInput, setConfirmInput] = useState('')
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!open) return
    setConfirmInput('')
    setReason('')
  }, [open, invoiceNumber])

  const canConfirm = useMemo(() => {
    return confirmInput === String(invoiceNumber || '') && !!reason.trim() && !submitting
  }, [confirmInput, invoiceNumber, reason, submitting])

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg border border-border bg-background text-foreground shadow-lg">
        <AlertDialogHeader className="items-start text-left">
          <AlertDialogMedia className="border border-destructive/20 bg-destructive/15 text-destructive">
            <AlertTriangle className="h-4 w-4" />
          </AlertDialogMedia>
          <AlertDialogTitle className="text-base font-semibold">
            Revert invoice to quotation?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 text-left">
            <p>This will revert Invoice {invoiceNumber} to a quotation.</p>
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
              <p className="font-medium text-foreground">The invoice will be deleted.</p>
              <p className="mt-1 font-medium text-destructive">
                All payments recorded against this invoice will also be removed.
              </p>
              <p className="mt-1 text-muted-foreground">
                Use this only when the invoice was created by mistake.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Invoice
              </div>
              <div className="mt-1 text-sm font-semibold text-foreground">
                {invoiceNumber || '-'}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Payments
              </div>
              <div className="mt-1">
                <Badge variant="outline">{paymentCount}</Badge>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Payment Total
              </div>
              <div className="mt-1 text-sm font-semibold text-foreground">
                {paymentTotal}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="revert-confirm-number" className="text-sm font-medium text-foreground">
              Type the invoice number to confirm
            </label>
            <Input
              id="revert-confirm-number"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={String(invoiceNumber || 'Invoice number')}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="revert-reason" className="text-sm font-medium text-foreground">
              Reason for revert
            </label>
            <Textarea
              id="revert-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this invoice needs to be reverted"
              rows={3}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={!canConfirm}
            onClick={() => void onConfirm()}
          >
            {submitting ? 'Reverting...' : 'Revert to Quotation'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
