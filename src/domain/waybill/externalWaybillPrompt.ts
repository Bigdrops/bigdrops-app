export const externalWaybillPrompt = `This is an external waybill import. Extract only what is explicitly present in the source document.

RULES:
1. Return null for any missing field — never guess or infer.
2. Return valid JSON only. No markdown, no explanation.
3. Wrap the JSON in a code block.
4. After the code block write: "Copy the JSON above and paste it back into the app."
5. po_number must be null unless the source explicitly labels it as PO Number, Purchase Order Number, or Voucher Number.
6. Do not extract signatures, party notes, purpose, or client identity.
7. This document type is isolated. Do not reuse logic from any other document type including internal waybill.
8. If items have additional fields beyond description, quantity, unit, and condition, extract ONLY make, part number, and serial number, using exactly these keys: "make", "part_no", "serial_no". Map any equivalent wording in the source document (e.g. "Model No.", "S/N", "Item Code", "Asset Tag") to these three exact keys — never invent variant key names for the same concept.

Across the entire waybill, do not introduce more than 2 additional custom field keys beyond make/part_no/serial_no. If the source document has other item-level details beyond these, only include them as extra keys if the same field appears consistently across most items — otherwise discard that field entirely. Never exceed 6 total item columns: description, quantity, unit, condition, plus at most 2 custom fields beyond make/part_no/serial_no when present.

Do not invent fields that are not present in the source document. Do not create a new key for every minor variation — consolidate into make/part_no/serial_no whenever the field is conceptually equivalent.

Return this exact shape:
{
  "sender_name": "",
  "receiver_name": "",
  "po_number": null,
  "vehicle_plate": null,
  "driver_name": null,
  "transport_mode": "By Vehicle | By Hand | By Courier",
  "delivery_location": null,
  "notes": null,
  "date": "YYYY-MM-DD",
  "time": null,
  "items": [
    {
      "description": "",
      "quantity": 1,
      "unit": null,
      "condition": "good | damaged | partial"
    }
  ]
}`
