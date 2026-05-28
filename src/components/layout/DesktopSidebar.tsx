import * as React from 'react'
import { Icons } from '@/lib/iconRegistry'
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
      className="sticky top-0 z-30 hidden h-dvh w-64 shrink-0 flex-col border-r border-bd-border bg-[hsl(var(--bd-layout-sidebar))] md:flex"
    >
      <div className="flex flex-col h-full overflow-y-auto bd-custom-scrollbar">
        <div className="px-5 py-6">
          <div className="text-[13px] font-black tracking-tight text-bd-text">
            {APP_NAME}
          </div>
          <div className="text-[9px] font-black uppercase tracking-widest text-bd-text-muted opacity-60">
            Invoicing & Projects
          </div>
          {session?.user?.email ? (
            <div className="mt-2 truncate text-[10px] font-bold text-bd-text-muted opacity-50">
              {session.user.email}
            </div>
          ) : null}
        </div>

        <div className="flex-1 space-y-[var(--bd-section-gap)] px-4 pb-10">
          <div>
            <div className="mb-2.5 px-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-bd-text-muted">
              Navigation
            </div>
            <div className="space-y-1.5">
            <div className="space-y-0.5">
              {desktopNav.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.key
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onTabClick(item.key)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-[var(--bd-radius-lg)] px-2.5 py-1.5 text-xs transition-all active:scale-[0.985]',
                      isActive ? activeNavItemClassName : inactiveNavItemClassName
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-7 w-7 place-items-center rounded-[var(--bd-icon-container-radius)] transition-colors',
                        isActive ? activeNavIconClassName : 'bg-[var(--bd-icon-container-bg)]'
                      )}
                    >
                      <Icon className={cn('h-4 w-4', isActive ? '' : 'text-[var(--bd-icon-container-text)]')} strokeWidth={2} />
                    </span>
                    <span className="font-semibold">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

          <div>
            <Separator className="my-4 bg-bd-border/60" />
            <div className="mb-2 px-2 text-[9px] font-extrabold uppercase tracking-[0.2em] text-bd-text-muted">
              Sales
            </div>
            <div className="space-y-1.5">
              {salesPicker.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleSalesPick(item.key)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-[var(--bd-radius-lg)] border border-bd-surface-action-border bg-bd-surface-action px-2.5 py-2 text-left text-xs shadow-sm transition-all hover:bg-bd-surface-action-hover active:scale-[0.985]',
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={cn('grid h-7 w-7 place-items-center rounded-[var(--bd-radius-md)] shadow-sm ring-1 ring-black/5', item.iconBg)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="font-semibold text-bd-text">{item.label}</span>
                    </div>
                    <Icons.chevronRight className="h-4 w-4 text-bd-text-muted" />
                  </button>
                )
              })}
            </div>
          </div>

          {moreGroups.map((group) => (
            <div key={group.group}>
              <div className="mb-2.5 px-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-bd-text-muted">
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
                      className="flex w-full items-center justify-between gap-[var(--bd-space-md)] rounded-[var(--bd-radius-lg)] border border-bd-border bg-bd-surface px-3 py-2 text-sm shadow-sm transition-all hover:bg-bd-surface-muted active:scale-[0.985]"
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-[var(--bd-radius-md)] bg-bd-surface-muted">
                          <Icon className="h-5 w-5 text-bd-text/80" />
                        </span>
                        <span className="font-semibold text-bd-text">{item.label}</span>
                      </div>
                      <Icons.chevronRight className="h-4.5 w-4.5 text-bd-text-muted" />
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          <div className="mt-auto pt-4">
             <div className="rounded-[var(--bd-radius-lg)] border border-bd-border bg-[hsl(var(--bd-surface-muted))/0.5] px-3 py-3 shadow-sm">
                <div className="mb-[var(--bd-space-sm)] px-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-bd-text-muted">
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
