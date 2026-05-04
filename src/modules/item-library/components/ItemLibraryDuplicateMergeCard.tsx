import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

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
import { buildMergePreview, createMergeRequest, suggestPrimaryItemId } from '../domain/itemMergePlanning'
import type { DuplicateCandidateGroup, ItemAlias, ItemLibraryMergeRequest } from '../types'
import { formatCompactUsageCount, formatItemPrice, formatLastUsedDate } from './itemLibraryFormatters'

type ItemLibraryDuplicateMergeCardProps = {
  aliases: ItemAlias[]
  aliasesError: Error | null
  aliasesLoading: boolean
  group: DuplicateCandidateGroup
  inspectedItemId: string | null
  mergeLoading: boolean
  onInspectItem: (itemId: string) => void
  onMerge: (request: ItemLibraryMergeRequest) => Promise<void>
}

function PreviewPill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-bd-border bg-bd-surface-muted px-2.5 py-1 text-[10px] font-semibold text-bd-text shadow-sm">
      {children}
    </span>
  )
}

export function ItemLibraryDuplicateMergeCard({
  aliases,
  aliasesError,
  aliasesLoading,
  group,
  inspectedItemId,
  mergeLoading,
  onInspectItem,
  onMerge,
}: ItemLibraryDuplicateMergeCardProps) {
  const [winnerItemId, setWinnerItemId] = useState<string | null>(suggestPrimaryItemId(group))
  const [selectedMergedIds, setSelectedMergedIds] = useState<string[]>(group.members.slice(1).map((member) => member.item_id))
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)

  useEffect(() => {
    const nextWinnerId = suggestPrimaryItemId(group)
    setWinnerItemId(nextWinnerId)
    setSelectedMergedIds(
      group.members
        .filter((member) => member.item_id !== nextWinnerId)
        .map((member) => member.item_id),
    )
    setConfirmOpen(false)
    setSubmissionError(null)
  }, [group])

  const request = useMemo(
    () => createMergeRequest(winnerItemId, selectedMergedIds),
    [selectedMergedIds, winnerItemId],
  )
  const preview = useMemo(
    () => buildMergePreview({ aliases, group, request }),
    [aliases, group, request],
  )

  const disableMerge = !request || aliasesLoading || Boolean(aliasesError) || mergeLoading

  const handleWinnerChange = (itemId: string) => {
    setWinnerItemId(itemId)
    setSelectedMergedIds((current) => {
      const next = current.filter((value) => value !== itemId)
      if (next.length > 0) return next

      return group.members
        .filter((member) => member.item_id !== itemId)
        .map((member) => member.item_id)
    })
  }

  const handleToggleMerged = (itemId: string) => {
    if (itemId === winnerItemId) return

    setSelectedMergedIds((current) =>
      current.includes(itemId) ? current.filter((value) => value !== itemId) : [...current, itemId],
    )
  }

  const handleConfirmMerge = async () => {
    if (!request) return

    try {
      setSubmissionError(null)
      await onMerge(request)
      setConfirmOpen(false)
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'Could not complete the merge.')
    }
  }

  return (
    <section className="mt-4 rounded-xl border border-bd-border bg-bd-surface p-4 shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-bd-text-muted">Manual merge</div>
          <h3 className="mt-1 text-[16px] font-extrabold text-bd-text">Choose primary item</h3>
          <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-bd-text-muted">
            Review the similar names below, keep one primary item active, and merge the others into it. This only
            relinks catalog references. Historical document descriptions stay unchanged.
          </p>
        </div>

        <div className="rounded-full border border-bd-border bg-bd-surface-muted px-3 py-1 font-mono text-[10px] font-bold text-bd-text">
          {group.members.length} candidates
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {group.members.map((member) => {
          const isWinner = winnerItemId === member.item_id
          const isMerged = selectedMergedIds.includes(member.item_id)
          const isInspected = inspectedItemId === member.item_id

          return (
            <div
              key={member.item_id}
              className={[
                'rounded-lg border p-3 transition-all duration-150',
                isWinner
                  ? 'border-bd-border-strong bg-bd-surface-muted shadow-sm'
                  : isInspected
                    ? 'border-bd-border bg-bd-surface/50'
                    : 'border-bd-border bg-bd-surface',
              ].join(' ')}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleWinnerChange(member.item_id)}
                        className={[
                          'relative rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] transition-all duration-200',
                          isWinner
                            ? 'border-bd-button-primary-bg bg-bd-button-primary-bg text-bd-button-primary-text shadow-sm'
                            : 'border-bd-border bg-bd-surface-muted text-bd-text-muted hover:bg-bd-surface',
                        ].join(' ')}
                      >
                        {isWinner ? (
                          <span className="flex items-center gap-1">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 6 9 17l-5-5" />
                            </svg>
                            Winner
                          </span>
                        ) : (
                          'Set as primary'
                        )}
                      </button>
                      <div className={[
                        "truncate text-[13px] font-bold transition-colors",
                        isWinner ? "text-bd-text" : "text-bd-text-muted"
                      ].join(' ')}>{member.name}</div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-bd-text-muted">
                      <PreviewPill>{formatCompactUsageCount(member.usage_count)} uses</PreviewPill>
                      <PreviewPill>{formatItemPrice(member.last_sold_price, 'No sales')}</PreviewPill>
                      <span className="opacity-60">{formatLastUsedDate(member.last_used_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-2 rounded-full border border-bd-border bg-bd-surface-muted px-3 py-1.5 text-[11px] font-semibold text-bd-text">
                    <input
                      type="checkbox"
                      checked={isMerged}
                      disabled={isWinner}
                      onChange={() => handleToggleMerged(member.item_id)}
                      className="h-3.5 w-3.5 rounded border-bd-input-border text-bd-button-primary-bg focus:ring-bd-input-focus"
                    />
                    Merge into primary
                  </label>

                  <button
                    type="button"
                    onClick={() => onInspectItem(member.item_id)}
                    className={[
                      'rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors',
                      isInspected
                        ? 'border-bd-border-strong bg-bd-surface text-bd-text'
                        : 'border-bd-border bg-bd-surface-muted text-bd-text-muted hover:bg-bd-surface',
                    ].join(' ')}
                  >
                    Inspect history
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 rounded-lg border border-bd-border bg-bd-surface-muted p-4 shadow-inner">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-bd-text-muted">Consolidation Plan</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[14px] font-bold text-bd-text">
                {preview?.winner.name || 'Choose a primary item'}
              </span>
              {preview && (
                 <span className="rounded-full bg-bd-button-primary-bg px-2 py-0.5 text-[9px] font-bold text-bd-button-primary-text">PRIMARY</span>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={disableMerge}
            onClick={() => setConfirmOpen(true)}
            className="rounded-md border border-transparent bg-bd-button-primary-bg px-5 py-2.5 text-[12px] font-bold text-bd-button-primary-text shadow-sm transition-all duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Confirm merge
          </button>
        </div>

        {aliasesLoading ? (
          <p className="mt-3 text-[11px] text-bd-text-muted">Loading existing aliases for this group…</p>
        ) : null}

        {aliasesError ? (
          <p className="mt-3 rounded-md border border-bd-status-danger-border bg-bd-status-danger-bg px-3 py-2 text-[11px] text-bd-status-danger-text">
            We could not load alias details yet, so merge confirmation is paused until that finishes cleanly.
          </p>
        ) : null}

        {submissionError ? (
          <p className="mt-3 rounded-md border border-bd-status-danger-border bg-bd-status-danger-bg px-3 py-2 text-[11px] text-bd-status-danger-text">
            {submissionError}
          </p>
        ) : null}

        {preview ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-md border border-bd-border bg-bd-surface p-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-bd-text-muted">Primary item</div>
              <div className="mt-2 text-[13px] font-bold text-bd-text">{preview.winner.name}</div>
              <div className="mt-1 font-mono text-[11px] text-bd-text-muted opacity-60">{preview.winner.item_id}</div>
            </div>

            <div className="rounded-md border border-bd-border bg-bd-surface p-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-bd-text-muted">History relinks</div>
              <div className="mt-2 text-[13px] font-bold text-bd-text">
                {preview.relinkedHistoryRows.toLocaleString()} linked {preview.relinkedHistoryRows === 1 ? 'row' : 'rows'}
              </div>
              <p className="mt-1 text-[11px] text-bd-text-muted opacity-80">
                Invoice and quotation `item_id` references will move to the selected primary item.
              </p>
            </div>

            <div className="rounded-md border border-bd-border bg-bd-surface p-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-bd-text-muted">Merge into primary</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {preview.mergedMembers.map((member) => (
                  <PreviewPill key={member.item_id}>{member.name}</PreviewPill>
                ))}
              </div>
            </div>

            <div className="rounded-md border border-bd-border bg-bd-surface p-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-bd-text-muted">Aliases kept</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {preview.aliasesToKeep.length ? (
                  preview.aliasesToKeep.map((alias) => <PreviewPill key={alias}>{alias}</PreviewPill>)
                ) : (
                  <span className="text-[11px] text-bd-text-muted">No extra aliases will be added from this selection.</span>
                )}
              </div>
            </div>

            <div className="rounded-md border border-bd-border bg-bd-surface p-3 md:col-span-2">
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-bd-text-muted">Retired catalog items</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {preview.retiredItems.map((member) => (
                  <PreviewPill key={member.item_id}>{member.name}</PreviewPill>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-[11px] text-bd-text-muted">
            Select one primary item and at least one duplicate item to merge before confirming.
          </p>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-2xl border-bd-border bg-bd-surface">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-bd-text">Confirm merge</AlertDialogTitle>
            <AlertDialogDescription className="text-bd-text-muted">
              {preview
                ? `${preview.mergedMembers.length} item name${preview.mergedMembers.length === 1 ? '' : 's'} will be merged into ${preview.winner.name}. Document descriptions stay as they were recorded; only catalog links and aliases are updated.`
                : 'Review the merge preview before confirming.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mergeLoading} className="rounded-lg border-bd-border bg-bd-surface text-bd-text hover:bg-bd-surface-muted">Keep reviewing</AlertDialogCancel>
            <AlertDialogAction
              disabled={disableMerge}
              onClick={(event) => {
                event.preventDefault()
                void handleConfirmMerge()
              }}
              className="rounded-lg border-transparent bg-bd-button-primary-bg text-bd-button-primary-text hover:opacity-90"
            >
              {mergeLoading ? 'Merging…' : 'Apply merge'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
