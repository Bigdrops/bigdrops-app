import type { ProjectDocumentType } from './projectDocuments'

/**
 * Centralised AI extraction prompts for external project documents.
 *
 * Rules for all prompts:
 * - Return ONLY the JSON object — no explanation, no markdown.
 * - Use snake_case keys.
 * - Dates must be YYYY-MM-DD or null.
 * - Numbers must be numeric (not strings).
 * - If a field is not present set it to null or 0 as appropriate.
 * - images[] is always optional; include only if the source contains embedded images
 *   that can be represented as URLs. If not present, omit the field.
 */
export const PROJECT_DOCUMENT_PROMPTS: Record<ProjectDocumentType, string> = {
  purchase_order: `Extract this Purchase Order into a JSON object only.
No explanation. No markdown. Return only the raw JSON object.

Use this exact structure:
{
  "reference_number": "",
  "voucher_number": "",
  "date": "YYYY-MM-DD",
  "from_party": "",
  "to_party": "",
  "items": [
    { "description": "", "quantity": 0, "unit": "", "unit_price": 0, "amount": 0 }
  ],
  "subtotal": 0,
  "vat": 0,
  "vat_rate": 0,
  "wht": 0,
  "wht_rate": 0,
  "total": 0,
  "currency": "NGN",
  "notes": ""
}

Rules:
- reference_number = PO Number or document number
- voucher_number = Voucher No if printed on document, else ""
- from_party = supplier / vendor name
- to_party = purchaser / company name
- If VAT not present set vat and vat_rate to 0
- If WHT not present set wht and wht_rate to 0
- Do not add any keys not listed above`,

  receipt: `Extract this Receipt into a JSON object only.
No explanation. No markdown. Return only the raw JSON object.

Use this exact structure:
{
  "reference_number": "",
  "date": "YYYY-MM-DD",
  "from_party": "",
  "to_party": "",
  "description": "",
  "amount": 0,
  "vat": 0,
  "wht": 0,
  "payment_method": "",
  "currency": "NGN",
  "notes": ""
}

Rules:
- from_party = who issued the receipt (vendor / payee)
- to_party = who paid (company / customer name)
- amount = net amount before VAT/WHT
- payment_method = e.g. "bank transfer", "cash", "cheque"
- Do not add any keys not listed above`,

  receiving_waybill: `Extract this Receiving Waybill into a JSON object only.
No explanation. No markdown. Return only the raw JSON object.

Use this exact structure:
{
  "reference_number": "",
  "date": "YYYY-MM-DD",
  "from_party": "",
  "to_party": "",
  "items": [
    { "description": "", "quantity": 0, "unit": "", "condition": "good" }
  ],
  "received_by": "",
  "notes": ""
}

Rules:
- from_party = supplier / sender
- to_party = receiving site or company
- condition values: "good", "damaged", "partial" or as written
- Do not add any keys not listed above`,

  other: `Extract this document into a JSON object only.
No explanation. No markdown. Return only the raw JSON object.

You MUST use this skeleton and fill in ONLY fields you can clearly read from the document:
{
  "title": "",
  "reference_number": "",
  "date": "YYYY-MM-DD",
  "from_party": "",
  "to_party": "",
  "description": "",
  "amount": 0,
  "notes": ""
}

You MAY add extra snake_case keys if the document clearly contains labelled data not covered above.
Do NOT invent data. Do NOT guess. If a field is blank, set it to "" or null.
Do NOT add nested objects or arrays unless the document has a clear table of items.
If a table of items is present, add: "items": [{ "description": "", "quantity": 0, "unit": "", "amount": 0 }]`,
}

export function getProjectDocumentPrompt(type: ProjectDocumentType): string {
  return PROJECT_DOCUMENT_PROMPTS[type] ?? PROJECT_DOCUMENT_PROMPTS.other
}
