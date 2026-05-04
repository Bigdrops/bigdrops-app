import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { formatNaira } from '@/lib/formatters/money'
import { formatDisplayDate } from '@/lib/formatters/date'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { 
  FileText, 
  ReceiptIcon, 
  PlusCircle, 
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  FileJson
} from 'lucide-react'
import ComplianceJsonImportSheet from './import/ComplianceJsonImportSheet'
import { supabase } from '@/supabase'
import { feedback } from '@/lib/feedback'
import { WhtReceipt, WhtReceiptStatus } from '@/domain/compliance/types'
import { getStatusClasses } from '@/lib/statusTheme'

interface WhtReceiptsPanelProps {
  payments: any[]
  receipts: WhtReceipt[]
  loading: boolean
  onReceiptsChanged?: () => void
}

const statusToneMap: Record<WhtReceiptStatus, string> = {
  pending: 'neutral',
  requested: 'warning',
  received: 'info',
  verified: 'success'
}

export default function WhtReceiptsPanel({ payments, receipts, loading, onReceiptsChanged }: WhtReceiptsPanelProps) {
  const [localReceipts, setLocalReceipts] = useState<WhtReceipt[]>(receipts)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const whtPayments = payments.filter(p => Number(p.wht_amount || 0) > 0)

  // Sync prop changes to local state
  if (receipts.length !== localReceipts.length && !loading) {
    setLocalReceipts(receipts)
  }

  async function initializeRecord(payment: any) {
    try {
      setProcessingId(payment.id)
      const newRecord: Partial<WhtReceipt> = {
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
        feedback.success('WHT tracking initialized')
      }
    } catch (error: any) {
      feedback.error(getUserFacingMutationMessage(error, { action: 'create' }))
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
        feedback.success('Receipt updated')
      }
    } catch (error: any) {
      feedback.error(getUserFacingMutationMessage(error, { action: 'update' }))
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return (
      <Card className="border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))]">
        <CardContent className="flex items-center gap-2 p-6 text-sm text-[hsl(var(--bd-text-muted))]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading WHT records...
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))]">
        <CardHeader className="border-b border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-[hsl(var(--bd-text))]">
            <ReceiptIcon className="h-4 w-4 text-[hsl(var(--bd-status-danger-text))]" />
            WHT Deductions Tracking
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="h-8 rounded-full px-3 text-[10px] font-black uppercase tracking-widest">
            <FileJson className="h-3 w-3 mr-1.5" />
            Import JSON
          </Button>
        </CardHeader>
        <CardContent className="p-4">
          {whtPayments.length === 0 ? (
            <div className="rounded-[var(--bd-radius-xl)] border border-dashed border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] py-10 text-center">
              <div className="text-sm font-bold text-[hsl(var(--bd-text))]">No WHT recorded</div>
              <div className="mt-1 text-xs text-[hsl(var(--bd-text-muted))]">No payments with WHT deductions have been recorded yet.</div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {whtPayments.map((p) => {
                const receipt = localReceipts.find(r => r.payment_id === p.id)
                const isProcessing = processingId === p.id

                return (
                  <div
                    key={p.id}
                    className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] p-4 shadow-sm transition-colors hover:bg-[hsl(var(--bd-surface-muted))]"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-[hsl(var(--bd-text))]">
                          {p.invoice_id ? (
                            <Link
                              to={`/invoices/${p.invoice_id}`}
                              className="transition-colors hover:text-[hsl(var(--bd-button-primary-bg))] hover:underline"
                            >
                              {p.invoice_number || '—'}
                            </Link>
                          ) : (
                            p.invoice_number || '—'
                          )}
                        </div>
                        <div className="truncate text-[11px] text-[hsl(var(--bd-text-muted))]">{p.client_name || '—'}</div>
                      </div>
                      
                      {receipt ? (
                        <Badge variant="outline" className={`${getStatusClasses(statusToneMap[receipt.receipt_status] as any)} text-[9px] font-bold uppercase rounded-full`}>
                          {receipt.receipt_status}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="rounded-full border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] text-[9px] font-bold uppercase text-[hsl(var(--bd-text-muted))]"
                        >
                          Untracked
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-tight text-[hsl(var(--bd-text-muted))]">WHT Amount</div>
                        <div className="text-base font-black text-[hsl(var(--bd-status-danger-text))]">{formatNaira(p.wht_amount)}</div>
                      </div>
                      <div className="flex flex-col justify-end items-end">
                        {receipt ? (
                          <Sheet>
                            <SheetTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 rounded-full px-3 text-[hsl(var(--bd-button-primary-bg))] hover:bg-[hsl(var(--bd-surface-muted))] hover:text-[hsl(var(--bd-button-primary-bg))]"
                              >
                                {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3 mr-1" />}
                                Manage
                              </Button>
                            </SheetTrigger>
                            <SheetContent className="flex h-full w-full max-w-full flex-col overflow-hidden bg-[hsl(var(--bd-card-bg))] p-0 sm:max-w-xl">
                              <SheetHeader className="border-b border-[hsl(var(--bd-border))]">
                                <SheetTitle>WHT Receipt Detail</SheetTitle>
                                <SheetDescription>
                                  Manage certification for {p.invoice_number || 'this payment'}.
                                </SheetDescription>
                              </SheetHeader>
                              <div className="flex-1 overflow-y-auto px-6 py-6">
                                <div className="space-y-6">
                                  <div className="space-y-3 rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] p-4">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-[hsl(var(--bd-text-muted))]">Amount Withheld</span>
                                      <span className="font-bold text-[hsl(var(--bd-status-danger-text))]">{formatNaira(p.wht_amount)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-[hsl(var(--bd-text-muted))]">Payment Date</span>
                                      <span className="font-semibold text-[hsl(var(--bd-text))]">{formatDisplayDate(p.date)}</span>
                                    </div>
                                  </div>

                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <Label className="text-[11px] font-bold text-[hsl(var(--bd-text-muted))]">Current Status</Label>
                                      <div className="flex flex-wrap gap-2">
                                        {(['pending', 'requested', 'received', 'verified'] as WhtReceiptStatus[]).map((s) => (
                                          <Button
                                            key={s}
                                            variant={receipt.receipt_status === s ? 'default' : 'outline'}
                                            size="sm"
                                            className="h-8 rounded-full px-3 text-[10px] font-black uppercase tracking-[0.14em]"
                                            onClick={() => updateRecord(receipt, { receipt_status: s })}
                                            disabled={isProcessing}
                                          >
                                            {s.charAt(0).toUpperCase() + s.slice(1)}
                                          </Button>
                                        ))}
                                      </div>
                                    </div>

                                    <div className="space-y-2">
                                      <Label htmlFor="receipt_number" className="text-[11px] font-bold text-[hsl(var(--bd-text-muted))]">
                                        Credential / Receipt Number
                                      </Label>
                                      <Input 
                                        id="receipt_number"
                                        placeholder="e.g. FIRS-12345"
                                        defaultValue={receipt.receipt_number || ''}
                                        onBlur={(e) => {
                                          if (e.target.value !== receipt.receipt_number) {
                                            updateRecord(receipt, { receipt_number: e.target.value })
                                          }
                                        }}
                                        className="h-10"
                                      />
                                    </div>

                                    <div className="space-y-2">
                                      <Label className="text-[11px] font-bold text-[hsl(var(--bd-text-muted))]">Notes</Label>
                                      <Textarea
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
                              </div>
                              <SheetFooter className="border-t border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] pb-[calc(1rem+env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
                                <SheetClose asChild>
                                  <Button variant="outline" className="h-10 sm:min-w-28">
                                    Done
                                  </Button>
                                </SheetClose>
                              </SheetFooter>
                            </SheetContent>
                          </Sheet>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 rounded-full px-3"
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
        <div className="flex items-center gap-3 rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--bd-surface-muted))] text-[hsl(var(--bd-text-muted))]">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-[hsl(var(--bd-text-muted))]">Pending</div>
            <div className="text-lg font-black text-[hsl(var(--bd-text))]">
              {localReceipts.filter(r => r.receipt_status === 'pending').length}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-status-warning-border))] bg-[hsl(var(--bd-status-warning-bg))] p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--bd-card-bg))] text-[hsl(var(--bd-status-warning-text))]">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-[hsl(var(--bd-status-warning-text))]">Requested</div>
            <div className="text-lg font-black text-[hsl(var(--bd-status-warning-text))]">
              {localReceipts.filter(r => r.receipt_status === 'requested').length}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-status-success-border))] bg-[hsl(var(--bd-status-success-bg))] p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--bd-card-bg))] text-[hsl(var(--bd-status-success-text))]">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-[hsl(var(--bd-status-success-text))]">Verified</div>
            <div className="text-lg font-black text-[hsl(var(--bd-status-success-text))]">
              {localReceipts.filter(r => r.receipt_status === 'verified' || r.receipt_status === 'received').length}
            </div>
          </div>
        </div>
      </div>

      <Card className="border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))]">
        <CardContent className="flex items-center gap-3 p-4">
          <FileText className="h-5 w-5 text-[hsl(var(--bd-text-muted))]" />
          <div className="text-xs text-[hsl(var(--bd-text-muted))]">
            <span className="font-bold text-[hsl(var(--bd-text))]">Storage Tip:</span> WHT Receipt records initialized here help track the lifecycle of tax deduction evidence needed for CIT audits.
          </div>
        </CardContent>
      </Card>
      <ComplianceJsonImportSheet 
        open={importOpen}
        onOpenChange={setImportOpen}
        type="wht_receipt"
        payments={payments}
        onSuccess={() => onReceiptsChanged?.()}
      />
    </div>
  )
}
