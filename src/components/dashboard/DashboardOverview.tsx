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

import { SidebarToggleIcon } from '@/components/unlumen-ui/sidebar-toggle-icon'
import type { ComponentType } from 'react'

import { MobileChromeContext } from '@/components/Layout'
import { GlobalSearch } from '@/components/layout/GlobalSearch'
import NotificationBell from '@/components/notifications/NotificationBell'
import type { RecentDoc } from '@/hooks/useDashboardData'
import { useUserThemePreferences } from '@/hooks/useUserThemePreferences'
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
  userId?: string
  loading: boolean
  kpiCards: KpiCardViewModel[]
  recentDocs: RecentDoc[]
  onRecentDocSelect: (doc: RecentDoc) => void
  onViewAllActivity: () => void
}

// V6 activity icon styling — typed by document domain
const ACTIVITY_ICON_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  Invoice: {
    bg: 'bg-[hsl(var(--primary)/0.14)]',
    color: 'text-[hsl(var(--primary))]',
    border: 'border-[hsl(var(--primary)/0.12)]',
  },
  Quotation: {
    bg: 'bg-[hsl(var(--secondary)/0.13)]',
    color: 'text-[hsl(var(--secondary))]',
    border: 'border-[hsl(var(--secondary)/0.12)]',
  },
  CSR: {
    bg: 'bg-[hsl(var(--attention-soft,hsl(var(--attention)/0.1)))]',
    color: 'text-[hsl(var(--attention))]',
    border: 'border-[hsl(var(--attention)/0.12)]',
  },
  Waybill: {
    bg: 'bg-[hsl(var(--sage-soft,hsl(var(--sage)/0.1)))]',
    color: 'text-[hsl(var(--sage))]',
    border: 'border-[hsl(var(--sage)/0.12)]',
  },
  RFQ: {
    bg: 'bg-[hsl(var(--primary)/0.14)]',
    color: 'text-[hsl(var(--primary))]',
    border: 'border-[hsl(var(--primary)/0.12)]',
  },
  BOQ: {
    bg: 'bg-[hsl(var(--sage-soft,hsl(var(--sage)/0.1)))]',
    color: 'text-[hsl(var(--sage))]',
    border: 'border-[hsl(var(--sage)/0.12)]',
  },
}

const ACTIVITY_ICON: Record<string, ComponentType<{ size?: number; strokeWidth?: number }>> = {
  Invoice: Receipt,
  Quotation: FileSignature,
  CSR: ClipboardCheck,
  Waybill: Truck,
  RFQ: FileText,
  BOQ: ClipboardList,
}

// V6 status badge styling
function StatusBadge({ status }: { status: string }) {
  const normalized = String(status || '').toLowerCase()
  const isDraft = normalized === 'draft'
  const isDelivered = normalized === 'delivered'

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[5px] px-[5px] py-[2px] text-[6px] font-[800] uppercase tracking-[0.07em]',
        isDraft
          ? 'bg-[hsl(var(--primary)/0.14)] text-[hsl(var(--primary))]'
          : isDelivered
            ? 'bg-[hsl(var(--surface-muted))] text-[hsl(var(--ink-2))]'
            : 'bg-[hsl(var(--secondary)/0.13)] text-[hsl(var(--secondary))]',
      )}
    >
      {status}
    </span>
  )
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

  return [doc.client, dateText].filter(Boolean).join(' · ')
}

function formatRecentRecordValue(doc: RecentDoc) {
  if (doc.amount != null) {
    return formatNaira(doc.amount, { round: true })
  }

  return formatStatusLabel(doc.status, { fallback: 'open', lowercase: false })
}

function RecentActivitySkeleton() {
  return (
    <div className="overflow-hidden rounded-[18px] border border-[hsl(var(--line))] bg-[hsl(var(--surface))] shadow-md">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-[9px] border-t border-[hsl(var(--line))] px-[11px] py-[9px] first:border-t-0"
        >
          <div className="grid h-[32px] w-[32px] shrink-0 place-items-center rounded-[11px] bg-[hsl(var(--surface-muted))]/80" />
          <div className="min-w-0 flex-1">
            <div className="h-3 w-28 rounded bg-[hsl(var(--surface-muted))]/80" />
            <div className="mt-2 h-2 w-40 rounded bg-[hsl(var(--surface-muted))]/60" />
          </div>
          <div className="text-right">
            <div className="h-3 w-16 rounded bg-[hsl(var(--surface-muted))]/60" />
            <div className="mt-1 h-2 w-10 rounded bg-[hsl(var(--surface-muted))]/40" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function DashboardOverview({
  businessName,
  userName,
  userId,
  loading,
  kpiCards,
  recentDocs,
  onRecentDocSelect,
  onViewAllActivity,
}: DashboardOverviewProps) {
  const [isDark, setIsDark] = React.useState(() =>
    document.documentElement.classList.contains('dark')
  )

  const { save: saveThemePref, preference } = useUserThemePreferences(userId ?? null)

  const toggleDark = React.useCallback(() => {
    document.documentElement.classList.toggle('dark')
    const nowDark = document.documentElement.classList.contains('dark')
    setIsDark(nowDark)
    if (userId) {
      saveThemePref({
        themePresetId: preference.themePresetId,
        themeMode: nowDark ? (preference.themePresetId ?? 'slate-navy') : (preference.themePresetId ?? 'slate-navy'),
      })
    }
  }, [userId, saveThemePref, preference.themePresetId])

  const mobileChrome = React.useContext(MobileChromeContext)

  // V6 eyebrow: month label
  const now = new Date()
  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="mx-auto flex w-full max-w-[var(--bd-layout-content-max,1200px)] flex-col pb-32 md:pb-16">
      {/* V6 Top Bar — sticky with gradient fade */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between py-2 transition-colors"
        style={{
          padding: 'calc(8px + env(safe-area-inset-top, 0px)) 14px 8px',
          background: 'linear-gradient(180deg, hsl(var(--bg)) 72%, transparent)',
        }}
      >
        <div className="flex min-w-0 items-center gap-[5px]">
          <button
            type="button"
            onClick={mobileChrome.openSidebar}
            className="grid h-[36px] w-[36px] shrink-0 place-items-center rounded-[12px] border border-[hsl(var(--line))] bg-[hsl(var(--surface-raised))] shadow-sm transition active:scale-95"
            style={{ boxShadow: '0 2px 6px rgba(30,28,24,.05), inset 0 1px rgba(255,255,255,.35)' }}
            aria-label="Open navigation menu"
          >
            <SidebarToggleIcon
              isOpen={mobileChrome.sidebarOpen}
              strokeWidth={1.9}
              className="size-[17px] text-[hsl(var(--ink))]"
            />
          </button>

          <div className="min-w-0">
            <div className="text-[7px] font-[800] uppercase tracking-[0.075em] text-[hsl(var(--ink-3))]">
              BIGDROPS WORKSPACE
            </div>
            <div className="mt-px truncate text-[13px] font-[800] tracking-[-.045em] text-[hsl(var(--ink))]">
              {userName || businessName || 'Bigdrops'}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={toggleDark}
            className="grid h-[36px] w-[36px] shrink-0 place-items-center rounded-[12px] border border-[hsl(var(--line))] bg-[hsl(var(--surface-raised))] text-[hsl(var(--ink))] transition active:scale-95"
            style={{ boxShadow: '0 2px 6px rgba(30,28,24,.05), inset 0 1px rgba(255,255,255,.35)' }}
          >
            {isDark ? <Sun className="size-[17px]" strokeWidth={1.9} /> : <Moon className="size-[17px]" strokeWidth={1.9} />}
          </button>
          <NotificationBell className="h-[36px] w-[36px]" />
          <div className="sr-only">Search</div>
          <div className="[&>button]:grid [&>button]:h-[36px] [&>button]:w-[36px] [&>button]:place-items-center [&>button]:rounded-[12px] [&>button]:border [&>button]:border-[hsl(var(--line))] [&>button]:bg-[hsl(var(--surface-raised))] [&>button]:text-[hsl(var(--ink))] [&_svg]:h-[17px] [&_svg]:w-[17px]">
            <GlobalSearch />
          </div>
          <button
            type="button"
            aria-label="Account"
            onClick={() => {}}
            className="ml-1 grid h-[36px] w-[36px] shrink-0 place-items-center overflow-hidden rounded-full border border-[hsl(var(--line))] bg-[hsl(var(--surface-raised))] text-[9px] font-[800] uppercase tracking-wide text-[hsl(var(--primary))] transition active:scale-95"
          >
            {getAvatarInitials(userName) || <UserRound className="size-4" />}
          </button>
        </div>
      </header>

      <main className="px-[14px] pt-[6px] md:px-6">
        {/* V6 Eyebrow */}
        <div className="mb-2 flex items-center justify-between px-[2px]">
          <span className="text-[8px] font-[800] uppercase tracking-[0.11em] text-[hsl(var(--ink-3))]">
            Finance pulse · {monthLabel}
          </span>
        </div>

        {/* KPI Metric Grid */}
        <KpiGrid loading={loading} cards={kpiCards} />

        {/* V6 Recent Activity Section */}
        <section className="mt-[14px]">
          <h2 className="mb-2 px-[2px] text-[9px] font-[800] uppercase tracking-[0.105em] text-[hsl(var(--ink-3))]">
            Recent activity
          </h2>

          {loading ? (
            <RecentActivitySkeleton />
          ) : (
            <div className="overflow-hidden rounded-[18px] border border-[hsl(var(--line))] bg-[hsl(var(--surface))] shadow-md">
              {recentDocs.length === 0 ? (
                <div className="px-4 py-8 text-center text-[12px] text-[hsl(var(--ink-2))]">
                  No recent activity.
                </div>
              ) : (
                recentDocs.slice(0, 6).map((doc) => {
                  const iconStyle = ACTIVITY_ICON_STYLE[doc.type] || ACTIVITY_ICON_STYLE.Invoice
                  const Icon = ACTIVITY_ICON[doc.type] || Receipt
                  const recordValue = formatRecentRecordValue(doc)
                  const meta = formatRecentRecordMeta(doc)
                  const isAmount = doc.amount != null

                  return (
                    <button
                      key={`${doc.type}-${doc.id}`}
                      type="button"
                      onClick={() => onRecentDocSelect(doc)}
                      className="flex w-full items-center gap-[9px] border-t border-[hsl(var(--line))] px-[11px] py-[9px] text-left first:border-t-0 transition-all active:scale-[0.99]"
                    >
                      {/* V6 typed activity icon */}
                      <div
                        className={cn(
                          'grid h-[32px] w-[32px] shrink-0 place-items-center rounded-[11px] border',
                          iconStyle.bg,
                          iconStyle.color,
                          iconStyle.border,
                        )}
                      >
                        <Icon size={15} strokeWidth={1.9} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-[5px]">
                          <span className="text-[11px] font-[800] tracking-[-.025em] text-[hsl(var(--ink))]">
                            {doc.number}
                          </span>
                          <StatusBadge status={doc.status} />
                        </div>
                        <div className="mt-[2px] truncate text-[8px] text-[hsl(var(--ink-2))]">
                          {meta}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="font-[\'DM_Mono\',ui-monospace,SFMono-Regular,Menlo,monospace] text-[10px] font-medium tracking-[-.045em] text-[hsl(var(--ink))]">
                          {recordValue}
                        </div>
                        <div className="mt-[3px] font-[var(--font)] text-[7px] text-[hsl(var(--ink-3))]">
                          {formatDisplayDate(doc.date, {
                            fallback: '',
                            locale: 'en-GB',
                            dateOptions: { month: 'short', day: 'numeric' },
                          })}
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          )}
        </section>

        {/* V6 Payment Reminder */}
        <section className="mt-[14px]">
          <PaymentReminderBanner />
        </section>

        {/* V6 Recent Alerts */}
        <section className="mt-[14px]">
          <RecentAlertsCarousel />
        </section>

        {/* V6 Audit Trail */}
        <section className="mt-[14px]">
          <h2 className="mb-2 px-[2px] text-[9px] font-[800] uppercase tracking-[0.105em] text-[hsl(var(--ink-3))]">
            Audit trail
          </h2>
          <AuditTrailSkeleton />
        </section>

        <div className="h-[6px]" />
      </main>
    </div>
  )
}
