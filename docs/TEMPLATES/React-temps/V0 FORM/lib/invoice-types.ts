/**
 * Invoice Workspace Type Definitions
 */

export interface LineItem {
  id: string;
  description: string;
  subDescription?: string;
  quantity: number;
  unit: string;
  rate: number;
  image?: string;
  make?: string;
  partNumber?: string;
  condition?: string;
  installRate?: number;
  vatOverride?: number;
  discountOverride?: number;
  customFields?: Record<string, string | number>;
  groupId?: string;
}

export interface Group {
  id: string;
  name: string;
  items: LineItem[];
  isCollapsed?: boolean;
  subtotal?: number;
}

export interface CommercialTerms {
  discount?: {
    type: 'percentage' | 'fixed';
    value: number;
    applyBeforeTax: boolean;
  };
  vat?: {
    rate: number;
  };
  withholding?: {
    type: 'percentage' | 'fixed';
    value: number;
  };
  additionalCharges?: Array<{
    id: string;
    name: string;
    amount: number;
    applyBeforeTax: boolean;
  }>;
  customFields?: Array<{
    id: string;
    name: string;
    value: string;
  }>;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId?: string;
  clientName?: string;
  purchaseOrderNumber?: string;
  issueDate: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  lineItems: LineItem[];
  groups: Group[];
  commercialTerms: CommercialTerms;
  notes?: string;
  termsAndConditions?: string;
  signatory?: string;
  referenceLinks?: string[];
  subtotal: number;
  totalDiscount: number;
  totalVAT: number;
  totalWithholding: number;
  totalAdditionalCharges: number;
  installTotal: number;
  grandTotal: number;
  amountInWords?: string;
}

export interface InvoiceWorkspaceProps {
  invoice: Invoice;
  onSave?: (invoice: Invoice) => void;
  onCancel?: () => void;
  onImportItems?: () => void;
  onTableSettings?: () => void;
  onMoreActions?: (action: string) => void;
  isLoading?: boolean;
  errors?: Record<string, string>;
}

export interface InvoiceHeaderProps {
  invoice: Invoice;
  onClientChange?: (clientId: string) => void;
  onInvoiceNumberChange?: (number: string) => void;
  onPONumberChange?: (number: string) => void;
  onIssueDateChange?: (date: string) => void;
  onDueDateChange?: (date: string) => void;
}

export interface LineItemsProps {
  items: LineItem[];
  groups: Group[];
  onItemChange?: (itemId: string, updates: Partial<LineItem>) => void;
  onAddItem?: () => void;
  onAddGroup?: () => void;
  onDeleteItem?: (itemId: string) => void;
  onDuplicateItem?: (itemId: string) => void;
  onImportItems?: () => void;
  onTableSettings?: () => void;
  onGroupCollapse?: (groupId: string) => void;
  onDragReorder?: (items: LineItem[]) => void;
}

export interface CommercialTermsProps {
  terms: CommercialTerms;
  onTermsChange?: (updates: Partial<CommercialTerms>) => void;
}

export interface TotalsSectionProps {
  invoice: Invoice;
}

export interface AdditionalInformationProps {
  invoice: Invoice;
  onNotesChange?: (notes: string) => void;
  onTermsChange?: (terms: string) => void;
  onSignatoryChange?: (signatory: string) => void;
  onReferenceLinksChange?: (links: string[]) => void;
}
