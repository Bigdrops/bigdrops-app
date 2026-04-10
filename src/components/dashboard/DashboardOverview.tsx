import * as React from 'react'
import {
  AlertCircle,
  Bell,
  ClipboardCheck,
  FileSignature,
  FolderKanban,
  Menu,
  MoreHorizontal,
  Receipt,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react'
import type { ComponentType } from 'react'

import { MobileChromeContext } from '@/components/Layout'
import { GlobalSearch } from '@/components/layout/GlobalSearch'
import { Badge } from '@/components/ui/badge'
import type { PriorityItem, RecentDoc } from '@/hooks/useDashboardData'
import { formatDisplayDate } from '@/lib/formatters/date'
import { formatNaira } from '@/lib/formatters/money'
import { formatStatusLabel } from '@/lib/formatters/status'
import { cn } from '@/lib/utils'

type QuickTile = {
  id: string
  label: string
  path: string
  icon: ComponentType<{ className?: string }>
  description: string
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
    value: (heroStats: DashboardOverviewProps['heroStats']) =>
      formatNaira(heroStats.collections, { round: true }),
    helper: 'Month to date',
    foot: (summary: DashboardOverviewProps['summary']) =>
      summary.dueThisWeek > 0
        ? `${formatNaira(summary.dueThisWeek, { round: true })} due this week`
        : 'Receivables calendar is clear',
    iconClassName: 'tone-success-panel text-foreground',
    Icon: TrendingUp,
  },
  {
    key: 'open-work',
    label: 'Open work',
    value: (heroStats: DashboardOverviewProps['heroStats']) => String(heroStats.openWork),
    helper: 'Active items',
    foot: (summary: DashboardOverviewProps['summary']) =>
      `${summary.pendingFollowUp || 0} need immediate review`,
    iconClassName: 'tone-warning-panel text-foreground',
    Icon: AlertCircle,
  },
  {
    key: 'invoices',
    label: 'Invoices',
    value: (heroStats: DashboardOverviewProps['heroStats']) =>
      String(heroStats.awaitingPaymentCount),
    helper: 'Awaiting payment',
    foot: (summary: DashboardOverviewProps['summary']) =>
      summary.overdue > 0
        ? `${formatNaira(summary.overdue, { round: true })} overdue`
        : 'No overdue balances right now',
    iconClassName: 'tone-info-panel text-foreground',
    Icon: Receipt,
  },
  {
    key: 'dispatch',
    label: 'Dispatch',
    value: (heroStats: DashboardOverviewProps['heroStats']) =>
      String(heroStats.inTransitWaybills),
    helper: 'Waybills in transit',
    foot: () => 'Live from current delivery records',
    iconClassName: 'tone-data-panel text-foreground',
    Icon: Truck,
  },
] as const

const quickTileFallbackMeta: Record<string, { iconBg: string }> = {
  invoices: { iconBg: 'bg-primary text-primary-foreground' },
  quotations: { iconBg: 'tone-accent-icon' },
  csr: { iconBg: 'tone-warning-icon' },
  projects: { iconBg: 'tone-success-icon' },
  clients: { iconBg: 'bg-secondary text-secondary-foreground' },
  waybills: { iconBg: 'tone-data-icon' },
}

const quickTileOverrides: Record<
  string,
  { label: string; description: string; iconBg?: string; Icon?: ComponentType<{ className?: string }> }
> = {
  invoices: {
    label: 'New invoice',
    description: 'Create, send, and track payment status.',
    iconBg: 'bg-primary text-primary-foreground',
    Icon: Receipt,
  },
  projects: {
    label: 'Open project',
    description: 'Start a job with owner, dates, and budget.',
    iconBg: 'tone-success-icon',
    Icon: FolderKanban,
  },
  clients: {
    label: 'Add client',
    description: 'Capture contacts, terms, and account context.',
    iconBg: 'tone-accent-icon',
    Icon: Users,
  },
  waybills: {
    label: 'Create waybill',
    description: 'Prepare dispatch details in a few steps.',
    iconBg: 'tone-data-icon',
    Icon: Truck,
  },
}

const recentDocMeta = {
  Invoice: {
    icon: Receipt,
    iconWrap: 'tone-info-panel text-foreground',
  },
  Quotation: {
    icon: FileSignature,
    iconWrap: 'tone-accent-panel text-foreground',
  },
  CSR: {
    icon: ClipboardCheck,
    iconWrap: 'tone-warning-panel text-foreground',
  },
  Waybill: {
    icon: Truck,
    iconWrap: 'tone-data-panel text-foreground',
  },
} as const

function getStatusBadgeClassName(status: string) {
  const value = String(status || '').toLowerCase()

  if (value === 'overdue' || value === 'rejected') {
    return 'border-destructive/20 bg-destructive/10 text-destructive'
  }

  if (
    value === 'accepted' ||
    value === 'delivered' ||
    value === 'completed' ||
    value === 'paid'
  ) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300'
  }

  if (value === 'sent' || value === 'dispatched') {
    return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300'
  }

  if (value === 'pending' || value === 'draft') {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300'
  }

  return 'border-border bg-muted/60 text-muted-foreground'
}

function formatDocSubline(doc: RecentDoc) {
  const dateText = formatDisplayDate(doc.date, {
    fallback: 'No date',
    locale: 'en-GB',
    dateOptions: { month: 'short', day: 'numeric' },
  })

  return [doc.number, dateText, doc.client || doc.meta, doc.meta && doc.client ? doc.meta : null]
    .filter(Boolean)
    .join(' · ')
}

function formatRecentDocTitle(doc: RecentDoc) {
  if (doc.type === 'Invoice') return `Invoice ${doc.number}`
  if (doc.type === 'Quotation') return `Quotation ${doc.number}`
  if (doc.type === 'CSR') return `CSR ${doc.number}`
  return `Waybill ${doc.number}`
}

function getRecentDocAccentClassName(doc: RecentDoc) {
  const status = String(doc.status || '').toLowerCase()

  if (status === 'overdue' || status === 'rejected') return 'bg-destructive'
  if (status === 'accepted' || status === 'delivered' || status === 'completed' || status === 'paid') {
    return 'bg-emerald-500'
  }
  if (status === 'dispatched') return 'bg-cyan-500'
  if (status === 'sent') return 'bg-blue-500'
  if (status === 'pending' || status === 'draft') return 'bg-amber-500'
  return 'bg-border'
}

function getQuickActionTiles(quickTiles: QuickTile[]) {
  return quickTiles.slice(0, 4).map((tile) => {
    const override = quickTileOverrides[tile.id]

    return {
      ...tile,
      label: override?.label ?? tile.label,
      description: override?.description ?? tile.description,
      iconBg:
        override?.iconBg ??
        tile.iconBg ??
        quickTileFallbackMeta[tile.id]?.iconBg ??
        'bg-muted text-muted-foreground',
      icon: override?.Icon ?? tile.icon,
    }
  })
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
  const quickActionTiles = React.useMemo(() => getQuickActionTiles(quickTiles), [quickTiles])
  const recentActivityItems = recentDocs.slice(0, 5)

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col px-[14px] pb-32 pt-[10px] sm:px-5 md:px-6 md:pb-14 lg:px-8">
      <section className="sticky top-0 z-30 -mx-[14px] bg-[linear-gradient(180deg,hsl(var(--background))_0%,color-mix(in_oklab,hsl(var(--background))_88%,transparent)_78%,transparent_100%)] px-[14px] pb-3 pt-[10px] backdrop-blur-[16px] sm:-mx-5 sm:px-5 md:static md:mx-0 md:bg-none md:px-0 md:pb-0 md:pt-0 md:backdrop-blur-0">
        <div className="rounded-[22px] border border-border bg-card p-[14px] shadow-sm md:rounded-[24px] md:px-5 md:py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-[10px] md:gap-3">
              <button
                type="button"
                onClick={mobileChrome.openSidebar}
                className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[13px] border border-border bg-card text-foreground shadow-sm md:hidden"
                aria-label="Open navigation menu"
              >
                <Menu className="h-[18px] w-[18px]" />
              </button>

              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  {businessName}
                </div>
                <h1 className="mt-0.5 text-[19px] font-extrabold tracking-[-0.03em] text-foreground sm:text-[21px]">
                  Good morning, {userName}
                </h1>
                <div className="mt-[3px] max-w-[44rem] text-[12px] text-muted-foreground sm:text-[13px]">
                  Operations overview across sales, projects, and logistics.
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                className="grid h-[38px] w-[38px] place-items-center rounded-[13px] bg-muted text-foreground transition hover:bg-muted/80"
                aria-label="Notifications"
              >
                <Bell className="h-[18px] w-[18px]" />
              </button>
              <GlobalSearch />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-[10px] lg:grid-cols-4">
        {metricCards.map((metric) => {
          const Icon = metric.Icon

          return (
            <article
              key={metric.key}
              className="rounded-[20px] border border-border bg-card p-[14px] shadow-sm"
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'grid h-[34px] w-[34px] place-items-center rounded-[12px] border',
                    metric.iconClassName,
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  {metric.label}
                </div>
              </div>
              <div className="mt-[14px] text-[24px] font-extrabold tracking-[-0.05em] text-foreground sm:text-[28px]">
                {metric.value(heroStats)}
              </div>
              <div className="mt-[3px] text-[12px] text-muted-foreground">{metric.helper}</div>
              <div className="mt-[5px] text-[11px] text-muted-foreground">{metric.foot(summary)}</div>
            </article>
          )
        })}
      </section>

      <section className="mt-4">
        <div className="mb-[10px] flex items-center justify-between gap-3">
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Quick actions
          </div>
          <button type="button" className="text-[12px] font-bold text-primary">
            Customize
          </button>
        </div>

        <div className="grid grid-cols-2 gap-[10px] lg:grid-cols-4">
          {quickActionTiles.map((tile) => {
            const Icon = tile.icon

            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => onQuickAction(tile.path)}
                className="rounded-[20px] border border-border bg-card p-[14px] text-left shadow-sm transition hover:bg-muted/20"
              >
                <div
                  className={cn(
                    'grid h-10 w-10 place-items-center rounded-[14px] shadow-sm',
                    tile.iconBg,
                  )}
                >
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

      <section className="mt-4">
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
            <div className="rounded-[16px] border border-dashed border-border bg-card px-4 py-6 text-sm text-muted-foreground">
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
                  <div className="text-[13px] font-bold leading-[1.3] text-foreground">
                    {item.title}
                  </div>
                  <div className="mt-[3px] text-[12px] text-muted-foreground">{item.meta}</div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'h-6 shrink-0 rounded-full px-2.5 text-[10px] font-bold uppercase tracking-[0.05em]',
                    item.badgeClassName,
                  )}
                >
                  {item.badgeLabel}
                </Badge>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="mt-4">
        <div className="mb-[10px] flex items-center justify-between gap-3">
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Recent activity
          </div>
          <button
            type="button"
            className="text-[12px] font-bold text-primary"
            onClick={onViewAllActivity}
          >
            View all
          </button>
        </div>

        <div className="overflow-hidden rounded-[20px] border border-border bg-card shadow-sm">
          {loading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-[10px] px-[14px] py-[14px]"
                >
                  <div className="flex items-center gap-[10px]">
                    <div className="h-[34px] w-[34px] rounded-[12px] bg-muted/70" />
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-40 rounded bg-muted/70" />
                      <div className="h-3 w-48 rounded bg-muted/50" />
                    </div>
                  </div>
                  <div className="h-5 w-16 rounded bg-muted/50" />
                  <div className="h-8 w-8 rounded-[11px] bg-muted/60" />
                </div>
              ))}
            </div>
          ) : recentActivityItems.length === 0 ? (
            <div className="px-[14px] py-10 text-center text-sm text-muted-foreground">
              No recent documents yet.
            </div>
          ) : (
            <div>
              {recentActivityItems.map((doc) => {
                const meta = recentDocMeta[doc.type]
                const Icon = meta.icon
                const statusLabel = formatStatusLabel(doc.status)
                const hasAmount = doc.amount != null

                return (
                  <button
                    key={`${doc.type}-${doc.id}`}
                    type="button"
                    onClick={() => onRecentDocSelect(doc)}
                    className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-[10px] border-t border-border px-[14px] py-[14px] text-left transition hover:bg-muted/20 first:border-t-0"
                  >
                    <div className="flex min-w-0 items-center gap-[10px]">
                      <div
                        className={cn(
                          'grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[12px] border',
                          meta.iconWrap,
                        )}
                      >
                        <Icon className="h-[18px] w-[18px]" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-bold tracking-[-0.02em] text-foreground">
                          {formatRecentDocTitle(doc)}
                        </div>
                        <div className="mt-1 truncate text-[12px] text-muted-foreground">
                          {formatDocSubline(doc)}
                        </div>
                      </div>
                    </div>

                    {hasAmount ? (
                      <div className="text-[15px] font-extrabold tracking-[-0.03em] text-foreground">
                        {formatNaira(doc.amount, { round: true })}
                      </div>
                    ) : (
                      <Badge
                        variant="outline"
                        className={cn(
                          'h-6 rounded-full px-2.5 text-[10px] font-bold uppercase tracking-[0.05em]',
                          getStatusBadgeClassName(doc.status),
                        )}
                      >
                        {statusLabel}
                      </Badge>
                    )}

                    <span
                      className="grid h-8 w-8 place-items-center rounded-[11px] bg-muted text-muted-foreground"
                      aria-hidden="true"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
