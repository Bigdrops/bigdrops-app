import { cn } from '@/lib/utils'
import { ChevronRight, type LucideIcon } from 'lucide-react'
import type { SettingsGroup, ActiveSectionId } from '@/pages/settings/settings-config'

interface SettingsNavProps {
  groups: SettingsGroup[]
  activeSection: ActiveSectionId | null
  onSelect: (id: ActiveSectionId) => void
  variant?: 'sidebar' | 'list'
  isTablet?: boolean
}

export function SettingsNav({ groups, activeSection, onSelect, variant = 'list', isTablet }: SettingsNavProps) {
  const isSidebar = variant === 'sidebar'

  return (
    <nav className={cn("space-y-6", isSidebar ? "w-full" : "w-full max-w-2xl mx-auto")}>
      {groups.map((group) => (
        <div key={group.id} className="space-y-2">
          <div className="px-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[hsl(var(--bd-text-muted))] opacity-60">
              {group.label}
            </p>
          </div>

          <div className={cn(
            "grid gap-1",
            !isSidebar && "rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] overflow-hidden shadow-sm"
          )}>
            {group.items.map((item) => {
              const isActive = activeSection === item.id
              const Icon = item.icon

              return (
                <button
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  className={cn(
                    "group relative flex items-center gap-3 transition-all",
                    isSidebar 
                      ? "w-full rounded-[var(--bd-radius-md)] px-3 py-2 text-left" 
                      : "w-full px-4 py-3.5 text-left border-b border-[hsl(var(--bd-border))]/40 last:border-b-0",
                    isSidebar && isActive 
                      ? "bg-[hsl(var(--bd-surface-muted))] text-[hsl(var(--bd-text))]" 
                      : isSidebar ? "text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-surface-muted))]/50 hover:text-[hsl(var(--bd-text))]"
                      : "hover:bg-[hsl(var(--bd-surface-muted))]"
                  )}
                >
                  {/* Active Indicator Line for Sidebar */}
                  {isSidebar && isActive && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-[hsl(var(--bd-button-primary-bg))]" />
                  )}

                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--bd-radius-sm)] transition-all",
                    isActive 
                      ? "bg-[hsl(var(--bd-button-primary-bg))] text-[hsl(var(--bd-button-primary-text))]" 
                      : "bg-[hsl(var(--bd-surface-muted))] text-[hsl(var(--bd-text-muted))] group-hover:bg-[hsl(var(--bd-surface-muted))] group-hover:text-[hsl(var(--bd-text))]"
                  )}>
                    <Icon size={16} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-bold truncate",
                      isActive ? "text-[hsl(var(--bd-text))]" : "text-[hsl(var(--bd-text))]"
                    )}>
                      {item.label}
                    </p>
                    {!isSidebar && (
                      <p className="mt-0.5 text-[11px] leading-tight text-[hsl(var(--bd-text-muted))] truncate">
                        {item.desc}
                      </p>
                    )}
                    {isSidebar && !isTablet && (
                      <p className="text-[10px] font-medium text-[hsl(var(--bd-text-muted))] truncate opacity-70">
                        {item.desc}
                      </p>
                    )}
                  </div>

                  {!isSidebar && (
                    <ChevronRight size={14} className="text-[hsl(var(--bd-text-muted))] opacity-20 group-hover:opacity-100 transition-all" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}
