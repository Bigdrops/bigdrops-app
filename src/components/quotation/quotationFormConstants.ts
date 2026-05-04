import { canUseAndroidNativeSqlite } from '@/lib/native/capacitor'
import type { PdfOutputState } from './quotationFormTypes'

export const defaultPdfOutput: PdfOutputState = {
  showBankDetails: true,
  bankAccountId: null,
  showFooter: true,
  showTagline: true,
}

export function canUseOfflineQuotationDrafts(): boolean {
  return canUseAndroidNativeSqlite() && typeof navigator !== 'undefined' && navigator.onLine === false
}