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
  Zap,
} from 'lucide-react'
import type { Session } from '@supabase/supabase-js'

import { useDashboardData } from '@/hooks/useDashboardData'
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
  const { recentDocs, priorityItems, heroStats, summary } = useDashboardData()
  const [createOpen, setCreateOpen] = React.useState(false)

  // Use the verified quick-tile control model instead of hardcoded lists
  const quickTiles = React.useMemo(() => getQuickTiles(loadStoredQuickTiles()), [])
  const createActions = React.useMemo(() => getCreateActions(), [])

  const userName = session?.user?.user_metadata?.full_name?.split(' ')[0] || 'there'
  const businessName = settings?.company_name || 'Bigdrops Workspace'

  const handleOpenMenu = () => {
    if (typeof mobileChrome?.openSidebar === 'function') {
      mobileChrome.openSidebar()
      return
    }
    window.dispatchEvent(new Event('bigdrops:open-mobile-drawer'))
  }

  return (
    <Layout
      session={session}
      title="Dashboard"
      hideMobileHomeHeader
      hidePageHeader
      contentClassName="pb-32 bg-[#F8F8F7]"
    >
      {/* 1. COMPACT PREMIUM MOBILE HEADER */}
      <div className="sticky top-0 z-[45] bg-background/90 px-4 py-3 shadow-sm backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleOpenMenu}
              className="h-9 w-9 shrink-0 rounded-xl bg-muted/40 text-foreground active:scale-95"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="min-w-0">
              <span className="block truncate text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80">
                {businessName}
              </span>
              <h1 className="text-[17px] font-black tracking-[-0.03em] text-foreground">
                Hello, {userName}
              </h1>
            </div>
          </div>

          <div className="flex items-center">
            <GlobalSearch />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] w-full px-4 pt-6 md:px-8 lg:px-12">
        {/* DESKTOP TOP BAR */}
        <div className="mb-8 hidden items-center justify-between md:flex">
          <div className="min-w-0">
            <div className="mb-1 text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground/60">
              {businessName}
            </div>
            <h1 className="text-3xl font-black tracking-tight text-foreground lg:text-4xl">
              Hello, {userName}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <GlobalSearch />
            <Button
              onClick={() => setCreateOpen(true)}
              className="h-11 gap-2 rounded-2xl bg-foreground px-5 font-bold text-background transition hover:bg-foreground/90 active:scale-95"
            >
              <Zap className="h-4 w-4 fill-current" />
              Quick Create
            </Button>
          </div>
        </div>

        {/* MAIN COMPOSITION GRID */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12 lg:gap-10">
          {/* LEFT/MAIN COLUMN (Summary + Quick Actions) */}
          <div className="space-y-8 md:col-span-12 lg:col-span-8">
            {/* 2. REFINED SUMMARY */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-2 lg:gap-6">
              <div className="group rounded-[32px] border border-border/60 bg-card p-5 shadow-sm transition-all hover:border-primary/20 hover:shadow-md md:p-6 lg:p-8">
                <div className="flex items-center gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                    Collections
                  </span>
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-black tracking-tight text-foreground md:text-3xl lg:text-4xl">
                    {formatNaira(heroStats.collections, { round: true })}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-muted-foreground/70">
                    <span>Month to date</span>
                    <Badge variant="outline" className="h-5 border-emerald-100 bg-emerald-50/50 text-[10px] text-emerald-700">
                      Top Performer
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="group rounded-[32px] border border-border/60 bg-card p-5 shadow-sm transition-all hover:border-primary/20 hover:shadow-md md:p-6 lg:p-8">
                <div className="flex items-center gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                    Open Work
                  </span>
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-black tracking-tight text-foreground md:text-3xl lg:text-4xl">
                    {heroStats.openWork}
                  </div>
                  <div className="mt-1 text-sm font-medium text-muted-foreground/70">
                    {summary.pendingFollowUp || 0} items need your attention
                  </div>
                </div>
              </div>
            </div>

            {/* 3. DYNAMIC QUICK TILES */}
            <section>
              <div className="mb-5 flex items-center justify-between px-2">
                <h2 className="text-[12px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">
                  Quick Actions
                </h2>
                {quickTiles.length > 4 && (
                  <span className="text-[11px] font-bold text-muted-foreground/40 hidden md:block">
                    Respecting verified settings
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                {quickTiles.map((tile) => {
                  const Icon = tile.icon
                  return (
                    <button
                      key={tile.id}
                      onClick={() => navigate(tile.path)}
                      className={cn(
                        "group relative flex flex-col items-start gap-4 rounded-[32px] border border-border/60 p-6 transition-all active:scale-[0.97]",
                        "bg-card shadow-sm hover:border-primary/20 hover:shadow-md",
                        tile.tint
                      )}
                    >
                      <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md transition-transform group-hover:-translate-y-1 group-active:scale-95", tile.iconBg)}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 text-left">
                        <div className="truncate text-lg font-black tracking-[-0.02em] text-foreground">
                          {tile.label}
                        </div>
                        <div className="truncate text-xs font-semibold text-muted-foreground/70">
                          {tile.tileHint || tile.description}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN (Activity + Attention) */}
          <div className="space-y-8 md:col-span-12 lg:col-span-4">
            {/* 4. NEEDS ATTENTION */}
            {priorityItems.length > 0 && (
              <section>
                <div className="mb-5 flex items-center justify-between px-2">
                  <h2 className="text-[12px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">
                    Priority Attention
                  </h2>
                  <Badge variant="outline" className="rounded-full bg-rose-50/80 text-[10px] font-black border-rose-100/50 text-rose-700">
                    {priorityItems.length}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {priorityItems.map((item) => (
                    <button
                      key={item.key}
                      className="flex w-full items-center gap-4 rounded-[28px] border border-border/60 bg-card p-4 text-left transition hover:border-rose-200/50 active:scale-[0.98] shadow-sm"
                      onClick={() => navigate(item.type === 'project' ? `/projects` : '/invoices')}
                    >
                      <div className={cn("h-3 w-3 shrink-0 rounded-full", item.dotClassName, "shadow-sm")} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-black tracking-tight text-foreground">{item.title}</div>
                        <div className="truncate text-xs font-medium text-muted-foreground/70">{item.meta}</div>
                      </div>
                      <div className={cn("shrink-0 rounded-full border border-border/30 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider", item.badgeClassName)}>
                        {item.badgeLabel}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* 5. RECENT ACTIVITY */}
            <section>
              <div className="mb-5 flex items-center justify-between px-2">
                <h2 className="text-[12px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">
                  Recent Records
                </h2>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
              </div>
              <div className="overflow-hidden rounded-[32px] border border-border/60 bg-card shadow-sm">
                {recentDocs.length > 0 ? (
                  recentDocs.map((doc, idx) => (
                    <button
                      key={`${doc.type}-${doc.id}`}
                      onClick={() => navigate(`/${doc.type.toLowerCase() === 'csr' ? 'csr' : doc.type.toLowerCase() + 's'}/${doc.id}`)}
                      className={cn(
                        "flex w-full items-center gap-4 px-6 py-5 text-left transition hover:bg-muted/40 active:bg-muted/60",
                        idx !== recentDocs.length - 1 && "border-b border-border/40"
                      )}
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground/80">
                        {doc.type === 'Invoice' ? <FileText className="h-5.5 w-5.5" /> :
                         doc.type === 'Quotation' ? <FileSignature className="h-5.5 w-5.5" /> :
                         doc.type === 'Waybill' ? <Truck className="h-5.5 w-5.5" /> :
                         <ClipboardCheck className="h-5.5 w-5.5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-black tracking-tight text-foreground">{doc.number}</div>
                        <div className="truncate text-xs font-semibold text-muted-foreground/60">
                          {doc.client} • {new Date(doc.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-[15px] font-bold tracking-tight text-foreground">
                          {doc.amount ? formatNaira(doc.amount, { round: true }) : 'Open'}
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-6 py-12 text-center text-muted-foreground/60">
                    <div className="mb-2 flex justify-center opacity-20">
                      <FileText className="h-10 w-10" />
                    </div>
                    <p className="text-xs font-medium">No recent activity found</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* FAB (Mobile Only) / Create Dialog (Desktop compatible Sheet) */}
      {createActions.length > 0 && (
        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetTrigger asChild>
            <button className="fixed bottom-26 left-1/2 z-[50] flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-[24px] bg-foreground text-background shadow-2xl shadow-black/20 transition active:scale-90 md:hidden">
              <Zap className="h-8 w-8 fill-current" />
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-[40px] border-none p-0 outline-none max-h-[85vh] overflow-y-auto">
            <div className="bg-card px-6 pb-16 pt-3 md:pb-12">
              <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-muted/60" />
              <SheetHeader className="mb-8">
                <SheetTitle className="text-center text-2xl font-black tracking-tight lg:text-3xl">Quick Create</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-3 gap-y-10 md:grid-cols-4 md:gap-y-12">
                {createActions.map(action => {
                  const Icon = action.icon
                  return (
                    <button
                      key={action.id}
                      onClick={() => { navigate(action.path); setCreateOpen(false); }}
                      className="group flex flex-col items-center gap-4 transition active:scale-95"
                    >
                      <div className={cn("flex h-16 w-16 items-center justify-center rounded-[28px] text-white shadow-lg transition-transform group-hover:-translate-y-1", action.iconBg)}>
                        <Icon className="h-7 w-7" />
                      </div>
                      <span className="text-[11px] font-black tracking-tight uppercase text-muted-foreground/80 group-hover:text-foreground">
                        {action.label}
                      </span>
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
