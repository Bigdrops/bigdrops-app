import { z } from 'zod'

import type { ImportMode, ParsedImportRoot } from './types'
import { MAX_IMPORTED_ROWS } from './utils'

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

function buildItemSchema(mode: ImportMode, maxRow: number) {
  return unknownRecordSchema.superRefine((item, ctx) => {
    if (mode !== 'Update') return
    if (!Object.prototype.hasOwnProperty.call(item, 'row_number')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Each update row must include row_number.',
      })
      return
    }

    const raw = item.row_number
    if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'row_number must be a positive integer (1, 2, 3, ...).',
      })
      return
    }

    if (raw > maxRow) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `row_number ${raw} is out of range. Valid range is 1 to ${maxRow}.`,
      })
    }
  })
}

export function buildImportSchema(mode: ImportMode, maxRow: number = MAX_IMPORTED_ROWS) {
  const schema = z
    .object({
      po_number: z.unknown().optional(),
      notes: z.unknown().optional(),
      terms: z.unknown().optional(),
      extra_charges: z.array(extraChargeSchema).optional(),
      groups: z.array(groupSchema).optional(),
      items: z.array(buildItemSchema(mode, maxRow)).default([]),
    })
    .passthrough()
    .superRefine((root, ctx) => {
      if (mode !== 'Update') return
      const items = root.items as Array<Record<string, unknown>>
      const seen = new Set<number>()
      for (let i = 0; i < items.length; i++) {
        const rn = items[i]?.row_number
        if (typeof rn === 'number' && Number.isInteger(rn)) {
          if (seen.has(rn)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Duplicate row_number ${rn} is not allowed in Update mode.`,
              path: ['items', i, 'row_number'],
            })
          }
          seen.add(rn)
        }
      }
    })
  
  return schema as unknown as z.ZodType<ParsedImportRoot>
}
