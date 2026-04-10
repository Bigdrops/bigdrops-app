import * as React from 'react'
import { Zap } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { useNavigate } from 'react-router-dom'

import Layout from '@/components/Layout'
import { DashboardOverview } from '@/components/dashboard/DashboardOverview'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useSettings } from '@/hooks/useSettings'
import { useDashboardData, type PriorityItem, type RecentDoc } from '@/hooks/useDashboardData'
import { cn } from '@/lib/utils'
import { getCreateActions, getQuickTiles, loadStoredQuickTiles } from '@/config/quickTiles'

export default function DashboardRedesign({ session }: { session: Session }) {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const { loading, recentDocs, priorityItems, heroStats, summary } = useDashboardData()
  const [createOpen, setCreateOpen] = React.useState(false)

  const quickTiles = React.useMemo(() => getQuickTiles(loadStoredQuickTiles()), [])
  const createActions = React.useMemo(() => getCreateActions(), [])

  const userName = session?.user?.user_metadata?.full_name?.split(' ')[0] || 'there'
  const businessName = settings?.company_name || 'Bigdrops Workspace'

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
      contentClassName="w-full max-w-none pb-32 bg-background"
    >
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
            <button className="fixed bottom-24 right-[18px] z-[50] flex h-[54px] w-[54px] items-center justify-center rounded-[18px] bg-primary text-primary-foreground shadow-2xl shadow-black/20 transition active:scale-90 md:hidden">
              <Zap className="h-[22px] w-[22px]" />
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
