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
    <nav className={cn(
      isSidebar ? "space-y-6 w-full" : "w-full max-w-2xl mx-auto pb-12"
    )}>
      {groups.map((group) => (
        <div key={group.id} className={cn(isSidebar ? "space-y-2" : "mb-6")}>
          <div className="px-3 mb-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-bd-text-muted opacity-50">
              {group.label}
            </p>
          </div>

          <div className={cn(
            "grid",
            isSidebar ? "gap-1" : "divide-y divide-[hsl(var(--bd-border)/0.4)]"
          )}>
            {group.items.map((item) => {
              const isActive = activeSection === item.id
              const Icon = item.icon

              return (
                <button
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  className={cn(
                    "group relative flex items-center gap-3 transition-all text-left",
                    isSidebar 
                      ? "w-full rounded-[var(--bd-radius-md)] px-3 py-2" 
                      : "w-full px-4 py-3 hover:bg-[hsl(var(--bd-surface-muted)/0.4)]",
                    isSidebar && isActive 
                      ? "bg-bd-surface-muted text-bd-text" 
                      : isSidebar ? "text-bd-text-muted hover:bg-bd-surface-muted/50 hover:text-bd-text"
                      : ""
                  )}
                >
                  {/* Active Indicator Line for Sidebar */}
                  {isSidebar && isActive && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-bd-button-primary-bg" />
                  )}

                  <div className={cn(
                    "flex shrink-0 items-center justify-center rounded-[var(--bd-radius-sm)] transition-all",
                    isSidebar ? "h-8 w-8" : "h-9 w-9",
                    isActive 
                      ? "bg-bd-button-primary-bg text-bd-button-primary-text" 
                      : "bg-bd-surface-muted text-bd-text-muted group-hover:text-bd-text"
                  )}>
                    <Icon size={isSidebar ? 16 : 18} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-semibold truncate",
                      isActive || !isSidebar ? "text-bd-text" : "text-bd-text-muted"
                    )}>
                      {item.label}
                    </p>
                    <p className={cn(
                      "text-[11px] leading-tight text-bd-text-muted truncate opacity-70",
                      isSidebar && isTablet && "hidden"
                    )}>
                      {item.desc}
                    </p>
                  </div>

                  {!isSidebar && (
                    <ChevronRight size={14} className="text-bd-text-muted opacity-30 group-hover:opacity-100 transition-all" />
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
