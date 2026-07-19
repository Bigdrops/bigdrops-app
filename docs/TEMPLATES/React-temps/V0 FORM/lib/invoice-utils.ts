import { LineItem, Group, Invoice, CommercialTerms } from './invoice-types';

export function calculateLineItemTotal(item: LineItem): number {
  return item.quantity * item.rate;
}

export function calculateSubtotal(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + calculateLineItemTotal(item), 0);
}

export function calculateGroupSubtotal(group: Group): number {
  return group.items.reduce((sum, item) => sum + calculateLineItemTotal(item), 0);
}

export function calculateDiscount(
  subtotal: number,
  discount?: CommercialTerms['discount']
): number {
  if (!discount) return 0;
  if (discount.type === 'percentage') {
    return (subtotal * discount.value) / 100;
  }
  return discount.value;
}

export function calculateVAT(
  subtotal: number,
  discount: number,
  terms: CommercialTerms
): number {
  if (!terms.vat) return 0;
  const applicableAmount = terms.discount?.applyBeforeTax
    ? subtotal - discount
    : subtotal;
  return (applicableAmount * terms.vat.rate) / 100;
}

export function calculateWithholding(
  subtotal: number,
  discount: number,
  vat: number,
  withholding?: CommercialTerms['withholding']
): number {
  if (!withholding) return 0;
  const base = subtotal - discount + vat;
  if (withholding.type === 'percentage') {
    return (base * withholding.value) / 100;
  }
  return withholding.value;
}

export function calculateAdditionalCharges(terms: CommercialTerms): number {
  if (!terms.additionalCharges) return 0;
  return terms.additionalCharges.reduce((sum, charge) => sum + charge.amount, 0);
}

export function calculateInstallTotal(
  items: LineItem[],
  groups: Group[]
): number {
  const itemsTotal = calculateSubtotal(items);
  const groupsTotal = groups.reduce((sum, group) => sum + calculateGroupSubtotal(group), 0);
  return itemsTotal + groupsTotal;
}

export function calculateGrandTotal(invoice: Invoice): number {
  return (
    invoice.subtotal -
    invoice.totalDiscount +
    invoice.totalVAT -
    invoice.totalWithholding +
    invoice.totalAdditionalCharges
  );
}

export function calculateInvoiceTotals(
  items: LineItem[],
  groups: Group[],
  terms: CommercialTerms
): Partial<Invoice> {
  const subtotal = calculateInstallTotal(items, groups);
  const discount = calculateDiscount(subtotal, terms.discount);
  const vat = calculateVAT(subtotal, discount, terms);
  const withholding = calculateWithholding(subtotal, discount, vat, terms.withholding);
  const additionalCharges = calculateAdditionalCharges(terms);
  const grandTotal = calculateGrandTotal({
    subtotal,
    totalDiscount: discount,
    totalVAT: vat,
    totalWithholding: withholding,
    totalAdditionalCharges: additionalCharges,
  } as Invoice);

  return {
    subtotal,
    totalDiscount: discount,
    totalVAT: vat,
    totalWithholding: withholding,
    totalAdditionalCharges: additionalCharges,
    grandTotal,
  };
}

export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(value);
}

export function numberToWords(num: number): string {
  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
  ];
  const teens = [
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tens = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];
  const thousands = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];

  if (num === 0) return 'Zero';

  let billionWords = '';
  let millionWords = '';
  let thousandWords = '';
  let hundredWords = '';

  if (Math.floor(num / 1000000000) > 0) {
    billionWords =
      convertHundred(Math.floor(num / 1000000000), ones, teens, tens) + ' Billion ';
    num %= 1000000000;
  }

  if (Math.floor(num / 1000000) > 0) {
    millionWords =
      convertHundred(Math.floor(num / 1000000), ones, teens, tens) + ' Million ';
    num %= 1000000;
  }

  if (Math.floor(num / 1000) > 0) {
    thousandWords =
      convertHundred(Math.floor(num / 1000), ones, teens, tens) + ' Thousand ';
    num %= 1000;
  }

  if (num > 0) {
    hundredWords = convertHundred(num, ones, teens, tens);
  }

  return (billionWords + millionWords + thousandWords + hundredWords).trim();
}

function convertHundred(
  num: number,
  ones: string[],
  teens: string[],
  tens: string[]
): string {
  let result = '';

  if (Math.floor(num / 100) > 0) {
    result = ones[Math.floor(num / 100)] + ' Hundred ';
    num %= 100;
  }

  if (num >= 20) {
    result += tens[Math.floor(num / 10)];
    if (num % 10 > 0) {
      result += ' ' + ones[num % 10];
    }
  } else if (num >= 10) {
    result += teens[num - 10];
  } else if (num > 0) {
    result += ones[num];
  }

  return result.trim();
}

export function createMockInvoice(): Invoice {
  return {
    id: 'inv-001',
    invoiceNumber: 'INV-2024-001',
    clientName: 'Acme Corporation',
    purchaseOrderNumber: 'PO-2024-5678',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    status: 'draft',
    lineItems: [
      {
        id: '1',
        description: 'Professional Services - Consulting',
        subDescription: 'Initial discovery and strategy sessions',
        quantity: 40,
        unit: 'hours',
        rate: 150,
      },
      {
        id: '2',
        description: 'UI/UX Design Package',
        subDescription: 'Complete design system and component library',
        quantity: 80,
        unit: 'hours',
        rate: 125,
      },
      {
        id: '3',
        description: 'Frontend Development',
        subDescription: 'React component implementation',
        quantity: 120,
        unit: 'hours',
        rate: 135,
      },
    ],
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
}
