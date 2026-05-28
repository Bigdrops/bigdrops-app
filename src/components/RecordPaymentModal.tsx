import * as React from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { NumericInput } from "@/components/ui/numeric-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getUserFacingMutationMessage } from "@/lib/userFacingMutationErrors"
import { Textarea } from "@/components/ui/textarea"
import { feedback } from "@/lib/feedback"
import {
  getPaymentEntrySummary,
  validatePaymentEntry,
} from "@/components/invoice/paymentEntryHelpers"
import { loadBankAccountsList, calculatePreviousSettled, recordInvoicePayment } from "@/modules/invoices/services/paymentService"
import type { BankAccountSummary } from "@/modules/invoices/types/paymentTypes"
import type { PaymentMethod } from "@/modules/invoices/types/paymentTypes"

type InvoiceSummary = {
  id: string
  invoice_number: string
  client_name?: string
  total: number
  wht?: number | string | null
}

type BankAccount = BankAccountSummary

type RecordPaymentModalProps = {
  invoice: InvoiceSummary
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void | Promise<void>
  onClose?: () => void
  onSaved?: () => void | Promise<void>
}

type FormState = {
  cashReceived: number | null
  date: string
  method: PaymentMethod
  reference: string
  notes: string
}

const DEFAULT_FORM = (): FormState => ({
  cashReceived: null,
  date: new Date().toISOString().split("T")[0] || "",
  method: "Transfer",
  reference: "",
  notes: "",
})

const formatMoney = (value: number) => `₦${Number(value || 0).toLocaleString()}`

export default function RecordPaymentModal({
  invoice,
  open,
  onOpenChange,
  onSuccess,
  onClose,
  onSaved,
}: RecordPaymentModalProps) {
  const controlledOpen = open ?? true
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM)
  const [previousSettled, setPreviousSettled] = React.useState(0)
  const [bankAccounts, setBankAccounts] = React.useState<BankAccount[]>([])
  const [selectedBankId, setSelectedBankId] = React.useState("")
  const [loadingBalance, setLoadingBalance] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState("")
  const [submitAttempted, setSubmitAttempted] = React.useState(false)

  const invoiceHasWht = Number(invoice?.wht || 0) > 0

  const close = React.useCallback(() => {
    onOpenChange?.(false)
    onClose?.()
  }, [onClose, onOpenChange])

  React.useEffect(() => {
    if (!controlledOpen || !invoice?.id) return

    let cancelled = false
    const loadModalData = async () => {
      setLoadingBalance(true)
      const [previousSettledValue, bankAccountsData] = await Promise.all([
        calculatePreviousSettled(invoice.id),
        loadBankAccountsList(),
      ])

      if (cancelled) return

      setPreviousSettled(previousSettledValue)
      const nextBanks = bankAccountsData as BankAccount[]
      setBankAccounts(nextBanks)
      setSelectedBankId(nextBanks[0]?.id || "")
      setLoadingBalance(false)
    }

    setForm(DEFAULT_FORM())
    setError("")
    setSubmitAttempted(false)
    void loadModalData()

    return () => {
      cancelled = true
    }
  }, [controlledOpen, invoice?.id])

  const currentBalance = Math.max(0, Number(invoice?.total || 0) - previousSettled)
  const settlementSummary = getPaymentEntrySummary({
    balanceDue: currentBalance,
    cashReceived: form.cashReceived,
  })
  const validation = validatePaymentEntry({
    balanceDue: currentBalance,
    cashReceived: form.cashReceived,
  })
  const amountError = submitAttempted ? validation.message : ""
  const amountFieldHasError = submitAttempted && Boolean(amountError || validation.cashError)

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const applyMax = React.useCallback(() => {
    setForm((current) => ({ ...current, cashReceived: Math.round(currentBalance * 100) / 100 }))
  }, [currentBalance])

  const showValidationError = React.useCallback((message: string) => {
    setError(message)
    feedback.error(message)
  }, [])

  const handleSave = async () => {
    setError("")
    setSubmitAttempted(true)

    if (!form.date) {
      showValidationError("Payment date is required")
      return
    }

    if (!validation.isValid) {
      showValidationError(validation.message)
      return
    }

    setSaving(true)

    const result = await recordInvoicePayment({
      invoiceId: invoice.id,
      settlement: {
        cashReceived: settlementSummary.cashReceived,
        whtDeducted: 0,
        settlementTotal: settlementSummary.settlementTotal,
        remainingBalance: settlementSummary.remainingBalance,
      },
      date: form.date,
      method: form.method,
      reference: form.reference,
      notes: form.notes,
      bankAccountId: form.method === "Transfer" && selectedBankId ? selectedBankId : null,
    })

    if (!result.success) {
      setError(result.error || getUserFacingMutationMessage(null, { action: 'record' }))
      setSaving(false)
      return
    }

    await onSuccess?.()
    await onSaved?.()
    setSaving(false)
    close()
  }

  return (
    <Dialog open={controlledOpen} onOpenChange={(next) => (next ? onOpenChange?.(next) : close())}>
      <DialogContent className="flex max-h-[90vh] max-w-[440px] flex-col overflow-hidden rounded-[var(--bd-radius-xl)] bg-card p-0 sm:max-w-[440px]">
        <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
          <DialogTitle className="border-l-4 border-bd-status-success-border pl-3 text-[17px] text-foreground">Record Payment</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Save a payment for {invoice.invoice_number}.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(100vh-12rem)] flex-1 space-y-4 overflow-y-auto px-5 py-4 pr-1">
          <div
            className="flex items-center justify-between gap-3 rounded-[var(--bd-radius-md)] border-l-4 border-bd-status-success-border bg-bd-status-success-bg px-4 py-3"
          >
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Invoice Total</div>
              <div className="mt-1 text-sm font-semibold text-foreground">{invoice.client_name || "No client name"}</div>
            </div>
            <div className="text-right text-base font-bold text-bd-status-success-text">{formatMoney(invoice.total)}</div>
          </div>

          <div
            className="flex items-center justify-between gap-3 rounded-[var(--bd-radius-md)] border-l-4 border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.08)] px-4 py-3"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Current Balance</div>
            <div className="flex items-center gap-2 text-sm font-bold text-[hsl(var(--destructive))]">
              {loadingBalance ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
              {formatMoney(currentBalance)}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Cash Received (₦)</div>
            <NumericInput
              min={0}
              className={amountFieldHasError ? "border-[hsl(var(--bd-feedback-error-border))] ring-2 ring-[hsl(var(--bd-feedback-error-border)/0.15)]" : undefined}
              value={form.cashReceived}
              onChange={(val) => setField("cashReceived", val)}
              placeholder="Enter amount"
            />
            <button
              type="button"
              onClick={applyMax}
              className="flex w-full items-center justify-center gap-2 rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-button-primary-bg)/0.3)] bg-[hsl(var(--bd-button-primary-bg)/0.1)] px-4 py-3 text-sm font-bold text-bd-button-primary-bg transition-colors hover:bg-[hsl(var(--bd-button-primary-bg)/0.18)]"
            >
              Pay Full Balance ({formatMoney(currentBalance)})
            </button>
            {submitAttempted && validation.cashError ? (
              <div className="text-xs font-semibold text-[hsl(var(--bd-feedback-error-text))]">
                {validation.cashError}
              </div>
            ) : null}
            {amountError ? (
              <div className="rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-feedback-error-border))] bg-[hsl(var(--bd-feedback-error-bg))] px-3 py-2 text-xs font-semibold text-[hsl(var(--bd-feedback-error-text))]">
                {amountError}
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Date</div>
              <Input type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} />
            </div>
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Payment Mode</div>
              <Select value={form.method} onValueChange={(value) => setField("method", value as PaymentMethod)}>
                <SelectTrigger className="w-full border-border bg-background">
                  <SelectValue placeholder="Select payment mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Transfer">Transfer</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="POS">POS</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.method === "Transfer" ? (
            <div className="space-y-1.5 rounded-[var(--bd-radius-lg)] border border-border bg-bd-surface-muted px-4 py-3">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Received Into Account</label>
              <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                <SelectTrigger className="w-full border-border bg-background">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {(b.bank_name || "Bank") + " — " + (b.account_number || "No account")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Reference</div>
            <Input value={form.reference} onChange={(e) => setField("reference", e.target.value)} placeholder="Optional reference" />
          </div>

          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Notes</div>
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Optional note"
            />
          </div>

          <div className="rounded-[var(--bd-radius-lg)] border border-border bg-[hsl(var(--bd-surface)/0.92)] px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium text-muted-foreground">Cash Received</span>
              <span className="font-bold text-foreground">{formatMoney(settlementSummary.cashReceived)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-sm">
              <span className="font-medium text-muted-foreground">Remaining Balance</span>
              <span className={settlementSummary.remainingBalance > 0 ? "font-bold text-[hsl(var(--destructive))]" : "font-bold text-bd-status-success-text"}>
                {formatMoney(settlementSummary.remainingBalance)}
              </span>
            </div>
          </div>

          {invoiceHasWht ? (
            <div className="rounded-[var(--bd-radius-lg)] border border-bd-status-warning-border bg-bd-status-warning-bg px-4 py-3 text-xs text-bd-status-warning-text">
              <span className="font-bold">💡 WHT Tracking Enabled:</span>{" "}
              This invoice contains configured WHT. Verify and track the tax credit receipt within the Compliance Hub once this settlement is completed.
            </div>
          ) : null}
        </div>

        <div className="shrink-0 space-y-3 border-t border-border bg-card px-5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-3">
          {error ? (
            <div className="rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-feedback-error-border))] bg-[hsl(var(--bd-feedback-error-bg))] px-3 py-2 text-xs font-semibold text-[hsl(var(--bd-feedback-error-text))]">
              {error}
            </div>
          ) : null}

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={close}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || loadingBalance}
              className="flex-1 bg-bd-button-primary-bg text-bd-button-primary-text hover:bg-[hsl(var(--bd-button-primary-hover-bg))]"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {saving ? "Saving..." : "Record Payment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
