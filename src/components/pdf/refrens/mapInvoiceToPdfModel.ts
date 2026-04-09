import { getAdvanceSummaryValues } from '@/domain/invoice/advanceSummary'
import type { Invoice } from '@/domain/invoice'
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

export function mapInvoiceToPdfModel({
  templateId,
  document,
  items,
  client,
  settings,
  computedResult,
  pdfOutput,
  bankAccounts,
  signatory,
}: MapperContext<Invoice>): RefrensPdfModel {
  const customFields = parsePdfCustomFields(document.custom_fields)
  const output = pdfOutput || resolvePdfOutput(document.custom_fields)
  const columnConfig = getColumnConfig(customFields)
  const headerEntries = getHeaderEntries(customFields)
  const bank = pickBankAccount(output, bankAccounts)
  const supportBlocks: RefrensPdfModel['supportBlocks'] = []
  const advanceSummary = getAdvanceSummaryValues({
    ...document,
    ...computedResult,
  })

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

  if (signatory && (hasText(signatory.signature_url) || hasText(signatory.name) || hasText(signatory.role))) {
    supportBlocks.push({
      type: 'signature',
      title: 'Authorised Signatory',
      name: asText(signatory.name) || undefined,
      role: asText(signatory.role) || 'Authorised Signatory',
      signatureUrl: asText(signatory.signature_url) || undefined,
    })
  }

  return {
    templateId,
    documentLabel: asText(document.document_type) || 'Invoice',
    documentNumber: asText(document.invoice_number) || 'Invoice',
    title: asText(document.invoice_title) || undefined,
    logoUrl: asText(settings?.company_logo_url) || asText(settings?.logo_url) || undefined,
    companyName: asText(settings?.company_name) || 'Business Name',
    companyTagline: output.showTagline === false ? undefined : asText(settings?.company_tagline) || undefined,
    metaEntries: [
      { label: 'Date', value: asText(document.issue_date) },
      { label: 'Due', value: asText(document.due_date) },
      { label: 'PO', value: asText(document.po_number) },
      { label: 'Terms', value: asText(document.custom_payment_terms) || asText(document.payment_terms) },
      { label: 'Ref', value: asText(document.work_duration) },
      ...headerEntries,
    ].filter((entry) => hasText(entry.value)),
    leftParty: {
      label: 'Bill To',
      name: asText(document.client_name) || 'Unassigned client',
      lines: getClientLines(client),
    },
    rightParty: {
      label: 'Billed By',
      name: asText(settings?.company_name) || 'Business Name',
      lines: getCompanyLines(settings),
    },
    items,
    computedResult: advanceSummary
      ? {
          ...computedResult,
          balanceDue: advanceSummary.thisAdvance,
        }
      : computedResult,
    columnConfig,
    descriptionExtras: (item) => buildItemDescriptionExtras(item, columnConfig),
    supportBlocks,
    footerText: output.showFooter === false ? undefined : asText(settings?.footer_text) || undefined,
    amountInWords: asText(document.amount_in_words) || undefined,
    totalLabel: advanceSummary ? advanceSummary.primaryLabel : 'Balance Due',
    showBalanceDue: output.showBalanceDue !== false,
  }
}
