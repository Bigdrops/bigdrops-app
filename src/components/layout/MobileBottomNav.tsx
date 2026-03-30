import { FolderKanban, Home, MoreHorizontal, Receipt, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'projects', label: 'Projects', icon: FolderKanban },
  { key: 'sales', label: 'Sales', icon: Receipt },
  { key: 'clients', label: 'Clients', icon: UserRound },
  { key: 'more', label: 'More', icon: MoreHorizontal },
]

export default function MobileBottomNav({
  active,
  onSelect,
}: {
  active: string
  onSelect: (key: string) => void
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/92 backdrop-blur-xl">
      <div className="grid h-[92px] w-full grid-cols-5 gap-1 px-2.5 pb-4 pt-2.5 shadow-[0_-10px_30px_-20px_rgba(15,23,42,0.35)]">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = active === item.key
          return (
            <button key={item.key} type="button" onClick={() => onSelect(item.key)} className="flex flex-col items-center gap-1.5 text-[11px] font-medium text-slate-500">
              <span className={cn('grid h-[42px] w-[42px] place-items-center rounded-[14px] border border-transparent', isActive && 'border-slate-950 bg-slate-950 text-white')}>
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className={cn(isActive && 'font-bold text-slate-950')}>{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
