import { z } from 'zod'

export const CSR_IMPORT_PROMPT = `You are a strict JSON data extractor. Follow these rules without exception:

· Return ONLY data explicitly present in the source document.
· Never infer, guess, or fabricate values.
· Missing values MUST be null.
· Output MUST be valid JSON only.

Extract only the CSR technical/service fields from the text below and return valid JSON only.

Ignore customer/admin/header/signature information.

Allowed keys:
system_down, problem_reported, equipment_type, equipment_location, make, model, serial_no, engine_no, capacity, voltage, frequency, battery, temperature, pressure, hours, service_rendered, defects_found, engineer_remarks, start_date, end_date, materials

Requirements:
- No markdown
- No commentary
- No extra keys
- Use YYYY-MM-DD for dates if present
- Use true/false/null for system_down
- materials must be an array of { "item": "", "quantity": "", "unit": "" }
- Missing values should be empty strings, except system_down can be null`

const csrJsonSchema = z.object({
  system_down: z.boolean().nullable().optional(),
  problem_reported: z.string().optional(),
  equipment_type: z.string().optional(),
  equipment_location: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  serial_no: z.string().optional(),
  engine_no: z.string().optional(),
  capacity: z.string().optional(),
  voltage: z.string().optional(),
  frequency: z.string().optional(),
  battery: z.string().optional(),
  temperature: z.string().optional(),
  pressure: z.string().optional(),
  hours: z.string().optional(),
  service_rendered: z.string().optional(),
  defects_found: z.string().optional(),
  engineer_remarks: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  materials: z.array(z.object({
    item: z.string(),
    quantity: z.string(),
    unit: z.string(),
  })).optional(),
})

export type CsrJson = z.infer<typeof csrJsonSchema>

export type ParseCsrJsonResult =
  | { ok: true; data: CsrJson }
  | { ok: false; error: { stage: string; message: string } }

export function parseCsrJson(
  text: string,
): ParseCsrJsonResult {
  if (!text.trim()) {
    return { ok: false, error: { stage: 'parse', message: 'Paste JSON before importing.' } }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: { stage: 'parse', message: 'Invalid JSON.' } }
  }

  const result = csrJsonSchema.safeParse(parsed)
  if (!result.success) {
    return {
      ok: false,
      error: {
        stage: 'validation',
        message: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      },
    }
  }

  return { ok: true, data: result.data }
}

// Backward-compat types for parent components
export type CsrImportMaterial = {
  item: string
  quantity: string
  unit: string
}

export type ParsedCsrImport = {
  fields: Partial<Record<string, string | boolean | null>>
  materials: CsrImportMaterial[]
  hasMaterials: boolean
  hasOperationalReadings: boolean
}
