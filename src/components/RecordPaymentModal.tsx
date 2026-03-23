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
}

type PaymentMethod = "Transfer" | "Cash" | "POS" | "Cheque" | "Other"
type WhtTypeOption = "Consulting" | "Services" | "Construction" | "Technical" | "Other"

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
  cash_amount: string
  wht_amount: string
  wht_rate: string
  wht_type: WhtTypeOption | ""
  date: string
  method: PaymentMethod
  reference: string
  notes: string
}

const DEFAULT_FORM = (): FormState => ({
  cash_amount: "",
  wht_amount: "",
  wht_rate: "",
  wht_type: "",
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

      if (!cancelled) {
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
    }

    setForm(DEFAULT_FORM())
    setError("")
    loadPreviousSettled()

    return () => {
      cancelled = true
    }
  }, [controlledOpen, invoice?.id])

  const cashAmount = Number(form.cash_amount || 0)
  const whtAmount = Number(form.wht_amount || 0)
  const totalSettlement = cashAmount + whtAmount
  const remainingBalance = Math.max(0, Number(invoice?.total || 0) - previousSettled - totalSettlement)
  const currentBalance = Math.max(0, Number(invoice?.total || 0) - previousSettled)

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const handleSave = async () => {
    setError("")

    if (!form.date) {
      setError("Payment date is required")
      return
    }

    if (totalSettlement <= 0) {
      setError("Cash received plus WHT deducted must be greater than 0")
      return
    }

    if (totalSettlement > currentBalance) {
      setError("Settlement cannot exceed the remaining balance")
      return
    }

    setSaving(true)
    const payload = {
      invoice_id: invoice.id,
      cash_amount: cashAmount,
      wht_amount: whtAmount,
      wht_rate: form.wht_rate === "" ? null : Number(form.wht_rate),
      wht_type: form.wht_type || null,
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
            Save a live payment entry for {invoice.invoice_number} and sync the invoice status from the financial view.
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
                  <div className="mt-1 text-base font-bold text-slate-900">{formatMoney(invoice.total)}</div>
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

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Cash Received (₦)</div>
              <Input
                type="number"
                min="0"
                value={form.cash_amount}
                onChange={(e) => setField("cash_amount", e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">WHT Deducted (₦)</div>
              <Input
                type="number"
                min="0"
                value={form.wht_amount}
                onChange={(e) => setField("wht_amount", e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">WHT Rate (%)</div>
              <Input
                type="number"
                min="0"
                value={form.wht_rate}
                onChange={(e) => setField("wht_rate", e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">WHT Type</div>
              <Select value={form.wht_type || "none"} onValueChange={(value) => setField("wht_type", value === "none" ? "" : (value as WhtTypeOption))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select WHT type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="Consulting">Consulting</SelectItem>
                  <SelectItem value="Services">Services</SelectItem>
                  <SelectItem value="Construction">Construction</SelectItem>
                  <SelectItem value="Technical">Technical</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
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

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Reference</div>
              <Input value={form.reference} onChange={(e) => setField("reference", e.target.value)} placeholder="Optional" />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Settlement</span>
                <Badge variant="outline">{formatMoney(totalSettlement)}</Badge>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Remaining Balance</span>
                <span className={`text-sm font-bold ${remainingBalance > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {formatMoney(remainingBalance)}
                </span>
              </div>
            </div>
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

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t border-slate-100 px-5 py-4">
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving || loadingBalance}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? "Saving..." : "Save Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
