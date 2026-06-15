import { useCallback, useEffect, useMemo, useState } from 'react'
import { RotateCcw, AlertTriangle } from 'lucide-react'
import { useSettings, saveSettings } from '@/hooks/useSettings'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { SettingsLoadingState } from './SettingsLoadingState'
import { SettingsSummaryCard } from '@/components/settings/SettingsSummaryCard'
import { feedback } from '@/lib/feedback'
import { Button } from '@/components/ui/button'
import {
  DEFAULT_PREFIXES,
  type DocumentPrefixKey,
  type DocumentPrefixes,
} from '@/domain/prefixConstants'

const PREFIX_KEYS: DocumentPrefixKey[] = [
  'waybill',
  'invoice',
  'quotation',
  'rfq',
  'boq',
  'project',
  'csr',
]

const LABELS: Record<DocumentPrefixKey, string> = {
  waybill: 'Waybill',
  invoice: 'Invoice',
  quotation: 'Quotation',
  rfq: 'RFQ',
  boq: 'BOQ',
  project: 'Project',
  csr: 'CSR',
}

const PREVIEW_TEMPLATES: Record<DocumentPrefixKey, (p: string) => string[]> = {
  waybill: (p) => [`${p}-E-000001`, `${p}-I-000001`],
  invoice: (p) => [`${p}-000001`],
  quotation: (p) => [`${p}-000001`],
  rfq: (p) => [`${p}-000001`],
  boq: (p) => [`${p}-000001`],
  project: (p) => [`${p}-000001`],
  csr: (p) => [`${p}-000001`, `${p}-M-000001`],
}

function sanitizePrefixInput(value: string): string {
  return value.replace(/[^A-Z0-9]/g, '').slice(0, 6)
}

function hasChanges(draft: DocumentPrefixes, saved: DocumentPrefixes): boolean {
  return PREFIX_KEYS.some((k) => draft[k] !== saved[k])
}

function findConflicts(draft: DocumentPrefixes, key: DocumentPrefixKey): string | null {
  const value = draft[key]
  const conflictingKey = PREFIX_KEYS.find((k) => k !== key && draft[k] === value)
  if (conflictingKey) return LABELS[conflictingKey]
  return null
}

function buildChangeSummary(draft: DocumentPrefixes, saved: DocumentPrefixes): string[] {
  return PREFIX_KEYS
    .filter((k) => draft[k] !== saved[k])
    .map((k) => `${LABELS[k]}: ${saved[k]} → ${draft[k]}`)
}

export function DocumentPrefixesSettingsSection() {
  const { settings, loading } = useSettings()
  const [draft, setDraft] = useState<DocumentPrefixes>({ ...DEFAULT_PREFIXES })
  const [saving, setSaving] = useState(false)

  const savedPrefixes = useMemo<DocumentPrefixes>(() => {
    const raw = settings?.document_prefixes
    if (!raw || typeof raw !== 'object') return { ...DEFAULT_PREFIXES }
    return {
      waybill: typeof raw.waybill === 'string' ? raw.waybill : DEFAULT_PREFIXES.waybill,
      invoice: typeof raw.invoice === 'string' ? raw.invoice : DEFAULT_PREFIXES.invoice,
      quotation: typeof raw.quotation === 'string' ? raw.quotation : DEFAULT_PREFIXES.quotation,
      rfq: typeof raw.rfq === 'string' ? raw.rfq : DEFAULT_PREFIXES.rfq,
      boq: typeof raw.boq === 'string' ? raw.boq : DEFAULT_PREFIXES.boq,
      project: typeof raw.project === 'string' ? raw.project : DEFAULT_PREFIXES.project,
      csr: typeof raw.csr === 'string' ? raw.csr : DEFAULT_PREFIXES.csr,
    }
  }, [settings])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!loading) setDraft({ ...savedPrefixes })
  }, [loading, savedPrefixes])
  /* eslint-enable react-hooks/set-state-in-effect */

  const isDirty = hasChanges(draft, savedPrefixes)

  const handleFieldChange = useCallback((key: DocumentPrefixKey, raw: string) => {
    setDraft((prev) => ({ ...prev, [key]: sanitizePrefixInput(raw) }))
  }, [])

  const handleSoloReset = useCallback(
    (key: DocumentPrefixKey) => {
      const defaultVal = DEFAULT_PREFIXES[key]
      const current = draft[key]
      if (current === defaultVal) return

      const label = LABELS[key]
      if (
        !confirm(
          `Reset ${label} to ${defaultVal}? A new sequence starting at ${defaultVal}-000001 will begin. Your existing documents are not affected.`,
        )
      ) {
        return
      }

      const updated = { ...draft, [key]: defaultVal }
      setDraft(updated)
      setSaving(true)
      saveSettings({ document_prefixes: updated })
        .then(() => feedback.success(`${label} prefix reset to ${defaultVal}`))
        .catch((err) =>
          feedback.error(getUserFacingMutationMessage(err, { action: 'save' })),
        )
        .finally(() => setSaving(false))
    },
    [draft],
  )

  const handleFullReset = useCallback(() => {
    if (
      !confirm(
        'Reset all prefixes to defaults? New sequences will begin for any changed prefixes. Existing documents are not affected.',
      )
    ) {
      return
    }

    const defaults = { ...DEFAULT_PREFIXES }
    setDraft(defaults)
    setSaving(true)
    saveSettings({ document_prefixes: defaults })
      .then(() => feedback.success('All prefixes reset to defaults'))
      .catch((err) =>
        feedback.error(getUserFacingMutationMessage(err, { action: 'save' })),
      )
      .finally(() => setSaving(false))
  }, [])

  const handleSave = useCallback(() => {
    const changes = buildChangeSummary(draft, savedPrefixes)
    if (changes.length === 0) return

    if (
      !confirm(
        `Changing prefix will start a new sequence. Your existing documents are not affected.\n\n${changes.join('\n')}`,
      )
    ) {
      return
    }

    setSaving(true)
    saveSettings({ document_prefixes: draft })
      .then(() => feedback.success('Prefixes updated'))
      .catch((err) =>
        feedback.error(getUserFacingMutationMessage(err, { action: 'save' })),
      )
      .finally(() => setSaving(false))
  }, [draft, savedPrefixes])

  if (loading) return <SettingsLoadingState />

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between gap-4 px-1">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-bd-text-muted opacity-60">
            Document Prefixes
          </p>
        </div>
      </div>

      <SettingsSummaryCard
        title="Document Prefixes"
        description="Configure the prefix used in auto-generated document numbers. Each new prefix starts a new sequence."
      >
        <div className="divide-y divide-[hsl(var(--bd-border)/0.3)]">
          {PREFIX_KEYS.map((key) => {
            const prefix = draft[key]
            const previews = PREVIEW_TEMPLATES[key](prefix)
            const conflict = findConflicts(draft, key)
            const isDefault = prefix === DEFAULT_PREFIXES[key]

            return (
              <div key={key} className="px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {LABELS[key]} Prefix
                    </label>
                    <input
                      type="text"
                      value={prefix}
                      onChange={(e) => handleFieldChange(key, e.target.value.toUpperCase())}
                      className="mt-1.5 w-full max-w-[120px] rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono font-bold text-foreground transition-colors placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 uppercase"
                      maxLength={6}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-bd-text-muted opacity-70">
                        Preview
                      </p>
                      <div className="mt-1 flex flex-wrap justify-end gap-1.5">
                        {previews.map((p) => (
                          <span
                            key={p}
                            className="inline-block rounded-md border border-[hsl(var(--bd-border)/0.5)] bg-[hsl(var(--bd-surface-muted)/0.3)] px-2 py-1 font-mono text-xs font-bold text-bd-text"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>

                    {!isDefault && (
                      <button
                        type="button"
                        onClick={() => handleSoloReset(key)}
                        disabled={saving}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-bd-text-muted transition-colors hover:bg-[hsl(var(--bd-surface-muted)/0.3)] hover:text-bd-text disabled:opacity-50"
                        title={`Reset ${LABELS[key]} to default`}
                      >
                        <RotateCcw size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {conflict && (
                  <div className="mt-2 flex items-center gap-1.5 text-amber-600">
                    <AlertTriangle size={12} />
                    <p className="text-[11px] font-medium">
                      This prefix is already used by {conflict}s. Using the same prefix across
                      document types may cause confusion.
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between border-t border-[hsl(var(--bd-border)/0.4)] px-5 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFullReset}
            disabled={saving}
            className="text-bd-text-muted hover:text-bd-text"
          >
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            Reset All to Defaults
          </Button>

          <Button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="min-w-[120px] bg-bd-button-primary-bg text-bd-button-primary-text hover:opacity-90"
          >
            {saving ? 'Saving...' : 'Save Prefixes'}
          </Button>
        </div>
      </SettingsSummaryCard>
    </div>
  )
}
