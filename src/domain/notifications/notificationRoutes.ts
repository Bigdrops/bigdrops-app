export type NotificationEntityType =
  | 'invoice'
  | 'quotation'
  | 'quote'
  | 'rfq'
  | 'waybill'
  | 'project'
  | 'client'
  | 'payment'
  | string

export type NotificationRouteInput = {
  entity_type?: NotificationEntityType | null
  entity_id?: string | null
}

export function getNotificationRoute(notification: NotificationRouteInput): string | null {
  const entityId = notification.entity_id
  if (!entityId) return null

  const entityType = String(notification.entity_type || '').toLowerCase()

  if (entityType === 'invoice' || entityType === 'payment') return `/invoices/${entityId}`
  if (entityType === 'quotation' || entityType === 'quote') return `/quotations/${entityId}`
  if (entityType === 'rfq' || entityType === 'csr') return `/rfqs/${entityId}`
  if (entityType === 'waybill') return `/waybills/${entityId}`
  if (entityType === 'letter') return `/letters/${entityId}`
  if (entityType === 'project') return `/projects/${entityId}`
  if (entityType === 'client') return `/clients/${entityId}`

  return null
}