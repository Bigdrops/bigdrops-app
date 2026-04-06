import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  FileText,
  Truck,
  ClipboardCheck,
  FileSignature,
  Users,
  FolderKanban,
  Zap,
} from 'lucide-react'
import { Session } from '@supabase/supabase-js'

import { useDashboardData, type RecentDoc, type PriorityItem } from '@/hooks/useDashboardData'
import { useSettings } from '@/hooks/useSettings'
import { formatNaira } from '@/lib/formatters/money'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import Layout from '@/components/Layout'
import { GlobalSearch } from '@/components/layout/GlobalSearch'

const quickActions = [
  { id: 'new-invoice', label: 'Invoice', path: '/invoices/new', icon: FileText, color: 'bg-blue-600' },
  { id: 'new-quote', label: 'Quotation', path: '/quotations/new', icon: FileSignature, color: 'bg-violet-600' },
  { id: 'new-waybill', label: 'Waybill', path: '/waybills/new', icon: Truck, color: 'bg-slate-700' },
  { id: 'new-csr', label: 'CSR', path: '/csr/new', icon: ClipboardCheck, color: 'bg-orange-600' },
  { id: 'new-client', label: 'Client', path: '/clients/new', icon: Users, color: 'bg-indigo-600' },
  { id: 'new-project', label: 'Project', path: '/projects/new', icon: FolderKanban, color: 'bg-emerald-600' },
]

export default function DashboardRedesign({ session }: { session: Session }) {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const { loading, recentDocs, priorityItems, heroStats, summary } = useDashboardData()
  const [createOpen, setCreateOpen] = React.useState(false)

  const userName = session?.user?.user_metadata?.full_name?.split(' ')[0] || 'there'
  const businessName = settings?.company_name || 'Bigdrops Workspace'

  return (
    <Layout session={session} title="Dashboard" hideMobileHomeHeader hidePageHeader contentClassName="pb-32">
      {/* Mobile Shell Header Replacement */}
      <div className="sticky top-0 z-40 bg-background/80 px-4 py-3 backdrop-blur-md md:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <span className="text-xl font-black italic tracking-tighter">B</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">{businessName}</span>
              </div>
              <h1 className="text-lg font-black tracking-tight text-foreground -mt-1">
                Hello, {userName}
              </h1>
            </div>
          </div>
          <GlobalSearch />
        </div>
      </div>

      <div className="space-y-8 px-4 pt-4 md:hidden">
        {/* Hero Section */}
        <section>
          <div className="relative overflow-hidden rounded-[32px] bg-[#111111] p-6 text-white shadow-2xl shadow-black/10">
            <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/5 blur-3xl" />
            <div className="absolute -bottom-12 -left-12 h-44 w-44 rounded-full bg-primary/10 blur-3xl" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <TrendingUp className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-white/50">Collections</span>
              </div>
              <div className="mt-4">
                <div className="text-[42px] font-black leading-none tracking-tighter">
                  {formatNaira(heroStats.collections, { round: true })}
                </div>
                <p className="mt-3 text-sm font-medium text-white/60">
                  You've captured {heroStats.collections > 0 ? 'steady' : 'new'} revenue this month.
                </p>
              </div>
              <div className="mt-6 flex gap-2">
                <Badge className="bg-white/10 text-white hover:bg-white/15 border-none px-3 py-1">MTD Peak</Badge>
                <Badge className="bg-primary/20 text-primary-foreground hover:bg-primary/25 border-none px-3 py-1">Live Update</Badge>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Actions Grid */}
        <section>
          <div className="mb-4 flex items-center justify-between px-1">
            <h2 className="text-[13px] font-black uppercase tracking-[0.2em] text-muted-foreground">Quick Action</h2>
            <Zap className="h-3.5 w-3.5 text-muted-foreground opacity-50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => navigate(action.path)}
                className="group flex flex-col items-start gap-4 rounded-[28px] border border-border/50 bg-card p-5 transition-all active:scale-[0.97] hover:bg-accent/5"
              >
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg", action.color)}>
                  <action.icon className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-base font-black tracking-tight text-foreground">{action.label}</div>
                  <div className="text-xs text-muted-foreground font-medium">Create new</div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Needs Attention / Priority */}
        {priorityItems.length > 0 && (
          <section>
            <div className="mb-4 flex items-center justify-between px-1">
              <h2 className="text-[13px] font-black uppercase tracking-[0.2em] text-muted-foreground">Need Attention</h2>
              <Badge variant="outline" className="rounded-full bg-rose-50 text-rose-700 border-rose-100 text-[10px] font-black">
                {priorityItems.length} Urgent
              </Badge>
            </div>
            <div className="space-y-3">
              {priorityItems.map((item) => (
                <div 
                  key={item.key}
                  className="flex items-center gap-4 rounded-[30px] border border-border/60 bg-card p-4 transition active:scale-[0.98]"
                  onClick={() => navigate(item.type === 'project' ? `/projects` : '/invoices')}
                >
                  <div className="relative shrink-0">
                    <div className={cn("h-3 w-3 rounded-full", item.dotClassName, "shadow-sm")} />
                    <div className={cn("absolute inset-0 h-3 w-3 animate-ping rounded-full opacity-40", item.dotClassName)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-black tracking-tight text-foreground">{item.title}</div>
                    <div className="truncate text-xs font-medium text-muted-foreground">{item.meta}</div>
                  </div>
                  <div className={cn("shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider", item.badgeClassName)}>
                    {item.badgeLabel}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recent Activity */}
        <section>
          <div className="mb-4 flex items-center justify-between px-1 text-muted-foreground">
            <h2 className="text-[13px] font-black uppercase tracking-[0.2em]">Recent Activity</h2>
            <ChevronRight className="h-4 w-4" />
          </div>
          <div className="divide-y divide-border/40 rounded-[32px] border border-border/50 bg-card overflow-hidden">
            {recentDocs.map((doc) => (
              <button
                key={`${doc.type}-${doc.id}`}
                onClick={() => navigate(`/${doc.type.toLowerCase()}s/${doc.id}`)}
                className="flex w-full items-center gap-4 px-5 py-5 text-left transition active:bg-muted/30"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
                  {doc.type === 'Invoice' ? <FileText className="h-5 w-5" /> :
                   doc.type === 'Quotation' ? <FileSignature className="h-5 w-5" /> :
                   doc.type === 'Waybill' ? <Truck className="h-5 w-5" /> :
                   <ClipboardCheck className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-black tracking-tight text-foreground">{doc.number}</div>
                  <div className="truncate text-xs font-medium text-muted-foreground">
                    {doc.client} • {new Date(doc.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[15px] font-black tracking-tight text-foreground">
                    {doc.amount ? formatNaira(doc.amount, { round: true }) : 'Open'}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-70">
                    {doc.status}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Fab for creation */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetTrigger asChild>
          <button className="fixed bottom-28 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-2xl shadow-primary/40 transition active:scale-90">
            <Plus className="h-8 w-8" />
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-[40px] border-none p-0 outline-none">
          <div className="bg-card px-6 pb-12 pt-4">
            <div className="mx-auto mb-8 h-1.5 w-12 rounded-full bg-muted/80" />
            <SheetHeader className="mb-8">
              <SheetTitle className="text-center text-2xl font-black tracking-tighter">Create New</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-y-8">
              {quickActions.map(action => (
                <button
                  key={action.id}
                  onClick={() => { navigate(action.path); setCreateOpen(false); }}
                  className="flex flex-col items-center gap-3"
                >
                  <div className={cn("flex h-16 w-16 items-center justify-center rounded-[24px] text-white shadow-xl", action.color)}>
                    <action.icon className="h-7 w-7" />
                  </div>
                  <span className="text-xs font-black tracking-tight">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </Layout>
  )
}
