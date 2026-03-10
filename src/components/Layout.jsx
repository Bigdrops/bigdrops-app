import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useIsMobile } from '../hooks/useIsMobile'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { supabase } from '../supabase'
import {
  LayoutDashboard, FileText, ClipboardList,
  Wrench, Users, Settings, Menu, LogOut, ChevronRight,
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard',  path: '/',          icon: LayoutDashboard },
  { label: 'Invoices',   path: '/invoices',  icon: FileText },
  { label: 'Quotations', path: '/quotations',icon: ClipboardList },
  { label: 'CSR',        path: '/csr',       icon: Wrench },
  { label: 'Clients',    path: '/clients',   icon: Users },
  { label: 'Settings',   path: '/settings',  icon: Settings },
]

const ACCENT = '#e94560'

function NavItems({ onNavigate }) {
  return (
    <nav className="flex-1 px-3 py-3 space-y-0.5">
      {navItems.map(({ label, path, icon: Icon }) => (
        <NavLink
          key={path}
          to={path}
          end={path === '/'}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group relative
            ${isActive ? 'text-white font-semibold' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute inset-0 rounded-xl" style={{ background: 'linear-gradient(90deg, rgba(233,69,96,0.3) 0%, rgba(233,69,96,0.05) 100%)', borderLeft: '3px solid #e94560' }} />
              )}
              <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} className="shrink-0 relative z-10" />
              <span className="flex-1 relative z-10">{label}</span>
              {isActive && <ChevronRight size={13} className="opacity-50 relative z-10" />}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

function SidebarContent({ session, onNavigate }) {
  return (
    <div className="flex flex-col h-full" style={{ background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-sm shadow-lg" style={{ background: 'linear-gradient(135deg, #e94560, #c62a47)' }}>B</div>
          <div>
            <div className="text-white font-bold text-base tracking-tight">BIGDROPS</div>
            <div className="text-white/30 text-[10px] tracking-widest uppercase">Business Suite</div>
          </div>
        </div>
      </div>
      <NavItems onNavigate={onNavigate} />
      <div className="px-5 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: 'linear-gradient(135deg, #e94560, #c62a47)' }}>
            {session?.user?.email?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white/70 text-[11px] truncate">{session?.user?.email || ''}</div>
            <div className="text-white/30 text-[10px]">Sun & Shield Power</div>
          </div>
        </div>
        <button onClick={async () => { await supabase.auth.signOut() }} className="flex items-center gap-2 text-white/40 text-xs hover:text-white/80 transition-colors">
          <LogOut size={13} />Sign Out
        </button>
      </div>
    </div>
  )
}

function MobileHeader({ title, session }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="sticky top-0 z-30 h-14 bg-white border-b border-neutral-100 flex items-center px-4 gap-3 shadow-sm">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button className="p-1.5 rounded-md text-neutral-500 hover:bg-neutral-100 transition-colors"><Menu size={20} /></button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[260px] p-0 border-0">
          <SidebarContent session={session} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <h1 className="text-[15px] font-bold text-neutral-800 flex-1 truncate">{title}</h1>
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow" style={{ background: 'linear-gradient(135deg, #e94560, #c62a47)' }}>
        {session?.user?.email?.[0]?.toUpperCase() || 'A'}
      </div>
    </div>
  )
}

function DesktopHeader({ title }) {
  return (
    <div className="sticky top-0 z-10 h-[60px] bg-white/80 backdrop-blur border-b border-neutral-100 flex items-center px-8 justify-between">
      <div>
        <div className="text-[10px] text-neutral-400 font-medium uppercase tracking-widest">BIGDROPS</div>
        <h2 className="text-[16px] font-bold text-neutral-900 tracking-tight leading-tight">{title}</h2>
      </div>
      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md" style={{ background: 'linear-gradient(135deg, #e94560, #c62a47)' }}>A</div>
    </div>
  )
}

function BottomNav() {
  const items = [
    { label: 'Home',     path: '/',         icon: LayoutDashboard },
    { label: 'Invoices', path: '/invoices', icon: FileText },
    { label: 'CSR',      path: '/csr',      icon: Wrench },
    { label: 'Clients',  path: '/clients',  icon: Users },
  ]
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-100 flex justify-around py-2 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      {items.map(({ label, path, icon: Icon }) => (
        <NavLink key={path} to={path} end={path === '/'}
          className={({ isActive }) => `flex flex-col items-center gap-0.5 min-w-[50px] min-h-[44px] px-2 pt-1 text-[10px] font-medium transition-colors ${isActive ? 'text-rose-600' : 'text-neutral-400'}`}>
          {({ isActive }) => (<><Icon size={20} strokeWidth={isActive ? 2.4 : 1.6} /><span>{label}</span></>)}
        </NavLink>
      ))}
    </div>
  )
}

export default function Layout({ title, children, session }) {
  const isMobile = useIsMobile()
  return (
    <div className="flex min-h-screen bg-[#F4F6FB]">
      {!isMobile && (
        <div className="fixed left-0 top-0 w-[240px] h-screen z-20 shadow-2xl">
          <SidebarContent session={session} />
        </div>
      )}
      <div className="flex-1 flex flex-col" style={{ marginLeft: isMobile ? 0 : '240px' }}>
        {isMobile ? <MobileHeader title={title} session={session} /> : <DesktopHeader title={title} />}
        <main className="flex-1 p-4 md:p-6" style={{ paddingBottom: isMobile ? '80px' : undefined }}>
          {children}
        </main>
      </div>
      {isMobile && <BottomNav />}
    </div>
  )
}
