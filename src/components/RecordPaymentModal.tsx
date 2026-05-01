import * as React from "react"
import { Loader2 } from "lucide-react"

import { supabase } from "../supabase"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getUserFacingMutationMessage } from "@/lib/userFacingMutationErrors"
import { Textarea } from "@/components/ui/textarea"

type InvoiceSummary = {
  id: string
  invoice_number: string
  client_name?: string
  total: number
}

type BankAccount = {
  id: string
  bank_name?: string | null
  account_number?: string | null
  is_default?: boolean | null
}

type PaymentMethod = "Transfer" | "Cash" | "POS" | "Cheque" | "Other"
type PaymentType = "full" | "partial"

type RecordPaymentModalProps = {
  invoice: InvoiceSummary
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void | Promise<void>
  onClose?: () => void
  onSaved?: () => void | Promise<void>
}

type FinancialRow = {
  computed_status?: string | null
}

type FormState = {
  amount: string
  date: string
  method: PaymentMethod
  reference: string
  notes: string
  type: PaymentType
}

const DEFAULT_FORM = (): FormState => ({
  amount: "",
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

  const close = React.useCallback(() => {
    onOpenChange?.(false)
    onClose?.()
  }, [onClose, onOpenChange])

  React.useEffect(() => {
    if (!controlledOpen || !invoice?.id) return

    let cancelled = false
    const loadModalData = async () => {
      setLoadingBalance(true)
      const [{ data, error }, { data: bankData, error: bankError }] = await Promise.all([
        supabase
          .from("payments")
          .select("cash_amount,wht_amount")
          .eq("invoice_id", invoice.id)
          .is("voided_at", null),
        supabase
          .from("bank_accounts")
          .select("*")
          .order("is_default", { ascending: false }),
      ])

      if (cancelled) return

      if (error) {
        setError(error.message)
        setPreviousSettled(0)
      } else {
        const total = (data || []).reduce(
          (sum, row) => sum + Number(row.cash_amount || 0) + Number(row.wht_amount || 0),
          0,
        )
        setPreviousSettled(total)
      }
      if (bankError) {
        setError((current) => current || bankError.message)
        setBankAccounts([])
        setSelectedBankId("")
      } else {
        const nextBanks = (bankData || []) as BankAccount[]
        setBankAccounts(nextBanks)
        setSelectedBankId(nextBanks[0]?.id || "")
      }
      setLoadingBalance(false)
    }

    setForm(DEFAULT_FORM())
    setError("")
    void loadModalData()

    return () => {
      cancelled = true
    }
  }, [controlledOpen, invoice?.id])

  const currentBalance = Math.max(0, Number(invoice?.total || 0) - previousSettled)
  const amountPaid = form.type === "full" ? currentBalance : Number(form.amount || 0)
  const remainingBalance = Math.max(0, currentBalance - amountPaid)

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const handleSave = async () => {
    setError("")

    if (!form.date) {
      setError("Payment date is required")
      return
    }

    if (amountPaid <= 0) {
      setError("Amount paid must be greater than 0")
      return
    }

    if (amountPaid > currentBalance) {
      setError("Amount paid cannot exceed the remaining balance")
      return
    }

    setSaving(true)
    const payload = {
      invoice_id: invoice.id,
      cash_amount: amountPaid,
      wht_amount: 0,
      wht_rate: null,
      wht_type: null,
      amount: amountPaid,
      date: form.date,
      method: form.method,
      reference: form.reference || null,
      notes: form.notes || null,
      source: "live",
      bank_account_id: form.method === "Transfer" && selectedBankId ? selectedBankId : null,
    }

    const { error: insertError } = await supabase.from("payments").insert(payload)
    if (insertError) {
      setError(getUserFacingMutationMessage(insertError, { action: 'record' }))
      setSaving(false)
      return
    }

    const { data: financialRow, error: financialError } = await supabase
      .from("invoice_financials_v")
      .select("*")
      .eq("id", invoice.id)
      .single<FinancialRow>()

    if (financialError) {
      setError(getUserFacingMutationMessage(financialError, { action: 'record' }))
      setSaving(false)
      return
    }

    const { error: statusError } = await supabase
      .from("invoices")
      .update({ status: financialRow?.computed_status || "unpaid" })
      .eq("id", invoice.id)

    if (statusError) {
      setError(getUserFacingMutationMessage(statusError, { action: 'record' }))
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
            className="flex items-center justify-between gap-3 rounded-[var(--bd-radius-md)] border-l-4 border-emerald-600 bg-emerald-50 px-4 py-3"
          >
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Invoice Total</div>
              <div className="mt-1 text-sm font-semibold text-foreground">{invoice.client_name || "No client name"}</div>
            </div>
            <div className="text-right text-base font-bold text-green-600">{formatMoney(invoice.total)}</div>
          </div>

          <div
            className="flex items-center justify-between gap-3 rounded-[var(--bd-radius-md)] border-l-4 border-blue-600 bg-blue-50 px-4 py-3"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Current Balance</div>
            <div className="flex items-center gap-2 text-sm font-bold text-red-600">
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
                    onClick={() => setField("type", type)}
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

          {form.type === "partial" ? (
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Amount (₦)</div>
              <Input
                type="number"
                min="0"
                value={form.amount}
                onChange={(e) => setField("amount", e.target.value)}
                placeholder="Enter amount"
              />
            </div>
          ) : null}

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

          <div className="rounded-[var(--bd-radius-lg)] border-l-4 border-emerald-500 bg-emerald-50 px-4 py-3">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium text-muted-foreground">Settlement</span>
              <span className="font-bold text-foreground">{formatMoney(amountPaid)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-sm">
              <span className="font-medium text-muted-foreground">Remaining Balance</span>
              <span className={remainingBalance > 0 ? "font-bold text-red-600" : "font-bold text-green-600"}>
                {formatMoney(remainingBalance)}
              </span>
            </div>
          </div>

          {error ? (
            <div className="rounded-[var(--bd-radius-lg)] bg-red-600 px-3 py-2 text-xs text-white">
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
      </DialogContent>
    </Dialog>
  )
}
