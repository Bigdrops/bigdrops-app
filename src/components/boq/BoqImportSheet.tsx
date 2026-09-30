import { useMemo, useState } from 'react'
import { JsonImportLayout } from '@/components/import/JsonImportLayout'
import { applyBoqImport, boqImportPrompt, boqImportSchema } from '@/domain/boq/importAdapter'
import type { Boq } from '@/domain/boq/types'

type BoqImportSheetProps = {
  open: boolean
  boq: Boq
  onOpenChange: (open: boolean) => void
  onApply: (boq: Boq) => void
}

export function BoqImportSheet({ open, boq, onOpenChange, onApply }: BoqImportSheetProps) {
  const [rawInput, setRawInput] = useState('')
  const [parsedBoq, setParsedBoq] = useState<Boq | null>(null)
  const [error, setError] = useState<string | null>(null)
  const prompt = useMemo(() => boqImportPrompt, [])

  const preview = () => {
    setError(null)
    try {
      const parsed = boqImportSchema.parse(JSON.parse(rawInput))
      setParsedBoq(applyBoqImport(parsed, boq))
    } catch (err) {
      setParsedBoq(null)
      setError(err instanceof Error ? err.message : 'Invalid JSON.')
    }
  }

  const save = () => {
    if (!parsedBoq) return
    onApply(parsedBoq)
    setRawInput('')
    setParsedBoq(null)
    onOpenChange(false)
  }

  return (
    <JsonImportLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Import Cost & Pricing Sheet"
      description="Paste Cost & Pricing Sheet JSON to populate groups and item rows."
      promptText={prompt}
      rawInput={rawInput}
      onRawInputChange={setRawInput}
      onPreview={preview}
      onSave={save}
      saveLabel="Apply Import"
      isParsed={Boolean(parsedBoq)}
      error={error}
      onEditJson={() => setParsedBoq(null)}
      previewContent={parsedBoq ? (
        <div className="rounded-xl border border-bd-overlay-section-border bg-bd-overlay-section-bg p-3 text-xs text-bd-overlay-text">
          <div className="font-bold">{parsedBoq.table_rows.filter((row) => row.row_type === 'item').length} items ready</div>
          <div className="mt-1 text-bd-overlay-muted">
            {parsedBoq.table_rows.filter((row) => row.row_type === 'section').length} groups. CP remains internal. SP is the selling rate.
          </div>
        </div>
      ) : null}
    />
  )
}
