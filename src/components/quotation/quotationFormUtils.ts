import type { InvoiceItem } from '@/domain/invoice'
import type { ColumnConfig, ExtraCharge, InvoiceFieldEntry } from '@/domain/invoice'
import { toDbItem } from '@/domain/invoice'
import { buildCalculationInputs } from '@/components/useInvoiceColumns.jsx'
import { filterPopulatedAdditionalFields } from '@/components/useInvoiceColumns.jsx'
import { normalizeRichTextHtml } from '@/components/pdf/core/richText'
import type { QuotationEditorState } from './quotationFormTypes'
import type { PdfOutputState } from './quotationFormTypes'

export function makeQuotationGroupId(): string {
  return `quo_group_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function toGroupMetaMap(groups: Array<{ id: string; name: string; showSubtotal?: boolean }>) {
  return Object.fromEntries(groups.map((group) => [group.id, { name: group.name, showSubtotal: !!group.showSubtotal }]))
}

export function parseGroupMeta(value: unknown): Record<string, { name?: string; showSubtotal?: boolean }> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [key, {}]
      const record = entry as Record<string, unknown>
      return [
        key,
        {
          name: typeof record.name === 'string' ? record.name : undefined,
          showSubtotal: record.showSubtotal === true,
        },
      ]
    }),
  )
}

export function parseChargeLabels(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, label]) => [
      key,
      typeof label === 'string' ? label : String(label || ''),
    ]),
  )
}

export function normalizeQuotationGrouping(
  items: InvoiceItem[],
  groupMeta: Record<string, { name?: string; showSubtotal?: boolean }> = {},
) {
  const headerOrder: string[] = []
  const headerById = new Map<string, { id: string; name: string; showSubtotal: boolean }>()
  const rawToCanonical = new Map<string, string>()
  const seenCanonical = new Set<string>()

  items.forEach((item) => {
    if (item.row_type !== 'group_header') return
    const rawId = String(item.group_id || '').trim()
    let canonicalId = rawId && !seenCanonical.has(rawId) ? rawId : makeQuotationGroupId()
    while (seenCanonical.has(canonicalId)) canonicalId = makeQuotationGroupId()

    seenCanonical.add(canonicalId)
    if (rawId && !rawToCanonical.has(rawId)) rawToCanonical.set(rawId, canonicalId)

    const meta = (rawId && groupMeta[rawId]) || groupMeta[canonicalId] || {}
    const name = String(item.group_name || '').trim() || String(meta.name || '').trim() || `Group ${headerOrder.length + 1}`

    headerOrder.push(canonicalId)
    headerById.set(canonicalId, {
      id: canonicalId,
      name,
      showSubtotal: !!meta.showSubtotal,
    })
  })

  const normalizedItems = items.map((item, index) => {
    if (item.row_type === 'group_header') {
      const rawId = String(item.group_id || '').trim()
      const canonicalId =
        (rawId && rawToCanonical.get(rawId)) ||
        headerOrder.find((groupId) => headerById.get(groupId)?.name === item.group_name) ||
        makeQuotationGroupId()

      const group = headerById.get(canonicalId) || {
        id: canonicalId,
        name: String(item.group_name || '').trim() || `Group ${index + 1}`,
        showSubtotal: false,
      }

      return {
        ...item,
        row_type: 'group_header' as const,
        group_id: canonicalId,
        group_name: group.name,
        sort_order: index,
      }
    }

    const rawId = String(item.group_id || '').trim()
    const canonicalId = rawId ? rawToCanonical.get(rawId) : null

    return {
      ...item,
      row_type: 'standard' as const,
      group_id: canonicalId || null,
      group_name: canonicalId ? item.group_name || '' : '',
      sort_order: index,
    }
  })

  return {
    items: normalizedItems,
    groups: headerOrder.map((groupId) => headerById.get(groupId)).filter(Boolean) as Array<{
      id: string
      name: string
      showSubtotal: boolean
    }>,
  }
}

export function buildCustomFields({
  quotation,
  columns,
  headerFields,
  additionalFields,
  discountType,
  discountTiming,
  whtType,
  notesTitle,
  termsTitle,
  mergeQtyUnit,
  showItemImages,
  groups,
  attachments,
  extraCharges,
  chargeLabels,
  signatoryId,
  pdfOutput,
}: {
  quotation: QuotationEditorState
  columns: ColumnConfig[]
  headerFields: InvoiceFieldEntry[]
  additionalFields: InvoiceFieldEntry[]
  discountType: 'fixed' | 'percent'
  discountTiming: 'before' | 'after'
  whtType: 'fixed' | 'percent'
  notesTitle: string
  termsTitle: string
  mergeQtyUnit: boolean
  showItemImages: boolean
  groups: Array<{ id: string; name: string; showSubtotal?: boolean }>
  attachments: Array<Record<string, unknown>>
  extraCharges: ExtraCharge[]
  chargeLabels: Record<string, string>
  signatoryId: string | null
  pdfOutput: PdfOutputState
}) {
  const groupMeta = toGroupMetaMap(groups)

  return {
    quotationTitle: quotation.quotation_title || '',
    clientName: quotation.client_name || '',
    notesHtml: normalizeRichTextHtml(quotation.notes || ''),
    termsHtml: normalizeRichTextHtml(quotation.terms || ''),
    header: headerFields.filter((field) => field.label && field.value),
    additionalFields: filterPopulatedAdditionalFields(additionalFields),
    columnConfig: columns,
    notesTitle,
    termsTitle,
    mergeQtyUnit,
    showItemImages,
    attachments,
    extraCharges: extraCharges.filter((charge) => String(charge.label || '').trim()),
    chargeLabels,
    signatoryId,
    pdfOutput,
    payment_terms: quotation.payment_terms || '',
    custom_payment_terms: quotation.custom_payment_terms || '',
    discountType,
    discountTiming,
    whtType,
    groupMeta,
    calculationInputs: buildCalculationInputs({
      invoice: quotation,
      discountType,
      discountTiming,
      whtType,
    }),
  }
}

export function toQuotationItem(item: InvoiceItem, quotationId: string, sortOrder: number) {
  const row = toDbItem(item, quotationId, sortOrder) as Record<string, unknown>
  delete row.invoice_id
  return { ...row, quotation_id: quotationId }
}
