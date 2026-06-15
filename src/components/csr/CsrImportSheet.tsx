import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Wand2, ClipboardCheck } from 'lucide-react'
import { feedback } from '@/lib/feedback'
import { CSR_IMPORT_PROMPT, parseCsrJson, type ParsedCsrImport } from '@/components/csr/csrImport'
import { JsonImportLayout } from '@/components/import/JsonImportLayout'

type CsrImportSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApplyImport: (result: ParsedCsrImport) => void
}

export default function CsrImportSheet({ open, onOpenChange, onApplyImport }: CsrImportSheetProps) {
  const [pastedText, setPastedText] = React.useState('')

  React.useEffect(() => {
    if (!open) {
      setPastedText('')
    }
  }, [open])

  const handleImport = () => {
    if (!pastedText.trim()) {
      feedback.error('Paste JSON', { description: 'Please paste the JSON extraction first.' })
      return
    }

    const parseResult = parseCsrJson(pastedText)

    if (parseResult.ok === false) {
      feedback.error('Import failed', {
        description: parseResult.error.message,
      })
      return
    }

    const { data } = parseResult

    const adaptedResult: ParsedCsrImport = {
      fields: {
        problem_reported: data.description,
        serial_no: data.product_serial_number,
        customer_name: data.customer_name,
        report_type: data.report_type,
        amount_due: data.amount_due?.toString() ?? null,
        amount_paid: data.amount_paid?.toString() ?? null,
        status: data.status,
      },
      materials: [],
      hasMaterials: false,
      hasOperationalReadings: false,
    }

    onApplyImport(adaptedResult)
    feedback.success('Import applied', { description: 'CSR fields were updated successfully.' })
    onOpenChange(false)
  }

  return (
    <JsonImportLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Import CSR"
      description="Update CSR fields from a JSON document extraction."
      promptText={CSR_IMPORT_PROMPT}
      rawInput={pastedText}
      onRawInputChange={setPastedText}
      onPreview={handleImport} // CSR import doesn't have a separate preview step in current code, it just applies.
      onSave={handleImport}    // We could split it, but keep it simple for now as per current behavior.
      tutorial={{
        title: 'How CSR JSON import works',
        description: 'You can update CSR fields by pasting a JSON extraction from a service report document.',
        steps: [
          'Copy the CSR AI Prompt',
          'Extract technical fields from your service report into JSON',
          'Paste the resulting JSON here to update the form'
        ],
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      }}
    />
  )
}
