import { useRef, useState } from 'react'
import { CheckCircle2, Loader2, Paperclip, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { feedback } from '@/lib/feedback'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import {
  submitCertificate,
  markReceiptVerified,
  uploadReceiptFile,
} from '@/modules/compliance/services/whtReceiptService'
import type { WhtReceipt } from '@/domain/compliance/types'
import type { WhtReceiptQueueEntry } from './WhtReceiptQueueRow'

interface WhtReceiptMatcherActionProps {
  entry: WhtReceiptQueueEntry
  onComplete: (receipt: WhtReceipt) => void
}

export default function WhtReceiptMatcherAction({ entry, onComplete }: WhtReceiptMatcherActionProps) {
  const [receiptNumber, setReceiptNumber] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isUntracked = entry.status === 'untracked' || entry.status === 'pending' || entry.status === 'requested'
  const isReceived = entry.status === 'received'

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleSubmitCertificate = async () => {
    if (!receiptNumber.trim()) {
      feedback.error('Receipt number is required')
      return
    }

    setSubmitting(true)
    try {
      let fileUrl: string | null = null
      if (selectedFile) {
        fileUrl = await uploadReceiptFile(selectedFile)
      }

      const receipt = await submitCertificate({
        payment_id: entry.payment.id,
        invoice_id: entry.payment.invoice_id || null,
        client_name: entry.payment.client_name || null,
        wht_amount: entry.payment.wht_amount != null ? Number(entry.payment.wht_amount) : null,
        receipt_number: receiptNumber.trim(),
        receipt_file_url: fileUrl,
        receipt_status: fileUrl ? 'received' : 'received',
        received_at: new Date().toISOString(),
      })

      feedback.success('Certificate submitted successfully')
      onComplete(receipt)
    } catch (error) {
      feedback.error(getUserFacingMutationMessage(error, { action: 'create' }))
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarkVerified = async () => {
    if (!entry.receipt?.id) return

    setSubmitting(true)
    try {
      const updated = await markReceiptVerified(entry.receipt.id)
      feedback.success('Receipt marked as verified')
      onComplete(updated)
    } catch (error) {
      feedback.error(getUserFacingMutationMessage(error, { action: 'update' }))
    } finally {
      setSubmitting(false)
    }
  }

  if (isReceived && entry.receipt) {
    return (
      <div className="mt-3 rounded-[var(--bd-radius-lg)] border border-bd-status-info-border bg-bd-status-info-bg p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-bd-text">
              Receipt received — ready for verification
            </p>
            {entry.receipt.receipt_number ? (
              <p className="mt-1 text-xs text-bd-text-muted">
                Ref: {entry.receipt.receipt_number}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleMarkVerified}
            disabled={submitting}
            className="h-9 shrink-0 gap-1.5 rounded-[var(--bd-radius-lg)] bg-emerald-600 px-4 text-[10px] font-black uppercase tracking-[0.18em] text-white hover:bg-emerald-700"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Mark as Verified
          </Button>
        </div>
      </div>
    )
  }

  if (!isUntracked) return null

  return (
    <div className="mt-3 rounded-[var(--bd-radius-lg)] border border-bd-border bg-bd-surface p-4">
      <p className="mb-3 text-xs font-bold text-bd-text">
        Submit WHT Certificate
      </p>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label
            htmlFor={`receipt-num-${entry.id}`}
            className="text-[10px] font-black uppercase tracking-[0.14em] text-bd-text-muted"
          >
            Receipt Number
          </Label>
          <Input
            id={`receipt-num-${entry.id}`}
            value={receiptNumber}
            onChange={(e) => setReceiptNumber(e.target.value)}
            placeholder="e.g. FIRS-WHT-2025-001"
            disabled={submitting}
            className="h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] font-black uppercase tracking-[0.14em] text-bd-text-muted">
            Attachment (optional)
          </Label>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={submitting}
              className="h-9 gap-1.5 rounded-[var(--bd-radius-lg)] px-3 text-[10px] font-black uppercase tracking-[0.14em]"
            >
              <Paperclip className="h-3.5 w-3.5" />
              {selectedFile ? 'Change file' : 'Attach file'}
            </Button>
            {selectedFile ? (
              <span className="truncate text-xs text-bd-text-muted">
                {selectedFile.name}
              </span>
            ) : null}
          </div>
        </div>

        <Button
          type="button"
          onClick={handleSubmitCertificate}
          disabled={submitting || !receiptNumber.trim()}
          className="h-10 w-full gap-2 rounded-[var(--bd-radius-lg)] text-[10px] font-black uppercase tracking-[0.18em]"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {submitting ? 'Submitting...' : 'Submit Certificate'}
        </Button>
      </div>
    </div>
  )
}
