/**
 * bolu-presentation.ts — pure deterministic engine for Bolu presentation operations.
 *
 * Applies a validated presentation patch (PDF output toggles, document
 * headings, charge labels, quantity/unit merge, item-image visibility, column
 * configuration, signatory) to the persisted custom_fields subtree and returns
 * the next subtree plus business-facing preview rows.
 *
 * The proposal builder (Gate 1 preview) and the modification executor
 * (Gate 2 persistence) call the same function, so preview and save agree.
 * No I/O in this file: tenant-scoped reference lookups (signatories, bank
 * accounts) are performed by the caller and passed in as `resolution`, so
 * the engine stays deterministic and unit-testable.
 */

import type { BoluPresentationChange } from './bolu-operations'

export interface ResolvedPdfOutput {
  showBankDetails: boolean
  bankAccountId: string | null
  showFooter: boolean
  showTagline: boolean
  showBalanceDue: boolean
  showAmountInWords: boolean
  compact: boolean
  landscapeLayout: boolean
}

export const DEFAULT_PDF_OUTPUT: ResolvedPdfOutput = {
  showBankDetails: true,
  bankAccountId: null,
  showFooter: false,
  showTagline: false,
  showBalanceDue: true,
  showAmountInWords: true,
  compact: false,
  landscapeLayout: false,
}

export function normalizePdfOutput(raw: unknown): ResolvedPdfOutput {
  const value = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>
  const boolish = (key: string, fallback: boolean): boolean =>
    typeof value[key] === 'boolean' ? (value[key] as boolean) : fallback
  const bankAccountId = typeof value.bankAccountId === 'string' && value.bankAccountId.trim() ? value.bankAccountId.trim() : null
  return {
    showBankDetails: boolish('showBankDetails', DEFAULT_PDF_OUTPUT.showBankDetails),
    bankAccountId,
    showFooter: boolish('showFooter', DEFAULT_PDF_OUTPUT.showFooter),
    showTagline: boolish('showTagline', DEFAULT_PDF_OUTPUT.showTagline),
    showBalanceDue: boolish('showBalanceDue', DEFAULT_PDF_OUTPUT.showBalanceDue),
    showAmountInWords: boolish('showAmountInWords', DEFAULT_PDF_OUTPUT.showAmountInWords),
    compact: boolish('compact', DEFAULT_PDF_OUTPUT.compact),
    landscapeLayout: boolish('landscapeLayout', DEFAULT_PDF_OUTPUT.landscapeLayout),
  }
}

export function normalizeChargeLabels(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const result: Record<string, string> = {}
  for (const key of ['workmanship', 'transportation', 'shipping'] as const) {
    const value = (raw as Record<string, unknown>)[key]
    if (typeof value === 'string' && value.trim()) result[key] = value.trim()
  }
  return result
}

export interface BoluPresentationColumn {
  key: string
  label: string
  type?: string
  visible?: boolean
  visibilityMode?: 'show' | 'hide_display' | 'hide_full'
  removable?: boolean
  includeInTotal?: boolean
  formula?: string
}

export const DEFAULT_COLUMN_ORDER = [
  'description',
  'quantity',
  'make',
  'unit',
  'unit_price',
  'amount',
  'install_rate',
  'vat_rate',
  'discount_rate',
] as const

const DEFAULT_COLUMN_SPECS: Record<string, { label: string; visibilityMode: 'show' | 'hide_display' | 'hide_full' }> = {
  description: { label: 'Description', visibilityMode: 'show' },
  quantity: { label: 'Quantity', visibilityMode: 'show' },
  make: { label: 'Make', visibilityMode: 'show' },
  unit: { label: 'Unit', visibilityMode: 'show' },
  unit_price: { label: 'Unit Price', visibilityMode: 'show' },
  amount: { label: 'Amount', visibilityMode: 'show' },
  install_rate: { label: 'Install Rate', visibilityMode: 'hide_display' },
  vat_rate: { label: 'VAT Rate', visibilityMode: 'hide_display' },
  discount_rate: { label: 'Discount Rate', visibilityMode: 'hide_display' },
}

const ALWAYS_VISIBLE = new Set(['description', 'quantity', 'unit_price'])

/** Columns that can never be hidden from display or from totals. */
export function columnCanBeHidden(key: string): boolean {
  return !ALWAYS_VISIBLE.has(key)
}

/** Normalizes a persisted/output column list: unknown keys pass through verbatim, builtins normalized. */
export function normalizeColumns(raw: unknown): BoluPresentationColumn[] {
  if (!Array.isArray(raw)) return resetColumns()
  const seen = new Set<string>()
  const result: BoluPresentationColumn[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const col = entry as Record<string, unknown>
    const key = typeof col.key === 'string' ? col.key.trim() : ''
    if (!key || seen.has(key)) continue
    seen.add(key)
    const spec = DEFAULT_COLUMN_SPECS[key]
    const visibilityMode = col.visibilityMode === 'hide_display' || col.visibilityMode === 'hide_full' || col.visibilityMode === 'show'
      ? col.visibilityMode
      : col.visible === false
        ? 'hide_display'
        : 'show'
    result.push({
      key,
      label: typeof col.label === 'string' && col.label.trim() ? col.label.trim() : spec?.label ?? key,
      ...(typeof col.type === 'string' ? { type: col.type } : {}),
      visible: visibilityMode === 'show',
      visibilityMode,
      ...(col.removable === true ? { removable: true } : {}),
      ...(col.removable === false || col.removable === undefined ? {} : {}),
      ...(typeof col.includeInTotal === 'boolean' ? { includeInTotal: col.includeInTotal } : {}),
      ...(typeof col.formula === 'string' ? { formula: col.formula } : {}),
    })
  }
  // Keep description first; unknown columns keep their relative order after it.
  const desc = result.find((col) => col.key === 'description')
  const rest = result.filter((col) => col.key !== 'description')
  const ordered = desc ? [desc, ...rest] : result

  // Builtin columns absent from the saved config are appended with defaults,
  // matching the application's resolveFinancialColumns behaviour.
  for (const builtin of DEFAULT_COLUMN_ORDER) {
    if (!seen.has(builtin)) {
      seen.add(builtin)
      ordered.push({
        key: builtin,
        label: DEFAULT_COLUMN_SPECS[builtin].label,
        visible: DEFAULT_COLUMN_SPECS[builtin].visibilityMode === 'show',
        visibilityMode: DEFAULT_COLUMN_SPECS[builtin].visibilityMode,
        removable: false,
      })
    }
  }
  return ordered
}

export function resetColumns(): BoluPresentationColumn[] {
  return DEFAULT_COLUMN_ORDER.map((key) => ({
    key,
    label: DEFAULT_COLUMN_SPECS[key].label,
    visible: DEFAULT_COLUMN_SPECS[key].visibilityMode === 'show',
    visibilityMode: DEFAULT_COLUMN_SPECS[key].visibilityMode,
    removable: false,
  }))
}

/** Fingerprint of the presentation subtree; order significant for columns. */
export function fingerprintPresentation(
  subtree: Record<string, unknown> | null | undefined,
): string {
  if (!subtree) return ''
  const columns = Array.isArray(subtree.columnConfig) ? normalizeColumns(subtree.columnConfig) : resetColumns()
  const normalized = {
    pdfOutput: normalizePdfOutput(subtree.pdfOutput),
    notesTitle: typeof subtree.notesTitle === 'string' ? subtree.notesTitle : null,
    termsTitle: typeof subtree.termsTitle === 'string' ? subtree.termsTitle : null,
    chargeLabels: normalizeChargeLabels(subtree.chargeLabels),
    mergeQtyUnit: subtree.mergeQtyUnit === true,
    showItemImages: subtree.showItemImages === true,
    columns: columns.map((col) => `${col.key}|${col.visibilityMode}|${col.label}`),
    signatoryId: typeof subtree.signatoryId === 'string' && subtree.signatoryId.trim() ? subtree.signatoryId.trim() : null,
  }
  return JSON.stringify(normalized)
}

export interface PresentationApplication {
  subtree: Record<string, unknown>
  rows: Array<{ key: string; label: string; before: string; after: string; cleared?: boolean }>
  summary: string[]
  errors: string[]
}

export interface PresentationResolution {
  /** Resolved signatory identity for the preview and the audit trail; null/undefined = clear. */
  signatory?: { id: string; name: string; role: string } | null
  /** Resolved bank account identity for the preview; null = use the business default bank. */
  bankAccount?: { id: string; label: string } | null
}

const DEFAULT_CHARGE_LABELS: Record<'workmanship' | 'transportation' | 'shipping', string> = {
  workmanship: 'Workmanship',
  transportation: 'Transportation',
  shipping: 'Shipping',
}

const CHARGE_LABELS = DEFAULT_CHARGE_LABELS

const PDF_TOGGLE_LABELS: Record<string, string> = {
  showBankDetails: 'Bank details',
  showFooter: 'Footer',
  showTagline: 'Tagline',
  showBalanceDue: 'Balance due',
  showAmountInWords: 'Amount in words',
  compact: 'Compact print',
  landscapeLayout: 'Landscape layout',
}

const MODE_LABELS: Record<string, string> = {
  show: 'Shown',
  hide_display: 'Hidden',
  hide_full: 'Hidden (and excluded from totals)',
}

const trimmed = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')
const onOff = (value: boolean): string => (value ? 'On' : 'Off')

function row(
  label: string,
  before: string,
  after: string,
  cleared?: boolean,
): PresentationApplication['rows'][number] {
  return { key: label, label, before, after, ...(cleared ? { cleared } : {}) }
}

export function applyPresentationPatch(
  persistedSubtree: Record<string, unknown> | null | undefined,
  patch: BoluPresentationChange,
  resolution: PresentationResolution,
): PresentationApplication {
  const errors: string[] = []
  const rows: PresentationApplication['rows'] = []
  const summary: string[] = []

  const subtree: Record<string, unknown> = { ...(persistedSubtree ?? {}) }
  const currentPdf = normalizePdfOutput(subtree.pdfOutput)
  const nextPdf: ResolvedPdfOutput = { ...currentPdf }

  if (patch.pdfOutput) {
    const given = patch.pdfOutput
    for (const key of ['showBankDetails', 'showFooter', 'showTagline', 'showBalanceDue', 'showAmountInWords', 'compact', 'landscapeLayout'] as const) {
      const value = given[key]
      if (value === undefined) continue
      const before = nextPdf[key]
      nextPdf[key] = value === true
      rows.push(row(PDF_TOGGLE_LABELS[key], onOff(before), onOff(nextPdf[key])))
      if (before !== nextPdf[key]) summary.push(`${PDF_TOGGLE_LABELS[key]}: ${onOff(nextPdf[key])}.`)
    }

    if (given.bankAccountId !== undefined) {
      if (given.bankAccountId === null) {
        nextPdf.bankAccountId = null
        rows.push(row('Bank account', currentPdf.bankAccountId ?? 'Business default', 'Business default', true))
        summary.push('Bank account reset to the business default.')
      } else if (typeof given.bankAccountId === 'string' && given.bankAccountId.trim()) {
        if (!resolution.bankAccount) {
          errors.push('That bank account reference was not resolved for this business. Choose an existing account and try again.')
        } else {
          nextPdf.bankAccountId = resolution.bankAccount.id
          rows.push(row('Bank account', currentPdf.bankAccountId ?? 'Business default', resolution.bankAccount.label))
          summary.push(`Bank account set to ${resolution.bankAccount.label}.`)
        }
      } else {
        errors.push('The bank account must be a valid reference or null for the business default.')
      }
    }
  }

  const notesTitlePersisted = typeof subtree.notesTitle === 'string' ? subtree.notesTitle : null
  if (patch.notesTitle !== undefined) {
    if (patch.notesTitle === null || trimmed(patch.notesTitle) === '') {
      delete subtree.notesTitle
      rows.push(row('Notes heading', notesTitlePersisted ?? 'Notes', 'Notes (default)', true))
      summary.push('Notes heading restored to the default.')
    } else {
      const before = notesTitlePersisted ?? 'Notes'
      const next = trimmed(patch.notesTitle)
      subtree.notesTitle = next
      rows.push(row('Notes heading', before, next))
      summary.push(`Notes heading changed to "${next}".`)
    }
  }

  const termsTitlePersisted = typeof subtree.termsTitle === 'string' ? subtree.termsTitle : null
  if (patch.termsTitle !== undefined) {
    if (patch.termsTitle === null || trimmed(patch.termsTitle) === '') {
      delete subtree.termsTitle
      rows.push(row('Terms heading', termsTitlePersisted ?? 'Terms and Conditions', 'Terms and Conditions (default)', true))
      summary.push('Terms heading restored to the default.')
    } else {
      const before = termsTitlePersisted ?? 'Terms and Conditions'
      const next = trimmed(patch.termsTitle)
      subtree.termsTitle = next
      rows.push(row('Terms heading', before, next))
      summary.push(`Terms heading changed to "${next}".`)
    }
  }

  const chargeLabelsPersisted = normalizeChargeLabels(subtree.chargeLabels)
  if (patch.chargeLabels) {
    const next = { ...chargeLabelsPersisted }
    for (const key of ['workmanship', 'transportation', 'shipping'] as const) {
      const value = patch.chargeLabels[key]
      if (value === undefined) continue
      const before = next[key] ?? CHARGE_LABELS[key]
      if (value === null || trimmed(value) === '') {
        delete next[key]
        rows.push(row(`${CHARGE_LABELS[key]} label`, before, CHARGE_LABELS[key], true))
        summary.push(`${CHARGE_LABELS[key]} label restored to the default.`)
        continue
      }
      next[key] = trimmed(value)
      rows.push(row(`${CHARGE_LABELS[key]} label`, before, next[key]))
      summary.push(`${CHARGE_LABELS[key]} label changed to "${next[key]}".`)
    }
    subtree.chargeLabels = next
  }

  if (patch.mergeQtyUnit !== undefined) {
    const before = subtree.mergeQtyUnit === true
    const next = patch.mergeQtyUnit === true
    subtree.mergeQtyUnit = next
    if (before !== next) {
      rows.push(row('Merge quantity & unit', onOff(before), onOff(next)))
      summary.push(`Quantity/unit ${next ? 'merged' : 'split'} in the document.`)
    }
  }

  if (patch.showItemImages !== undefined) {
    const before = subtree.showItemImages === true
    const next = patch.showItemImages === true
    subtree.showItemImages = next
    if (before !== next) {
      rows.push(row('Show item images', onOff(before), onOff(next)))
      summary.push(`Item images ${next ? 'shown' : 'hidden'}.`)
    }
  }

  const columnsPersisted = normalizeColumns(subtree.columnConfig)
  if (patch.columns) {
    let list = columnsPersisted.map((col) => ({ ...col }))

    if (patch.columns.resetToDefaults === true) {
      const unknown = list.filter((col) => !DEFAULT_COLUMN_SPECS[col.key])
      list = [...resetColumns(), ...unknown]
      rows.push(row('Columns', 'Customised', 'Defaults', true))
      summary.push('Columns reset to the defaults.')
    } else if (patch.columns.order) {
      const wanted = patch.columns.order.map((key) => key.trim()).filter((key) => key.length > 0)
      const builtinByKey = new Map(list.filter((col) => DEFAULT_COLUMN_SPECS[col.key]).map((col) => [col.key, col]))
      const order = wanted.filter((key) => builtinByKey.has(key))
      for (const key of wanted) {
        if (!builtinByKey.has(key)) errors.push(`Unknown column "${key}". Supported columns: ${DEFAULT_COLUMN_ORDER.join(', ')}.`)
      }
      if (wanted.length !== new Set(wanted).size) errors.push('The reorder repeats a column.')
      for (const builtin of DEFAULT_COLUMN_ORDER) {
        if (!wanted.includes(builtin) && !errors.length) {
          // A partial order is not supported; the document keeps the unlisted builtins in place.
          const col = builtinByKey.get(builtin)
          if (col) order.push(builtin)
        }
      }
      const ordered = order.map((key) => builtinByKey.get(key)!).filter(Boolean)
      const unknown = list.filter((col) => !DEFAULT_COLUMN_SPECS[col.key])
      list = [...ordered, ...unknown]
      if (errors.length === 0) {
        rows.push(row('Column order', 'Previous', 'Reordered'))
        summary.push('Column order changed.')
      }
    }

    if (patch.columns.setMode) {
      for (const op of patch.columns.setMode) {
        const col = list.find((entry) => entry.key === op.key)
        if (!col) {
          errors.push(`Unknown column "${op.key}". Supported columns: ${DEFAULT_COLUMN_ORDER.join(', ')}.`)
          continue
        }
        if (!columnCanBeHidden(op.key) && op.mode !== 'show') {
          errors.push(`The ${col.label} column cannot be hidden.`)
          continue
        }
        const before = col.visibilityMode ?? 'show'
        col.visibilityMode = op.mode
        col.visible = op.mode === 'show'
        rows.push(row(`${col.label} column`, MODE_LABELS[before], MODE_LABELS[op.mode]))
        summary.push(`${col.label} column: ${MODE_LABELS[op.mode].toLowerCase()}.`)
      }
    }

    if (patch.columns.setLabel) {
      for (const op of patch.columns.setLabel) {
        const col = list.find((entry) => entry.key === op.key)
        if (!col) {
          errors.push(`Unknown column "${op.key}". Supported columns: ${DEFAULT_COLUMN_ORDER.join(', ')}.`)
          continue
        }
        const label = trimmed(op.label)
        if (!label) {
          errors.push('A column needs a label.')
          continue
        }
        const clash = list.some((entry) => entry.key !== op.key && entry.label.toLowerCase() === label.toLowerCase())
        if (clash) {
          errors.push(`Another column is already named "${label}".`)
          continue
        }
        const before = col.label
        col.label = label
        rows.push(row('Column label', before, label))
        summary.push(`Column renamed from "${before}" to "${label}".`)
      }
    }

    subtree.columnConfig = normalizeColumns(list)
  }

  const signatoryPersisted = typeof subtree.signatoryId === 'string' && subtree.signatoryId ? subtree.signatoryId : null
  if (patch.signatory !== undefined) {
    if (patch.signatory === null) {
      delete subtree.signatoryId
      rows.push(row('Signatory', signatoryPersisted ? 'Set' : 'Not set', 'None', true))
      summary.push('Signatory removed.')
    } else if (resolution.signatory && typeof resolution.signatory === 'object') {
      subtree.signatoryId = resolution.signatory.id
      rows.push(row('Signatory', signatoryPersisted ? 'Set' : 'Not set', `${resolution.signatory.name}${resolution.signatory.role ? ` — ${resolution.signatory.role}` : ''}`))
      summary.push(`Signatory set to ${resolution.signatory.name}${resolution.signatory.role ? ` (${resolution.signatory.role})` : ''}.`)
    } else {
      errors.push('The requested signatory could not be resolved to a single authorised signatory in this business entity.')
    }
  }

  subtree.pdfOutput = nextPdf
  subtree.chargeLabels = normalizeChargeLabels(subtree.chargeLabels)
  if (!Array.isArray(subtree.columnConfig)) subtree.columnConfig = resetColumns()

  return { subtree, rows, summary, errors }
}
