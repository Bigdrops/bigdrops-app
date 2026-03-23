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
import { Textarea } from "@/components/ui/textarea"

type InvoiceSummary = {
  id: string
  invoice_number: string
  client_name?: string
  total: number
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
    const loadPreviousSettled = async () => {
      setLoadingBalance(true)
      const { data, error } = await supabase
        .from("payments")
        .select("cash_amount,wht_amount")
        .eq("invoice_id", invoice.id)
        .is("voided_at", null)

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
      setLoadingBalance(false)
    }

    setForm(DEFAULT_FORM())
    setError("")
    void loadPreviousSettled()

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
    }

    const { error: insertError } = await supabase.from("payments").insert(payload)
    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    const { data: financialRow, error: financialError } = await supabase
      .from("invoice_financials_v")
      .select("*")
      .eq("id", invoice.id)
      .single<FinancialRow>()

    if (financialError) {
      setError(financialError.message)
      setSaving(false)
      return
    }

    const { error: statusError } = await supabase
      .from("invoices")
      .update({ status: financialRow?.computed_status || "draft" })
      .eq("id", invoice.id)

    if (statusError) {
      setError(statusError.message)
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
      <DialogContent className="max-h-[85vh] max-w-[440px] overflow-y-auto rounded-2xl bg-white p-0 sm:max-w-[440px]">
        <DialogHeader className="border-b border-slate-100 px-5 py-4">
          <DialogTitle className="text-[17px] text-slate-900">Record Payment</DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Save a payment for {invoice.invoice_number}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4">
          <div
            style={{
              backgroundColor: "#F0FDF4",
              borderRadius: "10px",
              padding: "12px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Invoice Total</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{invoice.client_name || "No client name"}</div>
            </div>
            <div className="text-right text-base font-bold text-green-600">{formatMoney(invoice.total)}</div>
          </div>

          <div
            style={{
              backgroundColor: "#F8FAFC",
              borderRadius: "10px",
              padding: "12px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Current Balance</div>
            <div className="flex items-center gap-2 text-sm font-bold text-red-600">
              {loadingBalance ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
              {formatMoney(currentBalance)}
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Payment Type</div>
            <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200">
              {(["full", "partial"] as PaymentType[]).map((type) => {
                const active = form.type === type
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setField("type", type)}
                    style={{
                      padding: "10px",
                      backgroundColor: active ? "#16A34A" : "white",
                      color: active ? "white" : "#475569",
                      fontSize: "14px",
                      fontWeight: "700",
                      textTransform: "capitalize",
                    }}
                  >
                    {type === "full" ? "Full Payment" : "Partial Payment"}
                  </button>
                )
              })}
            </div>
          </div>

          {form.type === "partial" ? (
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Amount (₦)</div>
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
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Date</div>
              <Input type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} />
            </div>
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Payment Mode</div>
              <select
                value={form.method}
                onChange={(e) => setField("method", e.target.value as PaymentMethod)}
                style={{
                  width: "100%",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  fontSize: "14px",
                  backgroundColor: "white",
                  color: "#0f172a",
                }}
              >
                <option value="Transfer">Transfer</option>
                <option value="Cash">Cash</option>
                <option value="POS">POS</option>
                <option value="Cheque">Cheque</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Reference</div>
            <Input value={form.reference} onChange={(e) => setField("reference", e.target.value)} placeholder="Optional reference" />
          </div>

          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Notes</div>
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Optional note"
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium text-slate-500">Settlement</span>
              <span className="font-bold text-slate-900">{formatMoney(amountPaid)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-sm">
              <span className="font-medium text-slate-500">Remaining Balance</span>
              <span className={remainingBalance > 0 ? "font-bold text-red-600" : "font-bold text-green-600"}>
                {formatMoney(remainingBalance)}
              </span>
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
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
