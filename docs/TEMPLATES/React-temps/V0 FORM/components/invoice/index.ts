/**
 * Invoice Workspace Component Exports
 * 
 * Import the main component:
 * import { InvoiceWorkspace } from '@/components/invoice';
 * 
 * Import individual sections:
 * import { InvoiceHeader, LineItemsSection, TotalsSection } from '@/components/invoice';
 * 
 * Import types:
 * import type { Invoice, LineItem, Group, CommercialTerms } from '@/lib/invoice-types';
 * 
 * Import utilities:
 * import { calculateInvoiceTotals, formatCurrency, createMockInvoice } from '@/lib/invoice-utils';
 */

export { InvoiceWorkspace } from './invoice-workspace';
export { InvoiceHeader } from './invoice-header';
export { LineItemsSection } from './line-items-section';
export { CommercialTermsSection } from './commercial-terms-section';
export { TotalsSection } from './totals-section';
export { AdditionalInformationSection } from './additional-information-section';
export { FloatingSaveButton } from './floating-save-button';
