/**
 * Waybill Render Contract
 *
 * Canonical interfaces and Zod validation schemas for Waybill PDF rendering.
 * Templates consume ONLY this contract — never raw Supabase objects.
 *
 * RULES:
 * 1. Every template must accept WaybillRenderModel, nothing deeper
 * 2. Company blocks render vertically — never concatenate with '|'
 * 3. Blocks expand vertically when additional fields exist
 * 4. Delivery method values: BY_HAND | COURIER | OTHER
 * 5. Templates own typography/spacing; this contract owns data shape
 */

import { z } from 'zod'

// ── Zod Schemas ─────────────────────────────────────────────────────

export const CustomInfoItemSchema = z.object({
  label: z.string(),
  value: z.string(),
})

export const BrandingBlockSchema = z.object({
  name: z.string(),
  tagline: z.string().nullable(),
  logo: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  website: z.string().nullable(),
  customInfo: z.array(CustomInfoItemSchema).nullable(),
})

export const HeaderBlockSchema = z.object({
  type: z.enum(['internal', 'external']),
  waybillNumber: z.string(),
  date: z.string(),
  time: z.string().nullable(),
  poNumber: z.string().nullable(),
})

export const PartiesBlockSchema = z.object({
  clientName: z.string().nullable(),
  clientAddress: z.string().nullable(),
  clientPhone: z.string().nullable(),
  clientEmail: z.string().nullable(),
  clientCityState: z.string().nullable(),
  senderName: z.string().nullable(),
  receiverName: z.string().nullable(),
})

export const LogisticsBlockSchema = z.object({
  vehiclePlate: z.string().nullable(),
  driverName: z.string().nullable(),
  deliveryMode: z.string().nullable(),
  deliveryLocation: z.string().nullable(),
  purpose: z.string().nullable(),
})

export const NormalizedSignatureSchema = z.object({
  url: z.string(),
  width: z.literal(110),
  height: z.literal(42),
})

export const SignatureBlockSchema = z.object({
  sender: NormalizedSignatureSchema.nullable(),
  receiver: NormalizedSignatureSchema.nullable(),
})

export const FooterBlockSchema = z.object({
  waybillNumber: z.string(),
  companyName: z.string(),
})

export const PaginationPolicySchema = z.object({
  repeatTableHeader: z.boolean(),
  keepSignatureTogether: z.boolean(),
  keepNotesTogether: z.boolean(),
})

export const PrintColumnSchema = z.object({
  key: z.string(),
  label: z.string(),
})

export const PrintRowSchema = z.object({
  cells: z.record(z.string(), z.string()),
})

export const TableBlockSchema = z.object({
  columns: z.array(PrintColumnSchema),
  rows: z.array(PrintRowSchema),
})

export const WaybillRenderModelSchema = z.object({
  branding: BrandingBlockSchema,
  header: HeaderBlockSchema,
  parties: PartiesBlockSchema,
  logistics: LogisticsBlockSchema,
  notes: z.string(),
  signatures: SignatureBlockSchema,
  footer: FooterBlockSchema,
  pagination: PaginationPolicySchema,
  table: TableBlockSchema,
})

// ── Derived Types ───────────────────────────────────────────────────

export type CustomInfoItem = z.infer<typeof CustomInfoItemSchema>
export type BrandingBlock = z.infer<typeof BrandingBlockSchema>
export type HeaderBlock = z.infer<typeof HeaderBlockSchema>
export type PartiesBlock = z.infer<typeof PartiesBlockSchema>
export type LogisticsBlock = z.infer<typeof LogisticsBlockSchema>
export type NormalizedSignature = z.infer<typeof NormalizedSignatureSchema>
export type SignatureBlock = z.infer<typeof SignatureBlockSchema>
export type FooterBlock = z.infer<typeof FooterBlockSchema>
export type PaginationPolicy = z.infer<typeof PaginationPolicySchema>
export type PrintColumn = z.infer<typeof PrintColumnSchema>
export type PrintRow = z.infer<typeof PrintRowSchema>
export type TableBlock = z.infer<typeof TableBlockSchema>
export type WaybillRenderModel = z.infer<typeof WaybillRenderModelSchema>

// ── Validation ──────────────────────────────────────────────────────

/**
 * Validates a render model immediately before PDF generation.
 * Throws on malformed data instead of silently producing broken PDFs.
 */
export function validateRenderModel(model: unknown): WaybillRenderModel {
  return WaybillRenderModelSchema.parse(model)
}

/**
 * Non-throwing validation — returns { success, data, error }.
 */
export function safeValidateRenderModel(model: unknown) {
  return WaybillRenderModelSchema.safeParse(model)
}
