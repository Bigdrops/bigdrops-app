import { InvoiceIdentity } from "./invoiceIdentity.contract";

export type PdfRenderPayload = {
  identity: InvoiceIdentity;

  items: ReadonlyArray<{
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;

  totals: {
    subtotal: number;
    total: number;
  };

  meta: {
    isVirtualProjection: boolean;
    invoice_id: string;
  };

  custom_fields?: Record<string, any>;
};