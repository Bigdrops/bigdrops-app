import { supabase } from "@/supabase"
import {
  getAdvanceInvoiceMetadata,
  mergeAdvanceInvoiceMetadata,
  clearAdvanceInvoiceMetadata,
} from "@/domain/invoice/advanceMetadata"
import { buildAdvanceParentInvoiceMetadata } from "@/domain/invoice/advanceChildFlow"

const AUDIT_TRACKED_FIELDS = [
  "mode",
  "input_value",
  "suffix",
  "primary_label",
  "secondary_label",
  "amount",
  "document_number",
]

async function recordAdvanceAudit(
  entityId: string,
  label: string | null,
  action: "CREATE" | "UPDATE" | "DELETE",
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null,
  reason: string
) {
  try {
    const { recordAuditLog } = await import("@/lib/audit")
    await recordAuditLog({
      entityType: "invoice",
      recordId: entityId,
      entityLabel: label ?? undefined,
      action,
      oldData,
      newData,
      trackedFields: AUDIT_TRACKED_FIELDS,
      reason,
    })
  } catch (err) {
    console.error("Advance audit failed:", err)
  }
}

function resolveAdvanceAuditData(data: Record<string, unknown>) {
  return {
    mode: data.mode,
    input_value: data.input_value,
    suffix: data.suffix,
    primary_label: data.primary_label,
    secondary_label: data.secondary_label,
    document_number: data.document_number,
    amount: data.amount,
  }
}

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function persistParentConfig(invoiceId: string, customFields: unknown) {
  return supabase
    .from("invoices")
    .update({ custom_fields: JSON.stringify(customFields) })
    .eq("id", invoiceId)
}

function loadParentInvoice(id: string) {
  return supabase
    .from("invoices")
    .select("id, invoice_number, invoice_title, po_number, client_id, client_name, project_id, issue_date, due_date, total, notes, terms, custom_fields")
    .eq("id", id)
    .single()
}

export interface AdvanceSaveInput {
  parentId: string
  mode: "percent" | "fixed"
  inputValue: number | string
  suffix: string | undefined
  primaryLabel: string
  secondaryLabel: string
  existingAdvanceId?: string | null
  existingMetadata?: Record<string, unknown> | null
}

export interface AdvanceSaveResult {
  invoice: {
    id: string | null
    invoice_number: string
    invoice_title: string
    total: number
    status: string
    issue_date: string | null
    due_date: string | null
    custom_fields: unknown
  }
  created: boolean
}

export async function createOrUpdateAdvance(
  input: AdvanceSaveInput
): Promise<AdvanceSaveResult> {
  const { data: parent } = await loadParentInvoice(input.parentId)
  if (!parent) throw new Error("Parent invoice not found")

  const existingMetadata = getAdvanceInvoiceMetadata(parent as any)

  const metadata = buildAdvanceParentInvoiceMetadata({
    parentInvoice: parent as any,
    mode: input.mode,
    inputValue: input.inputValue,
    suffix: input.suffix,
    primaryLabel: input.primaryLabel,
    secondaryLabel: input.secondaryLabel,
    legacyChildInvoiceId: existingMetadata?.legacy_child_invoice_id || input.existingAdvanceId,
    legacyChildInvoiceNumber: existingMetadata?.legacy_child_invoice_number,
    legacyChildInvoiceTotal: existingMetadata?.legacy_child_invoice_total,
    issuedAt: existingMetadata?.issued_at,
    dueAt: existingMetadata?.due_at,
    status: existingMetadata?.status,
    printSnapshot: existingMetadata?.print_snapshot,
  })

  const nextCustomFields = mergeAdvanceInvoiceMetadata(parent.custom_fields, metadata)
  const { error: updateError } = await persistParentConfig(input.parentId, nextCustomFields)
  if (updateError) throw new Error("Could not update parent invoice")

  if (existingMetadata) {
    await recordAdvanceAudit(
      input.parentId,
      parent.invoice_number,
      "UPDATE",
      resolveAdvanceAuditData(existingMetadata as unknown as Record<string, unknown>),
      resolveAdvanceAuditData(metadata),
      "Advance invoice metadata updated on parent invoice"
    )
  } else {
    await recordAdvanceAudit(
      input.parentId,
      parent.invoice_number,
      "CREATE",
      null,
      resolveAdvanceAuditData(metadata),
      "Advance invoice metadata created on parent invoice"
    )
  }

  const advanceNumber = String(metadata.document_number || `${parent.invoice_number}-A`)

  return {
    invoice: {
      id: (metadata as any).legacy_child_invoice_id || null,
      invoice_number: advanceNumber,
      invoice_title: parent.invoice_title || "Advance Invoice",
      total: toNumber(metadata.amount),
      status: String(metadata.status || "unpaid"),
      issue_date: (metadata as any).issued_at || parent.issue_date || null,
      due_date: (metadata as any).due_at || parent.due_date || null,
      custom_fields: nextCustomFields,
    },
    created: !existingMetadata,
  }
}

export interface AdvanceDeleteResult {
  status: "cleared"
  message: string
}

export async function deleteAdvance(parentId: string, parentInvoiceNumber: string | null): Promise<AdvanceDeleteResult> {
  const { data: parent } = await loadParentInvoice(parentId)
  if (!parent) throw new Error("Parent invoice not found")

  const existingMetadata = getAdvanceInvoiceMetadata(parent as any)
  const nextCustomFields = clearAdvanceInvoiceMetadata(parent.custom_fields)
  const { error: updateError } = await persistParentConfig(parentId, nextCustomFields)
  if (updateError) throw new Error("Could not update parent invoice")

  if (existingMetadata) {
    await recordAdvanceAudit(
      parentId,
      parentInvoiceNumber,
      "DELETE",
      resolveAdvanceAuditData(existingMetadata as unknown as Record<string, unknown>),
      null,
      "Advance invoice details removed from parent invoice metadata"
    )
  }

  return { status: "cleared", message: "Advance invoice metadata cleared from the parent invoice." }
}