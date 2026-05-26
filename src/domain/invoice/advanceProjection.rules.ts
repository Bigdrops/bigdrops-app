import { getAdvanceInvoiceMetadata } from "./advanceMetadata";
import { calculateAdvanceAmount } from "./advanceChildFlow";
import type { AdvanceInvoiceProjection } from "./advanceProjection.contract";

/**
 * Derives an Advance Invoice projection from a parent invoice.
 *
 * CRITICAL INVARIANT:
 * This function produces ONLY presentation metadata (number, title, footer context).
 * It NEVER carries or synthesizes line items.
 * The parent invoice's items array must be used directly at the point of PDF generation.
 *
 * Returns null if:
 * - invoice is null/undefined
 * - invoice has no id (fail-closed during loading)
 * - no valid advance metadata exists
 * - advance is disabled or has zero amount
 */
export function deriveAdvanceInvoiceProjection(
  invoice: any | null | undefined
): AdvanceInvoiceProjection | null {
  if (!invoice?.id) return null;

  const metadata = getAdvanceInvoiceMetadata(invoice);
  if (!metadata || !metadata.enabled || metadata.amount <= 0) return null;

  const total = calculateAdvanceAmount({
    contractValue: metadata.contract_value ?? invoice.total,
    mode: metadata.mode === 'fixed' ? 'fixed' : 'percent',
    inputValue: metadata.value,
  });

  const suffix = metadata.suffix ? `-${metadata.suffix}` : "-ADV";

  return {
    parentId: invoice.id,
    invoice_number: `${invoice.invoice_number || ""}${suffix}`,
    invoice_title: metadata.primary_label || "Advance Invoice",
    status: (metadata.status as "unpaid" | "paid" | "void") || "unpaid",
    issue_date: metadata.issued_at || invoice.issue_date || "",
    due_date: metadata.due_at || (invoice.due_date ?? null),
    total,

    client_id: invoice.client_id || "",
    client_name: invoice.client_name || "",
    client_email: invoice.client_email || "",
    client_address: invoice.client_address || "",

    isVirtualProjection: true,
  };
}
