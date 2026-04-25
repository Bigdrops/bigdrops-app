import * as React from 'react'
import {
  BadgeCheck,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FileSignature,
  FileText,
  Truck,
  AlertCircle,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import MobileFab from '@/components/layout/MobileFab'
import { operationalEmptyStateClassName, operationalPanelClassName } from '@/components/ui/operational-card-styles'
import { SkeletonRow } from '@/components/loading/AppLoadingStates'
import { DashboardDesktopView } from '@/components/dashboard/DashboardDesktopView'
import Layout, { MobileChromeContext } from '../components/Layout'
import { getCreateActions, getQuickTiles, loadStoredQuickTiles } from '../config/quickTiles'
import { useDashboardData } from '@/hooks/useDashboardData'
import { formatNaira } from '@/lib/formatters/money'
import { formatStatusLabel } from '@/lib/formatters/status'

const naira = (amount) => formatNaira(amount, { round: true })

const typeStyle = {
  Invoice: { badge: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-600', icon: FileText, path: 'invoices' },
  Quotation: { badge: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-600', icon: FileSignature, path: 'quotations' },
  CSR: { badge: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-600', icon: ClipboardCheck, path: 'csr' },
  Waybill: { badge: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-700', icon: Truck, path: 'waybills' },
}


function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function getUserDisplayName(session) {
  const user = session?.user
  const metadata = user?.user_metadata || {}
  const candidates = [
    metadata.full_name,
    metadata.name,
    metadata.display_name,
    [metadata.first_name, metadata.last_name].filter(Boolean).join(' ').trim(),
  ].filter(Boolean)

  if (candidates.length > 0) return candidates[0]

  const emailName = user?.email?.split('@')[0]?.replace(/[._-]+/g, ' ')?.trim()
  if (emailName) return emailName.replace(/\b\w/g, (char) => char.toUpperCase())
  return 'there'
}

function getStatusStyle(status) {
  const label = formatStatusLabel(status, { fallback: 'open' })
  if (label === 'Paid' || label === 'Approved' || label === 'Delivered') return { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: BadgeCheck, label }
  if (label === 'Overdue' || label === 'Past due') return { badge: 'bg-red-50 text-red-700 border-red-200', icon: AlertCircle, label: 'Past Due' }
  if (label === 'In progress') return { badge: 'bg-slate-50 text-slate-700 border-slate-200', icon: Clock, label: 'In Progress' }
  if (label === 'Unpaid' || label === 'Open' || label === 'Dispatched') return { badge: 'bg-blue-50 text-blue-700 border-blue-200', icon: BadgeCheck, label }
  if (label === 'Partially paid') return { badge: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock, label: 'Partially Paid' }
  return { badge: 'bg-slate-50 text-slate-700 border-slate-200', icon: Clock, label }
}

function MobileDashboardView({
  userName,
  heroStats,
  quickTiles,
  priorityItems,
  loading,
  recentDocs,
  summary,
  createActions,
  createOpen,
  setCreateOpen,
  navigate,
}) {
  const mobileChrome = React.useContext(MobileChromeContext)

  return (
    <div className="md:hidden w-full overflow-x-hidden bg-[#f6f6f4] text-foreground">
      <div
        className="pb-6"
        style={{
          background:
            'radial-gradient(220px 220px at -30px 82%, rgba(255,255,255,.78), transparent 62%), radial-gradient(180px 180px at calc(100% + 20px) 32%, rgba(0,0,0,.96), transparent 62%), linear-gradient(180deg, #050607 0 255px, #f6f6f4 255px)',
        }}
      >
        <section className="px-4 pt-[18px] text-white">
          <div className="mb-[18px] flex items-center gap-3">
            <button
              type="button"
              onClick={() => mobileChrome.openSidebar()}
              aria-label="Open menu"
              className="grid h-[50px] w-[50px] shrink-0 place-items-center rounded-[18px] border border-white/10 bg-white/[0.05] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_24px_rgba(0,0,0,0.18)] backdrop-blur"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>

            <div className="min-w-0">
              <div className="mb-1 truncate text-[12px] font-bold uppercase tracking-[0.22em] text-white/60">
                Workspace
              </div>
              <h1 className="truncate text-2xl font-black tracking-[-0.04em] text-white">
                {getGreeting()}, {userName}
              </h1>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 px-4 min-[390px]:grid-cols-2">
          <article className="rounded-[24px] border border-black/10 bg-white px-4 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
            <label className="block text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#6d7a8f]">
              Collections
            </label>
            <strong className="mt-3 block text-[28px] font-black tracking-[-0.05em] text-[#111111]">
              {naira(heroStats.collections)}
            </strong>
            <span className="mt-2 block text-sm text-[#748197]">
              Tracking ahead of last month’s pace.
            </span>
          </article>

          <article className="rounded-[24px] border border-black/10 bg-white px-4 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
            <label className="block text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#6d7a8f]">
              Open work
            </label>
            <strong className="mt-3 block text-[28px] font-black tracking-[-0.05em] text-[#111111]">
              {heroStats.openWork}
            </strong>
            <span className="mt-2 block text-sm text-[#748197]">
              Track live records that still need follow-through.
            </span>
          </article>
        </section>
      </div>

      <div className="px-4 pt-6">
        <section className="space-y-3">
          <div className="px-1">
            <h2 className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#6c788d]">
              Quick actions
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2">
            {quickTiles.map((tile) => {
              const Icon = tile.icon
              return (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => navigate(tile.path)}
                  className={cn(
                    'relative overflow-hidden rounded-[26px] border p-[18px] text-left shadow-[0_20px_50px_rgba(0,0,0,0.08)] transition active:scale-[0.99]',
                    tile.tint
                  )}
                >
                  <span className="pointer-events-none absolute -left-5 -top-7 h-[120px] w-[120px] rounded-full bg-white/40" />
                  <span className={cn('relative z-[1] grid h-14 w-14 place-items-center rounded-[18px] shadow-sm', tile.iconBg)}>
                    <Icon className="h-6 w-6 text-white" />
                  </span>
                  <div className="relative z-[1] mt-5 text-[19px] font-black tracking-[-0.03em] text-foreground">
                    {tile.label}
                  </div>
                  <div className="relative z-[1] mt-1 text-sm leading-[1.45] text-muted-foreground">
                    {tile.tileHint || tile.description}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <section className="mt-6 space-y-3">
          <div className="px-1">
            <h2 className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#6c788d]">
              Priority follow-up
            </h2>
          </div>

          <div className="rounded-[30px] border border-black/10 bg-white/85 p-[18px] shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-2xl font-black tracking-[-0.05em] text-[#111111]">
                  {priorityItems.length || 0} reminders need action
                </h3>
                <p className="mt-1 text-sm leading-[1.45] text-[#6d7787]">
                  Use this space for stale project updates and invoice payments that still need to be recorded.
                </p>
              </div>
              <span className="inline-flex h-[34px] min-w-[76px] items-center justify-center rounded-full border border-black/10 bg-slate-50 px-3 text-xs font-bold text-[#111111]">
                Today
              </span>
            </div>

            <div className="grid gap-[10px]">
              {priorityItems.length === 0 ? (
                <div className="rounded-[20px] border border-black/5 bg-[#fafaf8] px-4 py-4 text-sm text-muted-foreground">
                  No reminders right now.
                </div>
              ) : (
                priorityItems.map((item) => (
                  <div
                    key={item.key}
                    className="grid grid-cols-[auto,1fr] gap-3 rounded-[20px] border border-black/5 bg-[#fafaf8] px-3.5 py-3.5 min-[390px]:grid-cols-[auto,1fr,auto] min-[390px]:items-center"
                  >
                    <span
                      className={cn('mt-1 h-3 w-3 rounded-full min-[390px]:mt-0', item.dotClassName, item.dotRingClassName)}
                    />
                    <div className="min-w-0">
                      <strong className="block text-[15px] leading-[1.25] text-[#111111]">
                        {item.title}
                      </strong>
                      <span className="block text-[13px] leading-[1.35] text-[#6e7787]">
                        {item.meta}
                      </span>
                    </div>
                    <span className={cn('mt-2 inline-flex h-8 w-fit min-w-[78px] items-center justify-center rounded-full border px-3 text-xs font-bold min-[390px]:mt-0', item.badgeClassName)}>
                      {item.badgeLabel}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 space-y-3">
          <div className="flex items-center justify-between gap-3 px-1">
            <h2 className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#6c788d]">
              Recent documents
            </h2>
          </div>

          <div className="grid gap-3">
            {loading ? (
              <div className="grid gap-3">
                {Array.from({ length: 4 }).map((_, idx) => (<SkeletonRow key={idx} />))}
              </div>
            ) : recentDocs.length === 0 ? (
              <div className={operationalEmptyStateClassName}>
                No recent documents yet.
              </div>
            ) : (
              recentDocs.map((doc) => {
                const type = typeStyle[doc.type]
                const status = getStatusStyle(doc.status)
                const amountText = doc.amount != null ? naira(doc.amount) : 'Open'

                return (
                  <button
                    key={`${doc.type}-${doc.id}`}
                    type="button"
                    onClick={() => navigate(doc.path)}
                    className={`${operationalPanelClassName} px-[18px] py-4 text-left transition hover:bg-muted/40`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <Badge variant="outline" className={cn('rounded-full', type.badge)}>
                            <span className={cn('mr-2 inline-block h-1.5 w-1.5 rounded-full', type.dot)} />
                            {doc.type}
                          </Badge>
                          <Badge variant="outline" className={cn('rounded-full', status.badge)}>
                            {status.label}
                          </Badge>
                        </div>

                        <div className="min-w-0 text-[18px] font-black leading-[1.2] tracking-[-0.03em] text-[#111111]">
                          {doc.number}
                        </div>

                        <div className="flex min-w-0 items-center justify-between gap-3">
                          <div className="min-w-0 flex-1 truncate text-[13px] text-[#748094]">
                            {doc.client} • {new Date(doc.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                            {doc.meta ? ` • ${doc.meta}` : ''}
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="block text-[16px] font-black tracking-[-0.03em] text-[#111111]">
                              {amountText}
                            </span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </section>

        <section className="mt-6 space-y-3 pb-2">
          <div className="flex items-center justify-between gap-3 px-1">
            <h2 className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#6c788d]">
              Snapshot
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-[14px] min-[390px]:grid-cols-2">
            <article className={`${operationalPanelClassName} bg-gradient-to-b from-rose-50/90 to-white/80 p-[18px]`}>
              <label className="block text-xs font-extrabold uppercase tracking-[0.18em] text-[#b33f4a]">
                Past Due
              </label>
              <strong className="mt-4 block text-[30px] font-black tracking-[-0.05em] text-[#111111]">
                {naira(summary.overdue)}
              </strong>
              <span className="mt-2 block text-sm leading-[1.45] text-[#747e8d]">
                No unpaid balance has crossed due date today.
              </span>
            </article>

            <article className={`${operationalPanelClassName} bg-gradient-to-b from-amber-50/90 to-white/80 p-[18px]`}>
              <label className="block text-xs font-extrabold uppercase tracking-[0.18em] text-[#ad770e]">
                Due this week
              </label>
              <strong className="mt-4 block text-[30px] font-black tracking-[-0.05em] text-[#111111]">
                {naira(summary.dueThisWeek)}
              </strong>
              <span className="mt-2 block text-sm leading-[1.45] text-[#747e8d]">
                Your receivables calendar is currently clear.
              </span>
            </article>

            <article className={`${operationalPanelClassName} bg-gradient-to-b from-emerald-50/90 to-white/80 p-[18px]`}>
              <label className="block text-xs font-extrabold uppercase tracking-[0.18em] text-[#0e8b5d]">
                Collected
              </label>
              <strong className="mt-4 block text-[30px] font-black tracking-[-0.05em] text-[#111111]">
                {naira(summary.thisMonthCollections)}
              </strong>
              <span className="mt-2 block text-sm leading-[1.45] text-[#747e8d]">
                Collection counter updates when payments are captured.
              </span>
            </article>

            <article className="rounded-[28px] border border-black/10 bg-white/85 p-[18px] shadow-[0_12px_30px_rgba(0,0,0,0.06)]">
              <label className="block text-xs font-extrabold uppercase tracking-[0.18em] text-[#6f7785]">
                Pending follow-up
              </label>
              <strong className="mt-4 block text-[30px] font-black tracking-[-0.05em] text-[#111111]">
                {priorityItems.length || summary.pendingFollowUp}
              </strong>
              <span className="mt-2 block text-sm leading-[1.45] text-[#747e8d]">
                Two projects and one payment need attention today.
              </span>
            </article>
          </div>
        </section>
      </div>

      {createActions.length > 0 ? (
        <>
          <MobileFab onClick={() => setCreateOpen(true)} ariaLabel="Create new" />

          <Sheet open={createOpen} onOpenChange={setCreateOpen}>
            <SheetContent side="bottom" className="h-[min(640px,84vh)] max-h-[84vh] overflow-hidden p-0">
              <div className="flex h-full flex-col rounded-t-[28px] bg-white">
                <div className="shrink-0">
                  <div className="mx-auto mt-2 h-[5px] w-[52px] rounded-full bg-[#d8deea]" />
                  <SheetHeader className="px-4 pb-3 pt-4 text-left">
                    <SheetTitle className="text-2xl font-black tracking-[-0.04em] text-[#111111]">
                      Create new
                    </SheetTitle>
                  </SheetHeader>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
                  <div className="grid gap-[10px]">
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
                          className="grid grid-cols-[52px,1fr,auto] items-center gap-3 rounded-[20px] border border-black/10 bg-[#fafcff] px-3.5 py-3.5 text-left"
                        >
                          <span className={cn('grid h-[52px] w-[52px] place-items-center rounded-[16px] text-white', action.iconBg)}>
                            <Icon className="h-6 w-6" />
                          </span>
                          <span>
                            <span className="block text-[15px] font-bold text-[#111111]">
                              {action.label}
                            </span>
                            <span className="block text-[13px] text-[#738096]">
                              {action.description}
                            </span>
                          </span>
                          <ChevronRight className="h-[18px] w-[18px] text-[#64748b]" />
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </>
      ) : null}
    </div>
  )
}


export default function Dashboard({ session }) {
  const navigate = useNavigate()

  const [quickAccessOpen, setQuickAccessOpen] = React.useState(false)
  const [createOpen, setCreateOpen] = React.useState(false)
  const { loading, recentDocs, recentProjects, priorityItems, heroStats, summary } = useDashboardData({ variant: 'classic' })

  const quickTiles = React.useMemo(() => getQuickTiles(loadStoredQuickTiles()), [])
  const createActions = React.useMemo(() => getCreateActions(), [])

  const userName = getUserDisplayName(session)
  const headline = `${getGreeting()}, ${userName}`

  return (
    <Layout title="Dashboard" session={session} hideMobileHomeHeader>
      <>
        <MobileDashboardView
          userName={userName}
          heroStats={heroStats}
          quickTiles={quickTiles}
          priorityItems={priorityItems}
          loading={loading}
          recentDocs={recentDocs}
          summary={summary}
          createActions={createActions}
          createOpen={createOpen}
          setCreateOpen={setCreateOpen}
          navigate={navigate}
        />

        <DashboardDesktopView
          headline={headline}
          loading={loading}
          quickTiles={quickTiles}
          recentDocs={recentDocs}
          recentProjects={recentProjects}
          summary={summary}
          quickAccessOpen={quickAccessOpen}
          onQuickTileClick={(path) => navigate(path)}
          onRecentDocSelect={(doc) => navigate(doc.path)}
          onReportClick={() => navigate('/reports')}
          onOpenQuickAccess={() => setQuickAccessOpen(true)}
          onQuickAccessOpenChange={setQuickAccessOpen}
          onProjectSelect={(project) => {
            navigate(`/projects/${project.id}`)
            setQuickAccessOpen(false)
          }}
        />
      </>
    </Layout>
  )
}
