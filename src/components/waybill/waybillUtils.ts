import { formatDisplayDate } from '@/lib/formatters/date'
import { safeParseJson } from '@/lib/json/safeParseJson'

export type WaybillType = 'internal' | 'external'

export interface WaybillMetric {
  label: string
  value: string
  tone?: 'default' | 'amber' | 'green' | 'blue' | 'purple'
  hint?: string
}
export type WaybillStatus = 'dispatched' | 'pending_confirmation' | 'delivered' | 'returned'
export type TransportMode = 'By Vehicle' | 'By Hand' | 'Courier' | 'Self Pick-Up'
export type WaybillPurpose = 'Supply' | 'Return' | 'Third-Party Custody'
export type ItemCondition = 'good' | 'damaged' | 'partial'
export type SignatureRole = 'sender' | 'receiver'

export interface WaybillCustomColumn {
  key: string
  label: string
}

export interface WaybillItemCustomData {
  [key: string]: string | number | null | undefined
}

export interface WaybillItem {
  description: string
  quantity: number
  unit: string | null
  condition?: ItemCondition
  custom_data: WaybillItemCustomData
  row_type?: 'standard' | 'group_header'
}

export interface WaybillSignatureEvidence {
  present?: boolean | null
  description?: string
  confidence?: string
  image_url?: string
  drawn_data_url?: string
}

export interface WaybillCustomFields {
  customColumns?: WaybillCustomColumn[]
  columnVisibility?: Record<string, boolean>
  signatures?: {
    sender?: WaybillSignatureEvidence
    receiver?: WaybillSignatureEvidence
  }
  partyNotes?: {
    sender?: string
    receiver?: string
  }
  references?: {
    linkedInvoiceNumber?: string
    linkedProjectName?: string
    sourceDocumentNumber?: string
  }
  importMeta?: {
    source?: 'json'
    importedAt?: string
    instructionsAccepted?: boolean
  }
}

export interface Waybill {
  id?: string
  waybill_number: string
  type: WaybillType
  date: string
  time: string
  sender_name: string
  receiver_name: string
  receiver_signature_url: string
  receiver_description: string
  client_id: string
  client_name: string
  project_id: string
  invoice_id: string
  po_number: string
  vehicle_plate: string
  driver_name: string
  transport_mode: TransportMode
  purpose: WaybillPurpose | ''
  delivery_location: string
  items: WaybillItem[]
  notes: string
  status: WaybillStatus
  created_by: string
  created_at?: string
  archived_at?: string
  custom_fields?: string | WaybillCustomFields | null
}

type WaybillImportResult = {
  type: WaybillType
  fields: Partial<Waybill>
  items: WaybillItem[]
  customColumns: WaybillCustomColumn[]
  customFields: WaybillCustomFields
}

export const WAYBILL_COLUMN_LIMIT = 4

export const STATUS_META: Record<string, { label: string; className: string }> = {
  dispatched: { label: 'Dispatched', className: 'bg-blue-500 text-white' },
  pending_confirmation: { label: 'Pending Confirmation', className: 'bg-amber-500 text-white' },
  delivered: { label: 'Delivered', className: 'bg-emerald-500 text-white' },
  returned: { label: 'Returned', className: 'bg-rose-500 text-white' },
}

export const TYPE_META: Record<string, { label: string; className: string }> = {
  internal: { label: 'Internal', className: 'bg-purple-600 text-white' },
  external: { label: 'External', className: 'bg-blue-600 text-white' },
}

export const CONDITION_OPTIONS: { value: ItemCondition; label: string }[] = [
  { value: 'good', label: 'Good' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'partial', label: 'Partial' },
]

export const TRANSPORT_MODE_OPTIONS: { value: TransportMode; label: string }[] = [
  { value: 'By Vehicle', label: 'By Vehicle' },
  { value: 'By Hand', label: 'By Hand' },
  { value: 'Courier', label: 'Courier' },
  { value: 'Self Pick-Up', label: 'Self Pick-Up' },
]

export const PURPOSE_OPTIONS: { value: WaybillPurpose; label: string }[] = [
  { value: 'Supply', label: 'Supply' },
  { value: 'Return', label: 'Return' },
  { value: 'Third-Party Custody', label: 'Third-Party Custody' },
]

export const WAYBILL_TYPE_CONTENT: Record<
  WaybillType,
  {
    title: string
    intro: string
    senderLabel: string
    senderPlaceholder: string
    senderNoteLabel: string
    receiverLabel: string
    receiverPlaceholder: string
    receiverNoteLabel: string
    locationLabel: string
    locationPlaceholder: string
    clientLabel: string
    clientHelp: string
    signatureSectionTitle: string
    senderSignatureLabel: string
    receiverSignatureLabel: string
    ackPendingText: string
    pdfTitle: string
    senderPdfLabel: string
    receiverPdfLabel: string
  }
> = {
  internal: {
    title: 'Internal Waybill',
    intro: 'Use this for internal movement, custody transfer, and worksite dispatch between your own teams.',
    senderLabel: 'Released By / From Location',
    senderPlaceholder: 'Store, workshop, or releasing staff',
    senderNoteLabel: 'Release Notes',
    receiverLabel: 'Received By / To Location',
    receiverPlaceholder: 'Receiving team, site, or custodian',
    receiverNoteLabel: 'Receipt Notes',
    locationLabel: 'Movement Route / Destination',
    locationPlaceholder: 'Where the items are moving within operations',
    clientLabel: 'Client (optional)',
    clientHelp: 'Only add a client when this internal movement still references a client-facing job.',
    signatureSectionTitle: 'Internal Custody Acknowledgement',
    senderSignatureLabel: 'Released By Signature',
    receiverSignatureLabel: 'Received By Signature',
    ackPendingText: 'Internal acknowledgement can be completed later when the receiving team signs off.',
    pdfTitle: 'INTERNAL WAYBILL',
    senderPdfLabel: 'Released By / From',
    receiverPdfLabel: 'Received By / To',
  },
  external: {
    title: 'Waybill/Delivery note',
    intro: 'Use this for delivery to a client or outside recipient where sender, receiver, and delivery destination must be clear.',
    senderLabel: 'Sender',
    senderPlaceholder: 'Dispatch officer or sending representative',
    senderNoteLabel: 'Sender Notes',
    receiverLabel: 'Receiver',
    receiverPlaceholder: 'Client rep or receiving contact',
    receiverNoteLabel: 'Receiver Notes',
    locationLabel: 'Delivery Location',
    locationPlaceholder: 'Client address, site, or drop-off location',
    clientLabel: 'Client',
    clientHelp: 'Client helps identify the outside party receiving the delivery.',
    signatureSectionTitle: 'Receiver Acknowledgement',
    senderSignatureLabel: 'Sender Signature',
    receiverSignatureLabel: 'Receiver Signature',
    ackPendingText: 'Receiver signature can be completed later if delivery acknowledgement happens offline.',
    pdfTitle: 'Waybill/Delivery note',
    senderPdfLabel: 'Sender',
    receiverPdfLabel: 'Receiver',
  },
}

export function parseWaybillCustomFields(value: unknown): WaybillCustomFields {
  if (!value) return {}

  const candidate =
    typeof value === 'string'
      ? safeParseJson(value, {})
      : value

  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return {}

  const parsed = candidate as WaybillCustomFields
  return {
    ...parsed,
    customColumns: Array.isArray(parsed.customColumns)
      ? parsed.customColumns
          .map((column) => makeWaybillCustomColumn(column?.label || column?.key || 'Custom Field', column?.key))
          .slice(0, WAYBILL_COLUMN_LIMIT)
      : [],
    columnVisibility: parsed.columnVisibility && typeof parsed.columnVisibility === 'object' && !Array.isArray(parsed.columnVisibility)
      ? parsed.columnVisibility as Record<string, boolean>
      : undefined,
    signatures: {
      sender: normalizeSignatureEvidence(parsed.signatures?.sender),
      receiver: normalizeSignatureEvidence(parsed.signatures?.receiver),
    },
    partyNotes: {
      sender: String(parsed.partyNotes?.sender || ''),
      receiver: String(parsed.partyNotes?.receiver || ''),
    },
    references: {
      linkedInvoiceNumber: String(parsed.references?.linkedInvoiceNumber || ''),
      linkedProjectName: String(parsed.references?.linkedProjectName || ''),
      sourceDocumentNumber: String(parsed.references?.sourceDocumentNumber || ''),
    },
    importMeta: parsed.importMeta && typeof parsed.importMeta === 'object' ? parsed.importMeta : undefined,
  }
}

export function normalizeSignatureEvidence(value: unknown): WaybillSignatureEvidence {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const evidence = value as WaybillSignatureEvidence
  return {
    present: typeof evidence.present === 'boolean' ? evidence.present : evidence.present === null ? null : undefined,
    description: String(evidence.description || ''),
    confidence: String(evidence.confidence || ''),
    image_url: String(evidence.image_url || ''),
    drawn_data_url: String(evidence.drawn_data_url || ''),
  }
}

export function getWaybillSignature(waybill: Pick<Waybill, 'receiver_signature_url' | 'custom_fields'>, role: SignatureRole): WaybillSignatureEvidence {
  const customFields = parseWaybillCustomFields(waybill.custom_fields)
  const signature = normalizeSignatureEvidence(customFields.signatures?.[role])

  if (role === 'receiver' && !signature.image_url && waybill.receiver_signature_url) {
    signature.image_url = waybill.receiver_signature_url
  }

  return signature
}

export function buildWaybillCustomFields(
  current: unknown,
  patch: Partial<WaybillCustomFields> = {},
): WaybillCustomFields {
  const base = parseWaybillCustomFields(current)
  return {
    ...base,
    ...patch,
    customColumns: patch.customColumns || base.customColumns || [],
    columnVisibility: patch.columnVisibility ?? base.columnVisibility,
    signatures: {
      sender: patch.signatures?.sender ? normalizeSignatureEvidence(patch.signatures.sender) : base.signatures?.sender || {},
      receiver: patch.signatures?.receiver ? normalizeSignatureEvidence(patch.signatures.receiver) : base.signatures?.receiver || {},
    },
    partyNotes: {
      sender: patch.partyNotes?.sender ?? base.partyNotes?.sender ?? '',
      receiver: patch.partyNotes?.receiver ?? base.partyNotes?.receiver ?? '',
    },
    references: {
      linkedInvoiceNumber: patch.references?.linkedInvoiceNumber ?? base.references?.linkedInvoiceNumber ?? '',
      linkedProjectName: patch.references?.linkedProjectName ?? base.references?.linkedProjectName ?? '',
      sourceDocumentNumber: patch.references?.sourceDocumentNumber ?? base.references?.sourceDocumentNumber ?? '',
    },
  }
}

export function mapDbWaybill(row: Partial<Waybill> | Record<string, unknown>): Waybill {
  const customFields = parseWaybillCustomFields((row as Waybill).custom_fields)
  const items = normalizeWaybillItems((row as Waybill).items, customFields.customColumns || [])

  return {
    id: String((row as Waybill).id || ''),
    waybill_number: String((row as Waybill).waybill_number || ''),
    type: normalizeWaybillType((row as Waybill).type),
    date: String((row as Waybill).date || ''),
    time: String((row as Waybill).time || ''),
    sender_name: String((row as Waybill).sender_name || ''),
    receiver_name: String((row as Waybill).receiver_name || ''),
    receiver_signature_url: String((row as Waybill).receiver_signature_url || ''),
    receiver_description: String((row as Waybill).receiver_description || ''),
    client_id: String((row as Waybill).client_id || ''),
    client_name: String((row as Waybill).client_name || ''),
    project_id: String((row as Waybill).project_id || ''),
    invoice_id: String((row as Waybill).invoice_id || ''),
    po_number: String((row as Waybill).po_number || ''),
    vehicle_plate: String((row as Waybill).vehicle_plate || ''),
    driver_name: String((row as Waybill).driver_name || ''),
    transport_mode: normalizeTransportMode((row as Waybill).transport_mode),
    purpose: normalizeWaybillPurpose((row as Waybill).purpose),
    delivery_location: String((row as Waybill).delivery_location || ''),
    items,
    notes: String((row as Waybill).notes || ''),
    status: normalizeWaybillStatus((row as Waybill).status),
    created_by: String((row as Waybill).created_by || ''),
    created_at: String((row as Waybill).created_at || ''),
    custom_fields: customFields,
  }
}

export function createDefaultWaybill(): Omit<Waybill, 'id' | 'created_at'> {
  const today = new Date().toISOString().split('T')[0]
  return {
    waybill_number: '',
    type: 'internal',
    date: today,
    time: '',
    sender_name: '',
    receiver_name: '',
    receiver_signature_url: '',
    receiver_description: '',
    client_id: '',
    client_name: '',
    project_id: '',
    invoice_id: '',
    po_number: '',
    vehicle_plate: '',
    driver_name: '',
    transport_mode: 'By Vehicle',
    purpose: '',
    delivery_location: '',
    items: [createDefaultItem()],
    notes: '',
    status: 'dispatched',
    created_by: '',
    custom_fields: buildWaybillCustomFields({}, {
      customColumns: [],
      signatures: {
        sender: { present: null, description: '', confidence: '' },
        receiver: { present: null, description: '', confidence: '' },
      },
      partyNotes: {
        sender: '',
        receiver: '',
      },
      references: {
        linkedInvoiceNumber: '',
        linkedProjectName: '',
        sourceDocumentNumber: '',
      },
    }),
  }
}

export function createDefaultItem(): WaybillItem {
  return { description: '', quantity: 1, unit: '', condition: 'good', custom_data: {}, row_type: 'standard' } as WaybillItem
}

export function normalizeWaybillType(value: unknown): WaybillType {
  return String(value || '').toLowerCase() === 'external' ? 'external' : 'internal'
}

export function normalizeWaybillStatus(value: unknown): WaybillStatus {
  const status = String(value || '').toLowerCase()
  if (status === 'dispatched' || status === 'pending_confirmation' || status === 'delivered' || status === 'returned') {
    return status as WaybillStatus
  }
  if (status === 'draft') return 'dispatched'
  return 'dispatched'
}

export function normalizeCondition(value: unknown): ItemCondition {
  const condition = String(value || '').toLowerCase()
  if (condition === 'damaged' || condition === 'partial') return condition
  return 'good'
}

export function createCustomColumnKey(label: string): string {
  const normalized = normalizeDataKey(label)
  return normalized || `custom_${Date.now()}`
}

export function makeWaybillCustomColumn(label: string, key?: string): WaybillCustomColumn {
  const normalizedLabel = String(label || 'Custom Field').trim() || 'Custom Field'
  return {
    key: key ? normalizeDataKey(key) || createCustomColumnKey(normalizedLabel) : createCustomColumnKey(normalizedLabel),
    label: normalizedLabel,
  }
}

export function normalizeWaybillItem(item: unknown, customColumns: WaybillCustomColumn[] = []): WaybillItem {
  const record = item && typeof item === 'object' && !Array.isArray(item) ? (item as Record<string, unknown>) : {}
  const baseCustomData = record.custom_data && typeof record.custom_data === 'object' && !Array.isArray(record.custom_data)
    ? (record.custom_data as WaybillItemCustomData)
    : {}

    // Preserve ALL existing custom_data keys (custom_data is the sole extension mechanism)
    const custom_data: Record<string, string | number | null> = {}
    for (const [key, value] of Object.entries(baseCustomData)) {
      custom_data[key] = normalizePrimitiveValue(value)
    }
    // Ensure every customColumn key is present (even if missing from source)
    for (const column of customColumns) {
      if (!(column.key in custom_data)) {
        custom_data[column.key] = ''
      }
    }

  return {
    description: String(record.description || ''),
    quantity: toNumber(record.qty ?? record.quantity),
    unit: String(record.unit || ''),
    condition: normalizeCondition(record.condition),
    row_type: 'standard' as const,
    custom_data,
  }
}

export function normalizeWaybillItems(items: unknown, customColumns: WaybillCustomColumn[] = []): WaybillItem[] {
  if (!Array.isArray(items) || items.length === 0) return [createDefaultItem()]
  return items.map((item) => normalizeWaybillItem(item, customColumns))
}

export function normalizeTransportMode(value: unknown): TransportMode {
  const mode = String(value || '').trim()
  if (mode === 'By Vehicle' || mode === 'By Hand' || mode === 'Courier' || mode === 'Self Pick-Up') {
    return mode
  }
  return 'By Vehicle'
}

export function normalizeWaybillPurpose(value: unknown): WaybillPurpose | '' {
  const purpose = String(value || '').trim()
  if (purpose === 'Supply' || purpose === 'Return' || purpose === 'Third-Party Custody') {
    return purpose
  }
  return ''
}

export function validateWaybill(waybill: Partial<Waybill>): string[] {
  const errors: string[] = []
  if (!waybill.sender_name?.trim()) errors.push('Sender name is required')
  if (!waybill.receiver_name?.trim()) errors.push('Receiver name is required')
  if (!waybill.transport_mode) errors.push('Transport mode is required')
  if (waybill.type === 'external' && !waybill.purpose) errors.push('Purpose is required for external waybills')
  if (!Array.isArray(waybill.items) || waybill.items.length === 0) {
    errors.push('At least one item is required')
  }
  return errors
}

export function getNextWaybillNumber(
  type: WaybillType,
  existingNumbers: string[],
  prefix: string = 'WBL',
  mode: 'normal' | 'blank' = 'normal',
): string {
  let routingSuffix: string
  if (mode === 'blank') {
    routingSuffix = type === 'internal' ? '-MI-' : '-ME-'
  } else {
    routingSuffix = type === 'internal' ? '-I-' : '-E-'
  }
  const routingPrefix = `${prefix}${routingSuffix}`
  const nums = existingNumbers
    .filter((n) => n.startsWith(routingPrefix))
    .map((n) => parseInt(n.slice(routingPrefix.length), 10))
    .filter((n) => !isNaN(n))
  const highest = nums.length > 0 ? Math.max(...nums) : 0
  return `${routingPrefix}${String(highest + 1).padStart(6, '0')}`
}

export function getStatusMeta(status: string) {
  return STATUS_META[status?.toLowerCase()] ?? STATUS_META.dispatched
}

export function getTypeMeta(type: string) {
  return TYPE_META[type?.toLowerCase()] ?? TYPE_META.internal
}

export function formatWaybillDate(value: string | null | undefined): string {
  return formatDisplayDate(value, {
    fallback: '—',
    locale: 'en-GB',
    dateOptions: { day: '2-digit', month: 'short', year: 'numeric' },
  })
}

export function formatWaybillTime(value: string | null | undefined): string {
  return String(value || '').trim() || '—'
}

export function getWaybillTypeContent(type: WaybillType) {
  return WAYBILL_TYPE_CONTENT[type]
}

export function collectWaybillCustomColumns(items: WaybillItem[], existingColumns: WaybillCustomColumn[] = []): WaybillCustomColumn[] {
  const map = new Map<string, WaybillCustomColumn>()

  existingColumns.forEach((column) => {
    const normalized = makeWaybillCustomColumn(column.label, column.key)
    map.set(normalized.key, normalized)
  })

  items.forEach((item) => {
    Object.keys(item.custom_data || {}).forEach((key) => {
      const normalizedKey = normalizeDataKey(key)
      if (!normalizedKey || map.has(normalizedKey)) return
      map.set(normalizedKey, makeWaybillCustomColumn(labelFromKey(normalizedKey), normalizedKey))
    })
  })

  return Array.from(map.values()).slice(0, WAYBILL_COLUMN_LIMIT)
}

export function normalizeWaybillImport(input: unknown, currentType: WaybillType): WaybillImportResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Paste one JSON object for the waybill import.')
  }

  const record = input as Record<string, unknown>
  const importedType = normalizeWaybillType(record.type || record.waybill_type || currentType)
  const customColumnsMap = new Map<string, WaybillCustomColumn>()
  const importedItems = Array.isArray(record.items) ? record.items : Array.isArray(record.line_items) ? record.line_items : []

  const items = (importedItems.length > 0 ? importedItems : [createDefaultItem()]).map((entry) => {
    const item = entry && typeof entry === 'object' && !Array.isArray(entry) ? (entry as Record<string, unknown>) : {}
    const custom_data: WaybillItemCustomData = {}

    Object.entries(item).forEach(([key, value]) => {
      const normalizedKey = normalizeDataKey(key)
      if (!normalizedKey) return
      if (['description', 'quantity', 'unit', 'condition'].includes(normalizedKey)) return
      const primitiveValue = normalizePrimitiveValue(value)
      custom_data[normalizedKey] = primitiveValue
      if (!customColumnsMap.has(normalizedKey)) {
        customColumnsMap.set(normalizedKey, makeWaybillCustomColumn(labelFromKey(normalizedKey), normalizedKey))
      }
    })

    return {
      description: String(item.description || item.item_description || item.name || ''),
      quantity: toNumber(item.quantity, 1),
      unit: String(item.unit || ''),
      condition: normalizeCondition(item.condition),
      custom_data,
      row_type: 'standard' as const,
    }
  })

  const customColumns = Array.from(customColumnsMap.values()).slice(0, WAYBILL_COLUMN_LIMIT)

  return {
    type: importedType,
    fields: {
      type: importedType,
      date: normalizeDateValue(record.date),
      time: String(record.time || record.dispatch_time || ''),
      sender_name: String(
        record.sender_name ||
          record.sender ||
          record.released_by ||
          record.from_location ||
          record.from_party ||
          '',
      ),
      receiver_name: String(
        record.receiver_name ||
          record.receiver ||
          record.received_by ||
          record.to_location ||
          record.to_party ||
          '',
      ),
      client_name: String(record.client_name || record.client || ''),
      po_number: String(record.po_number || record.po || ''),
      vehicle_plate: String(record.vehicle_plate || record.vehicle || ''),
      delivery_location: String(record.delivery_location || record.destination || record.to_location || ''),
      notes: String(record.notes || record.remarks || ''),
      receiver_description: String(record.receiver_description || record.acknowledgement_notes || ''),
      status: normalizeWaybillStatus(record.status),
    },
    items,
    customColumns,
    customFields: {
      customColumns,
      signatures: {
        sender: normalizeImportedSignature(record, 'sender'),
        receiver: normalizeImportedSignature(record, 'receiver'),
      },
      partyNotes: {
        sender: String(record.sender_note || record.release_note || ''),
        receiver: String(record.receiver_note || record.receipt_note || ''),
      },
      references: {
        linkedInvoiceNumber: String(record.linked_invoice_number || record.invoice_number || ''),
        linkedProjectName: String(record.linked_project_name || record.project_name || ''),
        sourceDocumentNumber: String(record.source_document_number || record.reference_number || ''),
      },
      importMeta: {
        source: 'json',
        importedAt: new Date().toISOString(),
      },
    },
  }
}

function normalizeImportedSignature(record: Record<string, unknown>, role: SignatureRole): WaybillSignatureEvidence {
  return {
    present: toNullableBoolean(record[`${role}_signature_present`]),
    description: String(record[`${role}_signature_description`] || ''),
    confidence: String(record[`${role}_signature_confidence`] || ''),
  }
}

function toNullableBoolean(value: unknown): boolean | null | undefined {
  if (value === null || value === undefined || value === '') return undefined
  if (typeof value === 'boolean') return value
  const normalized = String(value).toLowerCase()
  if (['yes', 'true', 'present', 'detected'].includes(normalized)) return true
  if (['no', 'false', 'missing', 'absent'].includes(normalized)) return false
  return undefined
}

function normalizePrimitiveValue(value: unknown): string | number | null {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'number') return Number.isFinite(value) ? value : ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

function normalizeDateValue(value: unknown): string {
  const text = String(value || '').trim()
  if (!text) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text
  const parsed = new Date(text)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().slice(0, 10)
}

function normalizeDataKey(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function labelFromKey(key: string): string {
  return key
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
