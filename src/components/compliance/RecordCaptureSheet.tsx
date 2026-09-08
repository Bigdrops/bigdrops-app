import { useState } from 'react'
import { Camera, Receipt } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumericInput } from '@/components/ui/numeric-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { PaymentAttachmentUploader } from '@/components/ui/PaymentAttachmentUploader'
import { feedback } from '@/lib/feedback'
import { useEntity } from '@/lib/tenant/contexts'
import { useLayoutMode } from '@/hooks/useLayoutMode'
import * as complianceService from '@/modules/compliance/services/complianceService'
import { recordExpenseRecorded } from '@/lib/audit'
import { reverseVat } from '@/lib/Calculations'
import { EvidenceFile, TaxInputEntry } from '@/domain/compliance/types'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'

const EXPENSE_CATEGORIES = [
  'Software',
  'Office',
  'Travel',
  'Utilities',
  'Professional Services',
  'Equipment',
  'Supplies',
  'Marketing',
  'Rent',
  'Other',
]

// ponytail: 7.5% is Nigeria's standard VAT rate — hard-coded per PRD system-derives-tax-treatment
const DEFAULT_VAT_RATE = 7.5

interface RecordCaptureSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry?: TaxInputEntry | null
  onSaved: () => void
}

export default function RecordCaptureSheet({ open, onOpenChange, entry, onSaved }: RecordCaptureSheetProps) {
  const { tenantClient } = useEntity()
  const { isMobile } = useLayoutMode()
  const [saving, setSaving] = useState(false)
  const [date, setDate] = useState(entry?.date ?? new Date().toISOString().split('T')[0])
  const [vendorName, setVendorName] = useState(entry?.vendor_name ?? '')
  const [category, setCategory] = useState(entry?.category ?? '')
  const [reference, setReference] = useState(entry?.reference ?? '')
  const [paymentReference, setPaymentReference] = useState(entry?.payment_reference ?? '')
  const [amount, setAmount] = useState(entry ? entry.net_amount + entry.vat_amount : 0)
  const [notes, setNotes] = useState(entry?.notes ?? '')
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([])

  const isEditing = !!entry?.id

  const handleSave = async () => {
    if (!date || amount <= 0) {
      feedback.error('Date and amount are required')
      return
    }

    try {
      setSaving(true)

      const { net, vat } = reverseVat(amount, DEFAULT_VAT_RATE)
      const roundedNet = Math.round(net * 100) / 100
      const roundedVat = Math.round(vat * 100) / 100

      const uploadedEvidence: EvidenceFile[] = entry?.evidence ?? []
      for (const file of evidenceFiles) {
        const url = await complianceService.uploadReceiptFile(file)
        uploadedEvidence.push({ name: file.name, url, size: file.size })
      }

      const recordToSave: Partial<TaxInputEntry> = {
        settings_id: entry?.settings_id ?? 1,
        date,
        vendor_name: vendorName || null,
        category: category || null,
        reference: reference || null,
        net_amount: roundedNet,
        vat_amount: roundedVat,
        is_recoverable: false,
        notes: notes || null,
        payment_reference: paymentReference || null,
        evidence: uploadedEvidence,
      }

      if (isEditing) {
        await complianceService.updateTaxInputEntry(entry.id, recordToSave, tenantClient)
        feedback.success('Record updated')
      } else {
        const inserted = await complianceService.insertTaxInputEntry(recordToSave, tenantClient)
        feedback.success('Record captured')
        recordExpenseRecorded(tenantClient, inserted.id, amount, category || 'Uncategorized').catch(() => {})
      }

      onSaved()
      onOpenChange(false)
    } catch (e: any) {
      feedback.error(getUserFacingMutationMessage(e, { action: 'save' }))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={isMobile ? 'bottom' : 'right'} className="flex h-full w-full max-w-full flex-col overflow-hidden bg-bd-card-bg p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-bd-border">
          <SheetTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            {isEditing ? 'Edit Record' : 'Capture Record'}
          </SheetTitle>
          <SheetDescription>
            Record a business expense with supplier, amounts, and optional evidence.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-bd-text-muted">Date</Label>
              <Input
                type="date"
                className="h-10"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-bd-text-muted">Vendor / Supplier</Label>
              <Input
                className="h-10"
                placeholder="e.g. Globacom Nigeria"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-bd-text-muted">Category</Label>
              <select
                className="flex h-10 w-full rounded-[var(--bd-radius-xl)] border border-bd-border bg-bd-card-bg px-3 py-2 text-sm text-bd-text ring-offset-bd-card-bg focus:outline-none focus:ring-2 focus:ring-bd-focus-ring"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Select category</option>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-bd-text-muted">Reference</Label>
              <Input
                className="h-10"
                placeholder="Receipt or invoice number"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <Label className="text-[11px] font-bold text-bd-text-muted">Amount (₦)</Label>
            <NumericInput
              className="h-10"
              value={amount}
              onChange={setAmount}
            />
            <p className="text-[11px] text-bd-text-muted">Total amount paid. Tax treatment is derived automatically.</p>
          </div>

          <div className="mt-4 space-y-2">
            <Label className="text-[11px] font-bold text-bd-text-muted">Payment Reference</Label>
            <Input
              className="h-10"
              placeholder="Bank transfer ref, receipt number..."
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
            />
          </div>

          <div className="mt-4 space-y-2">
            <Label className="text-[11px] font-bold text-bd-text-muted">Notes</Label>
            <Textarea
              placeholder="Optional context..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="mt-4 space-y-2">
            <Label className="text-[11px] font-bold text-bd-text-muted flex items-center gap-1.5">
              <Camera className="h-3 w-3" />
              Evidence (Receipts / Invoices)
            </Label>
            <PaymentAttachmentUploader
              files={evidenceFiles}
              onFilesChanged={setEvidenceFiles}
            />
          </div>
        </div>

        <SheetFooter className="border-t border-bd-border bg-bd-card-bg pb-[calc(1rem+env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-10 sm:min-w-28">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="h-10 sm:min-w-32">
            {saving ? 'Saving...' : isEditing ? 'Update' : 'Save Record'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
