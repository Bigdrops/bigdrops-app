import { Briefcase, Home, MoreHorizontal, TrendingUp, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'projects', label: 'Projects', icon: Briefcase },
  { key: 'sales', label: 'Sales', icon: TrendingUp },
  { key: 'clients', label: 'Clients', icon: Users },
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
      data-bd-layout="bottom-nav"
      className="fixed inset-x-0 bottom-0 z-40 transform-gpu will-change-transform border-t border-bd-border bg-[hsl(var(--bd-layout-nav)/0.95)] backdrop-blur-xl"
      style={{ paddingBottom: 'var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="grid h-[64px] w-full grid-cols-5 gap-1 px-2 pt-1.5">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = active === item.key

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 transition-all outline-none",
                isActive 
                  ? "bg-bd-text text-bd-surface shadow-sm" 
                  : "text-bd-text-muted hover:bg-[hsl(var(--bd-surface-muted))/0.5]"
              )}
            >
              <Icon className={cn("h-[18px] w-[18px]", isActive ? "stroke-[2.5px]" : "stroke-[2px]")} />
              <span className={cn("text-[10px] font-bold tracking-tight", isActive ? "opacity-100" : "opacity-80")}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}