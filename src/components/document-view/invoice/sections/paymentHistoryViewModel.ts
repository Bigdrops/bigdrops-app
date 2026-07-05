import { formatDisplayDate, formatDisplayTime } from "@/lib/formatters/date"

export interface PaymentHistoryRowViewModel {
  id: string
  amount: number
  date: string
  time?: string
  method: string
  reference: string | null
  notes: string | null
  voidedAt: string | null
}

export function buildPaymentHistoryRowViewModels(rawPayments: any[]): PaymentHistoryRowViewModel[] {
  return rawPayments.map((p) => ({
    id: p.id ?? "",
    amount: Number(p.cash_amount ?? 0),
    date: formatDisplayDate(p.date),
    time: p.created_at ? formatDisplayTime(p.created_at) : undefined,
    method: p.method ?? "",
    reference: p.reference ?? null,
    notes: p.notes ?? null,
    voidedAt: p.voided_at ?? null,
  }))
}
