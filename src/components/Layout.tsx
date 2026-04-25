import * as React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  X,
  ChevronRight,
  ChevronDown,
  Check,
  Building2,
  Receipt,
  LogOut,
  ClipboardList,
} from 'lucide-react'
import type { Session } from '@supabase/supabase-js'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import MobileBottomNav from '@/components/layout/MobileBottomNav'
import MobilePageHeader from '@/components/layout/MobilePageHeader'
import { useSettings } from '../hooks/useSettings'
import { supabase } from '../supabase'
import {
  APP_NAME,
  tabs,
  salesPicker,
  presalesPicker,
  moreGroups,
  desktopNav,
  mobileDrawerPrimaryNav,
  mobileDrawerUtilityNav,
  activeNavItemClassName,
  activeNavIconClassName,
  inactiveNavItemClassName,
  inactiveNavIconClassName,
  inactiveNavIconColorClassName,
  getSalesPath,
  getPreSalesPath,
  isPathActive,
  getActiveTab,
  type TabKey,
} from './layout/navData'
import { BusinessSwitcher } from './layout/BusinessSwitcher'
import { MobileSidebar } from './layout/MobileSidebar'

export interface MobileChromeContextValue {
  openSidebar: () => void
}

export const MobileChromeContext = React.createContext<MobileChromeContextValue>({ 
  openSidebar: () => {} 
})

interface LayoutProps {
  title?: string
  children: React.ReactNode
  session?: Session | null
  hidePageHeader?: boolean
  hideMobileHomeHeader?: boolean
  contentClassName?: string
}

export default function Layout({
  title,
  children,
  session,
  hidePageHeader = false,
  hideMobileHomeHeader = false,
  contentClassName = '',
}: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { settings } = useSettings()
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const [salesOpen, setSalesOpen] = React.useState(false)
  const [moreOpen, setMoreOpen] = React.useState(false)
  const [drawerSalesOpen, setDrawerSalesOpen] = React.useState(false)
  
  const activeTab = getActiveTab(location.pathname)
  const isHome = location.pathname === '/'
  const salesRouteActive = activeTab === 'sales'
  const presalesRouteActive = isPathActive(location.pathname, '/rfqs') || isPathActive(location.pathname, '/boqs')
  
  const openSidebar = React.useCallback(() => setSidebarOpen(true), [])

  const handleSalesPick = (key: string) => {
    setSalesOpen(false)
    setSidebarOpen(false)
    navigate(getSalesPath(key))
  }

  const handleMorePick = async (key: string) => {
    if (key === 'signout') {
      await supabase.auth.signOut()
      navigate('/login')
      setMoreOpen(false)
      setSidebarOpen(false)
      return
    }

    const pathByKey: Record<string, string> = {
      rfqs: '/rfqs',
      boqs: '/boqs',
      reports: '/reports',
      compliance: '/compliance',
      'item-library': '/item-library',
      settings: '/settings',
    }
    setMoreOpen(false)
    setSidebarOpen(false)
    navigate(pathByKey[key] || '/')
  }

  const onTabClick = (key: string) => {
    if (key === 'sales') return setSalesOpen(true)
    if (key === 'more') return setMoreOpen(true)
    
    const pathByKey: Record<string, string> = {
      home: '/',
      projects: '/projects',
      clients: '/clients',
      'item-library': '/item-library',
    }
    navigate(pathByKey[key as keyof typeof pathByKey] || '/')
  }

  React.useEffect(() => {
    if (salesRouteActive) {
      setDrawerSalesOpen(true)
    }
  }, [salesRouteActive])

  const desktopContentClassName = contentClassName || 'mx-auto w-full max-w-5xl px-6 py-6'
  const mobileContentClassName = contentClassName || 'w-full overflow-x-hidden px-0 pb-24 pt-0'
  
  const mobileChromeValue = React.useMemo(
    () => ({
      openSidebar,
    }),
    [openSidebar]
  )

  React.useEffect(() => {
    const handleExternalSidebarOpen = () => openSidebar()
    window.addEventListener('bigdrops:open-mobile-drawer', handleExternalSidebarOpen)
    return () => window.removeEventListener('bigdrops:open-mobile-drawer', handleExternalSidebarOpen)
  }, [openSidebar])

  return (
    <div className="app-ambient min-h-dvh bg-background text-foreground">
      <div className="hidden md:flex">
        <aside className="w-72 border-r border-border bg-background">
          <div className="px-5 py-5">
            <div className="text-sm font-black tracking-tight text-foreground">{APP_NAME}</div>
            <div className="text-xs text-muted-foreground">Invoicing and Projects</div>
            {session?.user?.email ? (
              <div className="mt-2 truncate text-xs text-muted-foreground">{session.user.email}</div>
            ) : null}
          </div>

          <div className="space-y-4 px-4 pb-6">
            <div>
              <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Navigation
              </div>
              <div className="space-y-2">
                {desktopNav.map((item) => {
                  const Icon = item.icon
                  const isActive = activeTab === item.key
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => onTabClick(item.key)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm transition',
                        isActive ? activeNavItemClassName : inactiveNavItemClassName
                      )}
                    >
                      <span
                        className={cn(
                          'grid h-9 w-9 place-items-center rounded-xl',
                          isActive ? activeNavIconClassName : inactiveNavIconClassName
                        )}
                      >
                        <Icon className={cn('h-5 w-5', isActive ? '' : inactiveNavIconColorClassName)} />
                      </span>
                      <span className="font-semibold">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <Separator className="my-3" />
              <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                        'flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left shadow-sm transition hover:brightness-[0.99]',
                        item.tint
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn('grid h-9 w-9 place-items-center rounded-xl', item.iconBg)}>
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="font-semibold text-foreground">{item.label}</span>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </button>
                  )
                })}
              </div>
            </div>

            {moreGroups.map((group) => (
              <div key={group.group}>
                <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                        className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-3 py-2 text-sm shadow-sm transition hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 place-items-center rounded-xl bg-muted">
                            <Icon className="h-5 w-5 text-foreground/80" />
                          </span>
                          <span className="font-semibold text-foreground">{item.label}</span>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="flex-1">
          {!isHome && !hidePageHeader ? (
            <div className="mx-auto w-full max-w-5xl px-6 pt-6">
              <div className="rounded-2xl border border-border border-l-4 border-l-[var(--tone-info)] bg-card px-5 py-4 shadow-sm">
                <div className="text-lg font-bold text-foreground">{title}</div>
              </div>
            </div>
          ) : null}
          <div className={desktopContentClassName}>{children}</div>
        </main>
      </div>

      <div className="md:hidden">
        {isHome && !hideMobileHomeHeader ? (
          <div className="w-full px-4 pt-3">
            <MobilePageHeader
              title={APP_NAME}
              subtitle={settings?.company_name || 'Invoicing and Projects'}
              accentClassName="tone-info-accent"
              onMenuClick={() => setSidebarOpen(true)}
            />
          </div>
        ) : null}

        {!isHome && !hidePageHeader ? (
          <div className="w-full px-4 pt-3">
            <MobilePageHeader
              title={title}
              onMenuClick={() => setSidebarOpen(true)}
            />
          </div>
        ) : null}

        <MobileChromeContext.Provider value={mobileChromeValue}>
          <main className={cn('overflow-x-hidden', mobileContentClassName)}>{children}</main>
        </MobileChromeContext.Provider>

        <MobileBottomNav active={activeTab} onSelect={onTabClick} />
        
        <MobileSidebar
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          pathname={location.pathname}
          navigate={navigate}
          drawerSalesOpen={drawerSalesOpen}
          setDrawerSalesOpen={setDrawerSalesOpen}
          salesRouteActive={salesRouteActive}
          presalesRouteActive={presalesRouteActive}
          handleSalesPick={handleSalesPick}
          handleMorePick={handleMorePick}
        />

        <Sheet open={salesOpen} onOpenChange={setSalesOpen}>
          <SheetContent
            side="bottom"
            showCloseButton={false}
            className="h-[min(640px,84vh)] max-h-[84vh] overflow-hidden rounded-t-[26px] border-x-0 border-b-0 border-t border-border bg-background p-0 shadow-2xl"
          >
            <div className="flex h-full flex-col">
              <div className="shrink-0 px-5 pb-2 pt-3">
                <div className="mx-auto h-1 w-10 rounded-full bg-border" />
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2">
                <div className="space-y-[10px]">
                  {salesPicker.map((item) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => handleSalesPick(item.key)}
                        className="grid w-full grid-cols-[52px,1fr,auto] items-center gap-3 rounded-[20px] border border-black/10 bg-[#fafcff] px-3.5 py-3.5 text-left transition hover:bg-[#f4f7fb]"
                      >
                        <span className={cn('grid h-[52px] w-[52px] place-items-center rounded-[16px] shadow-sm', item.iconBg)}>
                          <Icon className="h-6 w-6" />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[15px] font-bold text-[#111111]">{item.label}</div>
                          <div className="text-[13px] text-[#738096]">{item.description}</div>
                        </div>
                        <ChevronRight className="h-[18px] w-[18px] shrink-0 text-[#64748b]" />
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent
            side="bottom"
            showCloseButton={false}
            className="h-[min(640px,84vh)] overflow-hidden rounded-t-[26px] border-x-0 border-b-0 border-t border-border bg-background p-0 shadow-2xl"
          >
            <div className="flex h-full flex-col">
              <div className="shrink-0 border-b border-border/80 px-5 pb-4 pt-3">
                <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
                <SheetHeader className="space-y-0 p-0 text-left">
                  <SheetTitle className="text-[20px] font-extrabold leading-[1.15] tracking-[-0.03em] text-foreground">
                    More
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-1.5 text-[13px] leading-5 text-muted-foreground">
                  Admin, reporting, and workspace utilities
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3">
                {moreGroups.map((group, index) => (
                  <div key={group.group} className={index === 0 ? '' : 'mt-4'}>
                    <div className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      {group.sheetLabel || group.group}
                    </div>
                    <div className="space-y-2">
                      {group.items.map((item) => {
                        const Icon = item.icon
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => handleMorePick(item.key)}
                            className="flex w-full items-center justify-between rounded-[18px] border border-border bg-background px-4 py-3 text-left transition hover:bg-muted/35"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-2xl shadow-sm', item.iconBg)}>
                                <Icon className="h-5 w-5" />
                              </span>
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-foreground">{item.label}</div>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}
