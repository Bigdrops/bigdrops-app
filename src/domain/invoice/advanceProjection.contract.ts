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
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  isVirtualProjection: true;
};

export type AdvanceInvoice = AdvanceInvoiceProjection | null;
