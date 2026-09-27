import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileClock,
  Info,
  Link2,
  RefreshCw,
  Search,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNaira } from '@/lib/formatters/money'
import { formatDisplayDate } from '@/lib/formatters/date'
import { feedback } from '@/lib/feedback'
import { cn } from '@/lib/utils'
import { useHistoricalReviewCases } from '../hooks'
import type {
  HistoricalReviewCandidate,
  HistoricalReviewCase,
  HistoricalReviewMutationResult,
  HistoricalReviewSpecToken,
} from '../types'

type ReviewFilter = 'all' | 'repeated' | 'single' | 'candidates' | 'specs'

function formatCount(value: number, singular: string, plural = `${singular}s`) {
  return `${value.toLocaleString()} ${value === 1 ? singular : plural}`
}

function formatPriceRange(item: HistoricalReviewCase) {
  if (item.unit_price_min === null || item.unit_price_max === null) return 'No price history'
  if (item.unit_price_min === item.unit_price_max) return formatNaira(item.unit_price_min)
  return `${formatNaira(item.unit_price_min)} - ${formatNaira(item.unit_price_max)}`
}

function SpecChips({ specs, compact = false }: { specs: HistoricalReviewSpecToken[]; compact?: boolean }) {
  if (!specs.length) {
    return <span className="text-[11px] font-semibold text-bd-text-muted">No specification tokens detected</span>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {specs.map((spec) => (
        <span
          key={`${spec.kind}:${spec.value}`}
          className={cn(
            'inline-flex items-center rounded-md border border-bd-status-warning-border bg-bd-status-warning-bg font-bold text-bd-status-warning-text',
            compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10px]',
          )}
        >
          <span className="mr-1 text-bd-text-muted">{spec.label}</span>
          {spec.value}
        </span>
      ))}
    </div>
  )
}

function StatCard({ label, value, meta }: { label: string; value: string; meta: string }) {
  return (
    <div className="rounded-lg border border-bd-border bg-bd-card-bg p-3 shadow-sm">
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-bd-text-muted">{label}</div>
      <div className="mt-1 font-mono text-[17px] font-bold text-bd-text">{value}</div>
      <div className="mt-1 text-[11px] text-bd-text-muted">{meta}</div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="grid gap-3 p-4 md:grid-cols-[minmax(280px,0.42fr)_minmax(0,1fr)]">
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-lg bg-bd-surface-muted" />
        ))}
      </div>
      <Skeleton className="h-[420px] rounded-lg bg-bd-surface-muted" />
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex min-h-[420px] items-center justify-center p-8 text-center">
      <div className="max-w-sm">
        <div className="mx-auto flex h-[58px] w-[58px] items-center justify-center rounded-lg bg-bd-surface-muted text-bd-button-primary-bg">
          <ClipboardList className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-[16px] font-extrabold text-bd-text">No unresolved historical cases</h2>
        <p className="mt-2 text-[12px] leading-relaxed text-bd-text-muted">
          Item Library has no unresolved Tier C review cases for this tenant.
        </p>
      </div>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-[420px] items-center justify-center p-8 text-center">
      <div className="max-w-sm rounded-lg border border-bd-status-danger-border bg-bd-status-danger-bg p-5">
        <AlertTriangle className="mx-auto h-7 w-7 text-bd-status-danger-text" aria-hidden="true" />
        <h2 className="mt-3 text-[15px] font-extrabold text-bd-status-danger-text">Historical Review could not load</h2>
        <p className="mt-2 text-[12px] leading-relaxed text-bd-status-danger-text">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-md border border-bd-status-danger-border bg-bd-card-bg px-4 text-[12px] font-bold text-bd-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bd-button-primary-bg"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Retry
        </button>
      </div>
    </div>
  )
}

function CaseQueueItem({
  item,
  selected,
  onSelect,
}: {
  item: HistoricalReviewCase
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'w-full rounded-lg border bg-bd-card-bg p-3 text-left shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bd-button-primary-bg',
        selected ? 'border-bd-button-primary-bg ring-1 ring-bd-button-primary-bg' : 'border-bd-border hover:bg-bd-surface-muted',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="line-clamp-2 text-[13px] font-extrabold leading-snug text-bd-text">{item.display_description}</div>
          <div className="mt-1 text-[10px] font-semibold text-bd-text-muted">{item.normalized_description}</div>
        </div>
        <Badge variant="secondary" className="shrink-0 rounded-md">
          {item.occurrence_count}x
        </Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold text-bd-text-muted">
        <span>{item.invoice_count} invoice</span>
        <span aria-hidden="true">•</span>
        <span>{item.quotation_count} quote</span>
        <span aria-hidden="true">•</span>
        <span>{formatDisplayDate(item.latest_used_at, { fallback: 'No date' })}</span>
      </div>
      {item.specifications.length ? (
        <div className="mt-2">
          <SpecChips specs={item.specifications.slice(0, 4)} compact />
        </div>
      ) : null}
    </button>
  )
}

function getMutationMessage(result: HistoricalReviewMutationResult) {
  if (result.status === 'applied') return 'Historical Review was updated.'
  if (result.status === 'stale') return 'This review case changed. Reload and review the current evidence.'
  if (result.status === 'conflict') return 'This action conflicts with current Item Library state.'
  return 'The action could not be completed.'
}

function caseMutationBase(item: HistoricalReviewCase) {
  return {
    normalizedDescription: item.normalized_description,
    caseMembershipHash: item.case_membership_hash,
    invoiceRowIds: item.invoice_row_ids,
    quotationRowIds: item.quotation_row_ids,
  }
}

function CandidateRow({
  reviewCase,
  candidate,
  mutating,
  onLink,
  onKeepSeparate,
}: {
  reviewCase: HistoricalReviewCase
  candidate: HistoricalReviewCandidate
  mutating: boolean
  onLink: (candidate: HistoricalReviewCandidate) => void
  onKeepSeparate: (candidate: HistoricalReviewCandidate) => void
}) {
  const reviewSpecsByKind = new Map(reviewCase.specifications.map((spec) => [spec.kind, spec.value]))
  const differingSpecs = candidate.specifications.filter((spec) => {
    const reviewValue = reviewSpecsByKind.get(spec.kind)
    return reviewValue && reviewValue !== spec.value
  })

  return (
    <article className="rounded-lg border border-bd-border bg-bd-card-bg p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] font-extrabold text-bd-text">{candidate.name}</div>
          {candidate.matched_text && candidate.matched_text !== candidate.name ? (
            <div className="mt-1 text-[11px] font-semibold text-bd-text-muted">Shown because of: {candidate.matched_text}</div>
          ) : null}
        </div>
        <Badge
          variant={candidate.evidence_strength === 'deterministic' ? 'default' : 'secondary'}
          className="shrink-0 rounded-md"
        >
          {candidate.evidence_strength === 'deterministic' ? 'Exact' : 'Advisory'}
        </Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold text-bd-text-muted">
        <span>{candidate.evidence_label}</span>
        {candidate.shared_terms.length ? <span>Shared terms: {candidate.shared_terms.slice(0, 5).join(', ')}</span> : null}
      </div>
      <div className="mt-3 grid gap-2 text-[11px] text-bd-text-muted sm:grid-cols-3">
        <span>Uses: {Number(candidate.usage_count || 0).toLocaleString()}</span>
        <span>Last price: {candidate.last_sold_price === null ? 'No sale' : formatNaira(candidate.last_sold_price)}</span>
        <span>Last used: {formatDisplayDate(candidate.last_used_at, { fallback: 'No date' })}</span>
      </div>
      {candidate.specifications.length ? (
        <div className="mt-3">
          <SpecChips specs={candidate.specifications} compact />
        </div>
      ) : null}
      {differingSpecs.length ? (
        <div className="mt-3 rounded-md border border-bd-status-warning-border bg-bd-status-warning-bg p-2 text-[11px] font-semibold text-bd-status-warning-text">
          Specification difference: {differingSpecs.map((spec) => `${spec.label} ${reviewSpecsByKind.get(spec.kind)} vs ${spec.value}`).join('; ')}
        </div>
      ) : null}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={mutating}
          onClick={() => onLink(candidate)}
          className="min-h-[42px] rounded-md border border-bd-button-primary-bg bg-bd-button-primary-bg px-3 text-[12px] font-bold text-bd-button-primary-text disabled:cursor-not-allowed disabled:opacity-60"
        >
          Link to existing
        </button>
        <button
          type="button"
          disabled={mutating}
          onClick={() => onKeepSeparate(candidate)}
          className="min-h-[42px] rounded-md border border-bd-border bg-bd-card-bg px-3 text-[12px] font-bold text-bd-text disabled:cursor-not-allowed disabled:opacity-60"
        >
          Keep separate
        </button>
      </div>
    </article>
  )
}

function CaseDetail({
  item,
  mutating,
  onLinkCase,
  onCreateItem,
  onKeepCandidateSeparate,
}: {
  item: HistoricalReviewCase | null
  mutating: boolean
  onLinkCase: (item: HistoricalReviewCase, candidate: HistoricalReviewCandidate) => Promise<HistoricalReviewMutationResult>
  onCreateItem: (item: HistoricalReviewCase, canonicalName: string) => Promise<HistoricalReviewMutationResult>
  onKeepCandidateSeparate: (item: HistoricalReviewCase, candidate: HistoricalReviewCandidate) => Promise<HistoricalReviewMutationResult>
}) {
  const [canonicalName, setCanonicalName] = useState('')

  useEffect(() => {
    setCanonicalName(item?.display_description || '')
  }, [item?.case_id, item?.display_description])

  if (!item) {
    return (
      <div className="rounded-lg border border-dashed border-bd-border bg-bd-card-bg p-6 text-center text-[12px] text-bd-text-muted">
        Select a review case to inspect its historical evidence.
      </div>
    )
  }

  const handleResult = (result: HistoricalReviewMutationResult) => {
    const message = getMutationMessage(result)
    if (result.status === 'applied') {
      feedback.success(message)
    } else {
      feedback.warning(message, { description: result.reason })
    }
  }

  const handleLink = async (candidate: HistoricalReviewCandidate) => {
    const ok = window.confirm(
      `Link ${item.occurrence_count} historical occurrence${item.occurrence_count === 1 ? '' : 's'} for "${item.display_description}" to "${candidate.name}"? Historical prices, quantities, units, taxes, and descriptions will not change.`,
    )
    if (!ok) return
    try {
      const result = await onLinkCase(item, candidate)
      handleResult(result)
    } catch (error) {
      feedback.error('Link failed', { description: error instanceof Error ? error.message : 'Try again after reload.' })
    }
  }

  const handleKeepSeparate = async (candidate: HistoricalReviewCandidate) => {
    const ok = window.confirm(
      `Mark this historical review case as separate from "${candidate.name}"? This does not link rows or change catalog data.`,
    )
    if (!ok) return
    try {
      const result = await onKeepCandidateSeparate(item, candidate)
      handleResult(result)
    } catch (error) {
      feedback.error('Keep separate failed', { description: error instanceof Error ? error.message : 'Try again after reload.' })
    }
  }

  const handleCreateItem = async () => {
    const name = canonicalName.trim()
    if (!name) {
      feedback.error('Canonical name required')
      return
    }
    const ok = window.confirm(
      `Create a separate Item Library entry named "${name}" and link ${item.occurrence_count} historical occurrence${item.occurrence_count === 1 ? '' : 's'} to it? Historical prices, quantities, units, taxes, and descriptions will not change.`,
    )
    if (!ok) return
    try {
      const result = await onCreateItem(item, name)
      handleResult(result)
    } catch (error) {
      feedback.error('Create separate item failed', { description: error instanceof Error ? error.message : 'Try again after reload.' })
    }
  }

  return (
    <section aria-labelledby="historical-review-detail-title" className="space-y-4">
      <div className="rounded-lg border border-bd-border bg-bd-card-bg p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-bd-text-muted">Review case</div>
            <h2 id="historical-review-detail-title" className="mt-1 text-[19px] font-extrabold leading-tight text-bd-text">
              {item.display_description}
            </h2>
            <p className="mt-1 text-[12px] font-semibold text-bd-text-muted">{item.normalized_description}</p>
          </div>
          <Badge variant="secondary" className="rounded-md">
            Identity review
          </Badge>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Occurrences" value={item.occurrence_count.toLocaleString()} meta={`${item.invoice_count} invoice · ${item.quotation_count} quote`} />
          <StatCard label="Latest use" value={formatDisplayDate(item.latest_used_at, { fallback: 'No date' })} meta={`First: ${formatDisplayDate(item.first_used_at, { fallback: 'No date' })}`} />
          <StatCard label="Price range" value={formatPriceRange(item)} meta="Historical unit prices only" />
          <StatCard label="Candidates" value={item.candidates.length.toLocaleString()} meta={item.candidate_reason_labels.join(', ') || 'No current candidates'} />
        </div>

        <div className="mt-4 space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-bd-text-muted">Specification-sensitive evidence</div>
          <SpecChips specs={item.specifications} />
        </div>
      </div>

      <div className="rounded-lg border border-bd-border bg-bd-card-bg p-4">
        <div className="flex items-center gap-2 text-[12px] font-extrabold text-bd-text">
          <Info className="h-4 w-4 text-bd-button-primary-bg" aria-hidden="true" />
          Evidence, not identity proof
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-bd-text-muted">
          Exact text evidence and similar text evidence help a person review the case. Link and create decisions update identity only. They do not merge catalog items or rewrite commercial history.
        </p>
      </div>

      <section className="rounded-lg border border-bd-border bg-bd-card-bg p-4" aria-labelledby="historical-review-candidates">
        <div className="flex items-center justify-between gap-3">
          <h3 id="historical-review-candidates" className="text-[13px] font-extrabold text-bd-text">
            Possible existing items
          </h3>
          <Link2 className="h-4 w-4 text-bd-text-muted" aria-hidden="true" />
        </div>
        <div className="mt-3 space-y-2">
          {item.candidates.length ? (
            item.candidates.map((candidate) => (
              <CandidateRow
                key={candidate.item_id}
                reviewCase={item}
                candidate={candidate}
                mutating={mutating}
                onLink={handleLink}
                onKeepSeparate={handleKeepSeparate}
              />
            ))
          ) : (
            <p className="rounded-lg border border-dashed border-bd-border p-4 text-[12px] text-bd-text-muted">
              No current catalog candidate was found by exact or advisory evidence.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-bd-border bg-bd-card-bg p-4" aria-labelledby="historical-review-occurrences">
        <div className="flex items-center justify-between gap-3">
          <h3 id="historical-review-occurrences" className="text-[13px] font-extrabold text-bd-text">
            Historical occurrences
          </h3>
          <FileClock className="h-4 w-4 text-bd-text-muted" aria-hidden="true" />
        </div>

        <div className="mt-3 space-y-2">
          {item.occurrences.map((occurrence) => (
            <article key={`${occurrence.source_type}:${occurrence.row_id}`} className="rounded-lg border border-bd-border bg-bd-surface-muted p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-md">
                  {occurrence.source_type === 'invoice' ? 'Invoice' : 'Quotation'}
                </Badge>
                <span className="text-[12px] font-extrabold text-bd-text">
                  {occurrence.source_document_number || 'Document'}
                </span>
                <span className="text-[11px] font-semibold text-bd-text-muted">
                  {formatDisplayDate(occurrence.document_date || occurrence.updated_at, { fallback: 'No date' })}
                </span>
              </div>
              <div className="mt-2 text-[12px] font-bold text-bd-text">{occurrence.description}</div>
              <div className="mt-2 grid gap-1 text-[11px] text-bd-text-muted sm:grid-cols-2">
                <span>Client: {occurrence.client_name || 'Not recorded'}</span>
                <span>Unit: {occurrence.unit || 'Not recorded'}</span>
                <span>Make: {occurrence.make || 'Not recorded'}</span>
                <span>Quantity: {occurrence.quantity ?? 'Not recorded'}</span>
                <span>Unit price: {occurrence.unit_price === null ? 'Not recorded' : formatNaira(occurrence.unit_price)}</span>
                <span>Group: {occurrence.group_name || 'Ungrouped'}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-bd-border bg-bd-card-bg p-4" aria-labelledby="historical-review-future-actions">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-bd-button-primary-bg" aria-hidden="true" />
          <h3 id="historical-review-future-actions" className="text-[13px] font-extrabold text-bd-text">
            Reconciliation actions
          </h3>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-bd-text-muted">
          Link and create actions update identity only. They do not rewrite historical prices, quantities, units, taxes, or descriptions.
        </p>
        <div className="mt-3 rounded-lg border border-bd-border bg-bd-surface-muted p-3">
          <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-bd-text-muted" htmlFor="historical-review-canonical-name">
            New canonical name
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              id="historical-review-canonical-name"
              value={canonicalName}
              onChange={(event) => setCanonicalName(event.target.value)}
              className="min-h-[42px] min-w-0 flex-1 rounded-md border border-bd-border bg-bd-card-bg px-3 text-[13px] font-semibold text-bd-text outline-none focus:border-bd-button-primary-bg focus:ring-2 focus:ring-bd-button-primary-bg/20"
            />
            <button
              type="button"
              disabled={mutating}
              onClick={handleCreateItem}
              className="min-h-[42px] rounded-md border border-bd-border bg-bd-card-bg px-3 text-[12px] font-bold text-bd-text disabled:cursor-not-allowed disabled:opacity-60"
            >
              Create separate item
            </button>
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-dashed border-bd-border p-3 text-[12px] text-bd-text-muted">
          Leave unresolved stores no decision. The case remains available for later review.
        </div>
      </section>
    </section>
  )
}

export function ItemLibraryHistoricalReviewPanel() {
  const { data, loading, error, mutating, reload, linkCaseToItem, createItemFromCase, keepCandidateSeparate } = useHistoricalReviewCases()
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [filter, setFilter] = useState<ReviewFilter>('all')
  const [searchText, setSearchText] = useState('')

  const filteredCases = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase()
    return data.cases.filter((item) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'repeated' && item.occurrence_count > 1) ||
        (filter === 'single' && item.occurrence_count === 1) ||
        (filter === 'candidates' && item.candidates.length > 0) ||
        (filter === 'specs' && item.specifications.length > 0)
      const matchesSearch = normalizedSearch
        ? `${item.display_description} ${item.normalized_description} ${item.raw_description_variants.map((variant) => variant.value).join(' ')}`
            .toLowerCase()
            .includes(normalizedSearch)
        : true
      return matchesFilter && matchesSearch
    })
  }, [data.cases, filter, searchText])

  useEffect(() => {
    if (!filteredCases.length) {
      setSelectedCaseId(null)
      return
    }
    setSelectedCaseId((current) => {
      if (current && filteredCases.some((item) => item.case_id === current)) return current
      return filteredCases[0].case_id
    })
  }, [filteredCases])

  const selectedCase = filteredCases.find((item) => item.case_id === selectedCaseId) || null

  const handleLinkCase = (item: HistoricalReviewCase, candidate: HistoricalReviewCandidate) =>
    linkCaseToItem({
      ...caseMutationBase(item),
      targetItemId: candidate.item_id,
    })

  const handleCreateItem = (item: HistoricalReviewCase, canonicalName: string) =>
    createItemFromCase({
      ...caseMutationBase(item),
      canonicalName,
    })

  const handleKeepCandidateSeparate = (item: HistoricalReviewCase, candidate: HistoricalReviewCandidate) =>
    keepCandidateSeparate({
      ...caseMutationBase(item),
      candidateItemId: candidate.item_id,
    })

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error.message || 'Try again to load the current tenant review cases.'} onRetry={reload} />
  if (!data.cases.length) return <EmptyState />

  const filterOptions: Array<{ value: ReviewFilter; label: string; count: number }> = [
    { value: 'all', label: 'All unresolved', count: data.summary.case_count },
    { value: 'repeated', label: 'Repeated', count: data.summary.repeated_case_count },
    { value: 'single', label: 'Single', count: data.summary.singleton_case_count },
    { value: 'candidates', label: 'Has candidates', count: data.summary.cases_with_candidates_count },
    { value: 'specs', label: 'Specification-sensitive', count: data.summary.specification_sensitive_case_count },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col bg-bd-app-bg">
      <section className="border-b border-bd-border bg-bd-card-bg p-4 md:p-5" aria-labelledby="historical-review-title">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-bd-text-muted">Item Library</div>
            <h1 id="historical-review-title" className="mt-1 text-[22px] font-extrabold tracking-tight text-bd-text">
              Historical Review
            </h1>
            <p className="mt-2 text-[12px] leading-relaxed text-bd-text-muted">
              Review unresolved historical line-item descriptions and apply deliberate identity decisions. Historical commercial values are not changed.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[430px]">
            <StatCard label="Cases" value={data.summary.case_count.toLocaleString()} meta={formatCount(data.summary.occurrence_count, 'occurrence')} />
            <StatCard label="Repeated" value={data.summary.repeated_case_count.toLocaleString()} meta={formatCount(data.summary.repeated_occurrence_count, 'occurrence')} />
            <StatCard label="Specs" value={data.summary.specification_sensitive_case_count.toLocaleString()} meta="Need careful review" />
            <StatCard label="Excluded" value={data.summary.tier_d_excluded_count.toLocaleString()} meta="Tier D-style rows" />
          </div>
        </div>
        {data.summary.truncated ? (
          <div className="mt-3 rounded-md border border-bd-status-warning-border bg-bd-status-warning-bg p-3 text-[12px] font-semibold text-bd-status-warning-text">
            Historical Review loaded a bounded sample because the source row count is high. Use Stage 2 planning before applying decisions.
          </div>
        ) : null}
      </section>

      <div className="grid min-h-0 flex-1 gap-0 overflow-hidden md:grid-cols-[minmax(280px,0.42fr)_minmax(0,1fr)]">
        <aside className="min-h-0 overflow-y-auto border-b border-bd-border bg-bd-surface-muted p-3 md:border-b-0 md:border-r" aria-label="Historical Review queue">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-bd-text-muted" aria-hidden="true" />
            <span className="sr-only">Search Historical Review cases</span>
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search review cases"
              className="h-11 w-full rounded-md border border-bd-border bg-bd-card-bg pl-9 pr-3 text-[13px] font-semibold text-bd-text outline-none focus:border-bd-button-primary-bg focus:ring-2 focus:ring-bd-button-primary-bg/20"
            />
          </label>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Historical Review filters">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={filter === option.value}
                onClick={() => setFilter(option.value)}
                className={cn(
                  'min-h-[36px] shrink-0 rounded-md border px-3 text-[11px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bd-button-primary-bg',
                  filter === option.value
                    ? 'border-bd-button-primary-bg bg-bd-button-primary-bg text-bd-button-primary-text'
                    : 'border-bd-border bg-bd-card-bg text-bd-text-muted hover:text-bd-text',
                )}
              >
                {option.label} ({option.count})
              </button>
            ))}
          </div>

          <div className="mt-3 space-y-2" role="list" aria-label="Historical Review cases">
            {filteredCases.length ? (
              filteredCases.map((item) => (
                <div key={item.case_id} role="listitem">
                  <CaseQueueItem
                    item={item}
                    selected={item.case_id === selectedCaseId}
                    onSelect={() => setSelectedCaseId(item.case_id)}
                  />
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-bd-border bg-bd-card-bg p-4 text-[12px] text-bd-text-muted">
                No review cases match this filter.
              </div>
            )}
          </div>
        </aside>

        <div className="min-h-0 overflow-y-auto p-3 md:p-4">
          <CaseDetail
            item={selectedCase}
            mutating={mutating}
            onLinkCase={handleLinkCase}
            onCreateItem={handleCreateItem}
            onKeepCandidateSeparate={handleKeepCandidateSeparate}
          />
        </div>
      </div>
    </div>
  )
}
