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
        'rounded-[16px] border p-3 shadow-[0_12px_24px_rgba(102,77,48,0.08),inset_0_1px_0_rgba(255,255,255,0.4)]',
        isSelected
          ? 'border-[#c8ab82] bg-[linear-gradient(180deg,_#fbf3e6_0%,_#f1dfc8_100%)]'
          : 'border-[#d9c8b4] bg-[linear-gradient(180deg,_#fff9f1_0%,_#f7ecde_100%)]',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={() => onSelectGroup(group.group_id)}
        className="w-full text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#917b62]">Possible duplicates</div>
            <h3 className="mt-1 text-[14px] font-extrabold leading-tight text-[#2d2319]">{group.label}</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-[#8c7964]">{group.reason}</p>
          </div>
          <div className="rounded-full border border-[#d3bea1] bg-[#efe0cb] px-2.5 py-1 font-['JetBrains_Mono'] text-[10px] font-bold text-[#6b5138]">
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
                'w-full rounded-[12px] border px-3 py-2 text-left transition-all duration-150',
                memberSelected
                  ? 'border-[#b58d63] bg-[#ead7be] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]'
                  : 'border-[#ddd0bf] bg-[#fffaf3] hover:bg-[#f8efe2]',
              ].join(' ')}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-semibold text-[#31261b]">{member.name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-[#8b7761]">
                    <span>{formatCompactUsageCount(member.usage_count)}</span>
                    <span>•</span>
                    <span>{formatLastUsedDate(member.last_used_at)}</span>
                  </div>
                </div>
                <div className="font-['JetBrains_Mono'] text-[11px] font-semibold text-[#5e4935]">
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
