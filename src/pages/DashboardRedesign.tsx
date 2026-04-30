import * as React from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { useNavigate } from 'react-router-dom'

import Layout from '@/components/Layout'
import { DashboardOverview } from '@/components/dashboard/DashboardOverview'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
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

  const userName = session?.user?.user_metadata?.full_name?.split(' ')[0] || ''
  const businessName = settings?.company_name || 'Bigdrops Workspace'

  const handlePrioritySelect = React.useCallback(
    (item: PriorityItem) => {
      const pathByType: Record<string, string> = {
        project: '/projects',
        payment: '/invoices',
        quotation: '/quotations',
      }

      navigate(pathByType[item.type] || '/')
    },
    [navigate],
  )

  const handleRecentDocSelect = React.useCallback(
    (doc: RecentDoc) => {
      const pathByType = {
        Invoice: '/invoices',
        Quotation: '/quotations',
        CSR: '/csr',
        Waybill: '/waybills',
      } as const

      navigate(`${pathByType[doc.type]}/${doc.id}`)
    },
    [navigate],
  )

  return (
    <Layout
      session={session}
      title="Dashboard"
      hideMobileHomeHeader
      hidePageHeader
      contentClassName="bg-background pb-32"
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

      {createActions.length > 0 ? (
        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="fixed bottom-24 right-5 z-50 grid h-[52px] w-[52px] place-items-center rounded-[16px] bg-[hsl(var(--bd-fab-bg))] text-[hsl(var(--bd-fab-text))] shadow-2xl shadow-black/20 transition active:scale-90 md:hidden"
              aria-label="Create new record"
            >
              <Plus className="h-5 w-5" />
            </button>
          </SheetTrigger>

          <SheetContent
            side="bottom"
            className="h-[50vh] max-h-[50vh] overflow-hidden rounded-t-[30px] border-x-0 border-b-0 border-t border-border/80 p-0 outline-none"
          >
            <div className="flex h-full flex-col bg-card">
              <div className="px-5 pb-3 pt-3">
                <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border" />
                <SheetHeader className="space-y-0.5 px-0 pb-0 pt-0 text-left">
                  <SheetTitle className="text-[22px] font-black tracking-[-0.04em] text-foreground">
                    Create
                  </SheetTitle>
                </SheetHeader>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">
                <div className="grid gap-2.5">
                  {createActions.map((action) => {
                    const Icon = action.icon

                    return (
                      <button
                        key={action.id}
                        type="button"
                        onClick={() => {
                          navigate(action.path)
                          setCreateOpen(false)
                        }}
                        className="grid w-full grid-cols-[48px,minmax(0,1fr),auto] items-center gap-3 rounded-[20px] border border-border bg-background px-3.5 py-3.5 text-left shadow-sm transition active:scale-[0.99]"
                      >
                        <div
                          className={cn(
                            'grid h-12 w-12 place-items-center rounded-[16px] shadow-sm ring-1 ring-black/5',
                            action.iconBg,
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-[14px] font-bold tracking-[-0.02em] text-foreground">
                            {action.label}
                          </div>
                        </div>

                        <span className="grid h-8 w-8 place-items-center rounded-full bg-muted text-muted-foreground">
                          <ChevronRight className="h-4 w-4" />
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      ) : null}
    </Layout>
  )
}
