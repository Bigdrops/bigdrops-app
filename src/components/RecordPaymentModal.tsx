import * as React from "react"
import { Loader2 } from "lucide-react"

import { supabase } from "../supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Textarea } from "@/components/ui/textarea"

type InvoiceSummary = {
  id: string
  invoice_number: string
  client_name?: string
  total: number
  wht?: number | null
}

type PaymentMethod = "Transfer" | "Cash" | "POS" | "Cheque" | "Other"

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
}

type InvoiceConfigRow = {
  total?: number | null
  wht?: number | null
}

const DEFAULT_FORM = (): FormState => ({
  amount: "",
  date: new Date().toISOString().split("T")[0] || "",
  method: "Transfer",
  reference: "",
  notes: "",
})

const formatMoney = (value: number) => `\u20A6${Number(value || 0).toLocaleString()}`

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
  const [invoiceTotal, setInvoiceTotal] = React.useState(Number(invoice.total || 0))
  const [invoiceWht, setInvoiceWht] = React.useState(Number(invoice.wht || 0))
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
    const loadContext = async () => {
      setLoadingBalance(true)

      const [paymentsResult, invoiceResult] = await Promise.all([
        supabase
          .from("payments")
          .select("cash_amount,wht_amount")
          .eq("invoice_id", invoice.id)
          .is("voided_at", null),
        supabase
          .from("invoices")
          .select("total,wht")
          .eq("id", invoice.id)
          .single<InvoiceConfigRow>(),
      ])

      if (cancelled) return

      if (paymentsResult.error) {
        setError(paymentsResult.error.message)
        setPreviousSettled(0)
      } else {
        const total = (paymentsResult.data || []).reduce(
          (sum, row) => sum + Number(row.cash_amount || 0) + Number(row.wht_amount || 0),
          0,
        )
        setPreviousSettled(total)
      }

      if (invoiceResult.error) {
        setError((current) => current || invoiceResult.error?.message || "")
        setInvoiceTotal(Number(invoice.total || 0))
        setInvoiceWht(Number(invoice.wht || 0))
      } else {
        setInvoiceTotal(Number(invoiceResult.data?.total ?? invoice.total ?? 0))
        setInvoiceWht(Number(invoiceResult.data?.wht ?? invoice.wht ?? 0))
      }

      setLoadingBalance(false)
    }

    setForm(DEFAULT_FORM())
    setError("")
    void loadContext()

    return () => {
      cancelled = true
    }
  }, [controlledOpen, invoice?.id, invoice.total, invoice.wht])

  const settlementAmount = Number(form.amount || 0)
  const proportionalWht = invoiceTotal > 0 && invoiceWht > 0
    ? Math.min(settlementAmount, (settlementAmount / invoiceTotal) * invoiceWht)
    : 0
  const whtAmount = Number(proportionalWht.toFixed(2))
  const cashAmount = Number(Math.max(0, settlementAmount - whtAmount).toFixed(2))
  const currentBalance = Math.max(0, Number(invoiceTotal || 0) - previousSettled)
  const remainingBalance = Math.max(0, Number(currentBalance - settlementAmount).toFixed(2))

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const handleSave = async () => {
    setError("")

    if (!form.date) {
      setError("Payment date is required")
      return
    }

    if (settlementAmount <= 0) {
      setError("Amount paid must be greater than 0")
      return
    }

    if (settlementAmount > currentBalance) {
      setError("Amount paid cannot exceed the remaining balance")
      return
    }

    setSaving(true)
    const payload = {
      invoice_id: invoice.id,
      cash_amount: cashAmount,
      wht_amount: whtAmount,
      wht_rate: null,
      wht_type: invoiceWht > 0 ? "Auto" : null,
      amount: cashAmount,
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
      <DialogContent className="max-w-lg rounded-2xl p-0">
        <DialogHeader className="border-b border-slate-100 px-5 py-4">
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Save a payment for {invoice.invoice_number}. WHT is calculated automatically from the invoice.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4">
          <Card className="rounded-2xl border-slate-200 shadow-none">
            <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Invoice</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{invoice.invoice_number}</div>
                <div className="mt-1 text-xs text-slate-500">{invoice.client_name || "No client name"}</div>
              </div>
              <div className="grid gap-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Invoice Total</div>
                  <div className="mt-1 text-base font-bold text-slate-900">{formatMoney(invoiceTotal)}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Current Balance</div>
                    {loadingBalance ? <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" /> : null}
                  </div>
                  <div className="mt-1 text-base font-bold text-red-600">{formatMoney(currentBalance)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Amount Paid (\u20A6)</div>
            <Input
              type="number"
              min="0"
              value={form.amount}
              onChange={(e) => setField("amount", e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Payment Date</div>
              <Input type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} />
            </div>
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Payment Method</div>
              <Select value={form.method} onValueChange={(value) => setField("method", value as PaymentMethod)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
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

          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Reference</div>
            <Input value={form.reference} onChange={(e) => setField("reference", e.target.value)} placeholder="Optional" />
          </div>

          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Notes</div>
            <Textarea
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Optional payment note"
              rows={4}
            />
          </div>

          <Card className="rounded-2xl border-slate-200 bg-slate-50 shadow-none">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Settlement</span>
                <Badge variant="outline">{formatMoney(settlementAmount)}</Badge>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-500">Auto WHT</span>
                <span className="font-semibold text-slate-900">{formatMoney(whtAmount)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-500">Cash Applied</span>
                <span className="font-semibold text-slate-900">{formatMoney(cashAmount)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-500">Remaining Balance</span>
                <span className={remainingBalance > 0 ? "font-bold text-red-600" : "font-bold text-emerald-600"}>
                  {formatMoney(remainingBalance)}
                </span>
              </div>
            </CardContent>
          </Card>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t border-slate-100 px-5 py-4">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || loadingBalance}
              className="w-full sm:min-w-[180px]"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {saving ? "Saving..." : "Save Payment"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
