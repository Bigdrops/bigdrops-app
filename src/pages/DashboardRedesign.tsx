import * as React from 'react'
import { Menu, Zap } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { useNavigate } from 'react-router-dom'

import Layout, { MobileChromeContext } from '@/components/Layout'
import { DashboardOverview } from '@/components/dashboard/DashboardOverview'
import { GlobalSearch } from '@/components/layout/GlobalSearch'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useSettings } from '@/hooks/useSettings'
import { useDashboardData, type PriorityItem, type RecentDoc } from '@/hooks/useDashboardData'
import { cn } from '@/lib/utils'
import { getCreateActions, getQuickTiles, loadStoredQuickTiles } from '@/config/quickTiles'

export default function DashboardRedesign({ session }: { session: Session }) {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const mobileChrome = React.useContext(MobileChromeContext)
  const { loading, recentDocs, priorityItems, heroStats, summary } = useDashboardData()
  const [createOpen, setCreateOpen] = React.useState(false)

  const quickTiles = React.useMemo(() => getQuickTiles(loadStoredQuickTiles()), [])
  const createActions = React.useMemo(() => getCreateActions(), [])

  const userName = session?.user?.user_metadata?.full_name?.split(' ')[0] || 'there'
  const businessName = settings?.company_name || 'Bigdrops Workspace'

  const handleOpenMenu = React.useCallback(() => {
    if (mobileChrome && typeof mobileChrome.openSidebar === 'function') {
      mobileChrome.openSidebar()
      return
    }

    window.dispatchEvent(new Event('bigdrops:open-mobile-drawer'))
  }, [mobileChrome])

  const handlePrioritySelect = React.useCallback((item: PriorityItem) => {
    const pathByType: Record<string, string> = {
      project: '/projects',
      payment: '/invoices',
      quotation: '/quotations',
    }

    navigate(pathByType[item.type] || '/')
  }, [navigate])

  const handleRecentDocSelect = React.useCallback((doc: RecentDoc) => {
    const pathByType = {
      Invoice: '/invoices',
      Quotation: '/quotations',
      CSR: '/csr',
      Waybill: '/waybills',
    } as const

    navigate(`${pathByType[doc.type]}/${doc.id}`)
  }, [navigate])

  return (
    <Layout
      session={session}
      title="Dashboard"
      hideMobileHomeHeader
      hidePageHeader
      contentClassName="shell-surface-neutral pb-32"
    >
      <div className="sticky top-0 z-[60] border-b border-border/50 bg-background/85 px-4 py-3 backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleOpenMenu}
              className="h-10 w-10 shrink-0 rounded-[14px] border border-border/60 bg-card/80 shadow-sm"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="min-w-0">
              <div className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {businessName}
              </div>
              <div className="truncate text-sm font-black tracking-[-0.03em] text-foreground">
                Dashboard
              </div>
            </div>
          </div>

          <GlobalSearch />
        </div>
      </div>

      <div className="hidden border-b border-border/50 bg-background/70 px-8 py-4 backdrop-blur-xl md:block">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Dashboard
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              Neutral business overview aligned to the Bigdrops reference system.
            </div>
          </div>
          <div className="flex items-center gap-3">
            <GlobalSearch />
            <Button
              onClick={() => setCreateOpen(true)}
              className="h-10 rounded-full px-5 text-[11px] font-bold uppercase tracking-[0.16em]"
            >
              <Zap className="mr-2 h-4 w-4" />
              Quick create
            </Button>
          </div>
        </div>
      </div>

      <DashboardOverview
        businessName={businessName}
        userName={userName}
        loading={loading}
        heroStats={heroStats}
        summary={summary}
        quickTiles={quickTiles}
        priorityItems={priorityItems}
        recentDocs={recentDocs}
        onQuickAction={(path) => navigate(path)}
        onPrioritySelect={handlePrioritySelect}
        onRecentDocSelect={handleRecentDocSelect}
        onViewAllActivity={() => navigate('/invoices')}
      />

      {createActions.length > 0 && (
        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetTrigger asChild>
            <button className="fixed bottom-26 left-1/2 z-[50] flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-[24px] surface-strong shadow-2xl shadow-black/20 transition active:scale-90 md:hidden">
              <Zap className="h-7 w-7" />
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-[32px] border-none p-0 outline-none">
            <div className="bg-card px-6 pb-14 pt-3">
              <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-border" />
              <SheetHeader className="mb-7">
                <SheetTitle className="text-center text-2xl font-black tracking-[-0.04em]">
                  Quick create
                </SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-3 gap-4 md:grid-cols-4">
                {createActions.map((action) => {
                  const Icon = action.icon

                  return (
                    <button
                      key={action.id}
                      onClick={() => {
                        navigate(action.path)
                        setCreateOpen(false)
                      }}
                      className="group flex flex-col items-center gap-3 rounded-[22px] border border-border bg-background/70 px-3 py-4 transition hover:bg-muted/20 active:scale-95"
                    >
                      <div className={cn('flex h-14 w-14 items-center justify-center rounded-[20px] shadow-sm', action.iconBg)}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-center text-[11px] font-bold uppercase tracking-[0.14em] text-foreground">
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
