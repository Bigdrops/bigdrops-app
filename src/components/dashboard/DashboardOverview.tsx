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
import type { UserThemePreference } from '@/hooks/useUserThemePreferences'
import type { KpiCardViewModel } from '@/config/kpiCards'
import { KPI_CARD_COUNT_DESKTOP, KPI_CARD_COUNT_MOBILE } from '@/config/kpiCards'
import { formatDisplayDate } from '@/lib/formatters/date'
import { formatNaira } from '@/lib/formatters/money'
import { formatStatusLabel } from '@/lib/formatters/status'
import { cn } from '@/lib/utils'
import { AuditTrailSkeleton } from '@/components/dashboard/AuditTrailSkeleton'
import { KpiGrid } from '@/components/dashboard/KpiGrid'
import { PaymentReminderBanner } from '@/components/dashboard/PaymentReminderBanner'
import { RecentAlertsCarousel } from '@/components/dashboard/RecentAlertsCarousel'

type DashboardOverviewProps = {
  workspaceName: string
  businessName: string
  userName: string
  userId?: string
  loading: boolean
  kpiCards: KpiCardViewModel[]
  recentDocs: RecentDoc[]
  onRecentDocSelect: (doc: RecentDoc) => void
  onViewAllActivity: () => void
  preference: UserThemePreference
  saveThemePref: (updates: Partial<UserThemePreference>) => Promise<void>
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
}

const ACTIVITY_ICON: Record<string, ComponentType<{ size?: number; strokeWidth?: number }>> = {
  Invoice: Receipt,
  Quotation: FileSignature,
  CSR: ClipboardCheck,
  Waybill: Truck,
  RFQ: FileText,
}

function StatusBadge({ status }: { status: string }) {
  const normalized = String(status || '').toLowerCase()
  const isDraft = normalized === 'draft'
  const isDelivered = normalized === 'delivered'

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[5px] px-[5px] py-[2px] text-[6px] font-[800] uppercase tracking-[0.07em] lg:text-[7px]',
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
          <div className="min-w-0 flex-1">                <div className="h-3 w-28 rounded bg-[hsl(var(--bd-ink-muted))]/80" />
            <div className="mt-2 h-2 w-40 rounded bg-[hsl(var(--bd-ink-muted))]/60" />
          </div>
          <div className="text-right">
            <div className="h-3 w-16 rounded bg-[hsl(var(--bd-ink-muted))]/60" />
            <div className="mt-1 h-2 w-10 rounded bg-[hsl(var(--bd-ink-muted))]/40" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function DashboardOverview({
  workspaceName,
  businessName,
  userName,
  userId,
  loading,
  kpiCards,
  recentDocs,
  onRecentDocSelect,
  onViewAllActivity,
  preference,
  saveThemePref,
}: DashboardOverviewProps) {

  // Derive isDark from user preference, not from DOM class.
  // AppThemeManager is the single owner of DOM class mutations.
  const isDark = preference.themeMode === 'dark' ||
    (preference.themeMode === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)

  // Toggle dark/light by updating the user preference.
  // AppThemeManager reacts to this state change and applies the theme to the DOM.
  const toggleDark = React.useCallback(() => {
    if (!userId) return
    saveThemePref({
      themeMode: isDark ? 'light' : 'dark',
      themePresetId: preference.themePresetId,
    })
  }, [userId, saveThemePref, isDark, preference.themePresetId])

  // ponytail: inline matchMedia — one state, one listener, no separate file
  const [isDesktop, setIsDesktop] = React.useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true,
  )
  React.useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)')
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  const kpiMaxCards = isDesktop ? KPI_CARD_COUNT_DESKTOP : KPI_CARD_COUNT_MOBILE

  const mobileChrome = React.useContext(MobileChromeContext)
  const now = new Date()
  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="mx-auto flex w-full max-w-[var(--bd-layout-content-max,1200px)] flex-col" style={{ paddingBottom: 'max(128px, calc(70px + env(safe-area-inset-bottom, 0px)))' }}>
      {/* V6 Top Bar — solid bg for Android-native feel, matches V6 padding */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between"
        style={{
          padding: 'calc(8px + env(safe-area-inset-top, 0px)) 14px 8px 8px',
          background: 'hsl(var(--bd-app-bg))',
        }}
      >
        <div className="flex min-w-0 items-center gap-[5px]">
          <button
            type="button"
            onClick={mobileChrome.openSidebar}
            className="grid h-[36px] w-[36px] shrink-0 place-items-center rounded-[12px] bg-[hsl(var(--bd-surface-raised))] shadow-[0_2px_6px_rgba(30,28,24,0.05),inset_0_1px_rgba(255,255,255,0.35)] transition active:scale-95"
            aria-label="Open navigation menu"
          >
            <SidebarToggleIcon
              isOpen={mobileChrome.sidebarOpen}
              strokeWidth={1.9}
              className="size-[17px] text-[hsl(var(--bd-ink))]"
            />
          </button>

          <div className="min-w-0">
            <div className="text-[7px] font-[800] uppercase tracking-[0.075em] text-[hsl(var(--bd-ink-muted))]">
              {workspaceName || 'Workspace'}
            </div>
            <div className="mt-px truncate text-[13px] font-[800] tracking-[-.045em] text-[hsl(var(--bd-ink))]">
              {userName || businessName || 'Dashboard'}
            </div>
          </div>
        </div>

        {/* V6 top-right: gap 4px, order: theme, notif, search, AI */}
        <div className="flex shrink-0 items-center gap-[4px]">
          {/* Theme toggle */}
          <button
            type="button"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={toggleDark}
            className="grid h-[36px] w-[36px] shrink-0 place-items-center rounded-[12px] bg-[hsl(var(--bd-surface-raised))] shadow-[0_2px_6px_rgba(30,28,24,0.05),inset_0_1px_rgba(255,255,255,0.35)] text-[hsl(var(--bd-ink))] transition active:scale-95"
          >
            {isDark ? <Sun className="size-[17px]" strokeWidth={1.9} /> : <Moon className="size-[17px]" strokeWidth={1.9} />}
          </button>
          {/* Notification bell with V6 red pip */}
          <div className="relative">
            <NotificationBell className="h-[36px] w-[36px]" />
          </div>
          {/* Search */}
          <div className="[&>button]:grid [&>button]:h-[36px] [&>button]:w-[36px] [&>button]:place-items-center [&>button]:rounded-[12px] [&>button]:bg-[hsl(var(--bd-surface-raised))] [&>button]:shadow-[0_2px_6px_rgba(30,28,24,0.05),inset_0_1px_rgba(255,255,255,0.35)] [&>button]:text-[hsl(var(--bd-ink))] [&_svg]:h-[17px] [&_svg]:w-[17px]">
            <GlobalSearch />
          </div>
          {/* V6 AI button — gradient bg, white text, matching V6 spec */}
          <button
            type="button"
            aria-label="Ask AI assistant"
            className="grid h-[36px] w-[36px] shrink-0 place-items-center rounded-[12px] text-[10px] font-[800] tracking-[.01em] text-white shadow-[0_2px_6px_rgba(30,28,24,0.05),inset_0_1px_rgba(255,255,255,0.35)] transition active:scale-95"
            style={{ background: 'linear-gradient(135deg, hsl(var(--bd-primary)), hsl(var(--bd-secondary)))' }}
          >
            AI
          </button>
        </div>
      </header>

      <main className="px-[14px] pt-[6px] sm:px-5 md:px-6 lg:px-8">
        {/* V6 Eyebrow */}
        <div className="mb-2 px-[2px] lg:mb-3">
          <span className="text-[8px] font-[800] uppercase tracking-[0.1em] text-[hsl(var(--bd-ink-muted))]">
            Finance pulse · {monthLabel}
          </span>
        </div>

        {/* KPI Metric Grid — 2-col mobile, 4-col desktop */}
        <KpiGrid loading={loading} cards={kpiCards} maxCards={kpiMaxCards} />

        {/* Activity + Payment Reminder: stacked mobile, side-by-side md+ */}
        <div className="mt-[14px] grid gap-[14px] md:mt-5 md:grid-cols-5 md:gap-4 lg:gap-5">
          {/* Recent Activity — 3/5 on tablet+ */}
          <section className="md:col-span-3">
            <h2 className="mb-2 px-[2px] text-[9px] font-[800] uppercase tracking-[0.1em] text-[hsl(var(--bd-ink-muted))] md:mb-3 md:text-[10px]">
              Recent activity
            </h2>

            {loading ? (
              <RecentActivitySkeleton />
            ) : (
              <div className="overflow-hidden rounded-[18px] bg-[hsl(var(--bd-surface))] px-[11px] shadow-[0_12px_28px_color-mix(in_srgb,var(--primary)_8%,transparent),inset_0_1px_rgba(255,255,255,0.18)]">
                {recentDocs.length === 0 ? (
                  <div className="flex flex-col items-center px-4 py-10 text-center">
                    <div className="grid h-[58px] w-[58px] place-items-center rounded-[20px] bg-[hsl(var(--primary)/0.1)]">
                      <ClipboardList className="size-[26px] text-[hsl(var(--primary))]" strokeWidth={1.5} />
                    </div>
                    <div className="mt-4 text-[16px] font-[800] tracking-[-0.05em] text-[hsl(var(--bd-ink))]">
                      No recent activity
                    </div>
                    <div className="mt-1 max-w-[200px] text-[10px] leading-[1.45] text-[hsl(var(--bd-ink-muted))]">
                      Documents you create will appear here
                    </div>
                  </div>
                ) : (
                  recentDocs.slice(0, 6).map((doc) => {
                    const iconStyle = ACTIVITY_ICON_STYLE[doc.type] || ACTIVITY_ICON_STYLE.Invoice
                    const Icon = ACTIVITY_ICON[doc.type] || Receipt
                    const recordValue = formatRecentRecordValue(doc)
                    const meta = formatRecentRecordMeta(doc)

                    return (
                      <button
                        key={`${doc.type}-${doc.id}`}
                        type="button"
                        onClick={() => onRecentDocSelect(doc)}
                        className="flex w-full items-center gap-[9px] border-t border-[hsl(var(--bd-border))/60] px-[11px] py-[9px] text-left first:border-t-0 transition-all active:scale-[0.99] md:px-4 md:py-3"
                      >
                        <div
                          className={cn(
                            'grid h-[32px] w-[32px] shrink-0 place-items-center rounded-[11px] border md:h-[36px] md:w-[36px] md:rounded-[12px]',
                            iconStyle.bg,
                            iconStyle.color,
                            iconStyle.border,
                          )}
                        >
                          <Icon size={15} strokeWidth={1.9} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-[5px]">
                            <span className="text-[11px] font-[800] tracking-[-.03em] text-[hsl(var(--bd-ink))] md:text-[13px]">
                              {doc.number}
                            </span>
                            <StatusBadge status={doc.status} />
                          </div>
                          <div className="mt-[2px] truncate text-[8px] text-[hsl(var(--bd-ink-muted))] md:text-[10px]">
                            {meta}
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <div className="font-[\'DM_Mono\',ui-monospace,SFMono-Regular,Menlo,monospace] text-[10px] font-medium tracking-[-.04em] text-[hsl(var(--bd-ink))] md:text-[12px]">
                            {recordValue}
                          </div>
                          <div className="mt-[3px] font-[var(--font)] text-[7px] text-[hsl(var(--bd-ink-muted))] md:text-[9px]">
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

          {/* Payment Reminder — 2/5 on tablet+ */}
          <section className="md:col-span-2">
            <PaymentReminderBanner />
          </section>
        </div>

        {/* Alerts + Audit Trail: stacked mobile, side-by-side lg+ */}
        <div className="mt-[14px] grid gap-[14px] lg:mt-5 lg:grid-cols-2 lg:gap-5">
          <section>
            <h2 className="mb-2 px-[2px] text-[9px] font-[800] uppercase tracking-[0.1em] text-[hsl(var(--bd-ink-muted))] lg:mb-3 lg:text-[10px]">
              Recent alerts
            </h2>
            <RecentAlertsCarousel />
          </section>

          <section>
            <h2 className="mb-2 px-[2px] text-[9px] font-[800] uppercase tracking-[0.1em] text-[hsl(var(--bd-ink-muted))] lg:mb-3 lg:text-[10px]">
              Audit trail
            </h2>
            <AuditTrailSkeleton />
          </section>
        </div>

        <div className="h-[6px] lg:h-4" />
      </main>
    </div>
  )
}
