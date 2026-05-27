// ============================================================================
// INVOICE STATUS RESOLVER — Derived presentation layer
// Wraps calculateInvoiceFinancialState. NEVER uses raw invoice.status.
// OVERDUE is presentation-only metadata — never persisted.
// ============================================================================

import { calculateInvoiceFinancialState, type InvoiceStatusTone } from "./financialState"

export interface ResolvedInvoiceStatus {
  primary: string
  statusTone: InvoiceStatusTone
  display_labels: string[]
  display_classes: string[]
}

export function resolveInvoiceStatus(invoice: {
  total?: number | null
  status?: string | null
  payments?: any[]
  due_date?: string | null
}): ResolvedInvoiceStatus {
  const { displayStatus, statusTone } = calculateInvoiceFinancialState({
    invoiceTotal: Number(invoice.total || 0),
    status: invoice.status,
    payments: invoice.payments,
  })

  const primary = displayStatus

  // Guard clause: If there is no due date, it can never be overdue
  if (!invoice.due_date) {
    return {
      primary,
      statusTone,
      display_labels: [primary],
      display_classes: [toneToClassName(statusTone)],
    }
  }

  const normalizedNow = new Date()
  const normalizedDueDate = new Date(invoice.due_date)

  // Normalize hours to ensure clean calendar day comparisons
  normalizedNow.setHours(0, 0, 0, 0)
  normalizedDueDate.setHours(0, 0, 0, 0)

  // Safe case-insensitive validation guard
  const isPaid = primary.toUpperCase() === "PAID"
  const isOverdue = normalizedNow > normalizedDueDate && !isPaid

  const labels: string[] = isOverdue ? [primary, "OVERDUE"] : [primary]
  const classes: string[] = isOverdue
    ? [toneToClassName(statusTone), "bg-[hsl(var(--bd-status-danger-bg))] text-[hsl(var(--bd-status-danger-text))]"]
    : [toneToClassName(statusTone)]

  return {
    primary,
    statusTone,
    display_labels: labels,
    display_classes: classes,
  }
}

function toneToClassName(tone: InvoiceStatusTone): string {
  switch (tone) {
    case "success":
      return "bg-[hsl(var(--bd-status-success-bg))] text-[hsl(var(--bd-status-success-text))]"
    case "warning":
      return "bg-[hsl(var(--bd-status-warning-bg))] text-[hsl(var(--bd-status-warning-text))]"
    case "danger":
      return "bg-[hsl(var(--bd-status-danger-bg))] text-[hsl(var(--bd-status-danger-text))]"
    case "info":
      return "bg-[hsl(var(--bd-status-info-bg))] text-[hsl(var(--bd-status-info-text))]"
    default:
      return "bg-[hsl(var(--bd-surface-muted))] text-[hsl(var(--bd-text-muted))]"
  }
}
