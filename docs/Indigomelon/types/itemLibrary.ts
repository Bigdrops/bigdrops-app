export type SourceType = 'invoice' | 'quotation';

export interface ItemHistoryEntry {
  id: string;
  docNumber: string;
  sourceType: SourceType;
  date: string;
  clientName: string;
  originalDescription: string;
  unitPrice: number;
  quantity: number;
  unit: string;
  amount: number;
}

export interface CatalogItem {
  id: string;
  name: string;
  standardPrice: number;
  lastPrice: number;
  usageCount: number;
  lastUsedDate: string;
  lastSourceType: SourceType;
  isPossibleDuplicate?: boolean;
  duplicateCandidateName?: string;
  history: ItemHistoryEntry[];
}

export type FilterType = 'all' | 'invoice' | 'quotation' | 'flagged';
