import * as React from 'react'
import {
  ClipboardCheck,
  FileSignature,
  Moon,
  Sun,
  Receipt,
  Truck,
  UserRound,
  FileText,
  ClipboardList,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { SidebarToggleIcon } from '@/components/unlumen-ui/sidebar-toggle-icon'
import type { ComponentType } from 'react'

import { MobileChromeContext } from '@/components/Layout'
import { GlobalSearch } from '@/components/layout/GlobalSearch'
import NotificationBell from '@/components/notifications/NotificationBell'
import type { RecentDoc } from '@/hooks/useDashboardData'
import type { KpiCardViewModel } from '@/config/kpiCards'
import { formatDisplayDate } from '@/lib/formatters/date'
import { formatNaira } from '@/lib/formatters/money'
import { formatStatusLabel } from '@/lib/formatters/status'
import { cn } from '@/lib/utils'
import { AuditTrailSkeleton } from '@/components/dashboard/AuditTrailSkeleton'
import { KpiGrid } from '@/components/dashboard/KpiGrid'
import { PaymentReminderBanner } from '@/components/dashboard/PaymentReminderBanner'
import { RecentAlertsCarousel } from '@/components/dashboard/RecentAlertsCarousel'

type DashboardOverviewProps = {
  businessName: string
  userName: string
  loading: boolean
  kpiCards: KpiCardViewModel[]
  recentDocs: RecentDoc[]
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

function getIdentityLine(userName: string, businessName: string) {
  const trimmedName = String(userName || '').trim()
  const trimmedBusiness = String(businessName || '').trim()

  return trimmedName || trimmedBusiness || 'Bigdrops Workspace'
}

function getAvatarInitials(userName: string) {
  const parts = String(userName || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('')
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
  kpiCards,
  recentDocs,
  onRecentDocSelect,
  onViewAllActivity,
}: DashboardOverviewProps) {
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

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
            <button
              type="button"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--bd-radius-md)] border border-border bg-muted text-foreground transition active:scale-95"
            >
              {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <NotificationBell className="h-8 w-8" />
            <div className="sr-only">Search</div>
            <div className="[&>button]:grid [&>button]:h-8 [&>button]:w-8 [&>button]:place-items-center [&>button]:rounded-[var(--notification-radius,var(--radius))] [&>button]:bg-[var(--notification-bg,hsl(var(--muted)))] [&>button]:text-foreground [&_svg]:h-3.5 [&_svg]:w-3.5">
              <GlobalSearch />
            </div>
            <button
              type="button"
              aria-label="Account"
              onClick={() => {}}
              className="ml-1 grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-muted text-[10px] font-black uppercase tracking-wide text-foreground transition active:scale-95"
            >
              {getAvatarInitials(userName) || <UserRound className="size-4" />}
            </button>
          </div>
        </div>
      </section>


      <section className="mt-4 md:mt-6 px-4 md:px-6">
        <KpiGrid loading={loading} cards={kpiCards} />
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

      <section className="mt-5 md:mt-8 px-4 md:px-6">
        <PaymentReminderBanner />
      </section>

      <section className="mt-5 md:mt-8 px-4 md:px-6">
        <RecentAlertsCarousel />
      </section>

      <section className="mt-5 md:mt-8 px-4 md:px-6">
        <AuditTrailSkeleton />
      </section>

    </div>
  )
}
