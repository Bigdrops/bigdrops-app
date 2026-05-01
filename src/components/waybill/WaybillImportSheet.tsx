import * as React from 'react'
import { useEffect, useState } from 'react'
import { JsonImportLayout } from '@/components/import/JsonImportLayout'

type ImportSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (text: string) => void
}

export function WaybillImportSheet({
  open,
  onOpenChange,
  onImport,
}: ImportSheetProps) {
  const [text, setText] = useState('')

  useEffect(() => {
    if (!open) setText('')
  }, [open])

  const prompt = `Convert a photographed or handwritten waybill into JSON only.
Do not include markdown or explanations.
Never invent monetary values.

Return this shape:
{
  "type": "internal or external",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "sender_name": "",
  "receiver_name": "",
  "client_name": "",
  "delivery_location": "",
  "vehicle_plate": "",
  "po_number": "",
  "notes": "",
  "sender_note": "",
  "receiver_note": "",
  "linked_invoice_number": "",
  "linked_project_name": "",
  "source_document_number": "",
  "sender_signature_present": true,
  "sender_signature_description": "",
  "sender_signature_confidence": "low, medium, or high",
  "receiver_signature_present": true,
  "receiver_signature_description": "",
  "receiver_signature_confidence": "low, medium, or high",
  "items": [
    {
      "description": "",
      "quantity": 1,
      "unit": "",
      "condition": "good",
      "extra fields from the source": ""
    }
  ]
}

Rules:
- Internal waybills are custody transfers within the company.
- External waybills are deliveries to clients or outside recipients.
- Detect whether signature-like marks are present and describe them.
- Never fabricate exact signature text.
- Unknown item-level fields must still be returned at item level.`

  return (
    <JsonImportLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Import Waybill"
      description="Capture a paper waybill by pasting its JSON extraction."
      promptText={prompt}
      rawInput={text}
      onRawInputChange={setText}
      onPreview={() => onImport(text)}
      onSave={() => onImport(text)}

    />
  )
}
