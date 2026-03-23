import { useMemo, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useIsMobile } from '../hooks/useIsMobile'
import { useSettings } from '../hooks/useSettings'
import { supabase } from '../supabase'
import { QUICK_TILE_REGISTRY, DEFAULT_QUICK_TILES } from '../config/quickTiles'
import {
  LayoutDashboard, FileText, ClipboardList, Wrench, Users,
  Settings, LogOut, FolderKanban, BarChart3, Grid2x2,
  Package, ChevronDown, Check, Building2, X, Menu
} from 'lucide-react'

// ── Navigation structure ─────────────────────────────────────────────────────
const navGroups = [
  {
    group: 'Dashboard',
    items: [
      { label: 'Home', path: '/', icon: LayoutDashboard, exact: true },
    ]
  },
  {
    group: 'Projects',
    items: [
      { label: 'Projects', path: '/projects', icon: FolderKanban },
    ]
  },
  {
    group: 'Sales',
    items: [
      { label: 'Invoices',   path: '/invoices',   icon: FileText },
      { label: 'Quotations', path: '/quotations', icon: ClipboardList },
      { label: 'CSR',        path: '/csr',        icon: Wrench },
      { label: 'Clients',    path: '/clients',    icon: Users },
    ]
  },
  {
    group: 'Inventory',
    placeholder: true,
    items: [
      { label: 'Inventory', path: '/inventory', icon: Package, disabled: true },
    ]
  },
  {
    group: 'Reports',
    placeholder: true,
    items: [
      { label: 'Reports', path: '/reports', icon: BarChart3 },
    ]
  },
]

// Bottom nav — 4 structural items only
const bottomNav = [
  { label: 'Home',     path: '/',         icon: LayoutDashboard, exact: true },
  { label: 'Projects', path: '/projects', icon: FolderKanban },
  { label: 'Reports',  path: '/reports',  icon: BarChart3 },
  { label: 'More',     icon: Grid2x2,     isMore: true },
]

// ── Sidebar nav item ─────────────────────────────────────────────────────────
function NavItem({ item, onNavigate }) {
  const Icon = item.icon
  if (item.disabled) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 cursor-not-allowed select-none">
        <Icon size={16} />
        <span className="flex-1">{item.label}</span>
        <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-300 px-1.5 py-0.5 rounded">Soon</span>
      </div>
    )
  }
  return (
    <NavLink
      to={item.path}
      end={item.exact}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
          isActive
            ? 'bg-slate-900 text-white font-semibold'
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
        }`
      }
    >
      <Icon size={16} />
      <span className="flex-1">{item.label}</span>
    </NavLink>
  )
}

// ── Sidebar content ──────────────────────────────────────────────────────────
function SidebarContent({ session, onNavigate, hideReports = false }) {
  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center font-black text-white text-sm">B</div>
          <div className="text-slate-900 font-bold text-sm tracking-tight uppercase">BIGDROPS</div>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {navGroups.map(({ group, items, placeholder }) => {
          const visibleItems = items.filter((item) => !(hideReports && item.path === '/reports'))
          if (visibleItems.length === 0) return null
          return (
          <div key={group}>
            <div className={`px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${placeholder ? 'text-slate-300' : 'text-slate-400'}`}>
              {group}
              {placeholder && (
                <span className="text-[8px] bg-slate-100 text-slate-300 px-1.5 py-0.5 rounded font-bold">SOON</span>
              )}
            </div>
            <div className="space-y-0.5">
              {visibleItems.map(item => (
                <NavItem key={item.path} item={item} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-slate-100 space-y-0.5">
        <NavLink
          to="/settings"
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
              isActive ? 'bg-slate-900 text-white font-semibold' : 'text-slate-500 hover:bg-slate-50'
            }`
          }
        >
          <Settings size={16} />
          <span>Settings</span>
        </NavLink>
        {session?.user?.email && (
          <div className="text-xs text-slate-400 truncate px-3 py-1">{session.user.email}</div>
        )}
        <button
          onClick={() => supabase.auth.signOut()}
          className="flex items-center gap-2 text-slate-400 text-xs hover:text-red-500 w-full px-3 py-2 transition-colors rounded-lg hover:bg-red-50"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </div>
  )
}

// ── Business switcher ────────────────────────────────────────────────────────
function BusinessSwitcher() {
  const { settings } = useSettings()
  const [open, setOpen] = useState(false)
  const activeName = settings?.company_name || 'Business profile not configured'

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-left"
      >
        <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center flex-shrink-0">
          <Building2 size={11} className="text-white" />
        </div>
        <div className="hidden sm:block min-w-0">
          <div className="text-xs font-semibold text-slate-700 leading-tight max-w-[150px] truncate">{activeName}</div>
        </div>
        <ChevronDown size={11} className="text-slate-400 hidden sm:block flex-shrink-0" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-t-2xl shadow-2xl pb-8"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle + close */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto" />
            </div>
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="text-sm font-bold text-slate-800">Current Business</div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <div className="px-4 py-2 space-y-1">
              <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
                    {(settings?.company_name || 'B').charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-800">{activeName}</div>
                    <div className="text-[11px] text-slate-400">
                      {settings?.company_name
                        ? 'Loaded from saved company settings'
                        : 'Set up your company identity in Settings'}
                    </div>
                  </div>
                  <Check size={15} className="shrink-0 text-slate-800" />
                </div>
              </div>
            </div>
            <div className="px-4 pt-1">
              <div className="w-full rounded-xl border border-dashed border-slate-200 px-3 py-3 text-sm text-slate-400">
                Multi-business switching is not configured for this workspace yet.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function QuickTileRail({ tiles }) {
  const navigate = useNavigate()
  const location = useLocation()
  const validTiles = useMemo(() => {
    let active = DEFAULT_QUICK_TILES
    try {
      const savedTiles = localStorage.getItem('quick_tiles')
      const parsed = savedTiles ? JSON.parse(savedTiles) : DEFAULT_QUICK_TILES
      if (Array.isArray(parsed)) active = parsed
    } catch {
      active = DEFAULT_QUICK_TILES
    }
    const allowed = new Set(active)
    return tiles.filter((id) => allowed.has(id) && QUICK_TILE_REGISTRY[id])
  }, [tiles])

  if (validTiles.length === 0) return null

  return (
    <div className="flex-1 min-w-0 overflow-hidden">
      <div
        className="flex items-center gap-2 overflow-x-auto px-1"
        style={{
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          scrollSnapType: 'x mandatory',
        }}
      >
        {validTiles.map((id) => {
          const tile = QUICK_TILE_REGISTRY[id]
          const isActive =
            location.pathname === tile.path ||
            (tile.path !== '/' && location.pathname.startsWith(tile.path))
          return (
            <button
              key={id}
              onClick={() => navigate(tile.path)}
              className="text-[13px] font-semibold whitespace-nowrap transition-all"
              style={{
                scrollSnapAlign: 'start',
                flexShrink: 0,
                paddingTop: '6px',
                paddingBottom: '6px',
                paddingLeft: '14px',
                paddingRight: '14px',
                borderRadius: '999px',
                cursor: 'pointer',
                backgroundColor: isActive ? '#0F172A' : 'transparent',
                color: isActive ? 'white' : '#64748B',
                border: isActive ? '1px solid #0F172A' : '1px solid transparent',
              }}
            >
              {tile.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Layout ──────────────────────────────────────────────────────────────
export default function Layout({ title, children, session, hidePageHeader = false, contentClassName = '' }) {
  const isMobile = useIsMobile()
  const location = useLocation()
  const isDashboard = location.pathname === '/'
  const [moreOpen, setMoreOpen] = useState(false)
  let activeTiles = DEFAULT_QUICK_TILES
  try {
    const savedTiles = localStorage.getItem('quick_tiles')
    const parsed = savedTiles ? JSON.parse(savedTiles) : DEFAULT_QUICK_TILES
    if (Array.isArray(parsed)) activeTiles = parsed
  } catch {
    activeTiles = DEFAULT_QUICK_TILES
  }

  if (isMobile) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 font-sans antialiased text-slate-900">

        {/* Mobile Header */}
        {isDashboard ? (
          <header className="sticky top-0 z-20 h-14 bg-white/90 backdrop-blur-md border-b border-slate-200 px-2 flex items-center gap-2">
            <button
              onClick={() => setMoreOpen(true)}
              className="w-9 h-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-700 shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu size={18} />
            </button>
            <QuickTileRail tiles={activeTiles} />
            <BusinessSwitcher />
          </header>
        ) : hidePageHeader ? null : (
          <header className="sticky top-0 z-20 h-14 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 flex items-center justify-between gap-3">
            <button
              onClick={() => setMoreOpen(true)}
              className="w-9 h-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-700 shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu size={18} />
            </button>
            <h1 className="text-sm font-bold text-slate-900 uppercase tracking-tight truncate">{title}</h1>
            <BusinessSwitcher />
          </header>
        )}

        {/* Mobile Content */}
        <main className={`flex-1 w-full mx-auto ${contentClassName || 'p-4 pb-24 max-w-5xl'}`}>
          {children}
        </main>

        {/* Mobile Bottom Nav */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around py-2 z-20 shadow-lg">
          {bottomNav.map((item) => {
            const Icon = item.icon
            if (item.isMore) {
              return (
                <button
                  key="more"
                  onClick={() => setMoreOpen(true)}
                  className="flex flex-col items-center gap-1 text-slate-400 px-4 py-1"
                >
                  <Icon size={20} strokeWidth={1.5} />
                  <span className="text-[10px] font-bold uppercase">More</span>
                </button>
              )
            }
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 px-4 py-1 ${isActive ? 'text-slate-900' : 'text-slate-400'}`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                    <span className="text-[10px] font-bold uppercase">{item.label}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </div>

        {/* More sheet — slides up full sidebar */}
        <div
          className={`fixed inset-0 z-40 transition-opacity duration-300 ${moreOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setMoreOpen(false)}
        />
        <div
          className="fixed left-0 top-0 z-50 h-screen w-[280px] bg-white"
          style={{
            boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
            transform: moreOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <button
            onClick={() => setMoreOpen(false)}
            className="absolute top-4 right-4 flex items-center justify-center"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#F1F5F9',
              color: '#64748B',
            }}
            aria-label="Close navigation drawer"
          >
            <X size={16} />
          </button>
          <SidebarContent session={session} onNavigate={() => setMoreOpen(false)} hideReports />
        </div>
      </div>
    )
  }

  // ── Desktop ────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900"
      style={{ display: 'grid', gridTemplateColumns: '240px 1fr' }}
    >
      <aside className="fixed left-0 top-0 w-60 h-full z-30">
        <SidebarContent session={session} />
      </aside>

      <div className="flex flex-col col-start-2">
        {hidePageHeader ? null : (
          <header className="sticky top-0 z-20 h-14 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 flex items-center justify-between">
            <h1 className="text-sm font-bold text-slate-900 uppercase tracking-tight">{title}</h1>
            <BusinessSwitcher />
          </header>
        )}
        <main className={`flex-1 w-full mx-auto ${contentClassName || 'p-8 max-w-5xl'}`}>
          {children}
        </main>
      </div>
    </div>
  )
}
