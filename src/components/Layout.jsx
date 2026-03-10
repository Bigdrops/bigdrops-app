import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useIsMobile } from '../hooks/useIsMobile'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { supabase } from '../supabase'
import { LayoutDashboard, FileText, ClipboardList, Wrench, Users, Settings, Menu, LogOut } from 'lucide-react'

const navItems = [
  { label: 'Home',       path: '/',          icon: LayoutDashboard },
  { label: 'Invoices',   path: '/invoices',  icon: FileText },
  { label: 'Quotations', path: '/quotations',icon: ClipboardList },
  { label: 'CSR',        path: '/csr',       icon: Wrench },
  { label: 'Clients',    path: '/clients',   icon: Users },
  { label: 'Settings',   path: '/settings',  icon: Settings },
]

function SidebarContent({ session, onNavigate }) {
  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      <div className="px-6 py-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center font-black text-white text-lg shadow-sm">B</div>
          <div className="text-slate-900 font-bold text-base tracking-tight uppercase">BIGDROPS</div>
        </div>
      </div>
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map(({ label, path, icon: Icon }) => (
          <NavLink key={path} to={path} end={path === '/'} onClick={onNavigate}
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${isActive ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Icon size={18} />
            <span className="flex-1">{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-slate-100">
        {session?.user?.email && (
          <div className="text-xs text-slate-400 truncate mb-2 px-2">{session.user.email}</div>
        )}
        <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-2 text-slate-400 text-xs hover:text-red-600 w-full px-2 py-2 transition-colors">
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </div>
  )
}

export default function Layout({ title, children, session }) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
        {/* Mobile Header */}
        <header className="sticky top-0 z-20 h-14 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 flex items-center gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <button className="p-1 text-slate-500"><Menu size={20} /></button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 border-0">
              <SidebarContent session={session} />
            </SheetContent>
          </Sheet>
          <h1 className="text-sm font-bold text-slate-900 uppercase tracking-tight">{title}</h1>
        </header>

        {/* Mobile Content */}
        <main className="flex-1 p-4 pb-24 w-full max-w-5xl mx-auto">
          {children}
        </main>

        {/* Mobile Bottom Nav */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around py-3 z-20 shadow-lg">
          {navItems.slice(0, 4).map(({ path, icon: Icon, label }) => (
            <NavLink key={path} to={path} end={path === '/'}
              className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>
              {({ isActive }) => (
                <>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                  <span className="text-[10px] font-bold uppercase">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    )
  }

  // Desktop — CSS Grid, no gap
  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900" style={{ display: 'grid', gridTemplateColumns: '256px 1fr' }}>
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 w-64 h-full z-30">
        <SidebarContent session={session} />
      </aside>

      {/* Main — starts exactly at col 2 */}
      <div className="flex flex-col col-start-2">
        <header className="sticky top-0 z-20 h-14 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 flex items-center">
          <h1 className="text-sm font-bold text-slate-900 uppercase tracking-tight">{title}</h1>
        </header>
        <main className="flex-1 p-8 w-full max-w-5xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
