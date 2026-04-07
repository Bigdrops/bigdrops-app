import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Menu,
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
import Layout, { MobileChromeContext } from '@/components/Layout'
import { GlobalSearch } from '@/components/layout/GlobalSearch'
import { getCreateActions, getQuickTiles, loadStoredQuickTiles } from '@/config/quickTiles'

export default function DashboardRedesign({ session }: { session: Session }) {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const mobileChrome = React.useContext(MobileChromeContext)
  const { loading, recentDocs, priorityItems, heroStats, summary } = useDashboardData()
  const [createOpen, setCreateOpen] = React.useState(false)

  // Use the verified quick-tile control model instead of hardcoded lists
  const quickTiles = React.useMemo(() => getQuickTiles(loadStoredQuickTiles()), [])
  const createActions = React.useMemo(() => getCreateActions(), [])

  const userName = session?.user?.user_metadata?.full_name?.split(' ')[0] || 'there'
  const businessName = settings?.company_name || 'Bigdrops Workspace'

  return (
    <Layout session={session} title="Dashboard" hideMobileHomeHeader hidePageHeader contentClassName="pb-32 bg-[#FBFBFA]">
      {/* 1. COMPACT PREMIUM HEADER - Restored Hamburger and moved search to Right-side area */}
      <div className="sticky top-0 z-40 bg-background/95 px-4 py-3 shadow-[0_1px_0_rgba(0,0,0,0.05)] backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            {/* Restored Hamburger Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => mobileChrome.openSidebar()}
              className="h-10 w-10 shrink-0 rounded-xl bg-muted/30 text-foreground active:scale-95"
              aria-label="Open navigation menu"
            >
              <Menu className="h-[22px] w-[22px]" />
            </Button>
            
            <div className="min-w-0">
              <span className="block truncate text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80">
                {businessName}
              </span>
              <h1 className="text-[17px] font-black tracking-[-0.03em] text-foreground">
                Hello, {userName}
              </h1>
            </div>
          </div>
          
          {/* Right-side Action Area - Shell-integrated global search */}
          <div className="flex items-center">
            <GlobalSearch />
          </div>
        </div>
      </div>

      <div className="space-y-6 px-4 pt-6 md:hidden">
        {/* 2. REFINED SUMMARY - Compact stats block without oversized dark hero */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[24px] border border-border/50 bg-card p-4.5 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-2">
              <div className="grid h-6 w-6 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                <TrendingUp className="h-3.5 w-3.5" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Collections</span>
            </div>
            <div className="mt-3">
              <div className="text-[22px] font-black tracking-[-0.03em] text-foreground">
                {formatNaira(heroStats.collections, { round: true })}
              </div>
              <div className="mt-0.5 text-xs font-medium text-muted-foreground/70">Month to date</div>
            </div>
          </div>
          <div className="rounded-[24px] border border-border/50 bg-card p-4.5 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-2">
              <div className="grid h-6 w-6 place-items-center rounded-full bg-amber-50 text-amber-600">
                <AlertCircle className="h-3.5 w-3.5" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Open Work</span>
            </div>
            <div className="mt-3">
              <div className="text-[22px] font-black tracking-[-0.03em] text-foreground">
                {heroStats.openWork}
              </div>
              <div className="mt-0.5 text-xs font-medium text-muted-foreground/70">{summary.pendingFollowUp} attention</div>
            </div>
          </div>
        </div>

        {/* 3. DYNAMIC QUICK TILES - Restored existing configuration logic */}
        <section>
          <div className="mb-4 px-1">
            <h2 className="text-[12px] font-black uppercase tracking-[0.18em] text-muted-foreground/80">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {quickTiles.map((tile) => {
              const Icon = tile.icon
              return (
                <button
                  key={tile.id}
                  onClick={() => navigate(tile.path)}
                  className={cn(
                    "group relative flex flex-col items-start gap-4 rounded-[28px] border border-border/40 p-5 transition-all active:scale-[0.97]",
                    "bg-card shadow-[0_8px_24px_rgba(0,0,0,0.04)]",
                    "hover:border-primary/20",
                    tile.tint
                  )}
                >
                  <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-md transition-transform group-active:scale-95", tile.iconBg)}>
                    <Icon className="h-5.5 w-5.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[16px] font-black tracking-[-0.02em] text-foreground">{tile.label}</div>
                    <div className="truncate text-xs font-medium text-muted-foreground/80">{tile.tileHint || tile.description}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* 4. NEEDS ATTENTION - Premium data list style */}
        {priorityItems.length > 0 && (
          <section>
            <div className="mb-4 flex items-center justify-between px-1">
              <h2 className="text-[12px] font-black uppercase tracking-[0.18em] text-muted-foreground/80">Follow Up Required</h2>
              <Badge variant="outline" className="rounded-full bg-rose-50/80 text-[10px] font-black tracking-tighter text-rose-700 border-rose-100/50">
                {priorityItems.length} TASK{priorityItems.length > 1 ? 'S' : ''}
              </Badge>
            </div>
            <div className="space-y-3">
              {priorityItems.map((item) => (
                <button 
                  key={item.key}
                  className="flex w-full items-center gap-4 rounded-[26px] border border-border/40 bg-card p-4 text-left transition active:scale-[0.98] shadow-sm"
                  onClick={() => navigate(item.type === 'project' ? `/projects` : '/invoices')}
                >
                  <div className={cn("h-2.5 w-2.5 shrink-0 rounded-full", item.dotClassName, "shadow-[0_0_8px_rgba(0,0,0,0.1)]")} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-black tracking-tight text-foreground">{item.title}</div>
                    <div className="truncate text-xs font-medium text-muted-foreground/70">{item.meta}</div>
                  </div>
                  <div className={cn("shrink-0 rounded-full border border-border/20 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider", item.badgeClassName)}>
                    {item.badgeLabel}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 5. RECENT ACTIVITY - Clean Apple-style list */}
        <section>
          <div className="mb-4 flex items-center justify-between px-1">
            <h2 className="text-[12px] font-black uppercase tracking-[0.18em] text-muted-foreground/80">Recent Records</h2>
            <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
          </div>
          <div className="overflow-hidden rounded-[28px] border border-border/40 bg-card shadow-sm">
            {recentDocs.map((doc, idx) => (
              <button
                key={`${doc.type}-${doc.id}`}
                onClick={() => navigate(`/${doc.type.toLowerCase() === 'csr' ? 'csr' : doc.type.toLowerCase() + 's'}/${doc.id}`)}
                className={cn(
                  "flex w-full items-center gap-4 px-5 py-4 text-left transition active:bg-muted/30",
                  idx !== recentDocs.length - 1 && "border-b border-border/30"
                )}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted/40 text-muted-foreground/80">
                  {doc.type === 'Invoice' ? <FileText className="h-5 w-5" /> :
                   doc.type === 'Quotation' ? <FileSignature className="h-5 w-5" /> :
                   doc.type === 'Waybill' ? <Truck className="h-5 w-5" /> :
                   <ClipboardCheck className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-black tracking-tight text-foreground">{doc.number}</div>
                  <div className="truncate text-xs font-medium text-muted-foreground/60">
                    {doc.client} • {new Date(doc.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[15px] font-bold tracking-tight text-foreground">
                    {doc.amount ? formatNaira(doc.amount, { round: true }) : 'Open'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* FAB - Using existing creation model for dynamic actions */}
      {createActions.length > 0 && (
        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetTrigger asChild>
            <button className="fixed bottom-26 left-1/2 z-[50] flex h-15 w-15 -translate-x-1/2 items-center justify-center rounded-[20px] bg-foreground text-background shadow-xl shadow-black/20 transition active:scale-90">
              <Zap className="h-7 w-7 fill-current" />
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-[32px] border-none p-0 outline-none">
            <div className="bg-card px-6 pb-12 pt-4">
              <div className="mx-auto mb-6 h-1.5 w-10 rounded-full bg-muted/80" />
              <SheetHeader className="mb-6">
                <SheetTitle className="text-center text-[22px] font-black tracking-tighter">Quick Record</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-3 gap-y-8">
                {createActions.map(action => {
                  const Icon = action.icon
                  return (
                    <button
                      key={action.id}
                      onClick={() => { navigate(action.path); setCreateOpen(false); }}
                      className="flex flex-col items-center gap-3"
                    >
                      <div className={cn("flex h-15 w-15 items-center justify-center rounded-[22px] text-white shadow-lg", action.iconBg)}>
                        <Icon className="h-6.5 w-6.5" />
                      </div>
                      <span className="text-[11px] font-black tracking-tight uppercase text-muted-foreground">{action.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </Layout>
  )
}
