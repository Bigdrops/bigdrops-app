import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useIsMobile } from '../hooks/useIsMobile'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { supabase } from '../supabase'
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  Wrench,
  Users,
  Settings,
  Menu,
  LogOut,
  ChevronRight,
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', path: '/',         icon: LayoutDashboard },
  { label: 'Invoices',  path: '/invoices', icon: FileText },
  { label: 'Quotations',path: '/quotations',icon: ClipboardList },
  { label: 'CSR',       path: '/csr',      icon: Wrench },
  { label: 'Clients',   path: '/clients',  icon: Users },
  { label: 'Settings',  path: '/settings', icon: Settings },
]

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
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group
            ${isActive
              ? 'bg-red-50 text-red-700 font-semibold border-l-[3px] border-red-600 pl-[9px]'
              : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800 border-l-[3px] border-transparent'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} className="shrink-0" />
              <span className="flex-1">{label}</span>
              {isActive && <ChevronRight size={14} className="opacity-40" />}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

function SidebarContent({ session, onNavigate }) {
  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-6 py-6 border-b border-neutral-100">
        <div className="text-red-600 font-bold text-xl tracking-tight">BIGDROPS</div>
        <div className="text-neutral-400 text-[11px] mt-0.5 tracking-wide">Business Management</div>
      </div>

      {/* Nav */}
      <NavItems onNavigate={onNavigate} />

      {/* Footer */}
      <div className="px-6 py-4 border-t border-neutral-100">
        <div className="text-neutral-400 text-[11px] mb-1 font-medium">Sun & Shield Power Solutions</div>
        <div className="text-neutral-400 text-[11px] mb-3 truncate">{session?.user?.email || ''}</div>
        <button
          onClick={async () => { await supabase.auth.signOut() }}
          className="flex items-center gap-2 text-red-600 text-xs font-semibold hover:text-red-700 transition-colors"
        >
          <LogOut size={13} />
          Sign Out
        </button>
      </div>
    </div>
  )
}

function DesktopSidebar({ session }) {
  return (
    <div className="fixed left-0 top-0 w-[240px] h-screen bg-white border-r border-neutral-100 shadow-[2px_0_8px_rgba(0,0,0,0.04)] flex flex-col z-20">
      <SidebarContent session={session} onNavigate={undefined} />
    </div>
  )
}

function MobileHeader({ title, session }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="sticky top-0 z-30 h-14 bg-white border-b border-neutral-100 flex items-center px-4 gap-3">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button className="p-1.5 rounded-md text-neutral-500 hover:bg-neutral-100 transition-colors">
            <Menu size={20} />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[260px] p-0">
          <SidebarContent session={session} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <h1 className="text-[15px] font-semibold text-neutral-800 flex-1 truncate">{title}</h1>
      <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center text-white text-xs font-bold shrink-0">
        A
      </div>
    </div>
  )
}

function DesktopHeader({ title }) {
  return (
    <div className="sticky top-0 z-10 h-[60px] bg-white border-b border-neutral-100 flex items-center px-8 justify-between">
      <h2 className="text-[16px] font-semibold text-neutral-900 tracking-tight">{title}</h2>
      <div className="w-[34px] h-[34px] rounded-full bg-neutral-900 flex items-center justify-center text-white text-[13px] font-semibold">
        A
      </div>
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
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-100 flex justify-around py-2 z-20">
      {items.map(({ label, path, icon: Icon }) => (
        <NavLink
          key={path}
          to={path}
          end={path === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px] px-2 pt-1 text-[10px] transition-colors
            ${isActive ? 'text-red-600' : 'text-neutral-400'}`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={20} strokeWidth={isActive ? 2.2 : 1.6} />
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  )
}

export default function Layout({ title, children, session }) {
  const isMobile = useIsMobile()

  return (
    <div className="flex min-h-screen bg-[#F7F7F5]">
      {!isMobile && <DesktopSidebar session={session} />}
      <div
        className="flex-1 flex flex-col"
        style={{ marginLeft: isMobile ? 0 : '240px' }}
      >
        {isMobile
          ? <MobileHeader title={title} session={session} />
          : <DesktopHeader title={title} />
        }
        <main className="flex-1 p-6 md:p-8" style={{ paddingBottom: isMobile ? '80px' : undefined }}>
          {children}
        </main>
      </div>
      {isMobile && <BottomNav />}
    </div>
  )
}