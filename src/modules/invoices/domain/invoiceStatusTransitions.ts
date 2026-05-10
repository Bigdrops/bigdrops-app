import type { InvoiceFinancialState } from "@/domain/invoice/financialState"

export type InvoiceStatus = "unpaid" | "partially_paid" | "paid" | "cancelled" | "voided" | "archived"

const VALID_TRANSITIONS: Record<string, InvoiceStatus[]> = {
  unpaid: ["partially_paid", "paid", "cancelled", "voided"],
  partially_paid: ["paid", "cancelled", "voided"],
  paid: [],
  cancelled: [],
  voided: [],
  archived: [],
}

export function canTransitionTo(from: string, to: InvoiceStatus): boolean {
  return (VALID_TRANSITIONS[from] ?? []).includes(to)
}

export function resolveEffectiveStatus(invoiceStatus: string, financials: InvoiceFinancialState | null): string {
  if (financials?.paymentState) {
    return financials.paymentState
  }
  return invoiceStatus || "unpaid"
}

export type RevertOutcome =
  | { allowed: true }
  | { allowed: false; reason: string }

export function canRevertInvoice(
  financials: InvoiceFinancialState | null,
  archivedAt: string | null | undefined
): RevertOutcome {
  if (archivedAt) {
    return { allowed: false, reason: "Archived invoices cannot be reverted." }
  }
  if ((financials?.settledAmount ?? 0) > 0) {
    return { allowed: false, reason: "Cannot revert an invoice with recorded payments. Void payments first." }
  }
  return { allowed: true }
}

export function canDeleteInvoice(
  financials: InvoiceFinancialState | null,
  archivedAt: string | null | undefined
): RevertOutcome {
  if (archivedAt) {
    return { allowed: false, reason: "Archived invoices cannot be deleted." }
  }
  if ((financials?.settledAmount ?? 0) > 0) {
    return { allowed: false, reason: "Cannot delete an invoice with recorded payments. Void payments first." }
  }
  return { allowed: true }
}