export const externalWaybillPrompt = `This is an external waybill import. Extract only what is explicitly present in the source document.

RULES:
1. Return null for any missing field — never guess or infer.
2. Return valid JSON only. No markdown, no explanation.
3. Wrap the JSON in a code block.
4. After the code block write: "Copy the JSON above and paste it back into the app."
5. po_number must be null unless the source explicitly labels it as PO Number, Purchase Order Number, or Voucher Number.
6. Do not extract signatures, party notes, purpose, or client identity.
7. This document type is isolated. Do not reuse logic from any other document type including internal waybill.
8. If items have fields beyond description, quantity, unit, and condition (e.g. make, part number, serial, location), include them as additional key/value pairs in each item object. Do not discard unknown fields.

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
