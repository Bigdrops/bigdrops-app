import { useState } from 'react'
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

  const itemCount = parsedCps
    ? parsedCps.table_rows.filter((row) => row.row_type === 'item').length
    : 0
  const groupCount = parsedCps
    ? parsedCps.table_rows.filter((row) => row.row_type === 'section').length
    : 0

  return (
    <JsonImportLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Import Cost & Pricing Items"
      description="Add groups and line items from extracted JSON."
      promptText={cpsImportPrompt}
      rawInput={rawInput}
      onRawInputChange={(value) => {
        setRawInput(value)
        setParsedCps(null)
        setError(null)
      }}
      onPreview={preview}
      onSave={save}
      isParsed={parsedCps !== null}
      error={error}
      saveLabel="Apply Import"
      tutorial={{
        title: 'How CPS import works',
        description: 'Turn a priced source document into CPS groups and line items.',
        steps: [
          'Copy the AI prompt below',
          'Run it on your source document with any AI tool',
          'Paste the returned JSON here',
          'Preview the groups and items, then apply',
        ],
      }}
      previewContent={
        parsedCps ? (
          <div className="rounded-xl border border-bd-overlay-border bg-bd-overlay-section-bg p-4 text-center">
            <div className="text-lg font-black text-bd-overlay-text">
              {itemCount} item{itemCount === 1 ? '' : 's'} ready
            </div>
            <div className="mt-1 text-xs font-medium text-bd-overlay-muted">
              {groupCount} group{groupCount === 1 ? '' : 's'} will be created
            </div>
          </div>
        ) : null
      }
    />
  )
}
