import { parseCustomFields, getInvoicePdfOutput, type ColumnConfig } from '@/domain/invoice'
import { BUILTIN_COLUMNS, getPdfColumns } from '@/domain/invoice'
import { buildRenderRows } from '@/components/pdf/base/renderItems'
import { stripHtml } from '@/components/pdf/pdfUtils'
import type { DocumentResult } from '@/lib/Calculations'
import type { InvoiceItem } from '@/domain/invoice'
import type { PdfBankAccount, PdfOutputState } from './types'

type CustomFieldShape = ReturnType<typeof parseCustomFields> & {
  columnConfig?: ColumnConfig[]
  notesTitle?: string
  termsTitle?: string
  header?: Array<{ label?: unknown; value?: unknown }>
  bottom?: Array<{ text?: unknown }>
  attachments?: Array<{ label?: unknown; name?: unknown; url?: unknown }>
  groupMeta?: Record<string, { showSubtotal?: boolean }>
}

export function asText(value: unknown): string {
  return String(value || '').trim()
}

export function hasText(value: unknown): boolean {
  return asText(value).length > 0
}

export function cleanText(value: unknown): string {
  return stripHtml(asText(value))
}

export function parsePdfCustomFields(value: unknown): CustomFieldShape {
  return parseCustomFields(value) as CustomFieldShape
}

export function resolvePdfOutput(value: unknown): PdfOutputState {
  return getInvoicePdfOutput(value)
}

export function getColumnConfig(customFields: CustomFieldShape): ColumnConfig[] {
  return Array.isArray(customFields.columnConfig) && customFields.columnConfig.length
    ? customFields.columnConfig
    : BUILTIN_COLUMNS
}

export function isColumnVisible(columns: ColumnConfig[], key: string): boolean {
  const column = columns.find((entry) => entry.key === key)
  return column ? column.visible !== false : true
}

export function buildPdfRows(
  items: InvoiceItem[],
  computedResult: DocumentResult,
  customFields: CustomFieldShape,
) {
  return buildRenderRows({
    rawItems: items,
    computedItems: computedResult.items || [],
    groups: computedResult.groups || [],
    groupMeta: customFields.groupMeta || {},
  })
}

export function getHeaderEntries(customFields: CustomFieldShape) {
  return (customFields.header || [])
    .map((field) => ({
      label: asText(field?.label),
      value: asText(field?.value),
    }))
    .filter((field) => hasText(field.label) && hasText(field.value))
}

export function getBottomText(customFields: CustomFieldShape) {
  return (customFields.bottom || [])
    .map((field) => asText(field?.text))
    .filter(hasText)
}

export function getAttachmentLinks(customFields: CustomFieldShape) {
  return (customFields.attachments || [])
    .map((entry, index) => ({
      label: asText(entry?.label) || asText(entry?.name) || `Reference ${index + 1}`,
      url: asText(entry?.url),
    }))
    .filter((entry) => hasText(entry.label) && hasText(entry.url))
}

export function getCompanyLines(settings?: Record<string, unknown> | null): string[] {
  return [
    settings?.company_address,
    [settings?.company_city, settings?.company_state].filter(Boolean).join(', '),
    settings?.company_phone,
    settings?.company_email,
  ]
    .map(asText)
    .filter(hasText)
}

export function getClientLines(client?: Record<string, unknown> | null): string[] {
  return [
    client?.contact_person ? `Attn: ${client.contact_person}` : '',
    client?.address,
    [client?.city, client?.state].filter(Boolean).join(', '),
    client?.phone,
    client?.email,
  ]
    .map(asText)
    .filter(hasText)
}

export function pickBankAccount(pdfOutput?: PdfOutputState, bankAccounts: PdfBankAccount[] = []) {
  if (!pdfOutput?.showBankDetails) return null
  return (
    bankAccounts.find((account) => account.id && account.id === pdfOutput.bankAccountId) ||
    bankAccounts.find((account) => account.is_default) ||
    bankAccounts[0] ||
    null
  )
}

export function getVisiblePdfColumns(columnConfig: ColumnConfig[]) {
  return getPdfColumns(columnConfig)
}

export function buildItemDescriptionExtras(
  item: InvoiceItem,
  columnConfig: ColumnConfig[],
) {
  const extras: string[] = []

  if (isColumnVisible(columnConfig, 'make') && hasText(item.make)) {
    extras.push(`Make: ${asText(item.make)}`)
  }

  columnConfig
    .filter((column) => column.visible !== false && String(column.key || '').startsWith('custom_'))
    .forEach((column) => {
      const value = item.custom_data?.[column.key]
      if (!hasText(value)) return
      extras.push(`${column.label || column.key}: ${String(value)}`)
    })

  return extras
}
