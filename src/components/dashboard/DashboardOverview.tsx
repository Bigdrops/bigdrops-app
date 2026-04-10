import {
  AlertCircle,
  Bell,
  ChevronRight,
  ClipboardCheck,
  FileSignature,
  Menu,
  Receipt,
  Search,
  TrendingUp,
  Truck,
} from 'lucide-react'
import type { ComponentType } from 'react'
import * as React from 'react'

import { MobileChromeContext } from '@/components/Layout'
import { GlobalSearch } from '@/components/layout/GlobalSearch'
import { Badge } from '@/components/ui/badge'
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
  const mobileChrome = React.useContext(MobileChromeContext)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pb-32 pt-3 md:px-8 md:pb-12 md:pt-4">
      <section className="sticky top-0 z-30 -mx-4 bg-[linear-gradient(180deg,hsl(var(--background))_0%,color-mix(in_oklab,hsl(var(--background))_90%,transparent)_78%,transparent_100%)] px-4 pb-3 pt-2 backdrop-blur-xl md:mx-0 md:px-0">
        <div className="rounded-[22px] border border-border bg-card px-[14px] py-[14px] shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-[10px]">
              <button
                type="button"
                onClick={mobileChrome.openSidebar}
                className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[13px] border border-border bg-card text-foreground shadow-sm"
                aria-label="Open navigation menu"
              >
                <Menu className="h-[18px] w-[18px]" />
              </button>
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  {businessName}
                </div>
                <h1 className="mt-0.5 truncate text-[19px] font-extrabold tracking-[-0.03em] text-foreground">
                  Good morning, {userName}
                </h1>
                <div className="mt-1 text-[12px] text-muted-foreground">
                  Operations overview across sales, projects, and logistics.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden md:grid h-[38px] w-[38px] place-items-center rounded-[13px] bg-muted/55 text-foreground">
                <Bell className="h-[18px] w-[18px]" />
              </span>
              <span className="hidden md:grid h-[38px] w-[38px] place-items-center rounded-[13px] bg-muted/55 text-foreground">
                <Search className="h-[18px] w-[18px]" />
              </span>
              <div className="md:hidden">
                <GlobalSearch />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-[10px] md:grid-cols-4 md:gap-[10px]">
        {metricCards.map((metric) => {
          const Icon = metric.Icon

          return (
            <article
              key={metric.key}
              className={cn(
                'rounded-[20px] border px-[14px] py-[14px] shadow-sm',
                metric.panelClassName
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn('grid h-[34px] w-[34px] place-items-center rounded-[12px]', metric.iconClassName)}>
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  {metric.label}
                </div>
              </div>
              <div className="mt-[14px] text-[24px] font-extrabold tracking-[-0.05em] text-foreground">
                {metric.value(heroStats)}
              </div>
              <div className="mt-[3px] text-[12px] text-muted-foreground">{metric.helper}</div>
              <div className="mt-[5px] text-[11px] text-muted-foreground">{metric.foot(summary)}</div>
            </article>
          )
        })}
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-5">
        <div className="space-y-6">
          <section className="mt-[2px]">
            <div className="mb-[10px] flex items-center justify-between gap-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Quick actions
              </div>
              <button type="button" className="text-[12px] font-bold text-primary">
                Customize
              </button>
            </div>

            <div className="grid grid-cols-2 gap-[10px]">
              {quickTiles.map((tile) => {
                const Icon = tile.icon

                return (
                  <button
                    key={tile.id}
                    type="button"
                    onClick={() => onQuickAction(tile.path)}
                    className={cn(
                      'rounded-[20px] border p-[14px] text-left shadow-sm',
                      tile.tint
                    )}
                  >
                    <div className={cn('grid h-10 w-10 place-items-center rounded-[14px]', tile.iconBg)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="mt-3 text-[14px] font-extrabold tracking-[-0.02em] text-foreground">
                      {tile.label}
                    </div>
                    <div className="mt-1 text-[12px] leading-[1.35] text-muted-foreground">
                      {tile.description}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          <section>
            <div className="mb-[10px] flex items-center justify-between gap-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Recent activity
              </div>
              <button type="button" className="text-[12px] font-bold text-primary" onClick={onViewAllActivity}>
                View all
              </button>
            </div>

            <div className="overflow-hidden rounded-[20px] border border-border bg-card shadow-sm">
              {loading ? (
                <div className="divide-y divide-border">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-[10px] px-[14px] py-[14px]">
                      <div className="h-[34px] w-[34px] rounded-[12px] bg-muted/70" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 w-32 rounded bg-muted/70" />
                        <div className="h-3 w-40 rounded bg-muted/50" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentDocs.length === 0 ? (
                <div className="px-[14px] py-10 text-center text-sm text-muted-foreground">
                  No recent documents yet.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {recentDocs.map((doc) => {
                    const meta = recentDocMeta[doc.type]
                    const Icon = meta.icon

                    return (
                      <button
                        key={`${doc.type}-${doc.id}`}
                        type="button"
                        onClick={() => onRecentDocSelect(doc)}
                        className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-[10px] px-[14px] py-[14px] text-left transition hover:bg-muted/20"
                      >
                        <div className="flex min-w-0 items-center gap-[10px]">
                          <div className={cn('grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[12px]', meta.iconWrap)}>
                            <Icon className="h-[18px] w-[18px]" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-[14px] font-bold tracking-[-0.02em] text-foreground">{doc.number}</div>
                            <div className="mt-1 truncate text-[12px] text-muted-foreground">{formatDocSubline(doc)}</div>
                          </div>
                        </div>
                        {doc.amount != null ? (
                          <div className="text-[15px] font-extrabold tracking-[-0.03em] text-foreground">
                            {formatNaira(doc.amount, { round: true })}
                          </div>
                        ) : (
                          <Badge
                            variant="outline"
                            className={cn('h-6 rounded-full px-2.5 text-[10px] font-bold uppercase tracking-[0.05em]', getStatusBadgeClassName(doc.status))}
                          >
                            {formatStatusLabel(doc.status)}
                          </Badge>
                        )}
                        <button type="button" className="grid h-8 w-8 place-items-center rounded-[11px] bg-muted/55 text-muted-foreground" tabIndex={-1} aria-hidden="true">
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section>
            <div className="mb-[10px] flex items-center justify-between gap-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Needs follow-up
              </div>
              <Badge className="h-6 rounded-full border border-destructive/20 bg-destructive/10 px-2.5 text-[10px] font-bold uppercase tracking-[0.05em] text-destructive">
                {priorityItems.length} alerts
              </Badge>
            </div>

            <div className="space-y-[10px]">
              {priorityItems.length === 0 ? (
                <div className="rounded-[16px] border border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
                  No follow-up items are waiting right now.
                </div>
              ) : (
                priorityItems.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onPrioritySelect(item)}
                    className="flex w-full items-start gap-[10px] rounded-[16px] border border-border bg-card px-[14px] py-[13px] text-left shadow-sm transition hover:bg-muted/20"
                  >
                    <span className={cn('mt-[6px] h-2 w-2 shrink-0 rounded-full', item.dotClassName)} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-bold leading-[1.3] text-foreground">{item.title}</div>
                      <div className="mt-[3px] text-[12px] text-muted-foreground">{item.meta}</div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn('h-6 rounded-full px-2.5 text-[10px] font-bold uppercase tracking-[0.05em]', item.badgeClassName)}
                    >
                      {item.badgeLabel}
                    </Badge>
                  </button>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
