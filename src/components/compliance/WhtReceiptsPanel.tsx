import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { formatNaira } from '@/lib/formatters/money'
import { formatDisplayDate } from '@/lib/formatters/date'
import { 
  FileText, 
  ReceiptIcon, 
  PlusCircle, 
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { supabase } from '@/supabase'
import { toast } from 'sonner'
import { WhtReceipt, WhtReceiptStatus } from '@/domain/compliance/types'

interface WhtReceiptsPanelProps {
  payments: any[]
  receipts: WhtReceipt[]
  loading: boolean
}

const statusTones: Record<WhtReceiptStatus, string> = {
  pending: 'bg-slate-100 text-slate-600 border-slate-200',
  requested: 'bg-amber-50 text-amber-700 border-amber-200',
  received: 'bg-blue-50 text-blue-700 border-blue-200',
  verified: 'bg-emerald-50 text-emerald-700 border-emerald-200'
}

export default function WhtReceiptsPanel({ payments, receipts, loading }: WhtReceiptsPanelProps) {
  const [localReceipts, setLocalReceipts] = useState<WhtReceipt[]>(receipts)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const whtPayments = payments.filter(p => Number(p.wht_amount || 0) > 0)

  // Sync prop changes to local state
  if (receipts.length !== localReceipts.length && !loading) {
    setLocalReceipts(receipts)
  }

  async function initializeRecord(payment: any) {
    try {
      setProcessingId(payment.id)
      const newRecord: Partial<WhtReceipt> = {
        entity_id: 1,
        payment_id: payment.id,
        invoice_id: payment.invoice_id,
        client_name: payment.client_name,
        wht_amount: payment.wht_amount,
        receipt_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('wht_receipts')
        .insert([newRecord])
        .select()
        .single()

      if (error) throw error
      if (data) {
        setLocalReceipts([...localReceipts, data])
        toast.success('WHT tracking initialized')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to initialize tracking')
    } finally {
      setProcessingId(null)
    }
  }

  async function updateRecord(receipt: WhtReceipt, updates: Partial<WhtReceipt>) {
    try {
      setProcessingId(receipt.payment_id)
      const { data, error } = await supabase
        .from('wht_receipts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', receipt.id)
        .select()
        .single()

      if (error) throw error
      if (data) {
        setLocalReceipts(localReceipts.map(r => r.id === data.id ? data : r))
        toast.success('Receipt updated')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update receipt')
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return (
      <Card className="border-slate-200 bg-slate-50">
        <CardContent className="p-6 text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading WHT records...
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="border-red-100 bg-red-50/20">
        <CardHeader className="pb-3 border-b border-red-50">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <ReceiptIcon className="h-4 w-4 text-red-600" />
            WHT Deductions Tracking
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {whtPayments.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200">
              <div className="text-sm font-bold text-slate-800">No WHT recorded</div>
              <div className="text-xs text-muted-foreground mt-1">No payments with WHT deductions have been recorded yet.</div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {whtPayments.map((p) => {
                const receipt = localReceipts.find(r => r.payment_id === p.id)
                const isProcessing = processingId === p.id

                return (
                  <div key={p.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:border-red-200 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-800 truncate">
                          {p.invoice_id ? (
                            <Link to={`/invoices/${p.invoice_id}`} className="hover:text-blue-700 hover:underline">
                              {p.invoice_number || '—'}
                            </Link>
                          ) : (
                            p.invoice_number || '—'
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">{p.client_name || '—'}</div>
                      </div>
                      
                      {receipt ? (
                        <Badge variant="outline" className={`${statusTones[receipt.receipt_status]} text-[9px] font-bold uppercase rounded-full`}>
                          {receipt.receipt_status}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-slate-50 text-slate-400 border-slate-200 text-[9px] font-bold uppercase rounded-full">
                          Untracked
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">WHT Amount</div>
                        <div className="text-base font-black text-red-600">{formatNaira(p.wht_amount)}</div>
                      </div>
                      <div className="flex flex-col justify-end items-end">
                        {receipt ? (
                          <Sheet>
                            <SheetTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 rounded-full text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3">
                                {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3 mr-1" />}
                                Manage
                              </Button>
                            </SheetTrigger>
                            <SheetContent className="rounded-l-3xl">
                              <SheetHeader className="mb-6">
                                <SheetTitle className="text-lg font-black tracking-tight">WHT Receipt Detail</SheetTitle>
                                <p className="text-xs text-muted-foreground">Manage certification for {p.invoice_number}</p>
                              </SheetHeader>
                              <div className="space-y-6">
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-muted-foreground">Amount Withheld</span>
                                    <span className="font-bold text-red-600">{formatNaira(p.wht_amount)}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-muted-foreground">Payment Date</span>
                                    <span className="font-semibold">{formatDisplayDate(p.date)}</span>
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Current Status</Label>
                                    <div className="flex flex-wrap gap-2">
                                      {(['pending', 'requested', 'received', 'verified'] as WhtReceiptStatus[]).map((s) => (
                                        <Button
                                          key={s}
                                          variant={receipt.receipt_status === s ? 'default' : 'outline'}
                                          size="sm"
                                          className="rounded-full text-[10px] h-7 px-3"
                                          onClick={() => updateRecord(receipt, { receipt_status: s })}
                                          disabled={isProcessing}
                                        >
                                          {s.charAt(0).toUpperCase() + s.slice(1)}
                                        </Button>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor="receipt_number" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Credential / Receipt #</Label>
                                    <div className="flex gap-2">
                                      <Input 
                                        id="receipt_number"
                                        placeholder="e.g. FIRS-12345"
                                        defaultValue={receipt.receipt_number || ''}
                                        onBlur={(e) => {
                                          if (e.target.value !== receipt.receipt_number) {
                                            updateRecord(receipt, { receipt_number: e.target.value })
                                          }
                                        }}
                                        className="h-9 text-sm"
                                      />
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Notes</Label>
                                    <textarea 
                                      className="w-full min-h-[80px] rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm focus:bg-white transition-colors"
                                      placeholder="Add follow-up notes..."
                                      defaultValue={receipt.notes || ''}
                                      onBlur={(e) => {
                                        if (e.target.value !== receipt.notes) {
                                          updateRecord(receipt, { notes: e.target.value })
                                        }
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </SheetContent>
                          </Sheet>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 rounded-full border-blue-200 text-blue-600 hover:bg-blue-50 px-3"
                            onClick={() => initializeRecord(p)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <PlusCircle className="h-3 w-3 mr-1" />}
                            Initialize
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase">Pending</div>
            <div className="text-lg font-black text-slate-700">
              {localReceipts.filter(r => r.receipt_status === 'pending').length}
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl border border-amber-100 bg-amber-50/50 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-amber-600 uppercase">Requested</div>
            <div className="text-lg font-black text-amber-700">
              {localReceipts.filter(r => r.receipt_status === 'requested').length}
            </div>
          </div>
        </div>
        <div className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/50 shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-emerald-600 uppercase">Verified</div>
            <div className="text-lg font-black text-emerald-700">
              {localReceipts.filter(r => r.receipt_status === 'verified' || r.receipt_status === 'received').length}
            </div>
          </div>
        </div>
      </div>

      <Card className="border-slate-100 bg-slate-50/50">
        <CardContent className="p-4 flex items-center gap-3">
          <FileText className="h-5 w-5 text-slate-400" />
          <div className="text-xs text-muted-foreground">
            <span className="font-bold text-slate-700">Storage Tip:</span> WHT Receipt records initialized here help track the lifecycle of tax deduction evidence needed for CIT audits.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
