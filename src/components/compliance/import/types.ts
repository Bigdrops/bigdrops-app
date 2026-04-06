import { TaxInputEntry, TaxFiling, WhtReceipt } from '@/domain/compliance/types'
import { ComplianceRecordType } from '@/domain/compliance/import/contracts'

export type PartialRecord<T> = Partial<T> & Record<string, any>

export interface ImportState {
  recordType: ComplianceRecordType
  rawInput: string
  parsedData: PartialRecord<any> | null
  error: string | null
  isSaving: boolean
}

export type ValidatedRecord = {
  type: 'vat_input'
  data: Partial<TaxInputEntry>
} | {
  type: 'tax_filing'
  data: Partial<TaxFiling>
} | {
  type: 'wht_receipt'
  data: Partial<WhtReceipt>
}
