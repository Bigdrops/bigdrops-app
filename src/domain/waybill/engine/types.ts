export interface WaybillRenderInput {
  waybill: RawWaybill
  columns: ResolvedColumn[]
  company: CompanySettings
}

export interface ResolvedColumn {
  key: string
  label: string
}

export interface WaybillRenderModel {
  branding: BrandingBlock
  header: HeaderBlock
  parties: PartiesBlock
  logistics: LogisticsBlock
  notes: string
  signatures: SignatureBlock
  footer: FooterBlock
  pagination: PaginationPolicy
  table: TableBlock
}

export interface BrandingBlock {
  name: string
  tagline: string | null
  logo: string | null
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  customInfo: Array<{ label: string; value: string }> | null
}

export interface HeaderBlock {
  type: 'internal' | 'external'
  waybillNumber: string
  date: string
  time: string | null
  poNumber: string | null
}

export interface PartiesBlock {
  clientName: string | null
  clientAddress: string | null
  clientPhone: string | null
  clientEmail: string | null
  clientCityState: string | null
  senderName: string | null
  receiverName: string | null
}

export interface LogisticsBlock {
  vehiclePlate: string | null
  driverName: string | null
  deliveryMode: string | null
  deliveryLocation: string | null
  purpose: string | null
}

export interface SignatureBlock {
  sender: NormalizedSignature | null
  receiver: NormalizedSignature | null
}

export interface NormalizedSignature {
  url: string
  width: 110
  height: 42
}

export interface FooterBlock {
  waybillNumber: string
  companyName: string
}

export interface PaginationPolicy {
  repeatTableHeader: boolean
  keepSignatureTogether: boolean
  keepNotesTogether: boolean
}

export interface TableBlock {
  columns: PrintColumn[]
  rows: PrintRow[]
}

export interface PrintColumn {
  key: string
  label: string
}

export interface PrintRow {
  cells: Record<string, string>
}

export interface RawWaybill {
  waybill_number: string
  type: 'internal' | 'external'
  date: string
  time?: string | null
  po_number?: string | null
  client_name?: string | null
  client_address?: string | null
  client_phone?: string | null
  client_email?: string | null
  client_city_state?: string | null
  sender_name?: string | null
  receiver_name?: string | null
  vehicle_plate?: string | null
  driver_name?: string | null
  transport_mode?: string | null
  delivery_location?: string | null
  purpose?: string | null
  notes?: string | null
  custom_fields?: {
    signatures?: {
      sender?: {
        image_url?: string
        drawn_data_url?: string
      }
      receiver?: {
        image_url?: string
        drawn_data_url?: string
      }
    }
  }
  items: RawWaybillItem[]
}

export interface RawWaybillItem {
  description: string
  qty: number
  unit: string | null
  condition: string | null
  custom_data: Record<string, string | number | boolean | null> | null

  /** Forbidden — present in source data but must be stripped by buildRows */
  item_id?: string
  id?: string
  created_at?: string
  updated_at?: string
  unit_price?: number
  rate?: number
  vat?: number
  discount?: number
  subtotal?: number
  grand_total?: number
}

export interface CompanySettings {
  name: string
  tagline: string | null
  logo: string | null
  address: string | null
  phone: string | null
  email: string | null
  website?: string | null
  customInfo?: Array<{ label: string; value: string }> | null
  city?: string | null
  state?: string | null
}


