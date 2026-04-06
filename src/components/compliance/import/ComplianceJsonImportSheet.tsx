import { useState } from 'react'
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Wand2, Copy, Check, ClipboardCheck, Loader2, Link2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatNaira } from '@/lib/formatters/money'
import { formatDisplayDate } from '@/lib/formatters/date'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from 'sonner'
import { COMPLIANCE_IMPORT_CONTRACTS, ComplianceRecordType } from '@/domain/compliance/import/contracts'
import { parseJsonObject, validateRequiredFields, normalizeDate, normalizeNumber } from '@/domain/compliance/import/parse'
import { supabase } from '@/supabase'
import ComplianceJsonPreviewCard from './ComplianceJsonPreviewCard'

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
  const [copied, setCopied] = useState(false)
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null)

  const whtEligiblePayments = payments.filter(p => Number(p.wht_amount || 0) > 0)
  const selectedPayment = whtEligiblePayments.find(p => p.id === selectedPaymentId)

  const contract = COMPLIANCE_IMPORT_CONTRACTS[type]

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(contract.prompt)
      setCopied(true)
      toast.success('Prompt copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy prompt')
    }
  }

  const handlePreview = () => {
    setError(null)
    setParsedData(null)

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
      setError(`Missing required fields: ${missing.join(', ')}`)
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
    toast.success('JSON parsed successfully')
  }

  const handleSave = async () => {
    if (!parsedData) return
    
    try {
      setIsSaving(true)
      let table = ''
      let record: any = {}

      if (type === 'vat_input') {
        table = 'tax_input_entries'
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
        table = 'tax_filings'
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
          toast.error('Select a payment to link this receipt.')
          return
        }
        table = 'wht_receipts'
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

      const { error: dbErr } = await supabase.from(table).insert([record])
      if (dbErr) throw dbErr

      toast.success(`${contract.label} created successfully`)
      onSuccess()
      onOpenChange(false)
      setRawInput('')
      setParsedData(null)
    } catch (e: any) {
      toast.error(`Save failed: ${e.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[94vh] rounded-t-[28px] bg-slate-50 p-0 border-none sm:max-w-2xl sm:mx-auto select-none overflow-y-auto">
        <SheetHeader className="p-5 border-b bg-white rounded-t-[28px] flex flex-row items-center justify-between">
          <div className="space-y-1">
            <SheetTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-emerald-600" />
              {contract.label} Import
            </SheetTitle>
            <SheetDescription className="text-xs font-medium text-slate-500">
              Paste JSON extraction for {contract.label}.
            </SheetDescription>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleCopyPrompt}
            className="h-9 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3"
          >
            {copied ? <Check className="h-3 w-3 mr-1.5" /> : <Copy className="h-3 w-3 mr-1.5" />}
            {copied ? 'Copied' : 'AI Prompt'}
          </Button>
        </SheetHeader>

        <div className="p-5 space-y-6">
          {/* Step 2: Paste */}
          <div className="space-y-3">
             <div className="flex items-center justify-between">
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step 1: Paste JSON</span>
               <span className="text-[9px] text-slate-400 italic">No markdown fences</span>
             </div>
             <Textarea
              value={rawInput}
              onChange={(e) => {
                setRawInput(e.target.value)
                setError(null)
              }}
              placeholder={contract.jsonSchema}
              className="min-h-[140px] rounded-2xl border-slate-200 bg-white font-mono text-sm p-4 focus-visible:ring-emerald-500 shadow-inner"
             />
             {error && (
               <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-xs text-red-600 font-bold">
                 {error}
               </div>
             )}
             {!parsedData && (
               <Button 
                  onClick={handlePreview}
                  className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg"
               >
                 Preview Values
               </Button>
             )}
          </div>

          {/* Step 3: Review */}
          {parsedData && (
            <div className="space-y-5 pb-10">
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Step 2: Verify and Save</span>
               
               {type === 'wht_receipt' && (
                 <div className="space-y-3 border-2 border-amber-100 bg-amber-50/50 p-4 rounded-2xl">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-700">
                      <Link2 className="h-3 w-3" />
                      Link to Payment Required
                    </div>
                    {whtEligiblePayments.length > 0 ? (
                      <Select value={selectedPaymentId || ''} onValueChange={setSelectedPaymentId}>
                        <SelectTrigger className="bg-white border-amber-200 rounded-xl h-12 text-sm font-bold shadow-sm">
                          <SelectValue placeholder="Select a payment..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                           {whtEligiblePayments.map(p => (
                             <SelectItem key={p.id} value={p.id}>
                               <div className="flex flex-col text-left">
                                 <span className="font-bold">{p.client_name}</span>
                                 <span className="text-[10px] text-slate-500">{formatDisplayDate(p.date)} • {formatNaira(p.wht_amount)} WHT</span>
                               </div>
                             </SelectItem>
                           ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="text-xs text-amber-600 font-bold bg-white p-3 rounded-xl border border-amber-100">
                        No WHT payments are available to link this receipt to yet.
                      </div>
                    )}
                 </div>
               )}

               <ComplianceJsonPreviewCard type={type} data={parsedData} />
               
               <Button 
                onClick={handleSave}
                disabled={isSaving || (type === 'wht_receipt' && !selectedPaymentId)}
                className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg rounded-2xl shadow-lg shadow-emerald-200 mt-2 transition-all active:scale-[0.98]"
               >
                 {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <ClipboardCheck className="h-5 w-5 mr-2" />}
                 {isSaving ? 'Saving...' : `Save ${contract.label}`}
               </Button>
               
               <Button 
                variant="ghost" 
                onClick={() => setParsedData(null)}
                className="w-full h-10 text-slate-400 text-xs font-bold hover:text-slate-600"
               >
                 Clear and Start Over
               </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
