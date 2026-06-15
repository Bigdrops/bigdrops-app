import * as React from 'react'
import { useEffect, useState } from 'react'
import { JsonImportLayout } from '@/components/import/JsonImportLayout'
import { feedback } from '@/lib/feedback'

type ImportSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (text: string) => void
  adapter: {
    prompt: string
    schema: { parse: (data: unknown) => unknown }
  }
}

export function WaybillImportSheet({
  open,
  onOpenChange,
  onImport,
  adapter,
}: ImportSheetProps) {
  const [text, setText] = useState('')

  useEffect(() => {
    if (!open) setText('')
  }, [open])

  const handleImport = () => {
    try {
      const parsed = JSON.parse(text)
      adapter.schema.parse(parsed)
      onImport(text)
    } catch (err) {
      feedback.error('Import Failed', {
        description: err instanceof Error ? err.message : 'Invalid JSON or schema validation failed.',
      })
    }
  }

  return (
    <JsonImportLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Import Waybill"
      description="Capture a paper waybill by pasting its JSON extraction."
      promptText={adapter.prompt}
      rawInput={text}
      onRawInputChange={setText}
      onPreview={handleImport}
      onSave={handleImport}
      tutorial={{
        title: 'How Waybill JSON import works',
        description: 'Update Waybill details by pasting extracted JSON from dispatch or delivery documents.',
        steps: [
          'Copy the Waybill AI Prompt',
          'Extract items and reference numbers from your document into JSON',
          'Paste the resulting JSON here to review and apply'
        ],
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
      }}
    />
  )
}