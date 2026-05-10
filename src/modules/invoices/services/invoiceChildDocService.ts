import { linkCsrToInvoice, linkWaybillToInvoice } from "../repositories/invoiceChildDocRepository"

export interface SourceInvoiceRef {
  invoiceId: string
  invoiceNumber: string
  clientId: string
  clientName: string
  poNumber: string
}

export function buildCsrPrefill(source: SourceInvoiceRef) {
  return {
    sourceInvoice: {
      invoiceId: source.invoiceId,
      invoiceNumber: source.invoiceNumber,
      clientId: source.clientId,
      clientName: source.clientName,
      poNumber: source.poNumber,
    },
  }
}

export function buildWaybillPrefill(source: SourceInvoiceRef) {
  return {
    sourceInvoice: {
      invoiceId: source.invoiceId,
      invoiceNumber: source.invoiceNumber,
      clientId: source.clientId,
      clientName: source.clientName,
      poNumber: source.poNumber,
    },
  }
}

export async function attachExistingCsr(csrId: string, invoiceId: string): Promise<void> {
  await linkCsrToInvoice(csrId, invoiceId)
}

export async function attachExistingWaybill(waybillId: string, invoiceId: string): Promise<void> {
  await linkWaybillToInvoice(waybillId, invoiceId)
}

export async function attachChildDocument({
  invoiceId,
  childId,
  kind,
}: {
  invoiceId: string
  childId: string
  kind: "csr" | "waybill"
}): Promise<void> {
  if (kind === "csr") {
    await linkCsrToInvoice(childId, invoiceId)
  } else {
    await linkWaybillToInvoice(childId, invoiceId)
  }
}

export function buildSourceFromInvoice(invoice: {
  id?: string | null
  invoice_number?: string | null
  client_id?: string | null
  client_name?: string | null
  po_number?: string | null
}): SourceInvoiceRef {
  return {
    invoiceId: String(invoice?.id || ""),
    invoiceNumber: String(invoice?.invoice_number || ""),
    clientId: String(invoice?.client_id || ""),
    clientName: String(invoice?.client_name || ""),
    poNumber: String(invoice?.po_number || ""),
  }
}