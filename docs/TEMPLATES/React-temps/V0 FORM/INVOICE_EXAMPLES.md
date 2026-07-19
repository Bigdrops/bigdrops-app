# Invoice Workspace - Code Examples

## Basic Usage

### Simple Demo Page
```tsx
'use client';

import { InvoiceWorkspace } from '@/components/invoice';
import { createMockInvoice } from '@/lib/invoice-utils';

export default function InvoicePage() {
  return (
    <InvoiceWorkspace
      invoice={createMockInvoice()}
      onSave={(invoice) => {
        console.log('Saving invoice:', invoice);
      }}
      onCancel={() => {
        console.log('Cancelled');
      }}
    />
  );
}
```

## Advanced Usage

### With Backend Integration
```tsx
'use client';

import { useState } from 'react';
import { InvoiceWorkspace } from '@/components/invoice';
import { Invoice } from '@/lib/invoice-types';
import { createMockInvoice } from '@/lib/invoice-utils';

export default function InvoicePage() {
  const [invoice, setInvoice] = useState<Invoice>(createMockInvoice());
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSave = async (updatedInvoice: Invoice) => {
    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedInvoice),
      });

      if (!response.ok) {
        throw new Error('Failed to save invoice');
      }

      const saved = await response.json();
      setInvoice(saved);
      // Show success toast
    } catch (error) {
      setErrors({
        submit: 'Failed to save invoice. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Discard unsaved changes?')) {
      // Reload original invoice
    }
  };

  return (
    <InvoiceWorkspace
      invoice={invoice}
      onSave={handleSave}
      onCancel={handleCancel}
      isLoading={isLoading}
      errors={errors}
    />
  );
}
```

### With Custom Business Logic
```tsx
'use client';

import { useState, useCallback } from 'react';
import { InvoiceWorkspace } from '@/components/invoice';
import { Invoice, LineItem } from '@/lib/invoice-types';
import { createMockInvoice, calculateInvoiceTotals } from '@/lib/invoice-utils';

export default function InvoicePage() {
  const [invoice, setInvoice] = useState<Invoice>(createMockInvoice());

  const handleSave = useCallback(async (updatedInvoice: Invoice) => {
    // Custom save logic
    console.log('Total items:', updatedInvoice.lineItems.length);
    console.log('Grand total:', updatedInvoice.grandTotal);

    // Validate before saving
    if (updatedInvoice.lineItems.length === 0) {
      throw new Error('Invoice must have at least one line item');
    }

    // Save to backend
    const response = await fetch('/api/invoices', {
      method: 'POST',
      body: JSON.stringify(updatedInvoice),
    });

    return response.json();
  }, []);

  return (
    <InvoiceWorkspace
      invoice={invoice}
      onSave={handleSave}
      onImportItems={() => {
        // Open import dialog
        console.log('Import items clicked');
      }}
      onTableSettings={() => {
        // Open table settings sheet
        console.log('Table settings clicked');
      }}
      onMoreActions={(action) => {
        console.log('Action:', action);
      }}
    />
  );
}
```

## Utility Function Examples

### Calculate Invoice Totals
```typescript
import { calculateInvoiceTotals } from '@/lib/invoice-utils';
import { LineItem, Group, CommercialTerms } from '@/lib/invoice-types';

const items: LineItem[] = [
  {
    id: '1',
    description: 'Professional Services',
    quantity: 40,
    unit: 'hours',
    rate: 150,
  },
  {
    id: '2',
    description: 'Development',
    quantity: 80,
    unit: 'hours',
    rate: 125,
  },
];

const terms: CommercialTerms = {
  vat: { rate: 10 },
  discount: {
    type: 'percentage',
    value: 5,
    applyBeforeTax: true,
  },
};

const totals = calculateInvoiceTotals(items, [], terms);
console.log(totals);
// Output:
// {
//   subtotal: 13000,
//   totalDiscount: 650,
//   totalVAT: 1235,
//   totalWithholding: 0,
//   totalAdditionalCharges: 0,
//   installTotal: 13000,
//   grandTotal: 13585,
// }
```

### Format Currency
```typescript
import { formatCurrency } from '@/lib/invoice-utils';

const amount = 1234.567;
const formatted = formatCurrency(amount, 'USD');
console.log(formatted); // "$1,234.57"

const euro = formatCurrency(amount, 'EUR');
console.log(euro); // "€1,234.57"
```

### Convert Number to Words
```typescript
import { numberToWords } from '@/lib/invoice-utils';

console.log(numberToWords(1234)); // "One Thousand Two Hundred Thirty Four"
console.log(numberToWords(100)); // "One Hundred"
console.log(numberToWords(42)); // "Forty Two"
```

### Create Mock Invoice
```typescript
import { createMockInvoice } from '@/lib/invoice-utils';

const mockInvoice = createMockInvoice();
console.log(mockInvoice);
// Returns:
// {
//   id: 'inv-001',
//   invoiceNumber: 'INV-2024-001',
//   clientName: 'Acme Corporation',
//   purchaseOrderNumber: 'PO-2024-5678',
//   issueDate: '2024-07-19',
//   dueDate: '2024-08-18',
//   status: 'draft',
//   lineItems: [
//     {
//       id: '1',
//       description: 'Professional Services - Consulting',
//       subDescription: 'Initial discovery and strategy sessions',
//       quantity: 40,
//       unit: 'hours',
//       rate: 150,
//     },
//     // ... more items
//   ],
//   groups: [],
//   commercialTerms: { vat: { rate: 10 } },
//   ...
// }
```

## Component Composition Examples

### Using Individual Sections
```tsx
import {
  InvoiceHeader,
  LineItemsSection,
  TotalsSection,
} from '@/components/invoice';
import { Invoice } from '@/lib/invoice-types';

interface CustomInvoiceFormProps {
  invoice: Invoice;
  onUpdate: (updates: Partial<Invoice>) => void;
}

export function CustomInvoiceForm({
  invoice,
  onUpdate,
}: CustomInvoiceFormProps) {
  return (
    <div className="space-y-6">
      <InvoiceHeader
        invoice={invoice}
        onClientChange={(name) =>
          onUpdate({ clientName: name })
        }
      />

      <LineItemsSection
        items={invoice.lineItems}
        groups={invoice.groups}
        onAddItem={() => {
          // Add new item
        }}
      />

      <TotalsSection invoice={invoice} />
    </div>
  );
}
```

### Custom Save Dialog
```tsx
'use client';

import { useState } from 'react';
import { InvoiceWorkspace } from '@/components/invoice';
import { Invoice } from '@/lib/invoice-types';

interface SaveDialogProps {
  open: boolean;
  onConfirm: (invoice: Invoice) => void;
  onCancel: () => void;
}

function SaveDialog({ open, onConfirm, onCancel }: SaveDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg space-y-4">
        <h2>Save Invoice?</h2>
        <p>Make sure all information is correct before saving.</p>
        <div className="flex gap-2">
          <button onClick={onCancel}>Cancel</button>
          <button
            onClick={() => onConfirm(invoice)}
            className="bg-black text-white px-4 py-2 rounded"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
```

## Type-Safe Workflow

### Creating a New Invoice
```typescript
import { Invoice, LineItem, Group } from '@/lib/invoice-types';

const newInvoice: Invoice = {
  id: `inv-${Date.now()}`,
  invoiceNumber: 'INV-2024-0001',
  clientName: 'Client Name',
  purchaseOrderNumber: '',
  issueDate: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0],
  status: 'draft',
  lineItems: [],
  groups: [],
  commercialTerms: {
    vat: { rate: 10 },
  },
  subtotal: 0,
  totalDiscount: 0,
  totalVAT: 0,
  totalWithholding: 0,
  totalAdditionalCharges: 0,
  installTotal: 0,
  grandTotal: 0,
};
```

### Adding Line Items
```typescript
import { LineItem } from '@/lib/invoice-types';

const newItem: LineItem = {
  id: `item-${Date.now()}`,
  description: 'Development Services',
  subDescription: 'React component implementation',
  quantity: 80,
  unit: 'hours',
  rate: 150,
  make: 'Custom',
  partNumber: 'DEV-001',
  condition: 'New',
};

const updatedInvoice = {
  ...invoice,
  lineItems: [...invoice.lineItems, newItem],
};
```

### Creating Groups
```typescript
import { Group } from '@/lib/invoice-types';

const newGroup: Group = {
  id: `group-${Date.now()}`,
  name: 'Development Phase 1',
  items: [
    // Add items to this group
  ],
  isCollapsed: false,
};

const updatedInvoice = {
  ...invoice,
  groups: [...invoice.groups, newGroup],
};
```

## Error Handling Examples

### Validation
```typescript
function validateInvoice(invoice: Invoice): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!invoice.invoiceNumber) {
    errors.invoiceNumber = 'Invoice number is required';
  }

  if (!invoice.clientName) {
    errors.clientName = 'Client name is required';
  }

  if (invoice.lineItems.length === 0) {
    errors.lineItems = 'Invoice must have at least one line item';
  }

  if (invoice.grandTotal <= 0) {
    errors.total = 'Invoice total must be greater than zero';
  }

  return errors;
}

// Usage:
const errors = validateInvoice(invoice);
if (Object.keys(errors).length > 0) {
  setErrors(errors);
  return;
}
```

### API Error Handling
```typescript
async function saveInvoice(invoice: Invoice) {
  try {
    const response = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoice),
    });

    if (response.status === 400) {
      const { errors } = await response.json();
      setErrors(errors);
      return;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    setErrors({
      submit: 'Failed to save invoice. Please try again.',
    });
    console.error('Save error:', error);
  }
}
```

## Testing Examples

### Unit Testing Calculations
```typescript
import { calculateInvoiceTotals, formatCurrency } from '@/lib/invoice-utils';
import { LineItem } from '@/lib/invoice-types';

describe('Invoice Calculations', () => {
  it('calculates totals correctly', () => {
    const items: LineItem[] = [
      {
        id: '1',
        description: 'Item',
        quantity: 10,
        unit: 'units',
        rate: 100,
      },
    ];

    const totals = calculateInvoiceTotals(items, [], {
      vat: { rate: 10 },
    });

    expect(totals.subtotal).toBe(1000);
    expect(totals.totalVAT).toBe(100);
    expect(totals.grandTotal).toBe(1100);
  });

  it('formats currency correctly', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
    expect(formatCurrency(0)).toBe('$0.00');
  });
});
```

### Component Testing
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { InvoiceWorkspace } from '@/components/invoice';
import { createMockInvoice } from '@/lib/invoice-utils';

describe('InvoiceWorkspace', () => {
  it('renders invoice header', () => {
    const invoice = createMockInvoice();
    render(
      <InvoiceWorkspace
        invoice={invoice}
        onSave={jest.fn()}
      />
    );

    expect(screen.getByText('Invoice')).toBeInTheDocument();
    expect(screen.getByText('INV-2024-001')).toBeInTheDocument();
  });

  it('shows line items', () => {
    const invoice = createMockInvoice();
    render(
      <InvoiceWorkspace
        invoice={invoice}
        onSave={jest.fn()}
      />
    );

    expect(
      screen.getByText('Professional Services - Consulting')
    ).toBeInTheDocument();
  });

  it('calls onSave when save button is clicked', () => {
    const invoice = createMockInvoice();
    const onSave = jest.fn();

    render(
      <InvoiceWorkspace invoice={invoice} onSave={onSave} />
    );

    // Make an edit to show save button
    const input = screen.getByDisplayValue(invoice.clientName!);
    fireEvent.change(input, { target: { value: 'New Client' } });

    // Click save
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalled();
  });
});
```

These examples demonstrate how to integrate and extend the Invoice Workspace component for production use.
