import { z } from 'zod'

export const externalWaybillSchema = z.object({
  sender_name: z.string().nullable().optional(),
  receiver_name: z.string().nullable().optional(),
  po_number: z.string().nullable().optional(),
  vehicle_plate: z.string().nullable().optional(),
  driver_name: z.string().nullable().optional(),
  transport_mode: z.enum(['By Vehicle', 'By Hand', 'By Courier']).nullable().optional(),
  delivery_location: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
  time: z.string().nullable().optional(),
  items: z.array(
    z.object({
      description: z.string().min(1),
      quantity: z.number().positive(),
      unit: z.string().nullable().optional(),
      condition: z.enum(['good', 'damaged', 'partial']).nullable().optional(),
    })
  ).min(1),
})

export type ExternalWaybillPayload = z.infer<typeof externalWaybillSchema>
