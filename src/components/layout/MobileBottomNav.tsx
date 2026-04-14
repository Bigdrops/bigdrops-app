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
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl"
      style={{ paddingBottom: 'var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="grid h-[76px] w-full grid-cols-5 gap-1 px-2.5 pt-2.5 shadow-lg">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = active === item.key

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              className="flex flex-col items-center gap-1.5 text-[11px] font-medium text-muted-foreground"
            >
              <span
                className={cn(
                  'grid h-[42px] w-[42px] place-items-center rounded-[14px] border border-transparent',
                  isActive && 'border-transparent surface-strong',
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className={cn(isActive && 'font-bold text-foreground')}>{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}