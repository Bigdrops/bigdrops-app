import { useCallback, useEffect, useMemo, useState } from 'react'
import { RotateCcw, AlertTriangle } from 'lucide-react'
import { useSettings, saveSettings } from '@/hooks/useSettings'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { SettingsLoadingState } from './SettingsLoadingState'
import { SettingsSummaryCard } from '@/components/settings/SettingsSummaryCard'
import { feedback } from '@/lib/feedback'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
  waybill: (p) => [`${p}-E-000001`, `${p}-I-000001`, `${p}-ME-000001`, `${p}-MI-000001`],
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

type PendingAction =
  | { kind: 'soloReset'; key: DocumentPrefixKey }
  | { kind: 'fullReset' }
  | { kind: 'save' }

export function DocumentPrefixesSettingsSection() {
  const { settings, loading } = useSettings()
  const [draft, setDraft] = useState<DocumentPrefixes>({ ...DEFAULT_PREFIXES })
  const [saving, setSaving] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)

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

  const handleDismissChanges = useCallback(() => {
    setDraft({ ...savedPrefixes })
  }, [savedPrefixes])

  const executeSoloReset = useCallback(
    (key: DocumentPrefixKey) => {
      const defaultVal = DEFAULT_PREFIXES[key]
      const updated = { ...draft, [key]: defaultVal }
      setDraft(updated)
      setSaving(true)
      saveSettings({ document_prefixes: updated })
        .then(() => feedback.success(`${LABELS[key]} prefix reset to ${defaultVal}`))
        .catch((err) =>
          feedback.error(getUserFacingMutationMessage(err, { action: 'save' })),
        )
        .finally(() => setSaving(false))
    },
    [draft],
  )

  const executeFullReset = useCallback(() => {
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

  const executeSave = useCallback(() => {
    setSaving(true)
    saveSettings({ document_prefixes: draft })
      .then(() => feedback.success('Prefixes updated'))
      .catch((err) =>
        feedback.error(getUserFacingMutationMessage(err, { action: 'save' })),
      )
      .finally(() => setSaving(false))
  }, [draft])

  const handleConfirm = useCallback(() => {
    if (!pendingAction) return
    switch (pendingAction.kind) {
      case 'soloReset':
        executeSoloReset(pendingAction.key)
        break
      case 'fullReset':
        executeFullReset()
        break
      case 'save':
        executeSave()
        break
    }
    setPendingAction(null)
  }, [pendingAction, executeSoloReset, executeFullReset, executeSave])

  const getDialogMeta = () => {
    if (!pendingAction) return { title: '', description: '', confirmLabel: '' }
    switch (pendingAction.kind) {
      case 'soloReset': {
        const key = pendingAction.key
        const defaultVal = DEFAULT_PREFIXES[key]
        return {
          title: `Reset ${LABELS[key]} prefix?`,
          description: `Reset to ${defaultVal}? A new sequence starting at ${defaultVal}-000001 will begin. Your existing documents are not affected.`,
          confirmLabel: 'Reset',
        }
      }
      case 'fullReset':
        return {
          title: 'Reset all prefixes?',
          description: 'Reset all prefixes to defaults? New sequences will begin for any changed prefixes. Existing documents are not affected.',
          confirmLabel: 'Reset All',
        }
      case 'save': {
        const changes = buildChangeSummary(draft, savedPrefixes)
        return {
          title: 'Save prefix changes?',
          description: `Changing prefix will start a new sequence. Your existing documents are not affected.\n\n${changes.join('\n')}`,
          confirmLabel: 'Save',
        }
      }
    }
  }

  if (loading) return <SettingsLoadingState />

  const dialogMeta = getDialogMeta()

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="px-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-bd-text-muted opacity-60">
          Document Prefixes
        </p>
      </div>

      {isDirty && (
        <div className="sticky top-0 z-10 -mx-6 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-5 py-3 animate-in slide-in-from-top-2 fade-in duration-200 dark:border-amber-900/50 dark:bg-amber-950/30">
          <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
            Unsaved changes
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismissChanges}
              disabled={saving}
              className="text-amber-700 hover:bg-amber-100 hover:text-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/50 dark:hover:text-amber-200"
            >
              Dismiss
            </Button>
            <Button
              size="sm"
              onClick={() => setPendingAction({ kind: 'save' })}
              disabled={saving}
              className="bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      )}

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
            const isModified = prefix !== savedPrefixes[key]

            return (
              <div key={key} className="px-5 py-4 space-y-2">
                <div className="flex items-center gap-2">
                  <label className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {LABELS[key]} Prefix
                  </label>
                  {!isDefault && (
                    <button
                      type="button"
                      onClick={() => setPendingAction({ kind: 'soloReset', key })}
                      disabled={saving}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-bd-text-muted transition-colors hover:bg-[hsl(var(--bd-surface-muted)/0.3)] hover:text-bd-text disabled:opacity-50"
                      title={`Reset ${LABELS[key]} to default`}
                    >
                      <RotateCcw size={12} />
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={prefix}
                  onChange={(e) => handleFieldChange(key, e.target.value.toUpperCase())}
                  className={`w-full max-w-[120px] rounded-lg border bg-background px-3 py-2 text-sm font-mono font-bold text-foreground transition-colors placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20 uppercase ${
                    isModified
                      ? 'border-amber-400 ring-1 ring-amber-300'
                      : 'border-input'
                  }`}
                  maxLength={6}
                />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-bd-text-muted opacity-70">
                    Preview
                  </p>
                  <div className="mt-1 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:gap-2">
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
                {conflict && (
                  <div className="flex items-center gap-1.5 text-amber-600">
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

        <div className="border-t border-[hsl(var(--bd-border)/0.4)] px-5 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPendingAction({ kind: 'fullReset' })}
            disabled={saving}
            className="text-bd-text-muted hover:text-bd-text"
          >
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            Reset All to Defaults
          </Button>
        </div>
      </SettingsSummaryCard>

      <AlertDialog open={pendingAction !== null} onOpenChange={(open) => { if (!open) setPendingAction(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogMeta.title}</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {dialogMeta.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingAction(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              {dialogMeta.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
