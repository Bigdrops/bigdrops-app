import { useState } from 'react'
import { X } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { applyCpsImport, cpsImportSchema } from '@/domain/cps/importAdapter'
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

  const close = () => onOpenChange(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="cps-import-dialog border-0 bg-transparent p-0 shadow-none sm:max-w-none" showCloseButton={false}>
        <DialogTitle className="sr-only">Import Cost & Pricing Sheet</DialogTitle>
        <div className="cps-form">
          <div className="cps-overlay" onClick={close}>
            <div className="cps-sheet" onClick={(event) => event.stopPropagation()}>
              <div className="cps-grab" />
              <div className="cps-sheet-head">
                <div>
                  <b>Import JSON</b>
                  <small>Populate groups and line items</small>
                </div>
                <button type="button" className="cps-x" onClick={close} aria-label="Close import sheet">
                  <X size={13} />
                </button>
              </div>

              <div className="cps-impnote">
                Use the production CPS JSON schema. Client, site, photos, and calculated totals are not imported.
              </div>

              <textarea
                className="cps-field mono cps-import-input"
                value={rawInput}
                onChange={(event) => {
                  setRawInput(event.target.value)
                  setParsedCps(null)
                  setError(null)
                }}
                placeholder='{"title":"Cost & Pricing Sheet","items":[],"groups":[]}'
                aria-label="Cost and Pricing Sheet JSON"
              />

              {error ? <div className="cps-mk-err show">{error}</div> : null}

              {parsedCps ? (
                <div className="cps-preview">
                  <b>{parsedCps.table_rows.filter((row) => row.row_type === 'item').length} items ready</b>
                  <span>{parsedCps.table_rows.filter((row) => row.row_type === 'section').length} groups. Existing CPS import rules remain active.</span>
                </div>
              ) : null}

              <button type="button" className="cps-cta" onClick={parsedCps ? save : preview}>
                {parsedCps ? 'Apply import' : 'Preview import'}
              </button>
              {parsedCps ? (
                <button type="button" className="cps-linkbtn" onClick={() => setParsedCps(null)}>
                  Edit JSON
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
