// src/utils/exportSchemas.ts
// Domain-specific field whitelists and human-readable column header mappings.
// Eliminates raw system metadata (id, parent_id, item_id, client_id, project_id)
// from exported files and ensures clean, business-readable output.

export type Domain =
  | 'INVOICES'
  | 'CLIENTS'
  | 'WAYBILLS'
  | 'PROJECTS'
  | 'CSR'
  | 'QUOTATIONS'
  | 'RFQS'
  | 'BOQS';

export interface FieldMap {
  [dbField: string]: string;
}

export const domainSchemas: Record<Domain, FieldMap> = {
  INVOICES: {
    invoice_number: 'Invoice Number',
    client_name: 'Client Name',
    created_at: 'Date',
    issue_date: 'Issue Date',
    status: 'Status',
    total: 'Total',
    grand_total: 'Grand Total',
  },
  CLIENTS: {
    name: 'Name',
    category: 'Category',
    phone: 'Phone',
    email: 'Email',
    city: 'City',
    state: 'State',
  },
  WAYBILLS: {
    waybill_number: 'Waybill Number',
    client_name: 'Client Name',
    delivery_location: 'Delivery Location',
    status: 'Status',
    created_at: 'Date',
  },
  PROJECTS: {
    name: 'Project Name',
    project_code: 'Project Code',
    client_name: 'Client Name',
    status: 'Status',
    project_value: 'Project Value',
    start_date: 'Start Date',
  },
  CSR: {
    csr_number: 'CSR Number',
    client_name: 'Client Name',
    equipment_type: 'Equipment Type',
    status: 'Status',
    date: 'Date',
  },
  QUOTATIONS: {
    quotation_number: 'Quotation Number',
    client_name: 'Client Name',
    created_at: 'Date',
    issue_date: 'Issue Date',
    status: 'Status',
    total: 'Total',
    grand_total: 'Grand Total',
  },
  RFQS: {
    rfq_number: 'RFQ Number',
    title: 'Title',
    client_name: 'Client Name',
    status: 'Status',
    expiry_date: 'Expiry Date',
  },
  BOQS: {
    boq_number: 'BOQ Number',
    project_name: 'Project Name',
    client_name: 'Client Name',
    status: 'Status',
    total_amount: 'Total',
  },
};

export const lineItemSchema: FieldMap = {
  item_description: 'Description',
  quantity: 'Quantity',
  unit_price: 'Unit Price',
  item_subtotal: 'Subtotal',
};

/** Format ISO date string to YYYY-MM-DD */
export function formatDate(value: unknown): string {
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
    return value.split('T')[0];
  }
  return String(value ?? '');
}

/** Combine address fields for Clients domain */
export function combineAddress(record: Record<string, unknown>): string {
  const parts = [record.street, record.city, record.state, record.country].filter(Boolean);
  return parts.join(', ');
}

/** Date fields that should be formatted as YYYY-MM-DD */
export const DATE_FIELDS = new Set([
  'created_at',
  'start_date',
  'issue_date',
  'date',
  'expiry_date',
]);
