import type { DuplicateCandidateGroup } from '../types'
import { formatCompactUsageCount, formatItemPrice, formatLastUsedDate } from './itemLibraryFormatters'

type ItemLibraryDuplicateGroupCardProps = {
  group: DuplicateCandidateGroup
  selectedGroupId: string | null
  selectedItemId: string | null
  onSelectGroup: (groupId: string) => void
  onInspectItem: (groupId: string, itemId: string) => void
}

export function ItemLibraryDuplicateGroupCard({
  group,
  selectedGroupId,
  selectedItemId,
  onSelectGroup,
  onInspectItem,
}: ItemLibraryDuplicateGroupCardProps) {
  const isSelected = selectedGroupId === group.group_id

  return (
    <section
      className={[
        'rounded-xl border p-3 shadow-md',
        isSelected
          ? 'border-bd-border-strong bg-bd-surface-muted'
          : 'border-bd-border bg-bd-surface',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={() => onSelectGroup(group.group_id)}
        className="w-full text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-bd-text-muted">Possible duplicates</div>
            <h3 className="mt-1 text-[14px] font-extrabold leading-tight text-bd-text">{group.label}</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-bd-text-muted">{group.reason}</p>
          </div>
          <div className="rounded-full border border-bd-border bg-bd-surface-muted px-2.5 py-1 font-mono text-[10px] font-bold text-bd-text">
            {group.members.length} names
          </div>
        </div>
      </button>

      <div className="mt-3 space-y-2">
        {group.members.map((member) => {
          const memberSelected = selectedItemId === member.item_id
          return (
            <button
              key={member.item_id}
              type="button"
              onClick={() => onInspectItem(group.group_id, member.item_id)}
              className={[
                'w-full rounded-lg border px-3 py-2 text-left transition-all duration-150',
                memberSelected
                  ? 'border-bd-button-primary-bg bg-bd-surface-muted shadow-sm'
                  : 'border-bd-border bg-bd-surface hover:bg-bd-surface-muted',
              ].join(' ')}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-semibold text-bd-text">{member.name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-bd-text-muted">
                    <span>{formatCompactUsageCount(member.usage_count)}</span>
                    <span>•</span>
                    <span>{formatLastUsedDate(member.last_used_at)}</span>
                  </div>
                </div>
                <div className="font-mono text-[11px] font-semibold text-bd-text opacity-90">
                  {formatItemPrice(member.last_sold_price, 'No sales yet')}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
