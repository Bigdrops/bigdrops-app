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
  buildFullPaymentPreset,
  getPaymentEntrySummary,
  validatePaymentEntry,
} from "@/components/invoice/paymentEntryHelpers"
import { loadBankAccountsList, calculatePreviousSettled, recordInvoicePayment } from "@/modules/invoices/services/paymentService"
import type { BankAccountSummary } from "@/modules/invoices/types/paymentTypes"
import type { PaymentMethod, PaymentType } from "@/modules/invoices/types/paymentTypes"

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
  type: PaymentType
}

const DEFAULT_FORM = (): FormState => ({
  cashReceived: null,
  date: new Date().toISOString().split("T")[0] || "",
  method: "Transfer",
  reference: "",
  notes: "",
  type: "full",
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

  React.useEffect(() => {
    if (!controlledOpen || loadingBalance) return
    setForm((current) => {
      if (current.type !== "full") return current
      if (current.cashReceived !== null) return current
      return {
        ...current,
        ...buildFullPaymentPreset(currentBalance),
      }
    })
  }, [controlledOpen, currentBalance, loadingBalance])

  const applyFullPaymentPreset = React.useCallback(() => {
    setForm((current) => ({
      ...current,
      type: "full",
      ...buildFullPaymentPreset(currentBalance),
    }))
  }, [currentBalance])

  const applyPartialPaymentPreset = React.useCallback(() => {
    setForm((current) => ({
      ...current,
      type: "partial",
      cashReceived: current.cashReceived ?? null,
    }))
  }, [])

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
      <DialogContent className="max-h-[85vh] max-w-[440px] overflow-y-auto rounded-[var(--bd-radius-xl)] bg-card p-0 sm:max-w-[440px]">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="border-l-4 border-emerald-500 pl-3 text-[17px] text-foreground">Record Payment</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Save a payment for {invoice.invoice_number}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4">
          <div
            className="flex items-center justify-between gap-3 rounded-[var(--bd-radius-md)] border-l-4 border-[hsl(var(--bd-status-success-border))] bg-[hsl(var(--bd-status-success-bg))] px-4 py-3"
          >
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Invoice Total</div>
              <div className="mt-1 text-sm font-semibold text-foreground">{invoice.client_name || "No client name"}</div>
            </div>
            <div className="text-right text-base font-bold text-[hsl(var(--bd-status-success-text))]">{formatMoney(invoice.total)}</div>
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

          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Payment Type</div>
            <div className="grid grid-cols-2 overflow-hidden rounded-[var(--bd-radius-lg)] border border-border">
              {(["full", "partial"] as PaymentType[]).map((type) => {
                const active = form.type === type
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={type === "full" ? applyFullPaymentPreset : applyPartialPaymentPreset}
                    className={`px-2.5 py-2.5 text-sm font-bold capitalize transition-colors ${
                      active ? "bg-emerald-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {type === "full" ? "Full Payment" : "Partial Payment"}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Cash Received</div>
              <button
                type="button"
                onClick={applyFullPaymentPreset}
                className="text-xs font-semibold text-[hsl(var(--bd-button-primary-bg))] transition-colors hover:text-[hsl(var(--bd-button-primary-hover-bg))]"
              >
                Use balance as cash
              </button>
            </div>
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Cash Received (₦)</div>
              <NumericInput
                min={0}
                className={amountFieldHasError ? "border-[hsl(var(--bd-feedback-error-border))] ring-2 ring-[hsl(var(--bd-feedback-error-border)/0.15)]" : undefined}
                value={form.cashReceived}
                onChange={(val) => setField("cashReceived", val)}
                placeholder="Enter cash received"
              />
              {submitAttempted && validation.cashError ? (
                <div className="mt-2 text-xs font-semibold text-[hsl(var(--bd-feedback-error-text))]">
                  {validation.cashError}
                </div>
              ) : null}
            </div>
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
                <SelectTrigger className="w-full border-blue-200 bg-background">
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
            <div className="space-y-1.5 rounded-[var(--bd-radius-lg)] border-l-4 border-emerald-500 bg-emerald-50 px-4 py-3">
              <label className="text-sm font-medium text-slate-700">Received Into Account</label>
              <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                <SelectTrigger className="w-full border-emerald-200 bg-background">
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

          <div className="sticky bottom-0 -mx-5 mt-2 space-y-3 border-t border-border/70 bg-card/95 px-5 pb-4 pt-3 backdrop-blur">
            <div className="rounded-[var(--bd-radius-lg)] border-l-4 border-emerald-500 bg-emerald-50 px-4 py-3 shadow-sm">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium text-muted-foreground">Cash Received</span>
                <span className="font-bold text-foreground">{formatMoney(settlementSummary.cashReceived)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                <span className="font-medium text-muted-foreground">Remaining Balance</span>
                <span className={settlementSummary.remainingBalance > 0 ? "font-bold text-red-600" : "font-bold text-green-600"}>
                  {formatMoney(settlementSummary.remainingBalance)}
                </span>
              </div>
            </div>

            {invoiceHasWht ? (
              <div className="rounded-[var(--bd-radius-lg)] border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                <span className="font-bold">💡 WHT Tracking Enabled:</span>{" "}
                This invoice contains configured WHT. Ensure you verify and track the tax credit receipt within the Compliance Hub dashboard once this payment settlement is completed.
              </div>
            ) : null}

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
                className="flex-1 bg-green-600 text-white hover:bg-green-700"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {saving ? "Saving..." : "Record Payment"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
