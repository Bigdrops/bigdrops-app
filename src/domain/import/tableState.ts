import type { InvoiceItem } from '@/domain/invoice'

function hasText(value: unknown) {
  return String(value ?? '').trim() !== ''
}

function hasMeaningfulCustomData(item: InvoiceItem) {
  return Object.values(item.custom_data || {}).some((value) => {
    if (typeof value === 'number') return !Number.isNaN(value) && value !== 0
    return hasText(value)
  })
}

export function isMeaningfulStandardRow(item: InvoiceItem) {
  if (item.row_type === 'group_header') return false

  return (
    hasText(item.description) ||
    hasText(item.sub_description) ||
    hasText(item.make) ||
    hasText(item.unit) ||
    hasText(item.image_url) ||
    Number(item.quantity ?? 1) !== 1 ||
    Number(item.unit_price ?? 0) !== 0 ||
    item.install_rate !== null && item.install_rate !== undefined && Number(item.install_rate) !== 0 ||
    item.vat_rate !== null && item.vat_rate !== undefined ||
    item.discount_rate !== null && item.discount_rate !== undefined ||
    hasMeaningfulCustomData(item)
  )
}

export function hasMeaningfulStandardRows(items: InvoiceItem[]) {
  return items.some((item) => isMeaningfulStandardRow(item))
}
