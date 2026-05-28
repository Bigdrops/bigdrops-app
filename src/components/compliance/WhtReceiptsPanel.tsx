import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
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
} from '@/components/ui/sheet'
import { formatNaira } from '@/lib/formatters/money'
import { formatDisplayDate } from '@/lib/formatters/date'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { 
  ReceiptIcon, 
  Loader2,
  FileJson
} from 'lucide-react'
import ComplianceJsonImportSheet from './import/ComplianceJsonImportSheet'
import { supabase } from '@/supabase'
import { feedback } from '@/lib/feedback'
import { WhtReceipt, WhtReceiptStatus } from '@/domain/compliance/types'
import { useLayoutMode } from '@/hooks/useLayoutMode'
import WhtReceiptStatusStrip from './WhtReceiptStatusStrip'
import WhtReceiptQueueRow, { type WhtPaymentRecord, type WhtReceiptQueueEntry } from './WhtReceiptQueueRow'
import WhtReceiptMatcherAction from './WhtReceiptMatcherAction'

interface WhtReceiptsPanelProps {
  payments: any[]
  receipts: WhtReceipt[]
  loading: boolean
  onReceiptsChanged?: () => void
}

const statusRank: Record<'untracked' | WhtReceiptStatus, number> = {
  untracked: 1,
  requested: 2,
  pending: 3,
  received: 4,
  verified: 5,
}

export default function WhtReceiptsPanel({ payments, receipts, loading, onReceiptsChanged }: WhtReceiptsPanelProps) {
  const { isMobile } = useLayoutMode()
  const [localReceipts, setLocalReceipts] = useState<WhtReceipt[]>(receipts)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<WhtReceiptQueueEntry | null>(null)
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null)
  const [draftStatus, setDraftStatus] = useState<WhtReceiptStatus>('pending')
  const [draftReceiptNumber, setDraftReceiptNumber] = useState('')
  const [draftNotes, setDraftNotes] = useState('')

  useEffect(() => {
    if (!loading) {
      setLocalReceipts(receipts)
    }
  }, [loading, receipts])

  const whtPayments = useMemo<WhtPaymentRecord[]>(
    () => payments.filter((payment) => Number(payment.wht_amount || 0) > 0),
    [payments],
  )

  const paymentById = useMemo(
    () => new Map(whtPayments.map((payment) => [payment.id, payment])),
    [whtPayments],
  )

  const receiptByPaymentId = useMemo(
    () => new Map(localReceipts.map((receipt) => [receipt.payment_id, receipt])),
    [localReceipts],
  )

  const queueEntries = useMemo(() => {
    const untracked = whtPayments
      .filter((payment) => !receiptByPaymentId.has(payment.id))
      .map<WhtReceiptQueueEntry>((payment) => ({
        id: `untracked-${payment.id}`,
        rank: statusRank.untracked,
        status: 'untracked',
        actionLabel: 'Initialize tracking',
        payment,
        receipt: null,
      }))

    const tracked = localReceipts.map<WhtReceiptQueueEntry>((receipt) => {
      const payment = paymentById.get(receipt.payment_id) || {
        id: receipt.payment_id,
        invoice_id: receipt.invoice_id,
        invoice_number: receipt.invoice_id ? 'Invoice record' : null,
        client_name: receipt.client_name,
        date: receipt.received_at || receipt.created_at,
        wht_amount: receipt.wht_amount,
      }

      const actionLabel =
        receipt.receipt_status === 'received'
          ? 'Verify / Review'
          : receipt.receipt_status === 'verified'
            ? 'View details'
            : 'Update receipt'

      return {
        id: receipt.id,
        rank: statusRank[receipt.receipt_status],
        status: receipt.receipt_status,
        actionLabel,
        payment,
        receipt,
      }
    })

    return [...untracked, ...tracked].sort((left, right) => {
      if (left.rank !== right.rank) return left.rank - right.rank

      const leftDate = left.payment.date ? new Date(left.payment.date).getTime() : Number.POSITIVE_INFINITY
      const rightDate = right.payment.date ? new Date(right.payment.date).getTime() : Number.POSITIVE_INFINITY

      if (leftDate !== rightDate) return leftDate - rightDate

      return Number(right.payment.wht_amount || 0) - Number(left.payment.wht_amount || 0)
    })
  }, [localReceipts, paymentById, receiptByPaymentId, whtPayments])

  const counts = useMemo(
    () => ({
      untracked: queueEntries.filter((entry) => entry.status === 'untracked').length,
      requested: queueEntries.filter((entry) => entry.status === 'requested').length,
      pending: queueEntries.filter((entry) => entry.status === 'pending').length,
      received: queueEntries.filter((entry) => entry.status === 'received').length,
      verified: queueEntries.filter((entry) => entry.status === 'verified').length,
    }),
    [queueEntries],
  )

  const attentionEntries = queueEntries.filter((entry) => entry.status !== 'verified')
  const verifiedEntries = queueEntries.filter((entry) => entry.status === 'verified')
  const showTrackedSuccessState =
    whtPayments.length > 0 && attentionEntries.length === 0 && verifiedEntries.length > 0

  const openEntry = (entry: WhtReceiptQueueEntry) => {
    const isActionable = entry.status === 'untracked' || entry.status === 'pending' || entry.status === 'requested' || entry.status === 'received'
    if (isActionable) {
      setExpandedEntryId((current) => (current === entry.id ? null : entry.id))
      return
    }
    setSelectedEntry(entry)
    setDraftStatus(entry.receipt?.receipt_status || 'pending')
    setDraftReceiptNumber(entry.receipt?.receipt_number || '')
    setDraftNotes(entry.receipt?.notes || '')
  }

  const closeSheet = () => {
    setSelectedEntry(null)
    setDraftStatus('pending')
    setDraftReceiptNumber('')
    setDraftNotes('')
  }

  const handleMatcherComplete = (receipt: WhtReceipt) => {
    setLocalReceipts((current) => {
      const exists = current.some((r) => r.id === receipt.id)
      if (exists) {
        return current.map((r) => (r.id === receipt.id ? receipt : r))
      }
      return [...current, receipt]
    })
    setExpandedEntryId(null)
    onReceiptsChanged?.()
  }

  async function initializeRecord(payment: WhtPaymentRecord) {
    try {
      setProcessingId(payment.id)
      const nextWhtAmount = payment.wht_amount == null ? null : Number(payment.wht_amount)
      const newRecord: Partial<WhtReceipt> = {
        payment_id: payment.id,
        invoice_id: payment.invoice_id,
        client_name: payment.client_name,
        wht_amount: Number.isFinite(nextWhtAmount) ? nextWhtAmount : null,
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
        setLocalReceipts((current) => [...current, data])
        onReceiptsChanged?.()
        feedback.success('WHT tracking initialized')
        return data
      }
    } catch (error: any) {
      feedback.error(getUserFacingMutationMessage(error, { action: 'create' }))
    } finally {
      setProcessingId(null)
    }

    return null
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
        setLocalReceipts((current) => current.map((row) => (row.id === data.id ? data : row)))
        onReceiptsChanged?.()
        feedback.success('Receipt updated')
        return data
      }
    } catch (error: any) {
      feedback.error(getUserFacingMutationMessage(error, { action: 'update' }))
    } finally {
      setProcessingId(null)
    }

    return null
  }

  const handleSave = async () => {
    if (!selectedEntry) return

    if (!selectedEntry.receipt) {
      const created = await initializeRecord(selectedEntry.payment)
      if (!created) return

      setSelectedEntry({
        ...selectedEntry,
        id: created.id,
        status: created.receipt_status,
        actionLabel: 'Update receipt',
        receipt: created,
      })
      setDraftStatus(created.receipt_status)
      setDraftReceiptNumber(created.receipt_number || '')
      setDraftNotes(created.notes || '')
      return
    }

    const nextReceiptNumber = draftReceiptNumber.trim() || null
    const nextNotes = draftNotes.trim() || null
    const updates: Partial<WhtReceipt> = {}

    if (draftStatus !== selectedEntry.receipt.receipt_status) {
      updates.receipt_status = draftStatus
    }
    if (nextReceiptNumber !== (selectedEntry.receipt.receipt_number || null)) {
      updates.receipt_number = nextReceiptNumber
    }
    if (nextNotes !== (selectedEntry.receipt.notes || null)) {
      updates.notes = nextNotes
    }

    if (Object.keys(updates).length === 0) {
      closeSheet()
      return
    }

    const updated = await updateRecord(selectedEntry.receipt, updates)
    if (!updated) return
    closeSheet()
  }

  if (loading) {
    return (
      <Card className="border-bd-border bg-bd-surface-muted">
        <CardContent className="flex items-center gap-2 p-6 text-sm text-bd-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading WHT records...
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h3 className="flex items-center gap-2 text-sm font-bold text-bd-text">
            <ReceiptIcon className="h-4 w-4 text-bd-status-danger-text" />
            WHT Receipts
          </h3>
          <p className="text-sm text-bd-text-muted">
            Track missing, requested, received, and verified withholding tax evidence.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setImportOpen(true)}
          className="h-9 shrink-0 rounded-[var(--bd-radius-lg)] px-4 text-[10px] font-black uppercase tracking-[0.18em]"
        >
          <FileJson className="h-3 w-3 mr-1.5" />
          Import JSON
        </Button>
      </div>

      <WhtReceiptStatusStrip counts={counts} />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-sm font-bold text-bd-text">Attention Queue</h4>
          <p className="mt-1 text-xs text-bd-text-muted">
            Untracked payments and follow-up receipts are ordered ahead of cleared evidence.
          </p>
        </div>
        {counts.pending > 0 ? (
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-bd-text-muted">
            {counts.pending} pending in follow-up
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        {whtPayments.length === 0 && localReceipts.length === 0 ? (
          <div className="rounded-[var(--bd-radius-lg)] border border-dashed border-bd-border bg-bd-card-bg px-4 py-10 text-center">
            <p className="text-sm font-bold text-bd-text">No WHT receipt tracking yet.</p>
            <p className="mt-2 text-sm text-bd-text-muted">
              WHT receipt actions will appear here when payments include WHT deductions.
            </p>
          </div>
        ) : (
          <>
            {showTrackedSuccessState ? (
              <div className="rounded-[var(--bd-radius-lg)] border border-bd-status-success-border bg-bd-status-success-bg px-4 py-4">
                <p className="text-sm font-bold text-bd-status-success-text">All WHT receipts are tracked.</p>
                <p className="mt-1 text-sm text-bd-status-success-text">
                  No missing or requested receipts need attention.
                </p>
              </div>
            ) : null}

            {attentionEntries.length > 0 ? (
              <div className="space-y-3">
                {attentionEntries.map((entry) => (
                  <div key={entry.id}>
                    <WhtReceiptQueueRow
                      entry={entry}
                      onOpen={openEntry}
                      processing={processingId === entry.payment.id}
                    />
                    {expandedEntryId === entry.id ? (
                      <WhtReceiptMatcherAction
                        entry={entry}
                        onComplete={handleMatcherComplete}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {verifiedEntries.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between pt-2">
                  <h5 className="text-[10px] font-black uppercase tracking-[0.18em] text-bd-text-muted">
                    Verified receipts
                  </h5>
                  <span className="text-[10px] font-bold text-bd-text-muted">{verifiedEntries.length} cleared</span>
                </div>
                {verifiedEntries.map((entry) => (
                  <WhtReceiptQueueRow
                    key={entry.id}
                    entry={entry}
                    onOpen={openEntry}
                    processing={processingId === entry.payment.id}
                  />
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>

      <Sheet open={!!selectedEntry} onOpenChange={(open) => !open && closeSheet()}>
        <SheetContent
          side={isMobile ? 'bottom' : 'right'}
          className="flex h-full w-full max-w-full flex-col overflow-hidden bg-bd-card-bg p-0 sm:max-w-xl"
        >
          {selectedEntry ? (
            <>
              <SheetHeader className="border-b border-bd-border">
                <SheetTitle>WHT Receipt Detail</SheetTitle>
                <SheetDescription>
                  Review payment context, update receipt status, and manage evidence notes.
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-5 py-5">
                <div className="space-y-5">
                  <div className="rounded-[var(--bd-radius-lg)] border border-bd-border bg-bd-surface p-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-bd-text-muted">Client</p>
                        <p className="mt-1 text-sm font-semibold text-bd-text">
                          {selectedEntry.payment.client_name || selectedEntry.receipt?.client_name || 'Unknown client'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-bd-text-muted">Invoice</p>
                        <div className="mt-1 text-sm font-semibold text-bd-text">
                          {selectedEntry.payment.invoice_id ? (
                            <Link
                              to={`/invoices/${selectedEntry.payment.invoice_id}`}
                              className="transition-colors hover:text-bd-button-primary-bg hover:underline"
                            >
                              {selectedEntry.payment.invoice_number || 'Invoice record'}
                            </Link>
                          ) : (
                            selectedEntry.payment.invoice_number || 'Payment-linked WHT'
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-bd-text-muted">Payment date</p>
                        <p className="mt-1 text-sm font-semibold text-bd-text">
                          {selectedEntry.payment.date ? formatDisplayDate(selectedEntry.payment.date) : 'No payment date'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-bd-text-muted">WHT amount</p>
                        <p className="mt-1 text-sm font-black text-bd-status-danger-text">
                          {formatNaira(selectedEntry.payment.wht_amount)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-[var(--bd-radius-lg)] border border-bd-border bg-bd-card-bg p-4">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-bd-text-muted">Current receipt status</Label>
                      {selectedEntry.receipt ? (
                        <div className="flex flex-wrap gap-2">
                          {(['pending', 'requested', 'received', 'verified'] as WhtReceiptStatus[]).map((status) => (
                            <Button
                              key={status}
                              type="button"
                              variant={draftStatus === status ? 'default' : 'outline'}
                              className="h-8 rounded-full px-3 text-[10px] font-black uppercase tracking-[0.18em]"
                              onClick={() => setDraftStatus(status)}
                              disabled={processingId === selectedEntry.payment.id}
                            >
                              {status}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-[var(--bd-radius-lg)] border border-bd-status-warning-border bg-bd-status-warning-bg px-3 py-3 text-sm text-bd-status-warning-text">
                          Initializing tracking will create a pending receipt record for this payment.
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="wht-receipt-number" className="text-[11px] font-bold text-bd-text-muted">
                        Receipt reference / number
                      </Label>
                      <Input
                        id="wht-receipt-number"
                        value={draftReceiptNumber}
                        onChange={(event) => setDraftReceiptNumber(event.target.value)}
                        placeholder="e.g. FIRS-12345"
                        disabled={!selectedEntry.receipt || processingId === selectedEntry.payment.id}
                        className="h-10"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="wht-receipt-notes" className="text-[11px] font-bold text-bd-text-muted">
                        Notes
                      </Label>
                      <Textarea
                        id="wht-receipt-notes"
                        value={draftNotes}
                        onChange={(event) => setDraftNotes(event.target.value)}
                        placeholder="Add follow-up notes..."
                        disabled={!selectedEntry.receipt || processingId === selectedEntry.payment.id}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <SheetFooter className="border-t border-bd-border bg-bd-card-bg pb-[calc(1rem+env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
                <SheetClose asChild>
                  <Button variant="outline" className="h-10 sm:min-w-28">
                    Cancel
                  </Button>
                </SheetClose>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={processingId === selectedEntry.payment.id}
                  className="h-10 sm:min-w-36"
                >
                  {!selectedEntry.receipt
                    ? 'Initialize tracking'
                    : processingId === selectedEntry.payment.id
                      ? 'Saving...'
                      : 'Save changes'}
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

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
