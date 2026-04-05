import * as React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  FolderKanban,
  Users,
  MoreHorizontal,
  X,
  ChevronRight,
  Receipt,
  FileSignature,
  ClipboardCheck,
  BarChart3,
  Settings,
  LogOut,
  LayoutDashboard,
  ChevronDown,
  Check,
  Building2,
  Truck,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import MobileBottomNav from '@/components/layout/MobileBottomNav'
import MobilePageHeader from '@/components/layout/MobilePageHeader'
import { useSettings } from '../hooks/useSettings'
import { supabase } from '../supabase'

const APP_NAME = 'BIGDROPS'
export const MobileChromeContext = React.createContext({ openSidebar: () => {} })

const tabs = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'projects', label: 'Projects', icon: FolderKanban },
  { key: 'sales', label: 'Sales', icon: Receipt },
  { key: 'clients', label: 'Clients', icon: Users },
  { key: 'more', label: 'More', icon: MoreHorizontal },
]

const salesPicker = [
  { key: 'invoices',   label: 'Invoices',   icon: Receipt,       tint: 'tone-info-panel',    iconBg: 'tone-info-icon' },
  { key: 'quotations', label: 'Quotations', icon: FileSignature, tint: 'tone-accent-panel',  iconBg: 'tone-accent-icon' },
  { key: 'csr',        label: 'CSR',        icon: ClipboardCheck, tint: 'tone-warning-panel', iconBg: 'tone-warning-icon' },
  { key: 'waybills',   label: 'Waybills',   icon: Truck,          tint: 'tone-neutral-panel', iconBg: 'tone-neutral-icon' },
]

const moreGroups = [
  {
    group: 'Finance',
    items: [
      { key: 'reports', label: 'Reports', icon: BarChart3 },
      { key: 'compliance', label: 'Compliance Hub', icon: ClipboardCheck },
    ],
  },
  { group: 'System', items: [{ key: 'settings', label: 'Settings', icon: Settings }, { key: 'signout', label: 'Sign Out', icon: LogOut }] },
]

const desktopNav = [
  { key: 'home', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'projects', label: 'Projects', icon: FolderKanban },
  { key: 'clients', label: 'Clients', icon: Users },
]

const mobileDrawerPrimaryNav = [
  { key: 'home', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { key: 'projects', label: 'Projects', icon: FolderKanban, path: '/projects' },
  { key: 'clients', label: 'Clients', icon: Users, path: '/clients' },
]

const mobileDrawerUtilityNav = [
  { key: 'reports', label: 'Reports', icon: BarChart3, path: '/reports' },
  { key: 'compliance', label: 'Compliance Hub', icon: ClipboardCheck, path: '/compliance' },
  { key: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
]

const activeNavItemClassName = 'surface-strong shadow-sm'
const activeNavIconClassName = 'surface-strong-soft'
const inactiveNavItemClassName = 'text-foreground/80 hover:bg-muted/50'
const inactiveNavIconClassName = 'bg-muted'
const inactiveNavIconColorClassName = 'text-foreground/80'

function getSalesPath(key) {
  const pathByKey = {
    invoices: '/invoices',
    quotations: '/quotations',
    csr: '/csr',
    waybills: '/waybills',
  }

  return pathByKey[key] || '/'
}

function isPathActive(pathname, path) {
  if (path === '/') return pathname === '/'
  return pathname === path || pathname.startsWith(`${path}/`)
}

function getActiveTab(pathname) {
  if (pathname === '/') return 'home'
  if (pathname.startsWith('/projects')) return 'projects'
  if (pathname.startsWith('/clients')) return 'clients'
  if (pathname.startsWith('/invoices') || pathname.startsWith('/quotations') || pathname.startsWith('/csr') || pathname.startsWith('/waybills')) return 'sales'
  if (pathname.startsWith('/reports') || pathname.startsWith('/compliance') || pathname.startsWith('/settings')) return 'more'
  return 'home'
}

export function BusinessSwitcher() {
  const { settings } = useSettings()
  const [open, setOpen] = React.useState(false)
  const activeName = settings?.company_name || 'Business profile not configured'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm"
      >
        <span className="grid h-6 w-6 place-items-center rounded-full surface-strong">
          <Building2 className="h-3.5 w-3.5" />
        </span>
        <span className="max-w-[140px] truncate">{activeName}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open ? (
        <div className="surface-overlay fixed inset-0 z-[70] flex items-end justify-center p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-t-3xl border border-border bg-card shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <div className="text-sm font-bold text-foreground">Current Business</div>
                <div className="text-xs text-muted-foreground">Loaded from settings</div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-full bg-muted text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5">
              <div className="rounded-2xl border border-border bg-muted/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl surface-strong">
                    {(settings?.company_name || 'B').charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-foreground">{activeName}</div>
                    <div className="text-xs text-muted-foreground">Multi-business switching is not configured yet.</div>
                  </div>
                  <Check className="h-4 w-4 text-foreground" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default function Layout({
  title,
  children,
  session,
  hidePageHeader = false,
  hideMobileHomeHeader = false,
  contentClassName = '',
}) {
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

  const handleSalesPick = (key) => {
    setSalesOpen(false)
    setSidebarOpen(false)
    navigate(getSalesPath(key))
  }

  const handleMorePick = async (key) => {
    if (key === 'signout') {
      await supabase.auth.signOut()
      navigate('/login')
      setMoreOpen(false)
      setSidebarOpen(false)
      return
    }

    const pathByKey = {
      reports: '/reports',
      compliance: '/compliance',
      settings: '/settings',
    }
    setMoreOpen(false)
    setSidebarOpen(false)
    navigate(pathByKey[key] || '/')
  }

  const onTabClick = (key) => {
    if (key === 'sales') return setSalesOpen(true)
    if (key === 'more') return setMoreOpen(true)
    const pathByKey = { home: '/', projects: '/projects', clients: '/clients' }
    navigate(pathByKey[key] || '/')
  }

  React.useEffect(() => {
    if (salesRouteActive) {
      setDrawerSalesOpen(true)
    }
  }, [salesRouteActive])

  const desktopContentClassName = contentClassName || 'mx-auto w-full max-w-5xl px-6 py-6'
  const mobileContentClassName = contentClassName || 'w-full overflow-x-hidden px-0 pb-24 pt-0'
  const mobileChromeValue = React.useMemo(() => ({
    openSidebar: () => setSidebarOpen(true),
  }), [])

  return (
    <div className="min-h-dvh bg-muted/50 text-foreground">
      <div className="hidden md:flex">
        <aside className="w-72 border-r border-border bg-background">
          <div className="px-5 py-5">
            <div className="text-sm font-black tracking-tight text-foreground">{APP_NAME}</div>
            <div className="text-xs text-muted-foreground">Invoicing and Projects</div>
            {session?.user?.email ? <div className="mt-2 truncate text-xs text-muted-foreground">{session.user.email}</div> : null}
          </div>

          <div className="space-y-4 px-4 pb-6">
            <div>
              <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Navigation</div>
              <div className="space-y-2">
                {desktopNav.map((item) => {
                  const Icon = item.icon
                  const isActive = activeTab === item.key
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => onTabClick(item.key)}
                      className={cn('flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm transition', isActive ? activeNavItemClassName : inactiveNavItemClassName)}
                    >
                      <span className={cn('grid h-9 w-9 place-items-center rounded-xl', isActive ? activeNavIconClassName : inactiveNavIconClassName)}>
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
              <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sales</div>
              <div className="space-y-2">
                {salesPicker.map((item) => {
                  const Icon = item.icon
                  return (
                    <button key={item.key} type="button" onClick={() => handleSalesPick(item.key)} className={cn('flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left shadow-sm transition hover:brightness-[0.99]', item.tint)}>
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
                <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.group}</div>
                <div className="space-y-2">
                  {group.items.map((item) => {
                    const Icon = item.icon
                    return (
                      <button key={item.key} type="button" onClick={() => handleMorePick(item.key)} className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-3 py-2 text-sm shadow-sm transition hover:bg-muted/50">
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
          <div className="w-full px-4 pt-4">
            <MobilePageHeader
              title={APP_NAME}
              subtitle={settings?.company_name || 'Invoicing and Projects'}
              accentClassName="tone-info-accent"
              onMenuClick={() => setSidebarOpen(true)}
            />
          </div>
        ) : null}

        {!isHome && !hidePageHeader ? (
          <div className="w-full px-4 pt-4">
            <div className="rounded-2xl border border-border border-l-4 border-l-[var(--tone-info)] bg-card px-5 py-4 shadow-sm">
              <div className="text-base font-bold text-foreground">{title}</div>
            </div>
          </div>
        ) : null}

        <MobileChromeContext.Provider value={mobileChromeValue}>
          <main className={cn('overflow-x-hidden', mobileContentClassName)}>{children}</main>
        </MobileChromeContext.Provider>

        <MobileBottomNav active={activeTab} onSelect={onTabClick} />

        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-[280px] p-0 sm:max-w-[280px]" showCloseButton={false}>
            <button type="button" onClick={() => setSidebarOpen(false)} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-muted text-muted-foreground" aria-label="Close navigation menu">
              <X className="h-5 w-5" />
            </button>

            <div className="px-5 pb-5 pt-6">
              <div className="text-sm font-black tracking-tight text-foreground">{APP_NAME}</div>
              <div className="mt-1 text-xs text-muted-foreground">Navigation</div>
            </div>

            <div className="space-y-2 px-4 pb-6">
              <div className="rounded-2xl border border-border bg-card px-3 py-3 shadow-sm">
                <div className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Business</div>
                <BusinessSwitcher />
              </div>

              {mobileDrawerPrimaryNav.map((item) => {
                const Icon = item.icon
                const isActive = isPathActive(location.pathname, item.path)
                return (
                  <button key={item.key} type="button" onClick={() => { navigate(item.path); setSidebarOpen(false) }} className={cn('flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm transition', isActive ? activeNavItemClassName : inactiveNavItemClassName)}>
                    <span className={cn('grid h-9 w-9 place-items-center rounded-xl', isActive ? activeNavIconClassName : inactiveNavIconClassName)}>
                      <Icon className={cn('h-5 w-5', isActive ? '' : inactiveNavIconColorClassName)} />
                    </span>
                    <span className="font-semibold">{item.label}</span>
                  </button>
                )
              })}

              <Separator className="my-3" />

              <div className="rounded-2xl border border-border bg-card p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setDrawerSalesOpen((open) => !open)}
                  className={cn('flex w-full items-center justify-between rounded-[18px] px-2 py-2 text-sm transition', salesRouteActive ? activeNavItemClassName : inactiveNavItemClassName)}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn('grid h-9 w-9 place-items-center rounded-xl', salesRouteActive ? activeNavIconClassName : inactiveNavIconClassName)}>
                      <Receipt className={cn('h-5 w-5', salesRouteActive ? '' : inactiveNavIconColorClassName)} />
                    </span>
                    <span className="font-semibold">Sales</span>
                  </div>
                  <ChevronDown className={cn('h-5 w-5 transition-transform', drawerSalesOpen ? 'rotate-180' : '')} />
                </button>

                {drawerSalesOpen ? (
                  <div className="mt-1 space-y-1 pb-1 pl-2">
                    {salesPicker.map((item) => {
                      const Icon = item.icon
                      const isActive = isPathActive(location.pathname, getSalesPath(item.key))
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => handleSalesPick(item.key)}
                          className={cn('flex w-full items-center gap-3 rounded-2xl px-4 py-2 text-left text-sm transition', isActive ? activeNavItemClassName : inactiveNavItemClassName)}
                        >
                          <span className={cn('grid h-9 w-9 place-items-center rounded-xl', isActive ? activeNavIconClassName : inactiveNavIconClassName)}>
                            <Icon className={cn('h-5 w-5', isActive ? '' : inactiveNavIconColorClassName)} />
                          </span>
                          <span className="font-semibold">{item.label}</span>
                        </button>
                      )
                    })}
                  </div>
                ) : null}
              </div>

              {mobileDrawerUtilityNav.map((item) => {
                const Icon = item.icon
                const isActive = isPathActive(location.pathname, item.path)
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      navigate(item.path)
                      setSidebarOpen(false)
                    }}
                    className={cn('flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm transition', isActive ? activeNavItemClassName : inactiveNavItemClassName)}
                  >
                    <span className={cn('grid h-9 w-9 place-items-center rounded-xl', isActive ? activeNavIconClassName : inactiveNavIconClassName)}>
                      <Icon className={cn('h-5 w-5', isActive ? '' : inactiveNavIconColorClassName)} />
                    </span>
                    <span className="font-semibold">{item.label}</span>
                  </button>
                )
              })}

              <button type="button" onClick={() => handleMorePick('signout')} className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-3 py-2 text-sm shadow-sm transition hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-muted">
                    <LogOut className="h-5 w-5 text-foreground/80" />
                  </span>
                  <span className="font-semibold text-foreground">Sign Out</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          </SheetContent>
        </Sheet>

        <Sheet open={salesOpen} onOpenChange={setSalesOpen}>
          <SheetContent side="bottom" className="p-0">
            <div className="rounded-t-3xl">
              <SheetHeader className="surface-strong rounded-t-3xl px-5 py-4">
                <SheetTitle className="text-base font-black tracking-tight">Sales</SheetTitle>
              </SheetHeader>
              <div className="bg-muted/50 px-4 py-4">
                <div className="space-y-2">
                  {salesPicker.map((item) => {
                    const Icon = item.icon
                    return (
                      <button key={item.key} type="button" onClick={() => handleSalesPick(item.key)} className={cn('flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left shadow-sm transition hover:brightness-[0.99]', item.tint)}>
                        <div className="flex items-center gap-3">
                          <span className={cn('grid h-11 w-11 place-items-center rounded-2xl shadow-sm', item.iconBg)}>
                            <Icon className="h-6 w-6" />
                          </span>
                          <div>
                            <div className="text-sm font-bold text-foreground">{item.label}</div>
                            <div className="text-xs text-muted-foreground">Open</div>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </button>
                    )
                  })}
                </div>
                <div className="mt-4">
                  <Button variant="outline" className="w-full rounded-2xl border-border bg-card" onClick={() => setSalesOpen(false)}>Close</Button>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent side="bottom" className="p-0">
            <div className="rounded-t-3xl">
              <SheetHeader className="surface-strong rounded-t-3xl px-5 py-4">
                <SheetTitle className="text-base font-black tracking-tight">{APP_NAME}</SheetTitle>
              </SheetHeader>
              <div className="bg-muted/50 px-4 py-4">
                {moreGroups.map((group) => (
                  <div key={group.group} className="mb-4">
                    <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.group}</div>
                    <div className="space-y-2">
                      {group.items.map((item) => {
                        const Icon = item.icon
                        return (
                          <button key={item.key} type="button" onClick={() => handleMorePick(item.key)} className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-left shadow-sm transition hover:bg-muted/50">
                            <div className="flex items-center gap-3">
                              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-muted">
                                <Icon className="h-5 w-5 text-foreground/80" />
                              </span>
                              <div className="text-sm font-semibold text-foreground">{item.label}</div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full rounded-2xl border-border bg-card" onClick={() => setMoreOpen(false)}>Close</Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}
