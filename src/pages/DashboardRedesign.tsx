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
import { UnifiedActionSheet } from '@/components/actions/UnifiedActionSheet'

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
      contentClassName="bg-background"
      data-bd-page="dashboard"
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

      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        className="fixed bottom-24 right-5 z-50 grid h-[52px] w-[52px] place-items-center rounded-[var(--bd-overlay-radius)] bg-[hsl(var(--bd-fab-bg))] text-[hsl(var(--bd-fab-text))] shadow-2xl shadow-black/20 transition active:scale-90 md:hidden"
        aria-label="Create new record"
      >
        <Plus className="h-5 w-5" />
      </button>

      {createActions.length > 0 ? (
        <UnifiedActionSheet
          open={createOpen}
          onOpenChange={setCreateOpen}
          title="Create"
          actions={createActions.map(action => ({
            key: action.id,
            label: action.label,
            icon: <action.icon />,
            onClick: () => {
              navigate(action.path)
              setCreateOpen(false)
            }
          }))}
          layout="list-compact"
        />
      ) : null}
    </Layout>
  )
}
