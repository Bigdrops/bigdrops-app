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

export type CompanyPreviewResult = {
  addressLines: string[]
  website: string | null
  customInfo: Array<{ label: string; value: string }>
}

export function buildCompanyPreviewLines(settings?: SettingsLike): CompanyPreviewResult {
  const addressLines = [
    settings?.company_address,
    [settings?.company_city, settings?.company_state].filter(Boolean).join(', '),
  ].filter(Boolean) as string[]

  const website = settings?.company_website || null

  let customInfo: Array<{ label: string; value: string }> = []
  if (settings?.custom_info) {
    try {
      const parsed = JSON.parse(settings.custom_info)
      if (Array.isArray(parsed)) {
        customInfo = parsed
          .filter((item: any) => item?.label && item?.value)
          .map((item: any) => ({ label: String(item.label), value: String(item.value) }))
      }
    } catch {
      // ignore malformed JSON
    }
  }

  return { addressLines, website, customInfo }
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
