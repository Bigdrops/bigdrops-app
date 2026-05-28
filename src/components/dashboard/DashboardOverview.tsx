import * as React from 'react'
import {
  AlertCircle,
  ChevronRight,
  ClipboardCheck,
  FileSignature,
  FolderKanban,
  Receipt,
  TrendingUp,
  Truck,
  FileText,
  ClipboardList,
} from 'lucide-react'
import { SidebarToggleIcon } from '@/components/unlumen-ui/sidebar-toggle-icon'
import type { ComponentType } from 'react'

import { MobileChromeContext } from '@/components/Layout'
import { GlobalSearch } from '@/components/layout/GlobalSearch'
import NotificationBell from '@/components/notifications/NotificationBell'
import type { PriorityItem, RecentDoc } from '@/hooks/useDashboardData'
import { formatDisplayDate } from '@/lib/formatters/date'
import { formatNaira } from '@/lib/formatters/money'
import { formatStatusLabel } from '@/lib/formatters/status'
import { cn } from '@/lib/utils'

type QuickTile = {
  id: string
  label: string
  path: string
  icon: ComponentType<{ className?: string; size?: number; strokeWidth?: number }>
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


const recentRecordMeta = {
  Invoice: {
    Icon: Receipt,
    iconClassName:
      'tone-success-panel text-[var(--tone-success)] dark:bg-[var(--tone-success)]/10 dark:border-[var(--tone-success-border)]',
  },
  Quotation: {
    Icon: FileSignature,
    iconClassName:
      'tone-accent-panel text-[var(--tone-accent)] dark:bg-[var(--tone-accent)]/10 dark:border-[var(--tone-accent-border)]',
  },
  CSR: {
    Icon: ClipboardCheck,
    iconClassName:
      'tone-warning-panel text-[var(--tone-warning)] dark:bg-[var(--tone-warning)]/10 dark:border-[var(--tone-warning-border)]',
  },
  Waybill: {
    Icon: Truck,
    iconClassName:
      'tone-data-panel text-[var(--tone-data)] dark:bg-[var(--tone-data)]/10 dark:border-[var(--tone-data-border)]',
  },
  RFQ: {
    Icon: FileText,
    iconClassName:
      'bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20',
  },
  BOQ: {
    Icon: ClipboardList,
    iconClassName:
      'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20',
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
    return 'bg-[hsl(var(--destructive)/0.08)] text-[hsl(var(--destructive))] border-[hsl(var(--destructive)/0.18)] dark:bg-[hsl(var(--destructive)/0.15)]'
  }

  if (label.includes('quotation') || type === 'quotation') {
    return 'tone-warning-panel text-[var(--tone-warning)]'
  }

  return 'tone-success-panel text-[var(--tone-success)]'
}

function getFollowUpDotClassName(item: PriorityItem) {
  const label = String(item.badgeLabel || '').toLowerCase()
  const type = String(item.type || '').toLowerCase()

  if (label.includes('payment') || type === 'payment') {
    return 'bg-[hsl(var(--destructive))]'
  }

  if (label.includes('quotation') || type === 'quotation') {
    return 'bg-[var(--tone-warning)]'
  }

  return 'bg-[var(--tone-success)]'
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
    <div className="rounded-[var(--bd-radius-xl)] border border-border bg-card shadow-sm">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-[var(--bd-space-sm)] border-t border-border px-[var(--bd-space-md)] py-[var(--bd-space-sm)] first:border-t-0"
        >
          <div className="grid h-[38px] w-[38px] place-items-center rounded-[var(--bd-radius-lg)] bg-muted/80" />
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
    <div className="mx-auto flex w-full max-w-[var(--bd-layout-content-max,1200px)] flex-col pb-32 md:pb-16">
      <section className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 pb-2.5 pt-2.5 backdrop-blur-[18px] md:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={mobileChrome.openSidebar}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--bd-radius-md)] border border-border bg-muted text-foreground"
              aria-label="Open navigation menu"
            >
              <SidebarToggleIcon
                isOpen={mobileChrome.sidebarOpen}
                strokeWidth={2}
                className="size-5 text-bd-text"
              />
            </button>

            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-bold tracking-tight text-foreground">
                {getIdentityLine(userName, businessName)}
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <NotificationBell className="h-8 w-8" />
            <div className="sr-only">Search</div>
            <div className="[&>button]:grid [&>button]:h-8 [&>button]:w-8 [&>button]:place-items-center [&>button]:rounded-[var(--notification-radius,var(--radius))] [&>button]:bg-[var(--notification-bg,hsl(var(--muted)))] [&>button]:text-foreground [&_svg]:h-3.5 [&_svg]:w-3.5">
              <GlobalSearch />
            </div>
          </div>
        </div>
      </section>


      <section className="mt-4 md:mt-6 px-4 md:px-6">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
            Quick Actions
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {quickTiles.slice(0, 4).map((tile) => {
            const Icon = tile.icon

            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => onQuickAction(tile.path)}
                className="rounded-[var(--bd-radius-xl)] border border-border bg-card p-3 text-left shadow-sm active:scale-[0.97] transition-all"
              >
                <div
                  className={cn(
                    'grid h-8 w-8 place-items-center rounded-[var(--bd-icon-container-radius)] bg-[var(--bd-icon-container-bg)] text-[var(--bd-icon-container-text)] shadow-sm',
                    tile.iconBg,
                  )}
                >
                  <Icon size={16} strokeWidth={2.5} />
                </div>

                <div className="mt-2 text-[12px] font-bold tracking-tight text-foreground">
                  {tile.label}
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <section className="mt-5 md:mt-8 px-4 md:px-6">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
            Tasks
          </div>
          <span className="inline-flex h-4 items-center rounded-full border border-[hsl(var(--destructive)/0.18)] bg-[hsl(var(--destructive)/0.08)] px-2 text-[8px] font-bold uppercase tracking-wider text-[hsl(var(--destructive))] dark:bg-[hsl(var(--destructive)/0.15)]">
            {priorityItems.length} Pending
          </span>
        </div>

        <div className="space-y-1.5">
          {priorityItems.length === 0 ? (
            <div className="flex items-center gap-3 rounded-[var(--bd-radius-lg)] border border-border bg-card px-4 py-2.5 shadow-sm">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-bold tracking-tight text-foreground">
                  No pending tasks
                </div>
              </div>
            </div>
          ) : (
            priorityItems.slice(0, 3).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => onPrioritySelect(item)}
                className={cn(
                  "group relative flex w-full cursor-pointer items-center gap-3 rounded-[var(--bd-radius-lg)] border border-bd-border bg-bd-surface p-2.5 text-left transition-all hover:bg-bd-surface-muted active:scale-[0.99] shadow-sm",
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 shrink-0 rounded-full',
                    getFollowUpDotClassName(item),
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-bold tracking-tight text-foreground">
                    {item.title}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">{item.meta}</div>
                </div>
                <span
                  className={cn(
                    'inline-flex h-[18px] shrink-0 items-center rounded-full border px-1.5 text-[8px] font-black uppercase tracking-wider',
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
      <section className="mt-5 md:mt-8 px-4 md:px-6">
        <div className="mb-2">
          <div className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
            Recent Activity
          </div>
        </div>

        {loading ? (
          <RecentActivitySkeleton />
        ) : (
          <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-sm">
            {recentDocs.length === 0 ? (
              <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                No recent activity.
              </div>
            ) : (
              recentDocs.slice(0, 6).map((doc) => {
                const meta = recentRecordMeta[doc.type]
                const Icon = meta.Icon
                const recordValue = formatRecentRecordValue(doc)
                const isAmount = doc.amount != null

                return (
                  <button
                    key={`${doc.type}-${doc.id}`}
                    type="button"
                    onClick={() => onRecentDocSelect(doc)}
                    className="flex w-full items-center gap-3 border-t border-border px-4 py-2.5 text-left first:border-t-0 hover:bg-muted/30 active:scale-[0.99] transition-all"
                  >
                    <div
                      className={cn(
                        'grid h-8 w-8 shrink-0 place-items-center rounded-[var(--bd-radius-md)] border border-border',
                        meta.iconClassName,
                      )}
                    >
                      <Icon size={14} strokeWidth={2.5} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-bold tracking-tight text-bd-text">
                        {doc.number}
                      </div>
                      <div className="truncate text-[10px] text-muted-foreground">
                        {formatRecentRecordMeta(doc)}
                      </div>
                    </div>

                    <div
                      className={cn(
                        'text-right text-[12px] font-black tracking-tight',
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