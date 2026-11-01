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
- Missing values should be empty strings, except system_down can be null

Narrative fields (problem_reported, service_rendered, defects_found, engineer_remarks) use this rich-text contract. Each value is a plain string or an array of blocks:
· Paragraph: { "type": "paragraph", "children": [ { "text": "Replaced the damaged control relay.", "bold": true } ] }
· Heading: { "type": "heading", "text": "Work Performed" }
· Numbered list: { "type": "ordered_list", "items": [ [ { "text": "Isolated the faulty feeder." } ], [ { "text": "Fitted a replacement relay." } ] ] }
· Bulleted list: { "type": "unordered_list", "items": [ [ { "text": "Site left operational." } ] ] }
Text runs support optional "bold", "italic" and "underline" booleans.
Rules for narrative fields:
· Copy source wording and order exactly. Never paraphrase, summarize, invent headings, or merge points.
· Return an empty string when the source has no content for the field.
· Use a block array only when the source clearly shows headings, lists or separate paragraphs. Otherwise use a plain string.
· Convert headings into heading blocks, numbered lists into ordered lists, bullet lists into unordered lists, and separate paragraphs into separate paragraph blocks.
· Mark bold, italic or underline only where the source clearly shows it. Keep uncertain text as plain runs.
· Do not convert ordinary paragraphs into lists.
· Do not return HTML or Markdown syntax.`

const csrJsonSchema = z.object({
  system_down: z.boolean().nullable().optional(),
  problem_reported: z.union([z.string(), z.array(z.unknown())]).optional(),
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
  service_rendered: z.union([z.string(), z.array(z.unknown())]).optional(),
  defects_found: z.union([z.string(), z.array(z.unknown())]).optional(),
  engineer_remarks: z.union([z.string(), z.array(z.unknown())]).optional(),
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
