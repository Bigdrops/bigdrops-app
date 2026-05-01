import * as React from 'react'
import { ChevronRight } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { BusinessSwitcher } from './BusinessSwitcher'
import {
  APP_NAME,
  desktopNav,
  salesPicker,
  moreGroups,
  activeNavItemClassName,
  activeNavIconClassName,
  inactiveNavItemClassName,
  inactiveNavIconClassName,
  inactiveNavIconColorClassName,
} from './navData'

interface DesktopSidebarProps {
  session?: Session | null
  activeTab: string
  onTabClick: (key: string) => void
  handleSalesPick: (key: string) => void
  handleMorePick: (key: string) => void
}

export function DesktopSidebar({
  session,
  activeTab,
  onTabClick,
  handleSalesPick,
  handleMorePick,
}: DesktopSidebarProps) {
  return (
    <aside 
      className="sticky top-0 z-30 hidden h-dvh w-72 shrink-0 flex-col border-r border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-layout-sidebar))] md:flex"
    >
      <div className="flex flex-col h-full overflow-y-auto bd-custom-scrollbar">
        <div className="px-6 py-7">
          <div className="text-sm font-black tracking-[-0.03em] text-[hsl(var(--bd-text))]">
            {APP_NAME}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--bd-text-muted))]">
            Invoicing and Projects
          </div>
          {session?.user?.email ? (
            <div className="mt-3 truncate text-[11px] font-medium text-[hsl(var(--bd-text-muted))] opacity-70">
              {session.user.email}
            </div>
          ) : null}
        </div>

        <div className="flex-1 space-y-[var(--bd-section-gap)] px-4 pb-10">
          <div>
            <div className="mb-2.5 px-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[hsl(var(--bd-text-muted))]">
              Navigation
            </div>
            <div className="space-y-1.5">
              {desktopNav.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.key
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onTabClick(item.key)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-[var(--bd-radius-lg)] px-3 py-2 text-sm transition-all active:scale-[0.985]',
                      isActive ? activeNavItemClassName : inactiveNavItemClassName
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-9 w-9 place-items-center rounded-[var(--bd-icon-container-radius)] transition-colors',
                        isActive ? activeNavIconClassName : 'bg-[var(--bd-icon-container-bg)]'
                      )}
                    >
                      <Icon className={cn('h-[var(--bd-icon-size-md)] w-[var(--bd-icon-size-md)]', isActive ? '' : 'text-[var(--bd-icon-container-text)]')} strokeWidth={2} />
                    </span>
                    <span className="font-semibold">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <Separator className="my-5 bg-[hsl(var(--bd-border))]/60" />
            <div className="mb-2.5 px-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[hsl(var(--bd-text-muted))]">
              Sales
            </div>
            <div className="space-y-2">
              {salesPicker.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleSalesPick(item.key)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-surface-action-border))] bg-[hsl(var(--bd-surface-action))] px-3 py-2.5 text-left shadow-sm transition-all hover:bg-[hsl(var(--bd-surface-action-hover))] active:scale-[0.985]',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn('grid h-9 w-9 place-items-center rounded-[var(--bd-radius-md)] shadow-sm ring-1 ring-black/5', item.iconBg)}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="font-semibold text-[hsl(var(--bd-text))]">{item.label}</span>
                    </div>
                    <ChevronRight className="h-4.5 w-4.5 text-[hsl(var(--bd-text-muted))]" />
                  </button>
                )
              })}
            </div>
          </div>

          {moreGroups.map((group) => (
            <div key={group.group}>
              <div className="mb-2.5 px-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[hsl(var(--bd-text-muted))]">
                {group.group}
              </div>
              <div className="space-y-2">
                {group.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleMorePick(item.key)}
                      className="flex w-full items-center justify-between gap-[var(--bd-space-md)] rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] px-3 py-2 text-sm shadow-sm transition-all hover:bg-[hsl(var(--bd-surface-muted))] active:scale-[0.985]"
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-[var(--bd-radius-md)] bg-[hsl(var(--bd-surface-muted))]">
                          <Icon className="h-5 w-5 text-[hsl(var(--bd-text))]/80" />
                        </span>
                        <span className="font-semibold text-[hsl(var(--bd-text))]">{item.label}</span>
                      </div>
                      <ChevronRight className="h-4.5 w-4.5 text-[hsl(var(--bd-text-muted))]" />
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          <div className="mt-auto pt-4">
             <div className="rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))/0.5] px-3 py-3 shadow-sm">
                <div className="mb-[var(--bd-space-sm)] px-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[hsl(var(--bd-text-muted))]">
                  Business Context
                </div>
                <BusinessSwitcher />
             </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
