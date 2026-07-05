import { formatDisplayDate, formatDisplayTime } from "@/lib/formatters/date"
import { formatNaira } from "@/lib/formatters/money"

export interface PaymentHistoryRowViewModel {
  id: string
  amount: number
  formattedAmount: string
  date: string
  time: string
  method: string
  paymentMethodLabel: string
  reference: string | null
  notes: string | null
  hasReference: boolean
  hasNotes: boolean
  voidedAt: string | null
  isVoided: boolean
  statusLabel: string
  statusVariant: "voided" | "completed" | "pending"
}

export function buildPaymentHistoryRowViewModels(rawPayments: any[]): PaymentHistoryRowViewModel[] {
  return rawPayments.map((p) => {
    const method = p.method ?? ""
    const isVoided = Boolean(p.voided_at)

    return {
      id: p.id ?? "",
      amount: Number(p.cash_amount ?? 0),
      formattedAmount: formatNaira(p.cash_amount ?? 0),
      date: formatDisplayDate(p.date),
      time: p.created_at ? formatDisplayTime(p.created_at) : "",
      method,
      paymentMethodLabel: method ? `${method} Payment` : "Payment Received",
      reference: p.reference ?? null,
      notes: p.notes ?? null,
      hasReference: Boolean(p.reference),
      hasNotes: Boolean(p.notes),
      voidedAt: p.voided_at ?? null,
      isVoided,
      statusLabel: isVoided ? "Voided" : "Completed",
      statusVariant: isVoided ? "voided" : "completed",
    }
  })
}
