import { z } from 'zod'

import type { ImportMode, ParsedImportRoot } from './types'

const unknownRecordSchema = z.record(z.string(), z.unknown())

const extraChargeSchema = z.object({
  label: z.unknown(),
  value: z.unknown(),
})

const groupSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  showSubtotal: z.boolean().optional().default(false),
  itemIds: z.array(z.string()).optional(),
})

function buildItemSchema(mode: ImportMode) {
  return unknownRecordSchema.superRefine((item, ctx) => {
    if (mode !== 'Update') return
    if (!Object.prototype.hasOwnProperty.call(item, 'row_number')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Each update row must include row_number.',
      })
    }
  })
}

export function buildImportSchema(mode: ImportMode) {
  const schema = z
    .object({
      po_number: z.unknown().optional(),
      notes: z.unknown().optional(),
      terms: z.unknown().optional(),
      extra_charges: z.array(extraChargeSchema).optional(),
      groups: z.array(groupSchema).optional(),
      items: z.array(buildItemSchema(mode)).default([]),
    })
    .passthrough()
  
  return schema as unknown as z.ZodType<ParsedImportRoot>
}
