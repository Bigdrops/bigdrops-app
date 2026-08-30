import * as React from 'react'
import { Plus } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { useNavigate } from 'react-router-dom'

import Layout from '@/components/Layout'
import { DashboardOverview } from '@/components/dashboard/DashboardOverview'
import { useSettings } from '@/hooks/useSettings'
import { useLayoutMode } from '@/hooks/useLayoutMode'
import { useDashboardData, type RecentDoc } from '@/hooks/useDashboardData'
import { buildKpiCards, loadStoredKpiCards } from '@/config/kpiCards'
import { getCreateActions } from '@/config/quickTiles'
import type { UserThemePreference } from '@/hooks/useUserThemePreferences'

type DashboardRedesignProps = {
  session: Session
  preference: UserThemePreference
  saveThemePref: (updates: Partial<UserThemePreference>) => Promise<void>
}

export default function DashboardRedesign({ session, preference, saveThemePref }: DashboardRedesignProps) {
  const navigate = useNavigate()
  const { settings } = useSettings()
  const { widthClass } = useLayoutMode()
  const { loading, recentDocs, kpiStats } = useDashboardData()
  const [createOpen, setCreateOpen] = React.useState(false)

  const kpiCards = React.useMemo(() => buildKpiCards(kpiStats, loadStoredKpiCards()), [kpiStats])
  const createActions = React.useMemo(() => getCreateActions(), [])
  const createPanelWidthClass =
    widthClass === 'compact'
      ? 'w-[min(18rem,calc(100vw-1rem))]'
      : widthClass === 'medium'
        ? 'w-[min(19rem,calc(100vw-1.5rem))]'
        : 'w-[min(20rem,calc(100vw-2rem))]'

  React.useEffect(() => {
    if (!createOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCreateOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [createOpen])

  const userName = session?.user?.user_metadata?.full_name?.split(' ')[0] || ''
  const businessName = settings?.company_name || 'Bigdrops Workspace'

  const handleRecentDocSelect = React.useCallback(
    (doc: RecentDoc) => {
      const pathByType = {
        Invoice: '/invoices',
        Quotation: '/quotations',
        CSR: '/csr',
        Waybill: '/waybills',
        RFQ: '/rfqs',
        BOQ: '/boqs',
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
        userId={session.user.id}
        loading={loading}
        kpiCards={kpiCards}
        recentDocs={recentDocs}
        onRecentDocSelect={handleRecentDocSelect}
        onViewAllActivity={() => {}}
        preference={preference}
        saveThemePref={saveThemePref}
      />

      {createOpen && createActions.length > 0 ? (
        <>
        <div
            className="fixed inset-0 z-[45] bg-black/40"
            onClick={() => setCreateOpen(false)}
            aria-hidden="true"
          />

          <div
            role="dialog"
            aria-label="Create actions"
            className={`fixed bottom-[calc(82px+60px+env(safe-area-inset-bottom,0px))] right-4 z-50 rounded-[18px] border border-bd-overlay-border bg-bd-overlay-bg p-1.5 shadow-2xl lg:bottom-auto lg:top-[calc(4rem+60px)] lg:right-8 ${createPanelWidthClass}`}
          >
            <div className="bd-custom-scrollbar max-h-[min(24rem,calc(100dvh-12rem))] space-y-1 overflow-y-auto">
              {createActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    navigate(action.path)
                    setCreateOpen(false)
                  }}
                  className="flex w-full items-center gap-3 whitespace-nowrap rounded-xl border border-bd-surface-action-border bg-bd-surface-action px-3 py-2 text-left transition-all hover:bg-bd-surface-action-hover active:scale-[0.98]"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-bd-action-icon-bg text-bd-action-icon-text shadow-sm [&_svg]:h-3.5 [&_svg]:w-3.5">
                    <action.icon />
                  </span>
                  <span className="text-[12px] font-bold tracking-tight text-bd-surface-action-text">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}

      {/* V6 FAB: 50x50, radius 18px, right 16px, bottom calc(82px + safe-area) */}
      <button
        type="button"
        onClick={() => setCreateOpen((open) => !open)}
        aria-expanded={createOpen}
        aria-haspopup="true"
        className="fixed right-4 z-50 grid h-[50px] w-[50px] place-items-center rounded-[18px] text-white transition active:scale-90 lg:right-8 lg:top-24"
        style={{
          bottom: 'calc(82px + env(safe-area-inset-bottom, 0px))',
          background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))',
          boxShadow: '0 10px 24px color-mix(in srgb, hsl(var(--primary)) 40%, transparent)',
        }}
        aria-label="Create new record"
      >
        <Plus className="h-5 w-5" strokeWidth={2} />
      </button>
    </Layout>
  )
}
