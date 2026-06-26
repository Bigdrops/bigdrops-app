import type {
  PreviewBankAccount,
  PreviewSignatory,
  SignatoryLike,
  SettingsLike,
  ClientLike,
  BankAccountLike,
  PdfOutputLike,
} from '../renderTypes'

export function buildBankAccountsProjection(
  bankAccounts: BankAccountLike[],
): PreviewBankAccount[] {
  return bankAccounts.map((account) => ({
    id: account.id,
    bankName: account.bank_name || '',
    accountName: account.account_name || '',
    accountNumber: account.account_number || '',
    sortCode: account.sort_code || '',
    isDefault: account.is_default === true,
  }))
}

export function resolveSelectedBankAccount(
  previewBankAccounts: PreviewBankAccount[],
  bankAccountId?: string | null,
): PreviewBankAccount | null {
  return (
    previewBankAccounts.find((account) => account.id === bankAccountId)
    || previewBankAccounts.find((account) => account.isDefault)
    || previewBankAccounts[0]
    || null
  )
}

export function buildCompanyPreviewLines(settings?: SettingsLike): string[] {
  return [
    settings?.company_address,
    [settings?.company_city, settings?.company_state].filter(Boolean).join(', '),
  ].filter(Boolean) as string[]
}

export function buildClientPreviewLines(client?: ClientLike): string[] {
  return [
    client?.address || null,
    [client?.city, client?.state].filter(Boolean).join(', '),
  ].filter(Boolean) as string[]
}

export function buildSignatoryProjection(
  signatory: PreviewSignatory | null,
): PreviewSignatory | null {
  if (!signatory) return null
  return {
    name: signatory.name || '',
    role: signatory.role || '',
    signatureUrl: signatory.signatureUrl || '',
  }
}
