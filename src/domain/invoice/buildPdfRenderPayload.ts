import { PdfRenderPayload } from "./pdfRender.contract";

export function buildPdfRenderPayload(invoice: any): PdfRenderPayload {
  return {
    identity: Object.freeze({
      invoice_number: invoice.invoice_number,
      invoice_title: invoice.invoice_title,
      client_name: invoice.client_name,
      client_email: invoice.client_email,
      client_address: invoice.client_address,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date ?? null,
    }),

    items: Object.freeze(invoice.items ?? []),

    totals: Object.freeze({
      subtotal: invoice.subtotal,
      total: invoice.total,
    }),

    meta: Object.freeze({
      isVirtualProjection: !!invoice.isVirtualProjection,
      invoice_id: invoice.id,
    }),

    custom_fields: invoice.custom_fields ?? {},
  };
}