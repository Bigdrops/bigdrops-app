import { JSON_IMPORT_DISCIPLINE_SPEC } from '@/domain/import/promptGenerator'

export const EXTERNAL_WAYBILL_PROMPT: string = `${JSON_IMPORT_DISCIPLINE_SPEC}

This document type is isolated. Do not reuse interpretation logic from any other document type, including internal waybill.

Convert a photographed or handwritten external waybill into JSON only.
Do not include markdown or explanations.
Never invent monetary values.

Return this shape:
{
  "sender_name": "",
  "receiver_name": "",
  "po_number": "",
  "vehicle_plate": "",
  "driver_name": "",
  "transport_mode": "By Vehicle | By Hand | By Courier",
  "delivery_location": "",
  "notes": "",
  "date": "YYYY-MM-DD",
  "time": "HH:MM (optional)",
  "items": [
    {
      "description": "",
      "quantity": 1,
      "unit": "",
      "condition": "good | damaged | partial"
    }
  ]
}

Header fields to extract:
- sender_name (string, aliases: sender, from, from_name, consignor, shipper)
- receiver_name (string, aliases: receiver, to, to_name, consignee)
- po_number (string, aliases: po, purchase_order, purchase_order_number) — strict identifier rule applies: null unless source explicitly labels it as PO/Voucher
- vehicle_plate (string, aliases: vehicle, plate, plate_number, truck_plate, vehicle_number)
- driver_name (string, aliases: driver, driver_full_name)
- transport_mode (enum string: "By Vehicle" | "By Hand" | "By Courier", alias: transport)
- delivery_location (string, aliases: destination, to_location, delivery_address)
- notes (string, alias: remarks)
- date (string, ISO format preferred)
- time (string, optional)

Item fields to extract (per object in items array):
- description (string, required)
- quantity (number, required, > 0)
- unit (string, optional)
- condition (enum string: "good" | "damaged" | "partial", optional)

Fields to explicitly EXCLUDE from extraction:
- partyNotes (sender_note, release_note, receiver_note, receipt_note)
- linkedProjectName, sourceDocumentNumber
- purpose (out of scope for this phase)
- client_id, client_name (form-resolved, not AI-extracted)
- Any field that maps to custom_data keys not visible in the form

Rules:
- Internal waybills are custody transfers within the company.
- External waybills are deliveries to clients or outside recipients.
- Detect whether signature-like marks are present and describe them.
- Never fabricate exact signature text.
- Unknown item-level fields must still be returned at item level.
- JSON only.
- Wrap the JSON output in a code block.`
