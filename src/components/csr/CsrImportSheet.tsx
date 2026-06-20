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
    console.log('[CSR Import] Parsed data from Zod:', JSON.stringify(data, null, 2))

    const hasOperationalReadings = Boolean(
      data.voltage || data.frequency || data.battery || data.temperature || data.pressure || data.hours,
    )
    const materials = data.materials ?? []

    const adaptedResult: ParsedCsrImport = {
      fields: {
        system_down: data.system_down ?? null,
        problem_reported: data.problem_reported ?? null,
        equipment_type: data.equipment_type ?? null,
        equipment_location: data.equipment_location ?? null,
        make: data.make ?? null,
        model: data.model ?? null,
        serial_no: data.serial_no ?? null,
        engine_no: data.engine_no ?? null,
        capacity: data.capacity ?? null,
        voltage: data.voltage ?? null,
        frequency: data.frequency ?? null,
        battery: data.battery ?? null,
        temperature: data.temperature ?? null,
        pressure: data.pressure ?? null,
        hours: data.hours ?? null,
        service_rendered: data.service_rendered ?? null,
        defects_found: data.defects_found ?? null,
        engineer_remarks: data.engineer_remarks ?? null,
        start_date: data.start_date ?? null,
        end_date: data.end_date ?? null,
      },
      materials: materials.map((m) => ({ item: m.item, quantity: m.quantity, unit: m.unit })),
      hasMaterials: materials.length > 0,
      hasOperationalReadings,
    }
    console.log('[CSR Import] Adapted result:', JSON.stringify(adaptedResult, null, 2))

    onApplyImport(adaptedResult)
    console.log('[CSR Import] onApplyImport called, about to show toast & close sheet')
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
