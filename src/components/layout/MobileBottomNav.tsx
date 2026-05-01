import { Icons } from '@/lib/iconRegistry'
import { cn } from '@/lib/utils'

const items = [
  { key: 'home', label: 'Home', icon: Icons.home },
  { key: 'projects', label: 'Projects', icon: Icons.projects },
  { key: 'sales', label: 'Sales', icon: Icons.sales },
  { key: 'clients', label: 'Clients', icon: Icons.clients },
  { key: 'more', label: 'More', icon: Icons.more },
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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-layout-nav)/0.95)] backdrop-blur-xl"
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
                  ? "bg-[hsl(var(--bd-text))] text-[hsl(var(--bd-surface))] shadow-sm" 
                  : "text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-surface-muted))/0.5]"
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