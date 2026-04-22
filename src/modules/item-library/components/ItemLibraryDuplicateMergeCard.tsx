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
    <span className="rounded-full border border-[#d6c2a8] bg-[#f4e6d2] px-2.5 py-1 text-[10px] font-semibold text-[#6b5238] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
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
    <section className="mt-4 rounded-[16px] border border-[#d6c2a8] bg-[linear-gradient(180deg,_#fff8ef_0%,_#f7ecde_100%)] p-4 shadow-[0_18px_30px_rgba(92,68,41,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#917a61]">Manual merge</div>
          <h3 className="mt-1 text-[16px] font-extrabold text-[#2d2319]">Choose primary item</h3>
          <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-[#8b7863]">
            Review the similar names below, keep one primary item active, and merge the others into it. This only
            relinks catalog references. Historical document descriptions stay unchanged.
          </p>
        </div>

        <div className="rounded-full border border-[#d8c3a8] bg-[#efe1cd] px-3 py-1 font-['JetBrains_Mono'] text-[10px] font-bold text-[#6b5038]">
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
                'rounded-[14px] border p-3 transition-all duration-150',
                isWinner
                  ? 'border-[#c49d70] bg-[#f1ddc1] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]'
                  : isInspected
                    ? 'border-[#cfb391] bg-[#f8eddc]'
                    : 'border-[#dfd0be] bg-[#fffaf3]',
              ].join(' ')}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleWinnerChange(member.item_id)}
                      className={[
                        'rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] transition-colors',
                        isWinner
                          ? 'border-[#b78c5e] bg-[#e6cfb0] text-[#593f29]'
                          : 'border-[#d7c4ab] bg-[#f7efe3] text-[#907b64] hover:bg-[#efe1cf]',
                      ].join(' ')}
                    >
                      {isWinner ? 'Primary item' : 'Set as primary'}
                    </button>
                    <div className="truncate text-[13px] font-bold text-[#302519]">{member.name}</div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-[#8d7a65]">
                    <PreviewPill>{formatCompactUsageCount(member.usage_count)}</PreviewPill>
                    <PreviewPill>{formatItemPrice(member.last_sold_price, 'No sales yet')}</PreviewPill>
                    <span>{formatLastUsedDate(member.last_used_at)}</span>
                    <span className="font-['JetBrains_Mono'] text-[#a08c76]">{member.item_id}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-2 rounded-full border border-[#d8c5ad] bg-[#fbf5ec] px-3 py-1.5 text-[11px] font-semibold text-[#6d543b]">
                    <input
                      type="checkbox"
                      checked={isMerged}
                      disabled={isWinner}
                      onChange={() => handleToggleMerged(member.item_id)}
                      className="h-3.5 w-3.5 rounded border-[#b89a76] text-[#8b6845] focus:ring-[#8b6845]"
                    />
                    Merge into primary
                  </label>

                  <button
                    type="button"
                    onClick={() => onInspectItem(member.item_id)}
                    className={[
                      'rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors',
                      isInspected
                        ? 'border-[#c29a6e] bg-[#ead7be] text-[#5f4730]'
                        : 'border-[#d8c5ad] bg-[#fff8ef] text-[#8b745c] hover:bg-[#f4e7d4]',
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

      <div className="mt-4 rounded-[14px] border border-[#dbc8ae] bg-[#fcf7ef] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#947f67]">Review merge</div>
            <div className="mt-1 text-[14px] font-bold text-[#2f2419]">
              {preview?.winner.name || 'Choose a primary item to continue'}
            </div>
          </div>

          <button
            type="button"
            disabled={disableMerge}
            onClick={() => setConfirmOpen(true)}
            className="rounded-[10px] border border-[#c5a074] bg-[#e7d2b3] px-4 py-2 text-[12px] font-bold text-[#523b25] shadow-[0_10px_18px_rgba(92,68,41,0.10),inset_0_1px_0_rgba(255,255,255,0.5)] transition-all duration-150 hover:bg-[#dcc39f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Confirm merge
          </button>
        </div>

        {aliasesLoading ? (
          <p className="mt-3 text-[11px] text-[#8b7863]">Loading existing aliases for this group…</p>
        ) : null}

        {aliasesError ? (
          <p className="mt-3 rounded-[10px] border border-[#e4c3ba] bg-[#fff2ee] px-3 py-2 text-[11px] text-[#9c4338]">
            We could not load alias details yet, so merge confirmation is paused until that finishes cleanly.
          </p>
        ) : null}

        {submissionError ? (
          <p className="mt-3 rounded-[10px] border border-[#e4c3ba] bg-[#fff2ee] px-3 py-2 text-[11px] text-[#9c4338]">
            {submissionError}
          </p>
        ) : null}

        {preview ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-[12px] border border-[#dfcfbd] bg-[#fffaf3] p-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#98826a]">Primary item</div>
              <div className="mt-2 text-[13px] font-bold text-[#2f2419]">{preview.winner.name}</div>
              <div className="mt-1 font-['JetBrains_Mono'] text-[11px] text-[#8c7762]">{preview.winner.item_id}</div>
            </div>

            <div className="rounded-[12px] border border-[#dfcfbd] bg-[#fffaf3] p-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#98826a]">History relinks</div>
              <div className="mt-2 text-[13px] font-bold text-[#2f2419]">
                {preview.relinkedHistoryRows.toLocaleString()} linked {preview.relinkedHistoryRows === 1 ? 'row' : 'rows'}
              </div>
              <p className="mt-1 text-[11px] text-[#8b7761]">
                Invoice and quotation `item_id` references will move to the selected primary item.
              </p>
            </div>

            <div className="rounded-[12px] border border-[#dfcfbd] bg-[#fffaf3] p-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#98826a]">Merge into primary</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {preview.mergedMembers.map((member) => (
                  <PreviewPill key={member.item_id}>{member.name}</PreviewPill>
                ))}
              </div>
            </div>

            <div className="rounded-[12px] border border-[#dfcfbd] bg-[#fffaf3] p-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#98826a]">Aliases kept</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {preview.aliasesToKeep.length ? (
                  preview.aliasesToKeep.map((alias) => <PreviewPill key={alias}>{alias}</PreviewPill>)
                ) : (
                  <span className="text-[11px] text-[#917d68]">No extra aliases will be added from this selection.</span>
                )}
              </div>
            </div>

            <div className="rounded-[12px] border border-[#dfcfbd] bg-[#fffaf3] p-3 md:col-span-2">
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#98826a]">Retired catalog items</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {preview.retiredItems.map((member) => (
                  <PreviewPill key={member.item_id}>{member.name}</PreviewPill>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-[11px] text-[#8b7863]">
            Select one primary item and at least one duplicate item to merge before confirming.
          </p>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm merge</AlertDialogTitle>
            <AlertDialogDescription>
              {preview
                ? `${preview.mergedMembers.length} item name${preview.mergedMembers.length === 1 ? '' : 's'} will be merged into ${preview.winner.name}. Document descriptions stay as they were recorded; only catalog links and aliases are updated.`
                : 'Review the merge preview before confirming.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mergeLoading}>Keep reviewing</AlertDialogCancel>
            <AlertDialogAction
              disabled={disableMerge}
              onClick={(event) => {
                event.preventDefault()
                void handleConfirmMerge()
              }}
            >
              {mergeLoading ? 'Merging…' : 'Apply merge'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
