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
      className="fixed z-40 left-2.5 right-2.5 bottom-[max(8px,env(safe-area-inset-bottom,0px))] h-[62px] p-1 grid grid-cols-5 border border-[var(--line-strong)] rounded-[20px] bg-[var(--nav)] shadow-lg"
    >
      {items.map((item) => {
        const Icon = item.icon
        const isActive = active === item.key

        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelect(item.key)}
            className={cn(
              "flex flex-col items-center justify-center gap-[2px] rounded-[15px] font-[800] text-[7px] uppercase transition-all duration-200 outline-none active:scale-[0.965]",
              isActive
                ? "bg-[hsl(var(--bd-nav-active-bg))] text-[hsl(var(--bd-nav-active-text))] shadow-[0_1px_2px_rgba(15,23,42,0.05),inset_0_1px_rgba(255,255,255,0.25)]"
                : "text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-nav-hover-bg))]"
            )}
          >
            <Icon
              className="h-[17px] w-[17px]"
              strokeWidth={1.9}
              style={{
                color:
                  isActive
                    ? 'hsl(var(--bd-nav-active-icon))'
                    : undefined,
              }}
            />
            <span className="tracking-tight">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}