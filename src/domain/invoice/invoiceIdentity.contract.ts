export type InvoiceIdentity = Readonly<{
  invoice_number: string;
  invoice_title: string;
  client_name: string;
  client_email: string;
  client_address: string;
  issue_date: string;
  due_date: string | null;
}>;