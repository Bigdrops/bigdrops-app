import { useState } from 'react'
import { Wand2, ClipboardCheck, Loader2, Info } from 'lucide-react'
import { formatNaira } from '@/lib/formatters/money'
import { formatDisplayDate } from '@/lib/formatters/date'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { feedback } from '@/lib/feedback'
import { Button } from '@/components/ui/button'
import { COMPLIANCE_IMPORT_CONTRACTS, ComplianceRecordType } from '@/domain/compliance/import/contracts'
import { parseJsonObject, validateRequiredFields, normalizeDate, normalizeNumber } from '@/domain/compliance/import/parse'
import { importRecord } from '@/modules/compliance/services/complianceService'
import ComplianceJsonPreviewCard from './ComplianceJsonPreviewCard'
import { JsonImportLayout } from '@/components/import/JsonImportLayout'

interface ImportSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: ComplianceRecordType
  onSuccess: () => void
  payments?: any[] // Optional WHT-eligible payments
}

export default function ComplianceJsonImportSheet({ open, onOpenChange, type, onSuccess, payments = [] }: ImportSheetProps) {
  const [rawInput, setRawInput] = useState('')
  const [parsedData, setParsedData] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null)

  const whtEligiblePayments = payments.filter(p => Number(p.wht_amount || 0) > 0)
  const selectedPayment = whtEligiblePayments.find(p => p.id === selectedPaymentId)

  const contract = COMPLIANCE_IMPORT_CONTRACTS[type]

  const handlePreview = () => {
    if (parsedData) {
      setParsedData(null)
      return
    }

    setError(null)
    const { data: parsed, error: parseErr } = parseJsonObject(rawInput)
    if (parseErr) {
      setError(parseErr)
      return
    }

    if (!parsed) {
      setError('Paste JSON and click Preview.')
      return
    }

    const missing = validateRequiredFields(type, parsed)
    if (missing.length > 0) {
      setError(`Extraction is missing fields: ${missing.join(', ')}. Please refine your paste or the AI prompt.`)
      return
    }

    // Normalization
    const normalized = { ...parsed }
    if (type === 'vat_input') {
      normalized.date = normalizeDate(parsed.date)
      normalized.net_amount = normalizeNumber(parsed.net_amount)
      normalized.vat_amount = normalizeNumber(parsed.vat_amount)
      if (!normalized.date) return setError('Invalid date format. Expected YYYY-MM-DD.')
    } else if (type === 'tax_filing') {
      normalized.period_start = normalizeDate(parsed.period_start)
      normalized.period_end = normalizeDate(parsed.period_end)
      normalized.submitted_at = normalizeDate(parsed.submitted_at)
      normalized.amount_due = normalizeNumber(parsed.amount_due)
      normalized.amount_paid = normalizeNumber(parsed.amount_paid)
      if (!normalized.period_start || !normalized.period_end) return setError('Invalid date format in period dates.')
    } else if (type === 'wht_receipt') {
      normalized.issue_date = normalizeDate(parsed.issue_date)
      normalized.gross_base_amount = normalizeNumber(parsed.gross_base_amount)
      normalized.wht_rate = normalizeNumber(parsed.wht_rate)
      normalized.wht_amount = normalizeNumber(parsed.wht_amount)
    }

    setParsedData(normalized)
    feedback.success('JSON parsed successfully')
  }

  const handleSave = async () => {
    if (!parsedData) return
    
    try {
      setIsSaving(true)
      let record: Record<string, unknown> = {}

      if (type === 'vat_input') {
        record = {
          settings_id: 1,
          date: parsedData.date,
          vendor_name: parsedData.vendor_name,
          category: parsedData.category || 'Purchase',
          reference: parsedData.reference || null,
          net_amount: parsedData.net_amount,
          vat_amount: parsedData.vat_amount,
          is_recoverable: !!parsedData.is_recoverable,
          notes: parsedData.notes || null,
        }
      } else if (type === 'tax_filing') {
        record = {
          settings_id: 1,
          tax_type: parsedData.tax_type,
          period_start: parsedData.period_start,
          period_end: parsedData.period_end,
          amount_due: parsedData.amount_due,
          amount_paid: parsedData.amount_paid,
          status: parsedData.status,
          submitted_at: parsedData.submitted_at || null,
          receipt_reference: parsedData.receipt_reference || null,
          portal_reference: parsedData.portal_reference || null,
          notes: parsedData.notes || null,
        }
      } else if (type === 'wht_receipt') {
        if (!selectedPaymentId) {
          feedback.error('Select a payment to link this receipt.')
          return
        }
        record = {
          payment_id: selectedPaymentId,
          invoice_id: selectedPayment?.invoice_id || null,
          client_name: parsedData.client_name || selectedPayment?.client_name,
          gross_base_amount: parsedData.gross_base_amount || selectedPayment?.total || 0,
          wht_rate: parsedData.wht_rate || 5,
          wht_amount: parsedData.wht_amount || selectedPayment?.wht_amount,
          receipt_status: parsedData.receipt_status || 'received',
          receipt_number: parsedData.receipt_number || null,
          notes: parsedData.notes || null,
        }
      }

      await importRecord(type, record)

      feedback.success(`${contract.label} created successfully`)
      onSuccess()
      onOpenChange(false)
      setRawInput('')
      setParsedData(null)
    } catch (e: any) {
      feedback.error(`Save failed: ${e.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const whtPaymentsSection = type === 'wht_receipt' && (
    <div className="space-y-3 rounded-[var(--bd-radius-xl)] border border-bd-border bg-bd-surface p-4">
       <div className="flex items-center gap-2 text-[11px] font-bold text-bd-text-muted">
         Link to Payment
       </div>
       {whtEligiblePayments.length > 0 ? (
         <Select value={selectedPaymentId || ''} onValueChange={setSelectedPaymentId}>
           <SelectTrigger className="h-10 text-xs font-semibold">
             <SelectValue placeholder="Select a payment..." />
           </SelectTrigger>
           <SelectContent className="max-h-60">
              {whtEligiblePayments.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  <div className="flex flex-col text-left">
                    <span className="font-bold">{p.client_name}</span>
                    <span className="text-[10px] text-bd-text-muted">{formatDisplayDate(p.date)} • {formatNaira(p.wht_amount)} WHT</span>
                  </div>
                </SelectItem>
              ))}
           </SelectContent>
         </Select>
       ) : (
         <div className="rounded-[var(--bd-radius-lg)] border border-bd-status-danger-border bg-bd-status-danger-bg p-3 text-[11px] font-medium text-bd-status-danger-text">
           No WHT payments are available to link this receipt to yet.
         </div>
       )}
    </div>
  )

  return (
    <JsonImportLayout
      open={open}
      onOpenChange={onOpenChange}
      title={`${contract.label} Import`}
      description={`Paste JSON extraction for ${contract.label}.`}
      promptText={contract.prompt}
      rawInput={rawInput}
      onRawInputChange={(val) => {
        setRawInput(val)
        setError(null)
      }}
      onPreview={handlePreview}
      onSave={handleSave}
      saveLabel={`Save ${contract.label}`}
      isSaving={isSaving}
      isParsed={!!parsedData}
      error={error}
      whtNotice={type === 'wht_receipt'}
      whtHasPayments={whtEligiblePayments.length > 0}
      previewContent={
        <div className="space-y-4">
          {whtPaymentsSection}
          <ComplianceJsonPreviewCard type={type} data={parsedData} />
        </div>
      }
      additionalActions={
        <Button 
          variant="ghost" 
          onClick={() => setParsedData(null)}
          className="h-10 w-full text-xs font-bold text-bd-text-muted hover:text-bd-text"
        >
          Clear and Start Over
        </Button>
      }
      tutorial={{
        title: 'How Compliance JSON import works',
        description: 'Update compliance and tax records by pasting extracted JSON from official documents.',
        steps: [
          'Copy the Compliance AI Prompt for your record type',
          'Extract required fields (VAT, WHT, etc.) from your document into JSON',
          'Paste the resulting JSON here to review and save'
        ],
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      }}
    />
  )
}
