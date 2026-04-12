import * as React from 'react'
import {
  AlertCircle,
  ChevronRight,
  ClipboardCheck,
  FileSignature,
  FolderKanban,
  Menu,
  Receipt,
  TrendingUp,
  Truck,
} from 'lucide-react'
import type { ComponentType } from 'react'

import { MobileChromeContext } from '@/components/Layout'
import { GlobalSearch } from '@/components/layout/GlobalSearch'
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

const dashboardMetricCards = [
  {
    key: 'collections',
    label: 'Collections',
    helper: 'Month to date',
    Icon: TrendingUp,
    iconClassName: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    value: (heroStats: DashboardOverviewProps['heroStats']) =>
      formatNaira(heroStats.collections, { round: true }),
  },
  {
    key: 'openWork',
    label: 'Open Work',
    helper: (summary: DashboardOverviewProps['summary']) => {
      const pendingFollowUp = Number(summary.pendingFollowUp || 0)
      return pendingFollowUp > 0
        ? `${pendingFollowUp} need attention`
        : 'Nothing urgent right now'
    },
    Icon: AlertCircle,
    iconClassName: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    value: (heroStats: DashboardOverviewProps['heroStats']) => String(heroStats.openWork),
  },
] as const

const recentRecordMeta = {
  Invoice: {
    Icon: Receipt,
    iconClassName:
      'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  Quotation: {
    Icon: FileSignature,
    iconClassName:
      'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/15 dark:text-violet-300',
  },
  CSR: {
    Icon: ClipboardCheck,
    iconClassName:
      'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300',
  },
  Waybill: {
    Icon: Truck,
    iconClassName:
      'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-500/30 dark:bg-cyan-500/15 dark:text-cyan-300',
  },
} as const

function getQuickActionHint(tile: QuickTile) {
  if (tile.id === 'invoices') return 'Create & track invoices'
  if (tile.id === 'quotations') return 'Draft pricing proposals'
  if (tile.id === 'projects') return 'Manage live jobs'
  if (tile.id === 'waybills') return 'Log dispatch records'
  return tile.description
}

function getFollowUpBadgeClassName(item: PriorityItem) {
  const label = String(item.badgeLabel || '').toLowerCase()
  const type = String(item.type || '').toLowerCase()

  if (label.includes('payment') || type === 'payment') {
    return 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-300'
  }

  if (label.includes('quotation') || type === 'quotation') {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300'
  }

  return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300'
}

function getFollowUpDotClassName(item: PriorityItem) {
  const label = String(item.badgeLabel || '').toLowerCase()
  const type = String(item.type || '').toLowerCase()

  if (label.includes('payment') || type === 'payment') {
    return 'bg-red-600 dark:bg-red-400'
  }

  if (label.includes('quotation') || type === 'quotation') {
    return 'bg-amber-500 dark:bg-amber-400'
  }

  return 'bg-emerald-600 dark:bg-emerald-400'
}

function getIdentityLine(userName: string, businessName: string) {
  const trimmedName = String(userName || '').trim()
  const trimmedBusiness = String(businessName || '').trim()

  return trimmedName || trimmedBusiness || 'Bigdrops Workspace'
}

function formatRecentRecordMeta(doc: RecentDoc) {
  const dateText = formatDisplayDate(doc.date, {
    fallback: 'No date',
    locale: 'en-GB',
    dateOptions: { month: 'short', day: 'numeric', year: 'numeric' },
  })

  return [doc.client, dateText, doc.meta].filter(Boolean).join(' · ')
}

function formatRecentRecordValue(doc: RecentDoc) {
  if (doc.amount != null) {
    return formatNaira(doc.amount, { round: true })
  }

  return formatStatusLabel(doc.status, { fallback: 'open', lowercase: false })
}

function RecentActivitySkeleton() {
  return (
    <div className="rounded-[18px] border border-border bg-card shadow-sm">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-[10px] border-t border-border px-[14px] py-[11px] first:border-t-0"
        >
          <div className="grid h-[38px] w-[38px] place-items-center rounded-[12px] bg-muted/80" />
          <div className="min-w-0 flex-1">
            <div className="h-3.5 w-28 rounded bg-muted/80" />
            <div className="mt-2 h-3 w-40 rounded bg-muted/60" />
          </div>
          <div className="h-3 w-12 rounded bg-muted/60" />
        </div>
      ))}
    </div>
  )
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
    <div className="mx-auto flex w-full max-w-[760px] flex-col pb-32 pt-[34px] md:pb-16">
      <section className="sticky top-0 z-30 border-b border-border bg-background/95 px-[14px] pb-2.5 pt-[10px] backdrop-blur-[18px] md:px-6">
        <div className="flex items-center justify-between gap-[10px]">
          <div className="flex min-w-0 items-center gap-[10px]">
            <button
              type="button"
              onClick={mobileChrome.openSidebar}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-muted text-foreground"
              aria-label="Open navigation menu"
            >
              <Menu className="h-[15px] w-[15px]" />
            </button>

            <div className="min-w-0">
              <h1 className="truncate text-[16px] font-bold tracking-[-0.03em] text-foreground">
                {getIdentityLine(userName, businessName)}
              </h1>
            </div>
          </div>

          <div className="shrink-0">
            <div className="sr-only">Search</div>
            <div className="[&>button]:grid [&>button]:h-9 [&>button]:w-9 [&>button]:place-items-center [&>button]:rounded-[11px] [&>button]:bg-muted [&>button]:text-foreground [&_svg]:h-[15px] [&_svg]:w-[15px]">
              <GlobalSearch />
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-[9px] px-[14px] pt-[10px] md:px-6">
        {dashboardMetricCards.map((metric) => {
          const Icon = metric.Icon

          return (
            <article
              key={metric.key}
              className="rounded-[18px] border border-border bg-card p-[14px] shadow-sm"
            >
              <div className="flex items-center gap-[8px]">
                <div
                  className={cn(
                    'grid h-7 w-7 place-items-center rounded-[9px]',
                    metric.iconClassName,
                  )}
                >
                  <Icon className="h-[13px] w-[13px]" />
                </div>
                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {metric.label}
                </div>
              </div>

              <div className="mt-[10px] text-[24px] font-extrabold tracking-[-0.05em] text-foreground">
                {metric.value(heroStats)}
              </div>
              <div className="mt-[2px] text-[11px] text-muted-foreground">
                {typeof metric.helper === 'function' ? metric.helper(summary) : metric.helper}
              </div>
            </article>
          )
        })}
      </section>

      <section className="mt-[14px] px-[14px] md:px-6">
        <div className="mb-[10px] flex items-center justify-between">
          <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Quick Actions
          </div>
        </div>

        <div className="grid grid-cols-2 gap-[9px]">
          {quickTiles.slice(0, 4).map((tile) => {
            const Icon = tile.icon

            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => onQuickAction(tile.path)}
                className="rounded-[18px] border border-border bg-card p-[15px] text-left shadow-sm"
              >
                <div
                  className={cn(
                    'grid h-[38px] w-[38px] place-items-center rounded-[12px] shadow-sm',
                    tile.iconBg,
                  )}
                >
                  <Icon className="h-[17px] w-[17px]" />
                </div>

                <div className="mt-[11px] text-[13px] font-bold tracking-[-0.02em] text-foreground">
                  {tile.label}
                </div>
                <div className="mt-[2px] text-[11px] leading-[1.4] text-muted-foreground">
                  {getQuickActionHint(tile)}
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <section className="mt-[14px] px-[14px] md:px-6">
        <div className="mb-[10px] flex items-center justify-between gap-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Follow Up Required
          </div>
          <span className="inline-flex h-5 items-center rounded-full border border-red-200 bg-red-50 px-[7px] text-[9px] font-bold uppercase tracking-[0.06em] text-red-700 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-300">
            {priorityItems.length} Tasks
          </span>
        </div>

        <div className="space-y-[9px]">
          {priorityItems.length === 0 ? (
            <div className="flex items-center gap-[10px] rounded-[14px] border border-border bg-card px-[14px] py-[12px] shadow-sm">
              <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-muted-foreground/60" />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold tracking-[-0.02em] text-foreground">
                  No follow-up required
                </div>
                <div className="mt-[3px] text-[11px] text-muted-foreground">
                  Outstanding items will appear here.
                </div>
              </div>
            </div>
          ) : (
            priorityItems.slice(0, 3).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => onPrioritySelect(item)}
                className="flex w-full items-center gap-[10px] rounded-[14px] border border-border bg-card px-[14px] py-[12px] text-left shadow-sm"
              >
                <span
                  className={cn(
                    'h-[7px] w-[7px] shrink-0 rounded-full',
                    getFollowUpDotClassName(item),
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold tracking-[-0.02em] text-foreground">
                    {item.title}
                  </div>
                  <div className="mt-[3px] text-[11px] text-muted-foreground">{item.meta}</div>
                </div>
                <span
                  className={cn(
                    'inline-flex h-[22px] shrink-0 items-center rounded-full border px-[9px] text-[10px] font-bold uppercase tracking-[0.06em]',
                    getFollowUpBadgeClassName(item),
                  )}
                >
                  {item.badgeLabel}
                </span>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="mt-[14px] px-[14px] md:px-6">
        <div className="mb-[10px] flex items-center justify-between">
          <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Recent Records
          </div>

          <button
            type="button"
            onClick={onViewAllActivity}
            className="grid h-5 w-5 place-items-center text-muted-foreground"
            aria-label="View all recent records"
          >
            <ChevronRight className="h-[14px] w-[14px]" />
          </button>
        </div>

        {loading ? (
          <RecentActivitySkeleton />
        ) : (
          <div className="overflow-hidden rounded-[18px] border border-border bg-card shadow-sm">
            {recentDocs.length === 0 ? (
              <div className="px-[14px] py-10 text-center text-sm text-muted-foreground">
                No recent records yet.
              </div>
            ) : (
              recentDocs.slice(0, 3).map((doc) => {
                const meta = recentRecordMeta[doc.type]
                const Icon = meta.Icon
                const recordValue = formatRecentRecordValue(doc)
                const isAmount = doc.amount != null

                return (
                  <button
                    key={`${doc.type}-${doc.id}`}
                    type="button"
                    onClick={() => onRecentDocSelect(doc)}
                    className="flex w-full items-center gap-[10px] border-t border-border px-[14px] py-[11px] text-left first:border-t-0"
                  >
                    <div
                      className={cn(
                        'grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[12px] border border-border',
                        meta.iconClassName,
                      )}
                    >
                      <Icon className="h-[15px] w-[15px]" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-bold tracking-[-0.02em] text-foreground">
                        {doc.number}
                      </div>
                      <div className="mt-[3px] truncate text-[11px] text-muted-foreground">
                        {formatRecentRecordMeta(doc)}
                      </div>
                    </div>

                    <div
                      className={cn(
                        'text-right text-[13px] font-extrabold tracking-[-0.03em]',
                        isAmount ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {recordValue}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        )}
      </section>
    </div>
  )
}
