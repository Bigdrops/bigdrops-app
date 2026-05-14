import { normalizeQuantity } from '@/domain/invoice/normalize'
import type { InvoiceItemLike } from '../renderTypes'

export function resolveLineAmount(item: InvoiceItemLike): number {
  const explicitAmount = Number(item.amount)
  if (Number.isFinite(explicitAmount) && explicitAmount !== 0) return explicitAmount
  return normalizeQuantity(item.quantity, 1) * Number(item.unit_price || 0)
}

export function resolvePreviewGroupSubtotal(items: InvoiceItemLike[], groupId: string | null | undefined) {
  if (!groupId) return 0
  return items.reduce((subtotal, item) => {
    if (item.row_type === 'group_header') return subtotal
    if (item.group_id !== groupId) return subtotal
    return subtotal + resolveLineAmount(item)
  }, 0)
}
