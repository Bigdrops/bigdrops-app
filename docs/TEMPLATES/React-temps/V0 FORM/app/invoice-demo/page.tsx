'use client';

import { createMockInvoice } from '@/lib/invoice-utils';
import { InvoiceWorkspace } from '@/components/invoice/invoice-workspace';

export default function InvoiceDemoPage() {
  const mockInvoice = createMockInvoice();

  return (
    <InvoiceWorkspace
      invoice={mockInvoice}
      onSave={(invoice) => {
        console.log('Saving invoice:', invoice);
      }}
      onCancel={() => {
        console.log('Cancelled');
      }}
      onImportItems={() => {
        console.log('Import items clicked');
      }}
      onTableSettings={() => {
        console.log('Table settings clicked');
      }}
      onMoreActions={(action) => {
        console.log('More action:', action);
      }}
    />
  );
}
