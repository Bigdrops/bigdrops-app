import type { Quotation } from '@/domain/quotation'
import type { MapperContext, RefrensPdfModel } from './types'
import {
  asText,
  buildItemDescriptionExtras,
  getAttachmentLinks,
  getBottomText,
  getClientLines,
  getColumnConfig,
  getCompanyLines,
  getHeaderEntries,
  hasText,
  parsePdfCustomFields,
  pickBankAccount,
  resolvePdfOutput,
} from './modelUtils'

export function mapQuotationToPdfModel({
  templateId,
  document,
  items,
  client,
  settings,
  computedResult,
  pdfOutput,
  bankAccounts,
}: MapperContext<Quotation>): RefrensPdfModel {
  const customFields = parsePdfCustomFields(document.custom_fields)
  const output = pdfOutput || resolvePdfOutput(document.custom_fields)
  const columnConfig = getColumnConfig(customFields)
  const headerEntries = getHeaderEntries(customFields)
  const bank = pickBankAccount(output, bankAccounts)
  const supportBlocks: RefrensPdfModel['supportBlocks'] = []

  if (bank) {
    supportBlocks.push({
      type: 'bank',
      title: 'Bank Details',
      rows: [
        { label: 'Bank', value: asText(bank.bank_name) },
        { label: 'Account', value: asText(bank.account_number) },
        { label: 'Holder', value: asText(bank.account_name) },
        { label: 'Sort Code', value: asText(bank.sort_code) },
      ].filter((row) => hasText(row.value)),
    })
  }

  if (hasText(document.notes)) {
    supportBlocks.push({
      type: 'text',
      title: customFields.notesTitle || 'Notes',
      text: asText(document.notes),
    })
  }

  if (hasText(document.terms)) {
    supportBlocks.push({
      type: 'text',
      title: customFields.termsTitle || 'Terms & Conditions',
      text: asText(document.terms),
    })
  }

  const bottomNotes = getBottomText(customFields)
  if (bottomNotes.length) {
    supportBlocks.push({
      type: 'text',
      title: 'Additional Info',
      text: bottomNotes.join('\n'),
    })
  }

  const attachments = getAttachmentLinks(customFields)
  if (attachments.length) {
    supportBlocks.push({
      type: 'links',
      title: 'Supporting Documents',
      links: attachments,
    })
  }

  return {
    templateId,
    documentLabel: 'Quotation',
    documentNumber: asText(document.quotation_number) || 'Quotation',
    title: asText(document.quotation_title) || undefined,
    logoUrl: asText(settings?.company_logo_url) || asText(settings?.logo_url) || undefined,
    companyName: asText(settings?.company_name) || 'Business Name',
    companyTagline: output.showTagline === false ? undefined : asText(settings?.company_tagline) || undefined,
    metaEntries: [
      { label: 'Date', value: asText(document.issue_date) },
      { label: 'Valid Until', value: asText(document.valid_until) },
      { label: 'PO', value: asText(document.po_number) },
      ...headerEntries,
    ].filter((entry) => hasText(entry.value)),
    leftParty: {
      label: 'Prepared For',
      name: asText(document.client_name) || 'Unassigned client',
      lines: getClientLines(client),
    },
    rightParty: {
      label: 'Prepared By',
      name: asText(settings?.company_name) || 'Business Name',
      lines: getCompanyLines(settings),
    },
    items,
    computedResult,
    columnConfig,
    descriptionExtras: (item) => buildItemDescriptionExtras(item, columnConfig),
    supportBlocks,
    footerText: output.showFooter === false ? undefined : asText(settings?.footer_text) || undefined,
    amountInWords: asText(document.amount_in_words) || undefined,
    totalLabel: 'Total Payable',
    showBalanceDue: false,
  }
}
