import * as React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  FolderKanban,
  Users,
  MoreHorizontal,
  Menu,
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
import { QUICK_TILE_REGISTRY, DEFAULT_QUICK_TILES } from '../config/quickTiles'
import { useSettings } from '../hooks/useSettings'
import { supabase } from '../supabase'

const APP_NAME = 'BIGDROPS'

const tabs = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'projects', label: 'Projects', icon: FolderKanban },
  { key: 'sales', label: 'Sales', icon: Receipt },
  { key: 'clients', label: 'Clients', icon: Users },
  { key: 'more', label: 'More', icon: MoreHorizontal },
]

const salesPicker = [
  { key: 'invoices',   label: 'Invoices',   icon: Receipt,       tint: 'bg-blue-50 border-blue-200',   iconBg: 'bg-blue-600' },
  { key: 'quotations', label: 'Quotations', icon: FileSignature, tint: 'bg-violet-50 border-violet-200', iconBg: 'bg-violet-600' },
  { key: 'csr',        label: 'CSR',        icon: ClipboardCheck, tint: 'bg-orange-50 border-orange-200', iconBg: 'bg-orange-600' },
  { key: 'waybills',   label: 'Waybills',   icon: Truck,          tint: 'bg-slate-50 border-slate-200',  iconBg: 'bg-slate-700' },
]

const moreGroups = [
  { group: 'Finance', items: [{ key: 'reports', label: 'Reports', icon: BarChart3 }] },
  { group: 'System', items: [{ key: 'settings', label: 'Settings', icon: Settings }, { key: 'signout', label: 'Sign Out', icon: LogOut }] },
]

const desktopNav = [
  { key: 'home', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'projects', label: 'Projects', icon: FolderKanban },
  { key: 'clients', label: 'Clients', icon: Users },
]

function getStoredQuickTiles() {
  try {
    const savedTiles = localStorage.getItem('quick_tiles')
    const parsed = savedTiles ? JSON.parse(savedTiles) : DEFAULT_QUICK_TILES
    return Array.isArray(parsed) ? parsed : DEFAULT_QUICK_TILES
  } catch {
    return DEFAULT_QUICK_TILES
  }
}

function getActiveTab(pathname) {
  if (pathname === '/') return 'home'
  if (pathname.startsWith('/projects')) return 'projects'
  if (pathname.startsWith('/clients')) return 'clients'
  if (pathname.startsWith('/invoices') || pathname.startsWith('/quotations') || pathname.startsWith('/csr') || pathname.startsWith('/waybills')) return 'sales'
  if (pathname.startsWith('/reports') || pathname.startsWith('/settings')) return 'more'
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
        <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-900 text-white">
          <Building2 className="h-3.5 w-3.5" />
        </span>
        <span className="max-w-[140px] truncate">{activeName}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
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
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-900 text-white">
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

export function QuickTileRail({ tiles }) {
  const navigate = useNavigate()
  const location = useLocation()
  const validTiles = React.useMemo(() => {
    const activeTiles = Array.isArray(tiles) && tiles.length > 0 ? tiles : getStoredQuickTiles()
    const allowed = new Set(activeTiles)
    return activeTiles.filter((id) => allowed.has(id) && QUICK_TILE_REGISTRY[id])
  }, [tiles])

  if (validTiles.length === 0) return null

  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {validTiles.map((id) => {
        const tile = QUICK_TILE_REGISTRY[id]
        const isActive = location.pathname === tile.path || (tile.path !== '/' && location.pathname.startsWith(tile.path))
        return (
          <button
            key={id}
            type="button"
            onClick={() => navigate(tile.path)}
            className={cn(
              'shrink-0 rounded-full border px-4 py-2 text-xs font-semibold shadow-sm transition',
              isActive ? 'border-slate-900 bg-slate-900 text-white' : 'border-border bg-card text-slate-700 hover:bg-muted/50',
            )}
          >
            {tile.label}
          </button>
        )
      })}
    </div>
  )
}

export default function Layout({ title, children, session, hidePageHeader = false, contentClassName = '' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const [salesOpen, setSalesOpen] = React.useState(false)
  const [moreOpen, setMoreOpen] = React.useState(false)
  const activeTab = getActiveTab(location.pathname)
  const isHome = location.pathname === '/'

  const handleSalesPick = (key) => {
    const pathByKey = {
      invoices: '/invoices',
      quotations: '/quotations',
      csr: '/csr',
      waybills: '/waybills',
    }
    setSalesOpen(false)
    navigate(pathByKey[key] || '/')
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

  const desktopContentClassName = contentClassName || 'mx-auto w-full max-w-5xl px-6 py-6'
  const mobileContentClassName = contentClassName || 'w-full px-4 pb-24 pt-4'

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
                      className={cn('flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm transition', isActive ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-700 hover:bg-muted/50')}
                    >
                      <span className={cn('grid h-9 w-9 place-items-center rounded-xl', isActive ? 'bg-white/10' : 'bg-muted')}>
                        <Icon className={cn('h-5 w-5', isActive ? 'text-white' : 'text-slate-700')} />
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
                          <Icon className="h-5 w-5 text-white" />
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
                            <Icon className="h-5 w-5 text-slate-700" />
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
              <div className="rounded-2xl border-l-4 border-l-blue-500 border border-border bg-card px-5 py-4 shadow-sm">
                <div className="text-lg font-bold text-foreground">{title}</div>
              </div>
            </div>
          ) : null}
          <div className={desktopContentClassName}>{children}</div>
        </main>
      </div>

      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="fixed left-3 top-3 z-50 grid h-10 w-10 place-items-center rounded-2xl border border-border bg-card shadow-sm"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5 text-slate-700" />
        </button>

        {!isHome && !hidePageHeader ? (
          <div className="w-full px-4 pt-4">
            <div className="rounded-2xl border-l-4 border-l-blue-500 border border-border bg-card px-5 py-4 shadow-sm">
              <div className="text-base font-bold text-foreground">{title}</div>
            </div>
          </div>
        ) : null}

        <main className={mobileContentClassName}>{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card">
          <div className="grid w-full grid-cols-5 px-2 py-2 shadow-[0_-10px_30px_-20px_rgba(15,23,42,0.35)]">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.key
              return (
                <button key={tab.key} type="button" onClick={() => onTabClick(tab.key)} className={cn('group flex flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 transition', isActive ? 'bg-slate-900/5' : 'hover:bg-muted/50')}>
                  <span className={cn('grid h-9 w-9 place-items-center rounded-2xl transition', isActive ? 'bg-slate-900 text-white shadow-sm' : 'bg-muted text-slate-700')}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className={cn('text-[11px] font-semibold', isActive ? 'text-foreground' : 'text-muted-foreground')}>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </nav>

        <div className={cn('fixed inset-0 z-50 transition-opacity duration-300', sidebarOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0')} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setSidebarOpen(false)} />
        <div className="fixed left-0 top-0 z-[60] h-dvh w-[280px] bg-background" style={{ boxShadow: '4px 0 24px rgba(0,0,0,0.15)', transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)' }}>
          <button type="button" onClick={() => setSidebarOpen(false)} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-muted text-muted-foreground" aria-label="Close navigation menu">
            <X className="h-5 w-5" />
          </button>

          <div className="px-5 pb-5 pt-6">
            <div className="text-sm font-black tracking-tight text-foreground">{APP_NAME}</div>
            <div className="mt-1 text-xs text-muted-foreground">Navigation</div>
          </div>

          <div className="space-y-2 px-4 pb-6">
            {desktopNav.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.key
              return (
                <button key={item.key} type="button" onClick={() => { onTabClick(item.key); setSidebarOpen(false) }} className={cn('flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm transition', isActive ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-700 hover:bg-muted/50')}>
                  <span className={cn('grid h-9 w-9 place-items-center rounded-xl', isActive ? 'bg-white/10' : 'bg-muted')}>
                    <Icon className={cn('h-5 w-5', isActive ? 'text-white' : 'text-slate-700')} />
                  </span>
                  <span className="font-semibold">{item.label}</span>
                </button>
              )
            })}

            <Separator className="my-3" />

            <button type="button" onClick={() => { setSidebarOpen(false); setSalesOpen(true) }} className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-3 py-2 text-sm shadow-sm transition hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-muted">
                  <Receipt className="h-5 w-5 text-slate-700" />
                </span>
                <span className="font-semibold text-foreground">Sales</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            <button type="button" onClick={() => { setSidebarOpen(false); setMoreOpen(true) }} className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-3 py-2 text-sm shadow-sm transition hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-muted">
                  <MoreHorizontal className="h-5 w-5 text-slate-700" />
                </span>
                <span className="font-semibold text-foreground">More</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        <Sheet open={salesOpen} onOpenChange={setSalesOpen}>
          <SheetContent side="bottom" className="p-0">
            <div className="rounded-t-3xl">
              <SheetHeader className="rounded-t-3xl bg-slate-900 px-5 py-4 text-white">
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
                            <Icon className="h-6 w-6 text-white" />
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
              <SheetHeader className="rounded-t-3xl bg-slate-900 px-5 py-4 text-white">
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
                                <Icon className="h-5 w-5 text-slate-700" />
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
