import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Check, Loader2, Sparkles, AlertCircle, FileCheck, FileText, ShieldAlert, ArrowRight, Search, UserPlus, X, type LucideIcon } from 'lucide-react'
import type {
  BoluAdvanceConfigProposal,
  BoluAdvanceFieldKey,
  BoluClarification,
  BoluClientResolution,
  BoluProposal,
} from '@/lib/ai-assistant/bolu-operations'
import type {
  BoluClientCreateInput,
  BoluClientCreationOutcome,
  BoluClientMatch,
  BoluClientSearchResult,
} from '@/lib/ai-assistant/bolu-data'
import { formatNaira } from '@/lib/formatters/money'
import { richTextToPlainText } from '@/components/pdf/core/richText'
import { CopyButton } from './assistant-chat-copy-button'
import { HandCoins, Trash2 } from 'lucide-react'

/* Advance Invoice proposal helpers (parent-invoice-only metadata). */

function plainTextOf(value: unknown): string {
  return richTextToPlainText(value)
}

const ADVANCE_FIELD_ORDER: readonly BoluAdvanceFieldKey[] = ['suffix', 'mode', 'value', 'primary_label', 'secondary_label']
const ADVANCE_FIELD_LABELS: Record<BoluAdvanceFieldKey, string> = {
  suffix: 'Suffix',
  mode: 'Mode',
  value: 'Value',
  primary_label: 'Primary label',
  secondary_label: 'Secondary label',
}

function formatAdvanceValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

/**
 * AdvanceConfigPreview - structured before/after view of a parent invoice's
 * Advance Invoice configuration. It renders the approved proposal payload
 * only; it never recomputes money itself (preview values were derived by the
 * domain helpers when the proposal was built).
 */
export function AdvanceConfigPreview({ proposal }: { proposal: BoluAdvanceConfigProposal }) {
  const { intent } = proposal
  const isRemove = intent === 'remove'
  const action =
    intent === 'configure' ? 'Configure Advance Invoice' : intent === 'update' ? 'Update Advance Invoice' : 'Remove Advance Invoice'
  const changed = ADVANCE_FIELD_ORDER.filter((key) => {
    const field = proposal.preview.fields[key]
    return field && field.before !== field.after
  })
  const requestedValue = typeof proposal.newValues.value === 'number' ? proposal.newValues.value : null
  const effectiveMode = proposal.preview.fields.mode?.after
  const clamped =
    !isRemove &&
    effectiveMode === 'fixed' &&
    requestedValue != null &&
    proposal.preview.amount != null &&
    Math.abs(proposal.preview.amount - requestedValue) > 0.004

  return (
    <section className={`ac-advance${isRemove ? ' ac-advance--remove' : ''}`} aria-label={action}>
      <div className="ac-advance-head">
        {isRemove ? (
          <Trash2 size={12} aria-hidden="true" />
        ) : (
          <HandCoins size={12} aria-hidden="true" />
        )}
        <span>{action}</span>
      </div>
      <p className="ac-advance-target">
        Advance on invoice <code>{proposal.targetDocumentNumber || '—'}</code>
      </p>
      {isRemove ? (
        <div className="ac-advance-rows" aria-label="Configuration to be removed">
          {ADVANCE_FIELD_ORDER.map((key) => {
            const before = proposal.preview.fields[key]?.before ?? null
            return (
              <AdvanceRow key={key} label={ADVANCE_FIELD_LABELS[key]} before={before} after={null} removing />
            )
          })}
        </div>
      ) : changed.length === 0 ? (
        <p className="ac-advance-noop">No field changes detected; saving would write identical values.</p>
      ) : (
        <div className="ac-advance-rows" aria-label="Changed fields">
          {changed.map((key) => (
            <AdvanceRow
              key={key}
              label={ADVANCE_FIELD_LABELS[key]}
              before={proposal.preview.fields[key]?.before ?? null}
              after={proposal.preview.fields[key]?.after ?? null}
            />
          ))}
        </div>
      )}
      {!isRemove && proposal.preview.amount != null ? (
        <div className="ac-advance-amount">
          <span>Advance amount</span>
          <strong>{formatNaira(proposal.preview.amount)}</strong>
          <span>Contract value {formatNaira(proposal.preview.contractValue ?? 0)}</span>
        </div>
      ) : null}
      {clamped ? (
        <p className="ac-advance-clamp" role="status">
          Requested {formatNaira(requestedValue ?? 0)} exceeds the contract value; the effective advance is{' '}
          {formatNaira(proposal.preview.amount ?? 0)}.
        </p>
      ) : null}
    </section>
  )
}

const MODIFY_FIELD_LABELS: Record<string, string> = {
  client_name: 'Customer',
  notes: 'Notes',
  payment_terms: 'Payment terms',
  due_date: 'Due date',
  issue_date: 'Issue date',
  terms: 'Terms',
  po_number: 'PO number',
  title: 'Title',
  project_id: 'Project',
  work_duration: 'Work duration',
  workmanship: 'Workmanship',
  transportation: 'Transportation',
  shipping: 'Shipping',
}

const MODIFY_CHARGE_FIELDS = new Set(['workmanship', 'transportation', 'shipping'])

/** Readable cell for a modify diff value — rich text summarized, charges as naira. */
function formatModifyCell(field: string | undefined, value: unknown): string {
  if (value === undefined) return '—'
  if (value === null) return '—'
  if (typeof value === 'object') return plainTextOf(value).trim() || '—'
  if (field && MODIFY_CHARGE_FIELDS.has(field)) return formatNaira(Number(value) || 0)
  const text = String(value).trim()
  return text.length > 0 ? text : '—'
}

const CALC_INPUT_LABELS: Record<string, string> = {
  vatPercent: 'VAT rate (%)',
  discountValue: 'Discount',
  discountType: 'Discount type',
  discountTiming: 'Discount timing',
  whtValue: 'WHT',
  whtType: 'WHT type',
}

function formatCalcCell(key: string, value: unknown): string {
  if (value === undefined || value === null) return '—'
  if (key === 'discountType' || key === 'whtType') {
    return value === 'percent' ? 'Percentage' : value === 'fixed' ? 'Fixed amount' : String(value)
  }
  if (key === 'discountTiming') {
    return value === 'before_tax' ? 'Before tax' : value === 'after_tax' ? 'After tax' : String(value)
  }
  return String(value)
}

function ModifyDiffRow({ label, before, after, clearing = false }: { label: string; before: string; after: string; clearing?: boolean }) {
  return (
    <>
      <span className="ac-advance-key">{label}</span>
      <span className="ac-advance-val">
        <span className="ac-advance-before">{before}</span>
        <ArrowRight className="size-3 text-[var(--ac-muted)] shrink-0" aria-hidden="true" />
        <span className="font-bold text-[var(--ac-ink)]">{after}</span>
        {clearing ? (
          <span className="rounded-full border border-[var(--ac-accent)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--ac-accent)]">
            Cleared
          </span>
        ) : null}
      </span>
    </>
  )
}

/**
 * ModifyDiffPanel — the full before→after picture for a modification proposal:
 * the scalar field (if any), fixed-charge edits flagged when they clear to
 * zero, the desired extra-charges set (added / changed / removed), and the
 * calculation inputs the user changed. Rendering only; all values were
 * produced by the proposal builder from the persisted snapshot.
 */
function ModifyDiffPanel({ proposal }: { proposal: BoluProposal & { operationType: 'modify-document' } }) {
  const scalarIsCharge = proposal.field !== undefined && MODIFY_CHARGE_FIELDS.has(proposal.field)
  const clearingToZero =
    scalarIsCharge &&
    typeof proposal.oldValue === 'number' && proposal.oldValue > 0 &&
    typeof proposal.newValue === 'number' && proposal.newValue === 0

  const oldCharges = proposal.extraChargesChange?.oldExtraCharges ?? null
  const newCharges = proposal.extraChargesChange?.newExtraCharges ?? null

  const chargeRows: Array<{ key: string; before: string; after: string; added: boolean; removed: boolean }> = []
  if (oldCharges || newCharges) {
    const norm = (list: typeof oldCharges) =>
      (list ?? []).map((charge) => ({
        label: charge.label,
        value: Number(charge.value) || 0,
        withTax: charge.withTax === true,
      }))
    const oldList = norm(oldCharges)
    const newList = norm(newCharges)
    const keys = new Set<string>([
      ...oldList.map((c) => c.label.toLowerCase()),
      ...newList.map((c) => c.label.toLowerCase()),
    ])
    for (const key of keys) {
      const before = oldList.find((c) => c.label.toLowerCase() === key) ?? null
      const after = newList.find((c) => c.label.toLowerCase() === key) ?? null
      const fmt = (charge: typeof before) =>
        charge ? `${formatNaira(charge.value)}${charge.withTax ? ' · VAT' : ''}` : '—'
      chargeRows.push({
        key,
        before: fmt(before),
        after: fmt(after),
        added: !before && Boolean(after),
        removed: Boolean(before) && !after,
      })
    }
  }

  const calcChanges = proposal.calculationInputsChange
  const calcRows = calcChanges
    ? (Object.keys(calcChanges.new) as Array<keyof typeof calcChanges.new>).map((key) => ({
        key: String(key),
        label: CALC_INPUT_LABELS[String(key)] ?? String(key),
        before: formatCalcCell(String(key), calcChanges.old[key]),
        after: formatCalcCell(String(key), calcChanges.new[key]),
      }))
    : []

  const anything =
    Boolean(proposal.field) || chargeRows.length > 0 || calcRows.length > 0
  if (!anything) return null

  const documentNoun = proposal.documentFamily === 'quotation' ? 'quotation' : 'invoice'

  return (
    <section className="ac-advance ac-modify-diff" aria-label="Document changes">
      <p className="ac-advance-target">
        On {documentNoun} <code className="font-mono">{proposal.targetDocumentNumber || '—'}</code>
      </p>
      <div className="ac-advance-rows" aria-label="Document changes">
        {proposal.field ? (
          <ModifyDiffRow
            label={MODIFY_FIELD_LABELS[proposal.field] ?? proposal.field}
            before={formatModifyCell(proposal.field, proposal.oldValue)}
            after={formatModifyCell(proposal.field, proposal.newValue)}
            clearing={clearingToZero}
          />
        ) : null}
        {calcRows.map((row) => (
          <ModifyDiffRow key={row.key} label={row.label} before={row.before} after={row.after} />
        ))}
      </div>
      {chargeRows.length > 0 ? (
        <div className="ac-advance-rows" aria-label="Named charges">
          {chargeRows.map((row) => (
            <div key={row.key} className="contents">
              <span className="ac-advance-key">
                {row.key.charAt(0).toUpperCase() + row.key.slice(1)}
                {row.added ? (
                  <span className="ml-1.5 rounded-full border border-[var(--ac-line)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide">
                    New
                  </span>
                ) : null}
                {row.removed ? (
                  <span className="ml-1.5 rounded-full border border-[var(--ac-accent)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--ac-accent)]">
                    Removed
                  </span>
                ) : null}
              </span>
              <span className="ac-advance-val">
                <span className="ac-advance-before">{row.before}</span>
                <ArrowRight className="size-3 text-[var(--ac-muted)] shrink-0" aria-hidden="true" />
                <span className="font-bold text-[var(--ac-ink)]">{row.after}</span>
              </span>
            </div>
          ))}
        </div>
      ) : null}
      {clearingToZero ? (
        <p className="ac-advance-clamp" role="status">
          This clears the {MODIFY_FIELD_LABELS[proposal.field!]} to zero — the charge will no longer be applied on this document.
        </p>
      ) : null}
    </section>
  )
}

function AdvanceRow({
  label,
  before,
  after,
  removing = false,
}: {
  label: string
  before: string | number | null
  after: string | number | null
  removing?: boolean
}) {
  return (
    <>
      <span className="ac-advance-key">{label}</span>
      <span className="ac-advance-val">
        <span className="ac-advance-before">{formatAdvanceValue(before)}</span>
        {removing ? (
          <span className="ac-advance-remove-mark">Removed</span>
        ) : (
          <>
            <ArrowRight className="size-3 text-[var(--ac-muted)] shrink-0" aria-hidden="true" />
            <span className="font-bold text-[var(--ac-ink)]">{formatAdvanceValue(after)}</span>
          </>
        )}
      </span>
    </>
  )
}

/**
 * proposalPlainText — deterministic text view of a typed proposal payload.
 *
 * Used by the artifact copy action. It reads only the authoritative proposal
 * fields (the same ones the card renders) and never recalculates money beyond
 * the quantity × unit price already shown. No prose context is included, so a
 * copied artifact cannot be confused with the assistant response.
 */
export function proposalPlainText(proposal: BoluProposal): string {
  const isCreate = proposal.operationType === 'create-document'
  const isAdvance = proposal.operationType === 'advance-invoice-config'
  const isQuotation = proposal.documentFamily === 'quotation'
  const noun = isQuotation ? 'Quotation' : 'Invoice'
  const lines: string[] = []

  if (isCreate) {
    lines.push(`New ${noun} proposal for ${proposal.payload.client_name || 'Client'}`)
  } else if (isAdvance) {
    const action =
      proposal.intent === 'configure' ? 'Configure' : proposal.intent === 'update' ? 'Update' : 'Remove'
    lines.push(`${action} Advance Invoice for ${proposal.targetDocumentNumber || 'Document'}`)
    for (const key of ADVANCE_FIELD_ORDER) {
      const change = proposal.preview.fields[key]
      if (!change) continue
      if (change.before === change.after) continue
      lines.push(`${ADVANCE_FIELD_LABELS[key]}: ${formatAdvanceValue(change.before)} -> ${formatAdvanceValue(change.after)}`)
    }
    if (proposal.preview.amount != null) {
      lines.push(`Computed advance amount: ${formatNaira(proposal.preview.amount)}`)
    }
    if (proposal.preview.contractValue != null) {
      lines.push(`Contract value: ${formatNaira(proposal.preview.contractValue)}`)
    }
  } else {
    lines.push(`${noun} modification for ${proposal.targetDocumentNumber || 'Document'}`)
    if (proposal.field) {
      const label = MODIFY_FIELD_LABELS[proposal.field] ?? proposal.field
      const cleared =
        MODIFY_CHARGE_FIELDS.has(proposal.field) &&
        typeof proposal.oldValue === 'number' && proposal.oldValue > 0 &&
        typeof proposal.newValue === 'number' && proposal.newValue === 0
      lines.push(`${label}: ${formatModifyCell(proposal.field, proposal.oldValue)} -> ${formatModifyCell(proposal.field, proposal.newValue)}${cleared ? ' (cleared)' : ''}`)
    }
    if (proposal.calculationInputsChange) {
      for (const key of Object.keys(proposal.calculationInputsChange.new)) {
        const label = CALC_INPUT_LABELS[key] ?? key
        lines.push(`${label}: ${formatCalcCell(key, proposal.calculationInputsChange.old[key])} -> ${formatCalcCell(key, proposal.calculationInputsChange.new[key])}`)
      }
    }
    if (proposal.extraChargesChange) {
      const oldList = proposal.extraChargesChange.oldExtraCharges
      const newList = proposal.extraChargesChange.newExtraCharges
      const labels = Array.from(
        new Set<string>([...oldList, ...newList].map((charge) => charge.label.toLowerCase())),
      )
      for (const label of labels) {
        const before = oldList.find((charge) => charge.label.toLowerCase() === label)
        const after = newList.find((charge) => charge.label.toLowerCase() === label)
        const fmt = (charge: typeof before) =>
          charge ? `${formatNaira(charge.value)}${charge.withTax ? ' (VAT)' : ''}` : '—'
        const tag = !before ? ' [new]' : !after ? ' [removed]' : ''
        lines.push(`${(before ?? after)?.label ?? label}: ${fmt(before)} -> ${fmt(after)}${tag}`)
      }
    }
  }

  const items = (isCreate
    ? proposal.payload.items
    : proposal.operationType === 'modify-document'
      ? proposal.itemsChange?.newItems
      : []) ?? []
  if (items.length > 0) {
    lines.push('', 'Line items:')
    for (const item of items) {
      lines.push(
        `- ${item.quantity} x ${item.description}: ${formatNaira(item.quantity * item.unit_price)}`,
      )
    }
  }

  if (isCreate) {
    const fixed = [
      { label: 'Workmanship', value: proposal.payload.workmanship ?? 0 },
      { label: 'Transportation', value: proposal.payload.transportation ?? 0 },
      { label: 'Shipping', value: proposal.payload.shipping ?? 0 },
    ].filter((charge) => charge.value > 0)
    if (fixed.length > 0) {
      lines.push('', 'Fixed charges:')
      for (const charge of fixed) lines.push(`- ${charge.label}: ${formatNaira(charge.value)}`)
    }
    const custom = proposal.payload.extra_charges ?? []
    if (custom.length > 0) {
      lines.push('', 'Custom charges:')
      for (const charge of custom) {
        lines.push(
          `- ${charge.label}: ${formatNaira(charge.value)} (${charge.vatApplicable ? 'VAT applies' : 'no VAT'})`,
        )
      }
    }
  }

  const totals = proposal.operationType === 'advance-invoice-config' ? undefined : proposal.computedTotals
  if (totals && totals.total > 0) {
    lines.push('', `Subtotal: ${formatNaira(totals.subtotal)}`)
    const extraChargesTotal = (totals as { extraChargesTotal?: number }).extraChargesTotal
    if (typeof extraChargesTotal === 'number' && extraChargesTotal > 0) {
      lines.push(`Charges: ${formatNaira(extraChargesTotal)}`)
    }
    const discount = typeof (totals as { discount?: number }).discount === 'number'
      ? (totals as { discount?: number }).discount as number
      : 0
    const wht = typeof (totals as { wht?: number }).wht === 'number'
      ? (totals as { wht?: number }).wht as number
      : 0
    if (discount > 0) lines.push(`Discount: -${formatNaira(discount)}`)
    if (totals.vat > 0) lines.push(`VAT: ${formatNaira(totals.vat)}`)
    if (wht > 0) lines.push(`WHT: -${formatNaira(wht)}`)
    lines.push(`Authoritative total: ${formatNaira(totals.total)}`)
  }

  // Copy text follows the same rule as the card: no placeholder number.
  if (isCreate && AUTHORITATIVE_DOCUMENT_NUMBER.test(proposal.candidateNumber || '')) {
    lines.push('', `Document number: ${proposal.candidateNumber}`)
  }
  lines.push('', `Status: ${proposal.status}`)

  return lines.join('\n')
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string; icon?: LucideIcon }[]
  label: string
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex rounded-full border border-[var(--ac-line)] bg-[var(--ac-surface)] p-0.5"
    >
      {options.map((option) => {
        const Icon = option.icon
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              value === option.value
                ? 'bg-[var(--ac-ink)] text-[var(--ac-surface)]'
                : 'text-[var(--ac-muted)] hover:text-[var(--ac-ink)]'
            }`}
          >
            {Icon ? <Icon className="size-3.5" aria-hidden="true" /> : null}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * The BOUXRE mark: a geometric B drawn in two bowls around one stem.
 */
export function AssistantMark({
  size = 28,
  tone = 'soft',
  className = '',
  title,
}: {
  size?: number
  tone?: 'soft' | 'solid'
  className?: string
  title?: string
}) {
  return (
    <span
      className={`ac-mark ac-mark--${tone} ${className}`.trim()}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.3) }}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <svg viewBox="0 0 32 32" width={size} height={size} fill="none" aria-hidden="true">
        <path
          d="M11 7v18M11 7h7.5a5.5 5.5 0 0 1 0 11H11M11 18h8.5a5 5 0 0 1 0 10H11"
          stroke="currentColor"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

export function StatusRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="ac-status" data-done={done}>
      <span className="ac-status-icon" aria-hidden="true">
        {done ? <Check className="size-3.5" strokeWidth={2.6} /> : <Loader2 className="ac-spin size-3.5" />}
      </span>
      <span>{label}</span>
    </div>
  )
}

/**
 * ProposalCommercialBreakdown — commercial terms that are not ordinary line
 * items. Fixed charges and custom named charges stay visually distinct, and a
 * custom charge keeps its tax flag, because the tax base depends on it.
 */
export function ProposalCommercialBreakdown({ proposal }: { proposal: BoluProposal }) {
  if (proposal.operationType !== 'create-document') return null
  const payload = proposal.payload

  const fixedCharges = [
    { label: 'Workmanship', value: payload.workmanship ?? 0 },
    { label: 'Transportation', value: payload.transportation ?? 0 },
    { label: 'Shipping', value: payload.shipping ?? 0 },
  ].filter((charge) => charge.value > 0)

  const customCharges = payload.extra_charges ?? []

  // Discount and withholding are rendered once, in the totals block, so they
  // are deliberately not repeated here.
  if (fixedCharges.length === 0 && customCharges.length === 0) {
    return null
  }

  return (
    <div className="ac-card-charges mt-3 pt-2 border-t border-[var(--ac-line)] text-xs space-y-1">
      {fixedCharges.length > 0 ? (
        <div className="space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ac-muted)]">
            Fixed charges
          </p>
          {fixedCharges.map((charge) => (
            <div key={charge.label} className="flex justify-between text-[var(--ac-muted)]">
              <span>{charge.label}</span>
              <span>{formatNaira(charge.value)}</span>
            </div>
          ))}
        </div>
      ) : null}

      {customCharges.length > 0 ? (
        <div className="space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ac-muted)]">
            Custom charges
          </p>
          {customCharges.map((charge, index) => (
            <div key={`${charge.label}-${index}`} className="flex items-center justify-between gap-2 text-[var(--ac-muted)]">
              <span className="min-w-0 truncate">
                {charge.label}
                <span
                  className="ml-1.5 rounded-full border border-[var(--ac-line)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                  data-tax={charge.vatApplicable ? 'yes' : 'no'}
                >
                  {charge.vatApplicable ? 'VAT' : 'No VAT'}
                </span>
              </span>
              <span className="shrink-0">{formatNaira(charge.value)}</span>
            </div>
          ))}
        </div>
      ) : null}

    </div>
  )
}

/**
 * ProposalClientPicker — searchable client selection inside the document
 * preview card. It is the fallback for an unresolved, ambiguous or manually
 * overridden client, never a permanent second panel.
 *
 * Searching is read-only. Selecting attaches a verified record ID to the draft.
 * Creating a client needs a second, explicit approval on the preview below.
 */
export function ProposalClientPicker({
  resolution,
  clientName,
  disabled = false,
  onSearch,
  onSelect,
  onCreate,
}: {
  resolution?: BoluClientResolution
  clientName?: string
  disabled?: boolean
  onSearch: (term: string) => Promise<BoluClientSearchResult>
  onSelect: (client: BoluClientMatch) => void | Promise<unknown>
  onCreate?: (input: BoluClientCreateInput) => Promise<BoluClientCreationOutcome>
}) {
  const isResolved = resolution?.status === 'resolved'
  const [expanded, setExpanded] = useState(!isResolved)
  const [term, setTerm] = useState(
    resolution && 'query' in resolution ? resolution.query : (clientName ?? ''),
  )
  const [result, setResult] = useState<BoluClientSearchResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState<BoluClientCreateInput | null>(null)
  const [creating, setCreating] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runSearch = useCallback(
    async (value: string) => {
      const clean = value.trim()
      if (clean.length < 2) {
        setError('Enter at least 2 characters of the client name, phone or email.')
        return
      }
      setBusy(true)
      setError(null)
      setNotice(null)
      setDraft(null)
      try {
        setResult(await onSearch(clean))
      } catch {
        setResult({ status: 'search_error', query: clean, error: 'The search could not run.' })
      } finally {
        setBusy(false)
      }
    },
    [onSearch],
  )

  // An unresolved draft opens with one search so the user sees candidates at once.
  useEffect(() => {
    if (isResolved || disabled) return
    const query = resolution && 'query' in resolution ? resolution.query : ''
    if (query.length >= 2) void runSearch(query)
    // Runs once for the draft this card was created with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSelect = async (client: BoluClientMatch) => {
    setError(null)
    setNotice(null)
    await onSelect(client)
    setExpanded(false)
  }

  const handleCreate = async () => {
    if (!draft || !onCreate) return
    setCreating(true)
    setError(null)
    try {
      const outcome = await onCreate(draft)
      const attached = outcome.client
      if (!outcome.ok || !attached) {
        setError(outcome.error ?? 'The client could not be created.')
        return
      }
      setNotice(
        outcome.reused
          ? `${attached.name} already existed and is attached to this draft. Nothing has been filed yet.`
          : `${attached.name} was created and attached to this draft. Nothing has been filed yet.`,
      )
      setDraft(null)
      setExpanded(false)
    } finally {
      setCreating(false)
    }
  }

  const matches = result 
    ? result.status === 'exact_match' || result.status === 'single_match'
      ? [result.client]
      : result.status === 'ambiguous'
        ? result.matches
        : []
    : []

  return (
    <section className="mt-2" aria-label="Client for this document">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ac-muted)]">Client</p>
        <span
          className="rounded-full border border-[var(--ac-line)] px-2 py-0.5 text-[10px] font-semibold"
          data-resolved={isResolved ? 'yes' : 'no'}
        >
          {isResolved ? 'Verified record' : 'Not resolved'}
        </span>
      </div>
      <p className="mt-0.5 text-xs font-semibold text-[var(--ac-ink)] truncate">
        {isResolved ? resolution.client.name : (clientName || 'No client attached')}
      </p>

      {isResolved && !expanded ? (
        <button
          type="button"
          className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--ac-accent)] hover:underline"
          onClick={() => setExpanded(true)}
          disabled={disabled}
        >
          <Search className="size-3" aria-hidden="true" />
          Change client
        </button>
      ) : null}

      {expanded ? (
        <div className="mt-2 space-y-2">
          <form
            className="flex items-center gap-1.5"
            onSubmit={(event) => {
              event.preventDefault()
              void runSearch(term)
            }}
          >
            <input
              type="search"
              value={term}
              disabled={disabled || busy}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Name, phone, email or contact"
              aria-label="Search the client directory"
              className="min-w-0 flex-1 rounded-lg border border-[var(--ac-line)] bg-[var(--ac-surface)] px-2.5 py-1.5 text-xs text-[var(--ac-ink)] outline-none focus:border-[var(--ac-accent)]"
            />
            <button
              type="submit"
              disabled={disabled || busy}
              className="shrink-0 rounded-lg border border-[var(--ac-line)] px-2.5 py-1.5 text-xs font-semibold text-[var(--ac-ink)] hover:bg-[var(--ac-muted-surface)] disabled:opacity-50"
            >
              {busy ? 'Searching…' : 'Search'}
            </button>
          </form>

          {result?.status === 'search_error' ? (
            <p className="flex items-start gap-1.5 text-[11px] text-rose-600 dark:text-rose-400" role="alert">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span>
                The client directory could not be searched. This is not an empty result. Try again in a
                moment.
              </span>
            </p>
          ) : null}

          {result && (result.status === 'not_found' || result.status === 'ambiguous') && matches.length === 0 ? (
            <p className="text-[11px] text-[var(--ac-muted)]">
              No client matches “{result.query}”. Choose a different term or create the client below.
            </p>
          ) : null}

          {matches.length > 0 ? (
            <ul className="divide-y divide-[var(--ac-line)] rounded-lg border border-[var(--ac-line)] overflow-hidden">
              {matches.map((client) => (
                <li key={client.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => void handleSelect(client)}
                    className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-[var(--ac-muted-surface)] disabled:opacity-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-[var(--ac-ink)]">{client.name}</span>
                      <span className="block truncate text-[10px] text-[var(--ac-muted)]">
                        {[client.phone, client.email, client.contactPerson].filter(Boolean).join(' · ')
                          || 'No contact details'}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] font-semibold text-[var(--ac-accent)]">Use</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {onCreate && result?.status === 'not_found' && !draft ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                setDraft({
                  name: result.query,
                })
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--ac-line)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--ac-ink)] hover:bg-[var(--ac-muted-surface)] disabled:opacity-50"
            >
              <UserPlus className="size-3.5" aria-hidden="true" />
              Create a new client
            </button>
          ) : null}

          {draft ? (
            <div className="rounded-lg border border-[var(--ac-line)] bg-[var(--ac-muted-surface)] p-2.5 text-xs space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--ac-muted)]">
                New client preview
              </p>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                <input
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  aria-label="New client name"
                  placeholder="Client name"
                  className="rounded-lg border border-[var(--ac-line)] bg-[var(--ac-surface)] px-2 py-1 text-xs"
                />
                <input
                  value={draft.phone ?? ''}
                  onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
                  aria-label="New client phone"
                  placeholder="Phone"
                  className="rounded-lg border border-[var(--ac-line)] bg-[var(--ac-surface)] px-2 py-1 text-xs"
                />
                <input
                  value={draft.email ?? ''}
                  onChange={(event) => setDraft({ ...draft, email: event.target.value })}
                  aria-label="New client email"
                  placeholder="Email"
                  className="rounded-lg border border-[var(--ac-line)] bg-[var(--ac-surface)] px-2 py-1 text-xs"
                />
                <input
                  value={draft.contact_person ?? ''}
                  onChange={(event) => setDraft({ ...draft, contact_person: event.target.value })}
                  aria-label="New client contact person"
                  placeholder="Contact person"
                  className="rounded-lg border border-[var(--ac-line)] bg-[var(--ac-surface)] px-2 py-1 text-xs"
                />
              </div>
              <p className="text-[10px] text-[var(--ac-muted)] leading-relaxed">
                Creating the client adds a new record to your client directory. The document stays a draft and
                needs its own approval.
              </p>
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  disabled={creating}
                  onClick={() => setDraft(null)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--ac-line)] px-2.5 py-1 text-[11px] font-semibold text-[var(--ac-muted)] disabled:opacity-50"
                >
                  <X className="size-3" aria-hidden="true" />
                  Back
                </button>
                <button
                  type="button"
                  disabled={creating || draft.name.trim().length < 2}
                  onClick={() => void handleCreate()}
                  className="inline-flex items-center gap-1 rounded-lg bg-[var(--ac-accent)] px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
                >
                  {creating ? <Loader2 className="size-3 animate-spin" /> : <UserPlus className="size-3" />}
                  {creating ? 'Creating…' : 'Create client record'}
                </button>
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="text-[11px] text-rose-600 dark:text-rose-400" role="alert">{error}</p>
          ) : null}
          {notice ? (
            <p className="text-[11px] text-[var(--ac-sage,green)]" role="status">{notice}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

/**
 * ProposalClarificationCard — compact, reusable questions for one pending
 * operation. An answer updates the draft only and never authorizes a write.
 */
export function ProposalClarificationCard({
  clarification,
  disabled = false,
  onAnswer,
}: {
  clarification: BoluClarification
  disabled?: boolean
  onAnswer: (questionId: string, answer: { optionId?: string; text?: string }) => void | Promise<unknown>
}) {
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState<string | null>(null)

  const answer = async (questionId: string, value: { optionId?: string; text?: string }) => {
    setSubmitting(questionId)
    try {
      await onAnswer(questionId, value)
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <section
      className="ac-card-clarify mt-3 rounded-xl border border-[var(--ac-line)] bg-[var(--ac-muted-surface)] p-2.5"
      aria-label="Bolu needs more information"
    >
      <p className="flex items-start gap-1.5 text-[11px] font-medium text-[var(--ac-ink)]">
        <Sparkles className="mt-0.5 size-3.5 shrink-0 text-[var(--ac-accent)]" aria-hidden="true" />
        <span>{clarification.reason}</span>
      </p>

      <div className="mt-2 space-y-2">
        {clarification.questions.map((question) => (
          <div key={question.id}>
            <p className="text-[11px] text-[var(--ac-muted)]">{question.prompt}</p>
            {question.options.length > 0 ? (
              <div role="group" aria-label={question.prompt} className="mt-1 flex flex-wrap gap-1.5">
                {question.options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    disabled={disabled || submitting === question.id}
                    onClick={() => void answer(question.id, { optionId: option.id })}
                    className="rounded-full border border-[var(--ac-line)] bg-[var(--ac-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--ac-ink)] hover:border-[var(--ac-accent)] disabled:opacity-50"
                    title={option.description}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
            {question.allowFreeText ? (
              <form
                className="mt-1.5 flex items-center gap-1.5"
                onSubmit={(event) => {
                  event.preventDefault()
                  const value = textAnswers[question.id]?.trim() ?? ''
                  if (!value) return
                  void answer(question.id, { text: value })
                  setTextAnswers((prev) => ({ ...prev, [question.id]: '' }))
                }}
              >
                <input
                  value={textAnswers[question.id] ?? ''}
                  disabled={disabled || submitting === question.id}
                  onChange={(event) =>
                    setTextAnswers((prev) => ({ ...prev, [question.id]: event.target.value }))
                  }
                  aria-label={`Your answer: ${question.prompt}`}
                  placeholder="Type your answer"
                  className="min-w-0 flex-1 rounded-lg border border-[var(--ac-line)] bg-[var(--ac-surface)] px-2 py-1 text-[11px] text-[var(--ac-ink)]"
                />
                <button
                  type="submit"
                  disabled={disabled || submitting === question.id}
                  className="shrink-0 rounded-lg border border-[var(--ac-line)] px-2 py-1 text-[11px] font-semibold text-[var(--ac-ink)] disabled:opacity-50"
                >
                  Answer
                </button>
              </form>
            ) : null}
          </div>
        ))}
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-[var(--ac-muted)]">
        Answering updates this draft only. Nothing is saved until you approve the changes and confirm the
        save.
      </p>
    </section>
  )
}

/**
 * A document number is only shown when it comes from an authoritative source:
 * `{PREFIX}-{serial}` as allocated by the numbering engine. Draft placeholders
 * such as `INV-DRAFT` never match, so the card cannot imply a reserved number.
 */
const AUTHORITATIVE_DOCUMENT_NUMBER = /^[A-Z0-9]{2,6}-\d{3,}$/

/**
 * ProposalCardView — Two-Gate Operation Decision Surface (DEC-05)
 *
 * Consumes authoritative `BoluProposal` payloads from `bolu-operations.ts`.
 * - Gate 1: Review draft change proposal (Approve / Reject)
 * - Gate 2: Explicit human confirmation before persistent database write (Confirm Save / Cancel)
 */
export function ProposalCardView({
  proposal,
  onApproveGate1,
  onRejectGate1,
  onConfirmGate2,
  onCancelGate2,
  onSearchClients,
  onSelectClient,
  onCreateClient,
  onAnswerClarification,
  onReturnToReview,
  compact = false,
}: {
  proposal: BoluProposal
  onApproveGate1?: () => void
  onRejectGate1?: () => void
  onConfirmGate2?: () => void
  onCancelGate2?: () => void
  onSearchClients?: (term: string) => Promise<BoluClientSearchResult>
  onSelectClient?: (client: BoluClientMatch) => void | Promise<unknown>
  onCreateClient?: (input: BoluClientCreateInput) => Promise<BoluClientCreationOutcome>
  onAnswerClarification?: (
    questionId: string,
    answer: { optionId?: string; text?: string },
  ) => void | Promise<unknown>
  /** Reopens Gate 1 review; the earlier approval no longer authorizes a save. */
  onReturnToReview?: () => void | Promise<unknown>
  compact?: boolean
}) {
  const titleId = useId()
  const cardRef = useRef<HTMLElement | null>(null)
  const rejectRef = useRef<HTMLButtonElement | null>(null)
  const confirmRef = useRef<HTMLButtonElement | null>(null)

  const isPendingGate1 = proposal.status === 'pending_approval'
  const isApprovedGate2 = proposal.status === 'approved_pending_save'
  const isSaving = proposal.status === 'saving'
  const isPersisted = proposal.status === 'persisted'
  const isRejected = proposal.status === 'rejected'
  const isCancelled = proposal.status === 'cancelled'
  const isFailed = proposal.status === 'failed'

  useEffect(() => {
    if (!compact && isPendingGate1) {
      rejectRef.current?.focus()
    } else if (!compact && isApprovedGate2) {
      confirmRef.current?.focus()
    }
  }, [proposal.status, compact, isPendingGate1, isApprovedGate2])

  // Derive status badge
  let statusText = 'Pending Decision'
  let statusTone: 'ok' | 'off' | 'warn' | undefined
  if (isPendingGate1) {
    statusText = 'Gate 1 · Awaiting Approval'
    statusTone = 'warn'
  } else if (isApprovedGate2) {
    statusText = 'Gate 2 · Approved, Ready to Save'
    statusTone = 'warn'
  } else if (isSaving) {
    statusText = 'Saving to Database…'
    statusTone = 'warn'
  } else if (isPersisted) {
    statusText = '✓ Persisted to Database'
    statusTone = 'ok'
  } else if (isRejected) {
    statusText = 'Rejected (Gate 1)'
    statusTone = 'off'
  } else if (isCancelled) {
    statusText = 'Cancelled (Gate 2)'
    statusTone = 'off'
  } else if (isFailed) {
    statusText = 'Operation Failed'
    statusTone = 'off'
  }

  // Derive display values based on proposal type and document family
  const isCreate = proposal.operationType === 'create-document'
  const isAdvance = proposal.operationType === 'advance-invoice-config'
  const isQuotation = proposal.documentFamily === 'quotation'
  const documentNoun = isQuotation ? 'Quotation' : 'Invoice'
  const advanceAction = isAdvance
    ? proposal.intent === 'configure'
      ? 'Configure Advance Invoice'
      : proposal.intent === 'update'
        ? 'Update Advance Invoice'
        : 'Remove Advance Invoice'
    : null
  const kindLabel = isAdvance
    ? String(advanceAction)
    : isCreate
      ? `New ${documentNoun} Proposal`
      : `${documentNoun} Modification`
  const title = isAdvance
    ? `${advanceAction} for ${proposal.targetDocumentNumber || 'Document'}`
    : isCreate
      ? `Create ${documentNoun} for ${proposal.payload.client_name || 'Client'}`
      : `Update ${documentNoun} ${proposal.targetDocumentNumber || 'Document'}`

  const items = isCreate
    ? proposal.payload.items
    : proposal.operationType === 'modify-document'
      ? proposal.itemsChange?.newItems ?? []
      : []

  const total = isAdvance ? 0 : proposal.computedTotals?.total ?? 0
  const subtotal = isAdvance ? 0 : proposal.computedTotals?.subtotal ?? 0
  const vat = isAdvance ? 0 : proposal.computedTotals?.vat ?? 0
  // A modify proposal carries only subtotal/vat/total; read the extras safely.
  const totalsForExtras = isAdvance ? undefined : proposal.computedTotals
  const discount = (totalsForExtras as { discount?: number } | undefined)?.discount ?? 0
  const wht = (totalsForExtras as { wht?: number } | undefined)?.wht ?? 0
  const vatPercent = isCreate
    ? (proposal.payload.global_vat_percent ?? 7.5)
    : proposal.operationType === 'modify-document' &&
        typeof proposal.calculationInputsChange?.new.vatPercent === 'number'
      ? proposal.calculationInputsChange.new.vatPercent
      : 7.5

  const [submittingGate1, setSubmittingGate1] = useState(false)

  const handleApprove = async () => {
    if (submittingGate1 || !onApproveGate1) return
    try {
      setSubmittingGate1(true)
      await onApproveGate1()
    } finally {
      setSubmittingGate1(false)
    }
  }

  const handleReject = async () => {
    if (submittingGate1 || !onRejectGate1) return
    try {
      setSubmittingGate1(true)
      await onRejectGate1()
    } finally {
      setSubmittingGate1(false)
    }
  }

  return (
    <article
      ref={cardRef}
      tabIndex={-1}
      className={`ac-card${compact ? ' ac-card--compact' : ''} border border-[var(--ac-line)] rounded-2xl bg-[var(--ac-surface)] p-4 shadow-sm`}
      data-status={proposal.status}
      data-family={proposal.documentFamily}
      role="group"
      aria-labelledby={titleId}
    >
      <div className="ac-card-head flex items-center justify-between gap-2 pb-2 border-b border-[var(--ac-line)]">
        <span
          className={`ac-card-kind inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold tracking-wide uppercase ${
            isQuotation ? 'text-[var(--ac-sage,green)]' : 'text-[var(--ac-accent)]'
          }`}
        >
          {isAdvance ? <HandCoins className="size-3.5 shrink-0" aria-hidden="true" /> : isQuotation ? <FileText className="size-3.5 shrink-0" aria-hidden="true" /> : null}
          <span className="truncate">{kindLabel}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <CopyButton
            value={proposalPlainText(proposal)}
            label="Copy"
            ariaLabel="Copy artifact as text"
            copiedLabel="Copied"
            iconOnly
          />
          <span
            className="ac-card-flag px-2 py-0.5 rounded-full text-[11px] font-bold"
            data-tone={statusTone}
            role="status"
            aria-live="polite"
          >
            {statusText}
          </span>
        </span>
      </div>

      <h3 className="ac-card-title text-sm font-bold text-[var(--ac-ink)] mt-2" id={titleId}>
        {title}
      </h3>

      {/* Document identity that materially changes the filed record */}
      {isCreate ? (
        <>
          {proposal.payload.title ? (
            <p className="mt-1 text-[11px] text-[var(--ac-muted)]">
              Title: <span className="font-medium text-[var(--ac-ink)]">{proposal.payload.title}</span>
            </p>
          ) : null}
          {proposal.payload.po_number ? (
            <p className="text-[11px] text-[var(--ac-muted)]">
              PO number: <span className="font-mono font-medium text-[var(--ac-ink)]">{proposal.payload.po_number}</span>
            </p>
          ) : null}
          {proposal.payload.work_duration ? (
            <p className="text-[11px] text-[var(--ac-muted)]">
              Work duration: <span className="font-medium text-[var(--ac-ink)]">{proposal.payload.work_duration}</span>
            </p>
          ) : null}
          {proposal.payload.project_id ? (
            <p className="text-[11px] text-[var(--ac-muted)]">
              Project: <span className="font-mono font-medium text-[var(--ac-ink)]">{proposal.payload.project_id}</span>
            </p>
          ) : null}
        </>
      ) : null}

      {/* Client resolution: a verified record, or the searchable fallback picker.
          Offered at Gate 1 only: Gate 2 confirms the reviewed client. */}
      {isCreate && isPendingGate1 && (onSearchClients || proposal.clientResolution) ? (
        <ProposalClientPicker
          resolution={proposal.clientResolution}
          clientName={proposal.payload.client_name}
          disabled={false}
          onSearch={
            onSearchClients ??
            (async (term) => ({ status: 'search_error', query: term, error: 'Client search is unavailable.' }))
          }
          onSelect={onSelectClient ?? (() => undefined)}
          onCreate={onCreateClient}
        />
      ) : null}

      {/* Advance Invoice configuration preview (parent invoice only) */}
      {isAdvance ? (
        <AdvanceConfigPreview proposal={proposal} />
      ) : null}

      {/* Before→after diff for modify proposals (field, calc inputs, named charges) */}
      {!isCreate && !isAdvance && proposal.operationType === 'modify-document' ? (
        <ModifyDiffPanel proposal={proposal} />
      ) : null}

      {/* Item summary */}
      {items.length > 0 ? (
        <div className="my-2 space-y-1">
          <p className="text-[11px] font-semibold text-[var(--ac-muted)] uppercase tracking-wider">Line Items</p>
          <ul className="divide-y divide-[var(--ac-line)] text-xs">
            {items.map((item, idx) => {
              const meta = [
                item.sub_description,
                item.make ? `Make: ${item.make}` : null,
                item.part_number ? `Part no: ${item.part_number}` : null,
                item.condition ? `Condition: ${item.condition}` : null,
              ].filter(Boolean)
              return (
                <li key={idx} className="py-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0 break-words text-[var(--ac-ink)]">
                      {item.quantity}
                      {item.unit ? ` ${item.unit}` : ''} × {item.description}
                    </span>
                    <span className="shrink-0 font-medium text-[var(--ac-ink)]">
                      {formatNaira(item.quantity * item.unit_price)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-[var(--ac-muted)]">
                    {formatNaira(item.unit_price)} each
                    {meta.length > 0 ? ` · ${meta.join(' · ')}` : ''}
                  </p>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      {/* Dates, terms and notes that materially change the filed record */}
      {isCreate ? (
        <div className="mt-2 space-y-0.5 text-[11px] text-[var(--ac-muted)]">
          {proposal.payload.issue_date ? (
            <p>
              Issue date: <span className="font-medium text-[var(--ac-ink)]">{proposal.payload.issue_date}</span>
            </p>
          ) : null}
          {proposal.payload.due_date ? (
            <p>
              {isQuotation ? 'Valid until' : 'Due date'}:{' '}
              <span className="font-medium text-[var(--ac-ink)]">{proposal.payload.due_date}</span>
            </p>
          ) : null}
          {proposal.payload.payment_terms ? (
            <p className="break-words">
              Payment terms:{' '}
              <span className="font-medium text-[var(--ac-ink)]">{proposal.payload.payment_terms}</span>
            </p>
          ) : null}
          {proposal.payload.terms ? (
            <p className="break-words">
              Terms: <span className="font-medium text-[var(--ac-ink)]">{plainTextOf(proposal.payload.terms)}</span>
            </p>
          ) : null}
          {proposal.payload.notes ? (
            <p className="break-words">
              Notes: <span className="font-medium text-[var(--ac-ink)]">{plainTextOf(proposal.payload.notes)}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Authoritative Financial Totals: every amount that produces the total */}
      {isAdvance ? null : total > 0 || subtotal > 0 ? (
        <div className="ac-card-money mt-3 pt-2 border-t border-[var(--ac-line)] text-xs space-y-1">
          <div className="flex justify-between text-[var(--ac-muted)]">
            <span>Subtotal</span>
            <span>{formatNaira(subtotal)}</span>
          </div>
          {discount > 0 ? (
            <div className="flex justify-between text-[var(--ac-muted)]">
              <span>Discount</span>
              <span>-{formatNaira(discount)}</span>
            </div>
          ) : null}
          {vat > 0 ? (
            <div className="flex justify-between text-[var(--ac-muted)]">
              <span>VAT ({vatPercent}%)</span>
              <span>{formatNaira(vat)}</span>
            </div>
          ) : null}
          {wht > 0 ? (
            <div className="flex justify-between text-[var(--ac-muted)]">
              <span>WHT</span>
              <span>-{formatNaira(wht)}</span>
            </div>
          ) : null}
          <div className="flex justify-between font-bold text-sm text-[var(--ac-ink)]">
            <span>Total due</span>
            <strong className="text-[var(--ac-accent)]">{formatNaira(total)}</strong>
          </div>
        </div>
      ) : (
        <p className="mt-3 rounded-lg bg-[var(--ac-muted-surface)] p-2 text-[11px] text-[var(--ac-muted)]">
          BOURXE calculates the authoritative totals when this document is saved.
        </p>
      )}

      {/* Commercial charges: fixed charges stay separate from custom charges */}
      <ProposalCommercialBreakdown proposal={proposal} />

      {/* Optional, grounded improvements. Nothing here is applied silently. */}
      {isCreate && isPendingGate1 && proposal.suggestions && proposal.suggestions.length > 0 ? (
        <div className="mt-2 rounded-lg border border-[var(--ac-line)] bg-[var(--ac-muted-surface)] p-2 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ac-muted)]">
            Suggestions
          </p>
          <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-[var(--ac-ink)]">
            {proposal.suggestions.map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Reusable contextual clarification for the pending operation */}
      {isCreate && isPendingGate1 && proposal.clarification && onAnswerClarification ? (
        <ProposalClarificationCard
          clarification={proposal.clarification}
          disabled={!isPendingGate1}
          onAnswer={onAnswerClarification}
        />
      ) : null}

      {/* Document number: only an authoritative value is ever shown. A draft
          placeholder is never presented as the document's number. */}
      {isCreate ? (
        <p className="text-[11px] text-[var(--ac-muted)] mt-2">
          {AUTHORITATIVE_DOCUMENT_NUMBER.test(proposal.candidateNumber || '') ? (
            <>
              Document number:{' '}
              <span className="font-mono font-medium text-[var(--ac-ink)]">{proposal.candidateNumber}</span>
            </>
          ) : (
            <>The document number is assigned on save from your business prefix.</>
          )}
        </p>
      ) : null}

      {/* Gate 1 Approval Buttons */}
      {isPendingGate1 && onApproveGate1 && onRejectGate1 ? (
        <div className="ac-card-actions mt-3 pt-3 border-t border-[var(--ac-line)] flex items-center justify-end gap-2">
          <button
            ref={rejectRef}
            type="button"
            disabled={submittingGate1}
            className="ac-btn ac-btn--ghost px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--ac-line)] hover:bg-[var(--ac-muted-surface)] text-[var(--ac-muted)] disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleReject}
          >
            Reject Changes
          </button>
          <button
            type="button"
            disabled={submittingGate1}
            className="ac-btn ac-btn--solid px-4 py-1.5 rounded-lg text-xs font-semibold bg-[var(--ac-accent)] text-white hover:opacity-90 shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-wait"
            onClick={handleApprove}
          >
            {submittingGate1 ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Processing…</span>
              </>
            ) : (
              <span>Approve Changes (Gate 1)</span>
            )}
          </button>
        </div>
      ) : null}

      {/* Gate 2 Save Confirmation Buttons */}
      {(isApprovedGate2 || isSaving) && onConfirmGate2 && onCancelGate2 ? (
        <div className="ac-card-actions mt-3 pt-3 border-t border-[var(--ac-line)] flex flex-wrap items-center justify-end gap-2 bg-[var(--ac-muted-surface)] -mx-4 -mb-4 p-3 rounded-b-2xl">
          {onReturnToReview && isApprovedGate2 ? (
            <button
              type="button"
              disabled={isSaving}
              className="mr-auto text-[11px] font-semibold text-[var(--ac-muted)] underline underline-offset-2 hover:text-[var(--ac-ink)] disabled:opacity-50"
              onClick={() => void onReturnToReview()}
            >
              Change something? Back to review
            </button>
          ) : null}
          <button
            type="button"
            disabled={isSaving}
            className="ac-btn ac-btn--ghost px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--ac-line)] hover:bg-[var(--ac-surface)] text-[var(--ac-muted)] disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onCancelGate2}
          >
            Cancel Save
          </button>
          <button
            ref={confirmRef}
            type="button"
            disabled={isSaving}
            className="ac-btn ac-btn--solid px-4 py-1.5 rounded-lg text-xs font-semibold bg-[hsl(var(--primary))] text-white hover:opacity-90 shadow-md flex items-center gap-1.5 disabled:opacity-75 disabled:cursor-wait"
            onClick={onConfirmGate2}
          >
            {isSaving ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Saving to Database…
              </>
            ) : (
              <>
                <FileCheck className="size-3.5" />
                Confirm &amp; Save (Gate 2)
              </>
            )}
          </button>
        </div>
      ) : null}

      {/* Persisted Confirmation Notice */}
      {isPersisted ? (
        <div className="mt-3 pt-2 text-xs text-[var(--ac-sage,green)] flex items-center gap-1.5 font-medium">
          <Check className="size-3.5" />
          {isAdvance ? (
            <span>
              Advance Invoice configuration saved{proposal.persistedId ? ` for ${proposal.persistedId}` : ''}.
            </span>
          ) : (
            <span>
              Successfully filed {proposal.persistedId ? `as record ${proposal.persistedId}` : 'to database'}.
            </span>
          )}
        </div>
      ) : null}
    </article>
  )
}
