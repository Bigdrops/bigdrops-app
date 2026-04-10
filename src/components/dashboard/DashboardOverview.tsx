import {
  AlertCircle,
  ArrowRight,
  ChevronRight,
  ClipboardCheck,
  FileSignature,
  Receipt,
  TrendingUp,
  Truck,
} from 'lucide-react'
import type { ComponentType } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatNaira } from '@/lib/formatters/money'
import { formatStatusLabel } from '@/lib/formatters/status'
import { formatDisplayDate } from '@/lib/formatters/date'
import { cn } from '@/lib/utils'
import type { PriorityItem, RecentDoc } from '@/hooks/useDashboardData'

type QuickTile = {
  id: string
  label: string
  path: string
  icon: ComponentType<{ className?: string }>
  description: string
  tileHint?: string
  tint: string
  iconBg: string
}

type DashboardOverviewProps = {
  businessName: string
  userName: string
  loading: boolean
  heroStats: {
    collections: number
    openWork: number
    awaitingPaymentCount: number
    inTransitWaybills: number
  }
  summary: {
    overdue: number
    dueThisWeek: number
    pendingFollowUp: number
  }
  quickTiles: QuickTile[]
  priorityItems: PriorityItem[]
  recentDocs: RecentDoc[]
  onQuickAction: (path: string) => void
  onPrioritySelect: (item: PriorityItem) => void
  onRecentDocSelect: (doc: RecentDoc) => void
  onViewAllActivity: () => void
}

const metricCards = [
  {
    key: 'collections',
    label: 'Collections',
    value: (heroStats: DashboardOverviewProps['heroStats']) => formatNaira(heroStats.collections, { round: true }),
    helper: 'Month to date',
    foot: (summary: DashboardOverviewProps['summary']) =>
      summary.dueThisWeek > 0 ? `${formatNaira(summary.dueThisWeek, { round: true })} due this week` : 'Receivables calendar is clear',
    panelClassName: 'tone-success-panel',
    iconClassName: 'tone-success-icon',
    Icon: TrendingUp,
  },
  {
    key: 'open-work',
    label: 'Open work',
    value: (heroStats: DashboardOverviewProps['heroStats']) => String(heroStats.openWork),
    helper: 'Active items',
    foot: (summary: DashboardOverviewProps['summary']) =>
      `${summary.pendingFollowUp || 0} need immediate review`,
    panelClassName: 'tone-warning-panel',
    iconClassName: 'tone-warning-icon',
    Icon: AlertCircle,
  },
  {
    key: 'invoices',
    label: 'Invoices',
    value: (heroStats: DashboardOverviewProps['heroStats']) => String(heroStats.awaitingPaymentCount),
    helper: 'Awaiting payment',
    foot: (summary: DashboardOverviewProps['summary']) =>
      summary.overdue > 0 ? `${formatNaira(summary.overdue, { round: true })} overdue` : 'No overdue balances right now',
    panelClassName: 'tone-info-panel',
    iconClassName: 'tone-info-icon',
    Icon: Receipt,
  },
  {
    key: 'dispatch',
    label: 'Dispatch',
    value: (heroStats: DashboardOverviewProps['heroStats']) => String(heroStats.inTransitWaybills),
    helper: 'Waybills in transit',
    foot: () => 'Live from current delivery records',
    panelClassName: 'tone-data-panel',
    iconClassName: 'tone-data-icon',
    Icon: Truck,
  },
] as const

const recentDocMeta = {
  Invoice: {
    icon: Receipt,
    iconWrap: 'tone-info-panel',
  },
  Quotation: {
    icon: FileSignature,
    iconWrap: 'tone-accent-panel',
  },
  CSR: {
    icon: ClipboardCheck,
    iconWrap: 'tone-warning-panel',
  },
  Waybill: {
    icon: Truck,
    iconWrap: 'tone-data-panel',
  },
} as const

function getStatusBadgeClassName(status: string) {
  const value = String(status || '').toLowerCase()

  if (value === 'overdue' || value === 'rejected') {
    return 'border-destructive/20 bg-destructive/10 text-destructive'
  }

  if (value === 'accepted' || value === 'delivered' || value === 'completed' || value === 'paid') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }

  if (value === 'sent' || value === 'dispatched') {
    return 'border-blue-200 bg-blue-50 text-blue-700'
  }

  if (value === 'pending' || value === 'draft') {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }

  return 'border-border bg-muted/60 text-muted-foreground'
}

function formatDocSubline(doc: RecentDoc) {
  const dateText = formatDisplayDate(doc.date, {
    fallback: 'No date',
    locale: 'en-GB',
    dateOptions: { month: 'short', day: 'numeric' },
  })

  return [doc.client, dateText, doc.meta].filter(Boolean).join(' • ')
}

export function DashboardOverview({
  businessName,
  userName,
  loading,
  heroStats,
  summary,
  quickTiles,
  priorityItems,
  recentDocs,
  onQuickAction,
  onPrioritySelect,
  onRecentDocSelect,
  onViewAllActivity,
}: DashboardOverviewProps) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-32 pt-4 md:px-8 md:pb-12 md:pt-6">
      <section className="sticky top-[72px] z-30 -mx-4 border-b border-border/50 bg-[linear-gradient(180deg,hsl(var(--background))_0%,color-mix(in_oklab,hsl(var(--background))_88%,transparent)_82%,transparent_100%)] px-4 pb-4 pt-2 backdrop-blur-xl md:static md:mx-0 md:border-none md:bg-transparent md:px-0 md:pb-0 md:pt-0">
        <div className="rounded-[26px] border border-border/70 bg-card/95 p-4 shadow-sm md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {businessName}
              </div>
              <h1 className="mt-1 text-[26px] font-black tracking-[-0.05em] text-foreground md:text-[30px]">
                Good morning, {userName}
              </h1>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Operations overview across sales, projects, and logistics.
              </p>
            </div>
            <div className="hidden rounded-full border border-border bg-muted/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground md:block">
              Live dashboard
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {metricCards.map((metric) => {
          const Icon = metric.Icon

          return (
            <article
              key={metric.key}
              className={cn(
                'rounded-[22px] border p-4 shadow-sm transition-transform hover:-translate-y-0.5',
                metric.panelClassName
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className={cn('grid h-9 w-9 place-items-center rounded-[14px]', metric.iconClassName)}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  {metric.label}
                </div>
              </div>
              <div className="mt-5 text-[28px] font-black tracking-[-0.06em] text-foreground md:text-[30px]">
                {metric.value(heroStats)}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{metric.helper}</div>
              <div className="mt-2 text-xs text-muted-foreground/90">{metric.foot(summary)}</div>
            </article>
          )
        })}
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="space-y-6">
          <section className="rounded-[26px] border border-border bg-card p-4 shadow-sm md:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Quick actions
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Real shortcuts synced with your saved dashboard tiles.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-2">
              {quickTiles.map((tile) => {
                const Icon = tile.icon

                return (
                  <button
                    key={tile.id}
                    type="button"
                    onClick={() => onQuickAction(tile.path)}
                    className={cn(
                      'group rounded-[22px] border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md',
                      tile.tint
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className={cn('grid h-11 w-11 place-items-center rounded-[16px] shadow-sm', tile.iconBg)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <div className="mt-5 text-[15px] font-black tracking-[-0.03em] text-foreground">
                      {tile.label}
                    </div>
                    <div className="mt-1.5 text-[13px] leading-5 text-muted-foreground">
                      {tile.tileHint || tile.description}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="rounded-[26px] border border-border bg-card p-4 shadow-sm md:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Recent activity
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Latest documents and status movement across the workspace.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-full px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-primary"
                onClick={onViewAllActivity}
              >
                View all
              </Button>
            </div>

            <div className="overflow-hidden rounded-[22px] border border-border/80 bg-background/60">
              {loading ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-3 rounded-[18px] border border-border/60 bg-card/80 px-4 py-4">
                      <div className="h-10 w-10 rounded-[14px] bg-muted/70" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-32 rounded bg-muted/70" />
                        <div className="h-3 w-44 rounded bg-muted/50" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentDocs.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No recent activity yet.
                </div>
              ) : (
                <div className="divide-y divide-border/70">
                  {recentDocs.map((doc) => {
                    const meta = recentDocMeta[doc.type]
                    const Icon = meta.icon

                    return (
                      <button
                        key={`${doc.type}-${doc.id}`}
                        type="button"
                        onClick={() => onRecentDocSelect(doc)}
                        className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-muted/20"
                      >
                        <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border border-transparent', meta.iconWrap)}>
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-bold text-foreground">{doc.number}</div>
                          <div className="mt-1 truncate text-[12px] text-muted-foreground">{formatDocSubline(doc)}</div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {doc.amount != null ? (
                            <div className="text-right text-sm font-bold tracking-[-0.03em] text-foreground">
                              {formatNaira(doc.amount, { round: true })}
                            </div>
                          ) : (
                            <Badge
                              variant="outline"
                              className={cn('h-6 rounded-full px-2.5 text-[10px] font-bold uppercase tracking-[0.14em]', getStatusBadgeClassName(doc.status))}
                            >
                              {formatStatusLabel(doc.status)}
                            </Badge>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-[26px] border border-border bg-card p-4 shadow-sm md:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Needs follow-up
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Priority reminders pulled from current project and payment activity.
                </p>
              </div>
              <Badge className="h-7 rounded-full bg-destructive/10 px-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-destructive">
                {priorityItems.length} alerts
              </Badge>
            </div>

            <div className="space-y-3">
              {priorityItems.length === 0 ? (
                <div className="rounded-[18px] border border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
                  No follow-up items are waiting right now.
                </div>
              ) : (
                priorityItems.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onPrioritySelect(item)}
                    className="flex w-full items-start gap-3 rounded-[18px] border border-border bg-background/70 px-4 py-4 text-left transition hover:bg-muted/20"
                  >
                    <span className={cn('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', item.dotClassName)} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-bold leading-5 text-foreground">{item.title}</div>
                      <div className="mt-1 text-[12px] leading-5 text-muted-foreground">{item.meta}</div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn('mt-0.5 h-6 rounded-full px-2.5 text-[10px] font-bold uppercase tracking-[0.14em]', item.badgeClassName)}
                    >
                      {item.badgeLabel}
                    </Badge>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[26px] border border-border bg-card p-4 shadow-sm md:p-5">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Dashboard notes
            </div>
            <div className="mt-3 rounded-[20px] border border-dashed border-border bg-muted/30 px-4 py-4 text-sm leading-6 text-muted-foreground">
              This pass keeps the existing shell, routing, search, and module launch logic intact while shifting the dashboard into the new neutral business dashboard system.
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
