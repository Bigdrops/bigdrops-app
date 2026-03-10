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

function SidebarContent({ session, onNavigate }) {
  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      <div className="px-6 py-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center font-black text-white text-lg shadow-sm">B</div>
          <div>
            <div className="text-slate-900 font-bold text-base tracking-tight leading-none">BIGDROPS</div>
            <div className="text-slate-400 text-[10px] tracking-widest uppercase mt-1">Enterprise</div>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group
              ${isActive ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`
            }
          >
            <Icon size={18} className="shrink-0" />
            <span className="flex-1">{label}</span>
            <ChevronRight size={14} className="opacity-0 group-hover:opacity-40 transition-opacity" />
          </NavLink>
        ))}
      </nav>

      <div className="p-4 mt-auto border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3 px-2 mb-4">
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 text-xs font-bold border-2 border-white shadow-sm">
            {session?.user?.email?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-slate-900 text-xs font-semibold truncate">{session?.user?.email?.split('@')[0]}</div>
            <div className="text-slate-400 text-[10px] truncate">Administrator</div>
          </div>
        </div>
        <button 
          onClick={async () => await supabase.auth.signOut()} 
          className="w-full flex items-center justify-center gap-2 py-2 text-slate-500 text-xs hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
        >
          <LogOut size={14} /> Log Out
        </button>
      </div>
    </div>
  )
}

export default function Layout({ title, children, session }) {
  const isMobile = useIsMobile()
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
      {!isMobile && (
        <aside className="fixed left-0 top-0 w-64 h-screen z-30">
          <SidebarContent session={session} />
        </aside>
      )}
      
      <div className={`flex-1 flex flex-col ${!isMobile ? 'ml-64' : ''}`}>
        {/* Simplified Header */}
        <header className="sticky top-0 z-20 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {isMobile && (
              <Sheet>
                <SheetTrigger asChild>
                  <button className="p-2 -ml-2 text-slate-500"><Menu size={20} /></button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-64 border-0">
                  <SidebarContent session={session} />
                </SheetContent>
              </Sheet>
            )}
            <h1 className="text-lg font-bold tracking-tight text-slate-900">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
             <div className="hidden md:block text-right">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</div>
                <div className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live System
                </div>
             </div>
          </div>
        </header>

        <main className={`flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto ${isMobile ? 'pb-24' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  )
}
