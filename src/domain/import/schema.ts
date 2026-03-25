import { z } from 'zod'

import type { ImportMode, ParsedImportRoot } from './types'

const unknownRecordSchema = z.record(z.string(), z.unknown())

const extraChargeSchema = z.object({
  label: z.unknown(),
  value: z.unknown(),
})

function buildItemSchema(mode: ImportMode) {
  return unknownRecordSchema.superRefine((item, ctx) => {
    if (mode !== 'Update Table') return
    if (!Object.prototype.hasOwnProperty.call(item, 'row_number')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Each update row must include row_number.',
      })
    }
  })
}

export function buildImportSchema(mode: ImportMode) {
  return z
    .object({
      po_number: z.unknown().optional(),
      notes: z.unknown().optional(),
      terms: z.unknown().optional(),
      extra_charges: z.array(extraChargeSchema).optional(),
      items: z.array(buildItemSchema(mode)).default([]),
    })
    .passthrough() as z.ZodType<ParsedImportRoot>
}
