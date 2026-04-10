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
    if (mobileChrome && typeof mobileChrome.openSidebar === 'function') {
      mobileChrome.openSidebar()
    } else {
      window.dispatchEvent(new Event('bigdrops:open-mobile-drawer'))
    }
  }

  return (
    <Layout
      session={session}
      title="Dashboard"
      hideMobileHomeHeader
      hidePageHeader
      contentClassName="pb-32 bg-background"
    >
      {/* 1. COMPACT PREMIUM MOBILE HEADER */}
      <div className="sticky top-0 z-[50] border-b border-border/40 bg-background/80 px-4 py-3 backdrop-blur-md md:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleOpenMenu}
              className="h-10 w-10 shrink-0 rounded-xl bg-muted/50 text-foreground/80 hover:bg-muted active:scale-95"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="min-w-0">
              <span className="block truncate text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80">
                {businessName}
              </span>
              <h1 className="text-base font-bold tracking-tight text-foreground">
                Dashboard
              </h1>
            </div>
          </div>

          <div className="flex items-center">
            <GlobalSearch />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] w-full px-4 pt-6 md:px-8 lg:px-12">
        {/* DESKTOP TOP BAR - REFINED */}
        <div className="mb-8 hidden items-center justify-between md:flex">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-primary" />
              {businessName}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
              Greetings, {userName}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <GlobalSearch />
            <Button
              onClick={() => setCreateOpen(true)}
              className="h-11 gap-2.5 rounded-2xl bg-foreground px-6 font-bold text-background transition-all hover:bg-foreground/90 active:scale-95 shadow-md"
            >
              <Zap className="h-4 w-4 fill-current" />
              Quick Action
            </Button>
          </div>
        </div>

        {/* MAIN COMPOSITION GRID */}
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12 lg:gap-14 xl:gap-20">
          
          {/* LEFT/MAIN COLUMN (Summary + Quick Actions) */}
          <div className="space-y-12 md:col-span-12 lg:col-span-8">
            
            {/* 2. REFINED SUMMARY AREA */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-8">
              <div className="group relative overflow-hidden rounded-[24px] border border-border/60 bg-card p-6 shadow-sm transition-all hover:shadow-md md:p-10">
                <div className="absolute right-0 top-0 h-40 w-40 -translate-y-8 translate-x-8 rounded-full bg-emerald-500/5 blur-3xl transition-all group-hover:bg-emerald-500/10" />
                <div className="relative flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-inner dark:bg-emerald-500/10">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Collections
                  </span>
                </div>
                <div className="relative mt-8">
                  <div className="text-3xl font-bold tracking-tight text-foreground md:text-5xl">
                    {formatNaira(heroStats.collections, { round: true })}
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <Badge variant="outline" className="h-5 border-emerald-100 bg-emerald-50/80 px-2 text-[10px] font-bold text-emerald-700">
                      MTD Revenue
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-[24px] border border-border/60 bg-card p-6 shadow-sm transition-all hover:shadow-md md:p-10">
                <div className="absolute right-0 top-0 h-40 w-40 -translate-y-8 translate-x-8 rounded-full bg-amber-500/5 blur-3xl transition-all group-hover:bg-amber-500/10" />
                <div className="relative flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/15 text-accent-foreground shadow-inner">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    In Focus
                  </span>
                </div>
                <div className="relative mt-8">
                  <div className="text-3xl font-bold tracking-tight text-foreground md:text-5xl">
                    {heroStats.openWork}
                  </div>
                  <div className="mt-2.5 text-sm font-medium text-muted-foreground">
                    {summary.pendingFollowUp || 0} urgent tasks remain
                  </div>
                </div>
              </div>
            </div>

            {/* 3. DYNAMIC QUICK TILES - GRID REFINEMENT */}
            <section className="space-y-6">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-[12px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Operation Centre
                  </h2>
                </div>
                {quickTiles.length > 0 && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/30">
                    Synced with settings
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {quickTiles.map((tile) => {
                  const Icon = tile.icon
                  return (
                    <button
                      key={tile.id}
                      onClick={() => navigate(tile.path)}
                      className={cn(
                        "group relative flex items-center gap-5 rounded-[24px] border border-border/50 p-5 transition-all active:scale-[0.98]",
                        "bg-card shadow-sm hover:border-primary/30 hover:shadow-md",
                        tile.tint
                      )}
                    >
                      <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-all group-hover:scale-105", tile.iconBg)}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 text-left">
                        <div className="truncate text-base font-bold tracking-tight text-foreground">
                          {tile.label}
                        </div>
                        <div className="truncate text-[11px] font-medium text-muted-foreground/70 group-hover:text-muted-foreground">
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
          <div className="space-y-12 md:col-span-12 lg:col-span-4 lg:sticky lg:top-10 self-start">
            
            {/* 4. NEEDS ATTENTION - HIGHER CONTRAST */}
            {priorityItems.length > 0 && (
              <section className="space-y-6">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-[12px] font-bold uppercase tracking-[0.2em] text-destructive">
                    Action Required
                  </h2>
                  <Badge className="rounded-full bg-destructive px-2 text-[10px] font-bold text-destructive-foreground">
                    {priorityItems.length}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {priorityItems.slice(0, 4).map((item) => (
                    <button
                      key={item.key}
                      className="group flex w-full items-center gap-4 rounded-[20px] border border-border/60 bg-card p-4 text-left transition hover:border-rose-200 hover:shadow-sm active:scale-[0.98] shadow-sm"
                      onClick={() => navigate(item.type === 'project' ? `/projects` : '/invoices')}
                    >
                      <div className={cn("h-2.5 w-2.5 shrink-0 rounded-full", item.dotClassName, "shadow-sm group-hover:scale-125 transition-transform")} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-bold tracking-tight text-foreground">{item.title}</div>
                        <div className="truncate text-[11px] font-medium text-muted-foreground/70">{item.meta}</div>
                      </div>
                      <div className={cn("shrink-0 rounded-full border border-border/30 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider", item.badgeClassName)}>
                        {item.badgeLabel}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* 5. RECENT ACTIVITY - CLEARER HIERARCHY */}
            <section className="space-y-6">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-[12px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Latest Updates
                </h2>
                <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 hover:text-foreground" onClick={() => navigate('/invoices')}>
                  Explorer <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
              <div className="overflow-hidden rounded-[24px] border border-border/60 bg-card shadow-sm">
                {recentDocs.length > 0 ? (
                  <div className="divide-y divide-border/30">
                    {recentDocs.slice(0, 6).map((doc) => (
                      <button
                        key={`${doc.type}-${doc.id}`}
                        onClick={() => navigate(`/${doc.type.toLowerCase() === 'csr' ? 'csr' : doc.type.toLowerCase() + 's'}/${doc.id}`)}
                        className="flex w-full items-center gap-4 px-6 py-4 text-left transition hover:bg-muted/30 active:bg-muted/50 group"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          {doc.type === 'Invoice' ? <FileText className="h-5 w-5" /> :
                          doc.type === 'Quotation' ? <FileSignature className="h-5 w-5" /> :
                          doc.type === 'Waybill' ? <Truck className="h-5 w-5" /> :
                          <ClipboardCheck className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[14px] font-bold tracking-tight text-foreground">{doc.number}</div>
                          <div className="truncate text-[11px] font-medium text-muted-foreground/60">
                            {doc.client} • {new Date(doc.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-[14px] font-bold tracking-tight text-foreground">
                            {doc.amount ? formatNaira(doc.amount, { round: true }) : 'Draft'}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-6 py-12 text-center text-muted-foreground/40">
                    <p className="text-xs font-semibold italic">No recent documents found</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* QUICK CREATE DIALOG (FAB on Mobile) */}
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
                <SheetTitle className="text-center text-2xl font-black tracking-tight">Quick Create</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-3 gap-y-10 md:grid-cols-4 lg:grid-cols-5 md:gap-y-12">
                {createActions.map(action => {
                  const Icon = action.icon
                  return (
                    <button
                      key={action.id}
                      onClick={() => { navigate(action.path); setCreateOpen(false); }}
                      className="group flex flex-col items-center gap-4 transition active:scale-95"
                    >
                      <div className={cn("flex h-16 w-16 items-center justify-center rounded-[28px] shadow-lg transition-transform group-hover:-translate-y-1", action.iconBg)}>
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
