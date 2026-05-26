/**
 * Advance Invoice Projection Contract
 *
 * ARCHITECTURAL INVARIANT:
 * An Advance Invoice is a STRICT 1:1 CLONE of the parent invoice.
 * It is NOT a derived dataset. It is NOT a transformed financial model.
 *
 * The projection carries ONLY presentation overrides:
 * 1. invoice_number (with suffix)
 * 2. invoice_title (advance label)
 * 3. Footer context (advance due / balance upon completion)
 *
 * Items are NEVER carried on the projection — they are always sourced
 * directly from the parent invoice at the point of use.
 */

export type AdvanceInvoiceProjection = {
  parentId: string;
  invoice_number: string;
  invoice_title: string;
  status: "unpaid" | "paid" | "void";
  issue_date: string;
  due_date: string | null;
  total: number;
  client_id: string;
  client_name: string;
  client_email: string;
  client_address: string;
  isVirtualProjection: true;
};

export type AdvanceInvoice = AdvanceInvoiceProjection | null;
