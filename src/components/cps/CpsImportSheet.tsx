import { useMemo, useState } from 'react'
import { JsonImportLayout } from '@/components/import/JsonImportLayout'
import { applyCpsImport, cpsImportPrompt, cpsImportSchema } from '@/domain/cps/importAdapter'
import type { Cps } from '@/domain/cps/types'

type CpsImportSheetProps = {
  open: boolean
  cps: Cps
  onOpenChange: (open: boolean) => void
  onApply: (cps: Cps) => void
}

export function CpsImportSheet({ open, cps, onOpenChange, onApply }: CpsImportSheetProps) {
  const [rawInput, setRawInput] = useState('')
  const [parsedCps, setParsedCps] = useState<Cps | null>(null)
  const [error, setError] = useState<string | null>(null)
  const prompt = useMemo(() => cpsImportPrompt, [])

  const preview = () => {
    setError(null)
    try {
      const parsed = cpsImportSchema.parse(JSON.parse(rawInput))
      setParsedCps(applyCpsImport(parsed, cps))
    } catch (err) {
      setParsedCps(null)
      setError(err instanceof Error ? err.message : 'Invalid JSON.')
    }
  }

  const save = () => {
    if (!parsedCps) return
    onApply(parsedCps)
    setRawInput('')
    setParsedCps(null)
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
      isParsed={Boolean(parsedCps)}
      error={error}
      onEditJson={() => setParsedCps(null)}
      previewContent={parsedCps ? (
        <div className="rounded-xl border border-bd-overlay-section-border bg-bd-overlay-section-bg p-3 text-xs text-bd-overlay-text">
          <div className="font-bold">{parsedCps.table_rows.filter((row) => row.row_type === 'item').length} items ready</div>
          <div className="mt-1 text-bd-overlay-muted">
            {parsedCps.table_rows.filter((row) => row.row_type === 'section').length} groups. CP remains internal. SP is the selling rate.
          </div>
        </div>
      ) : null}
    />
  )
}
