/**
 * Dashboard Theme Experiment — Design Lab preview.
 *
 * The experiment mounts the real dashboard presentation at full viewport: the
 * production `Layout` (desktop sidebar, mobile drawer, bottom navigation) and
 * the production `DashboardOverview` (header, KPI grid, recent activity,
 * sections). Five children of `DashboardOverview` read Supabase-backed hooks, so
 * the experiment passes read-only adapters through the shared slot props.
 *
 * Isolation contract:
 *  - The Design Lab theme drives the whole experiment through one scoped token
 *    layer on `.dte-root`. No document-root write, no global stylesheet rule,
 *    no change to the saved user preference.
 *  - Representative data replaces live tenant data. No Supabase read or write
 *    can start from this route.
 *  - Every action control resolves to local preview state or to a preview-only
 *    notice. No business action executes.
 *
 * Theme layers on `.dte-root`:
 *  1. Atmosphere — `getPhotoHeroVars(family, appearance)`: the Design Lab canvas
 *     (scene gradient, light fields, glass recipe, chrome ink).
 *  2. Surface — the theme registry bundle and the PRD semantic tokens for the
 *     same family and appearance, in production HSL-triplet format so every
 *     `hsl(var(--…))` consumer resolves. Material surfaces keep an alpha channel
 *     so the atmospheric canvas reads through the dashboard itself.
 */

import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  BellRing,
  CheckCircle2,
  CircleDotDashed,
  Info,
  Moon,
  Palette,
  Plus,
  Search,
  Sun,
  X,
} from 'lucide-react'

import { DashboardOverview } from '@/components/dashboard/DashboardOverview'
import {
  resolveAppearance,
  useExperimentThemeStyle,
  useIsDesktop,
} from '@/components/design-lab/design-lab-theme'
import { ViewportStage, ViewportSwitcher } from '@/components/design-lab/viewport-stage'
import Layout from '@/components/Layout'
import {
  PHOTO_HERO_FAMILY_META,
  isPhotoHeroFamilyId,
  type PhotoHeroAppearance,
  type PhotoHeroFamilyId,
} from '@/components/onboarding/photo-hero-v2-theme'
import { buildKpiCards, KPI_CARD_COUNT_DESKTOP, KPI_CARD_COUNT_MOBILE } from '@/config/kpiCards'
import { getCreateActions } from '@/config/quickTiles'
import { useThemePreferenceContext } from '@/contexts/ThemePreferenceContext'
import type { UserThemePreference } from '@/hooks/useUserThemePreferences'
import { useDesignLabViewport } from '@/lib/designLabViewports'
import { cn } from '@/lib/utils'
import {
  PREVIEW_ALERTS,
  PREVIEW_AUDIT_ENTRIES,
  PREVIEW_KPI_SELECTION,
  PREVIEW_KPI_STATS,
  PREVIEW_RECENT_DOCS,
  PREVIEW_REMINDER,
  PREVIEW_WORKSPACE,
  type PreviewAlert,
} from './preview-dashboard-data'


const ALERT_ICON: Record<PreviewAlert['severity'], React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle2,
}

/** Read-only stand-in for `NotificationBell` (that component reads Supabase). */
function PreviewNotificationControl({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      aria-label="Notifications (preview only)"
      className="relative grid h-[36px] w-[36px] shrink-0 place-items-center rounded-[12px] bg-[hsl(var(--bd-surface-raised))] text-[hsl(var(--bd-ink))] shadow-[0_2px_6px_rgba(30,28,24,0.05),inset_0_1px_rgba(255,255,255,0.35)] transition active:scale-95"
      onClick={onOpen}
    >
      <Bell className="size-[17px]" strokeWidth={1.9} />
      <span className="absolute right-[9px] top-[8px] h-[6px] w-[6px] rounded-full bg-[hsl(var(--attention))]" />
    </button>
  )
}

/** Read-only stand-in for `GlobalSearch` (that component queries tenant data). */
function PreviewSearchControl({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      aria-label="Search (preview only)"
      className="grid h-[36px] w-[36px] shrink-0 place-items-center rounded-[12px] bg-[hsl(var(--bd-surface-raised))] text-[hsl(var(--bd-ink))] shadow-[0_2px_6px_rgba(30,28,24,0.05),inset_0_1px_rgba(255,255,255,0.35)] transition active:scale-95"
      onClick={onOpen}
    >
      <Search className="size-[17px]" strokeWidth={1.9} />
    </button>
  )
}

/** Read-only copy of `PaymentReminderBanner` with local state and no storage write. */
function PreviewPaymentReminder({
  onAction,
  onDismiss,
}: {
  onAction: () => void
  onDismiss: () => void
}) {
  return (
    <>
      <h2 className="mb-2 px-[2px] text-[9px] font-[800] uppercase tracking-[0.1em] text-[hsl(var(--bd-ink-muted))] md:mb-3 md:text-[10px]">
        Payment reminder
      </h2>
      <section
        aria-label="Payment reminder"
        className="relative overflow-hidden rounded-[18px] bg-[hsl(var(--surface))] shadow-[0_12px_28px_color-mix(in_srgb,hsl(var(--primary))_8%,transparent),inset_0_1px_rgba(255,255,255,0.18)]"
      >
        <div
          className="pointer-events-none absolute -right-[36px] -top-[48px] h-[120px] w-[120px] rounded-full border-[18px] border-transparent opacity-85"
          style={{
            background:
              'conic-gradient(from 180deg, hsl(var(--primary)/0.14), hsl(var(--secondary)/0.13), hsl(var(--primary)/0.14)) border-box',
            WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 18px), #000 calc(100% - 18px))',
            mask: 'radial-gradient(farthest-side, transparent calc(100% - 18px), #000 calc(100% - 18px))',
          }}
        />

        <div className="relative z-10 flex items-start gap-[9px] p-3 md:p-4">
          <div
            className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[12px] text-white"
            style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))' }}
          >
            <BellRing size={16} strokeWidth={1.9} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-[7px] font-[800] uppercase tracking-[0.1em] text-[hsl(var(--bd-ink-muted))]">
              {PREVIEW_REMINDER.eyebrow}
            </div>
            <h3 className="mt-[3px] text-[12px] font-[800] tracking-[-.045em] text-[hsl(var(--bd-ink))] md:text-[14px]">
              {PREVIEW_REMINDER.headline}
            </h3>
            <p className="mt-[2px] text-[9px] leading-[1.4] text-[hsl(var(--bd-ink-muted))] md:text-[11px]">
              {PREVIEW_REMINDER.copy}
            </p>

            <div className="mt-[9px] flex items-center gap-[6px]">
              <button
                type="button"
                onClick={onAction}
                className="inline-flex items-center gap-[6px] rounded-[10px] px-[10px] py-[7px] text-[8px] font-[800] uppercase tracking-[0.065em] text-white transition active:scale-[0.96] md:px-4 md:py-2.5 md:text-[10px]"
                style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))' }}
              >
                Record payments
                <ArrowRight size={12} strokeWidth={1.9} />
              </button>
              <span className="inline-flex items-center gap-[3px] text-[7px] font-[700] text-[hsl(var(--ink-2))]">
                <CircleDotDashed size={11} strokeWidth={1.9} />
                Evergreen
              </span>
            </div>
          </div>

          <button
            type="button"
            aria-label="Dismiss payment reminder"
            onClick={onDismiss}
            className="grid h-[28px] w-[28px] shrink-0 place-items-center rounded-full text-[hsl(var(--bd-ink-muted))] shadow-[0_1px_2px_rgba(15,23,42,0.05),inset_0_1px_rgba(255,255,255,0.25)] transition hover:scale-105 active:scale-95"
          >
            <X size={14} strokeWidth={1.9} />
          </button>
        </div>
      </section>
    </>
  )
}

/** Read-only copy of `RecentAlertsCarousel` with local read state. */
function PreviewAlerts({
  readIds,
  onToggle,
}: {
  readIds: readonly string[]
  onToggle: (id: string) => void
}) {
  return (
    <div className="rounded-[18px] bg-[hsl(var(--surface))] px-[11px] py-[11px] shadow-[0_12px_28px_color-mix(in_srgb,hsl(var(--primary))_8%,transparent),inset_0_1px_rgba(255,255,255,0.18)] md:px-4 md:py-4">
      <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch] md:gap-3">
        {PREVIEW_ALERTS.map((alert) => {
          const Icon = ALERT_ICON[alert.severity]
          const unread = alert.unread && !readIds.includes(alert.id)
          const isWarning = alert.severity === 'warning'

          return (
            <button
              key={alert.id}
              type="button"
              onClick={() => onToggle(alert.id)}
              aria-label={`${alert.title}. Mark as ${unread ? 'read' : 'unread'} in the preview.`}
              className="h-full w-[200px] min-w-[200px] shrink-0 rounded-[16px] bg-[hsl(var(--surface-raised))] p-[10px] text-left shadow-[0_1px_2px_rgba(15,23,42,0.05),inset_0_1px_rgba(255,255,255,0.2)] transition active:scale-[0.99] md:w-[220px] md:min-w-[220px] md:p-3"
            >
              <div className="flex items-start gap-[7px]">
                <div
                  className={cn(
                    'grid h-[29px] w-[29px] shrink-0 place-items-center rounded-[10px]',
                    isWarning
                      ? 'bg-[hsl(var(--attention-soft,hsl(var(--attention)/0.1)))] text-[hsl(var(--attention))]'
                      : 'bg-[hsl(var(--primary)/0.14)] text-[hsl(var(--primary))]',
                  )}
                >
                  <Icon size={14} strokeWidth={1.9} />
                </div>
                <div className="min-w-0">
                  <div className="text-[6px] font-[800] uppercase tracking-[0.13em] text-[hsl(var(--ink-3))] md:text-[7px]">
                    Alert
                  </div>
                  <div className="mt-[2px] line-clamp-2 text-[10px] font-[800] leading-[1.25] text-[hsl(var(--ink))] md:text-[11px]">
                    {alert.title}
                  </div>
                </div>
              </div>

              <p className="mt-[6px] line-clamp-3 text-[8px] leading-[1.4] text-[hsl(var(--ink-2))] md:text-[9px]">
                {alert.body}
              </p>

              <div className="mt-[8px] flex items-center justify-between text-[7px] font-[700] text-[hsl(var(--ink-3))]">
                <span>{alert.time}</span>
                <span>{unread ? 'Unread' : 'Read'}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Read-only copy of the audit trail rows with representative entries. */
function PreviewAuditTrail() {
  return (
    <div className="overflow-hidden rounded-[18px] bg-[hsl(var(--surface))] px-[11px] shadow-[0_12px_28px_color-mix(in_srgb,hsl(var(--primary))_8%,transparent),inset_0_1px_rgba(255,255,255,0.18)]">
      <div className="px-[11px] md:px-4">
        {PREVIEW_AUDIT_ENTRIES.map((entry) => (
          <div
            key={entry.id}
            className="flex gap-[8px] border-t border-[hsl(var(--bd-border))/60] py-[9px] first:border-t-0 md:py-3"
          >
            <div
              className={cn(
                'mt-[3px] h-[6px] w-[6px] shrink-0 rounded-full',
                entry.variant === 'primary'
                  ? 'bg-[hsl(var(--primary))] shadow-[0_0_0_3px_hsl(var(--primary)/0.14)]'
                  : 'bg-[hsl(var(--secondary))] shadow-[0_0_0_3px_hsl(var(--secondary)/0.13)]',
              )}
            />
            <div>
              <div className="text-[9px] font-[700] leading-[1.25] text-[hsl(var(--ink))] md:text-[11px]">
                {entry.text}
              </div>
              <div className="mt-[2px] text-[7px] text-[hsl(var(--ink-3))] md:text-[9px]">{entry.meta}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardThemePreview() {
  const navigate = useNavigate()
  const { preference } = useThemePreferenceContext()

  // Seed from the persisted preference once; the preview then owns its own
  // family and appearance and never writes back.
  const [family, setFamily] = React.useState<PhotoHeroFamilyId>(() =>
    isPhotoHeroFamilyId(preference.themePresetId) ? preference.themePresetId : 'slate-navy',
  )
  const [appearance, setAppearance] = React.useState<PhotoHeroAppearance>(() =>
    resolveAppearance(preference.themeMode),
  )
  const [paletteOpen, setPaletteOpen] = React.useState(false)
  // Viewport selection is local to this experiment. The default is the actual
  // device, so opening the experiment uses the full available viewport.
  const { viewportId, viewport, setViewportId } = useDesignLabViewport()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [reminderDismissed, setReminderDismissed] = React.useState(false)
  const [readAlertIds, setReadAlertIds] = React.useState<string[]>([])
  const [notice, setNotice] = React.useState<string | null>(null)

  const noticeTimer = React.useRef<number | null>(null)
  const paletteRef = React.useRef<HTMLButtonElement | null>(null)
  const popoverRef = React.useRef<HTMLDivElement | null>(null)

  const isDesktop = useIsDesktop()
  // Shared Design Lab theme layer: atmosphere plus the production-format
  // surface tokens, scoped to this experiment root.
  const { rootStyle } = useExperimentThemeStyle(family, appearance)
  // Mirror the production KPI cap for the selected viewport tier: the production
  // dashboard caps at four cards on its phone tier and six above it.
  const kpiCards = React.useMemo(
    () =>
      buildKpiCards(PREVIEW_KPI_STATS, PREVIEW_KPI_SELECTION).slice(
        0,
        viewport.width === null || viewport.width >= 768
          ? KPI_CARD_COUNT_DESKTOP
          : KPI_CARD_COUNT_MOBILE,
      ),
    [viewport.width],
  )
  const createActions = React.useMemo(() => getCreateActions(), [])
  const dashboardPreference = React.useMemo<UserThemePreference>(
    () => ({ ...preference, themeMode: appearance }),
    [preference, appearance],
  )

  const familyLabel = PHOTO_HERO_FAMILY_META.find((item) => item.id === family)?.label ?? family
  const familySwatch = PHOTO_HERO_FAMILY_META.find((item) => item.id === family)?.swatch ?? '#ffffff'

  const notify = React.useCallback((message: string) => {
    setNotice(message)
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(null), 2600)
  }, [])

  // Preview-local replacement for the production preference write. The
  // dashboard's own appearance toggle therefore drives the experiment without
  // touching the saved user preference.
  const handleThemePref = React.useCallback(async (updates: Partial<UserThemePreference>) => {
    const mode = updates.themeMode
    if (mode === 'system') setAppearance(resolveAppearance('system'))
    else if (mode === 'light' || mode === 'dark') setAppearance(mode)
  }, [])

  React.useEffect(
    () => () => {
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current)
    },
    [],
  )

  // Popover dismissal: Escape returns focus to the trigger, outside taps close.
  React.useEffect(() => {
    if (!paletteOpen) return
    popoverRef.current?.querySelector('button')?.focus()

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (popoverRef.current?.contains(target) || paletteRef.current?.contains(target)) return
      setPaletteOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setPaletteOpen(false)
      paletteRef.current?.focus()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [paletteOpen])

  React.useEffect(() => {
    if (!createOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCreateOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [createOpen])

  return (
    <div
      className="dte-root"
      style={rootStyle}
      data-dte-root="dashboard-theme-experiment"
      data-dte-family={family}
      data-dte-appearance={appearance}
    >
      <style>{PREVIEW_CSS}</style>

      <h1 className="dte-vh">Dashboard Theme Experiment</h1>
      <p className="dte-vh" role="status">
        {`Dashboard theme experiment. ${familyLabel} in ${appearance} mode. Preview only.`}
      </p>

      {/* The real dashboard: production chrome, header, KPIs, activity, sections. */}
      <ViewportStage viewport={viewport}>
      <Layout
        title="Dashboard"
        hidePageHeader
        contentClassName="!px-0 !py-0 bg-transparent"
        data-bd-page="dashboard"
      >
        <DashboardOverview
          workspaceName={PREVIEW_WORKSPACE.workspace}
          businessName={PREVIEW_WORKSPACE.business}
          userName={PREVIEW_WORKSPACE.user}
          userId="design-lab-preview"
          loading={false}
          kpiCards={kpiCards}
          recentDocs={PREVIEW_RECENT_DOCS}
          onRecentDocSelect={() => notify('Preview only — no document was opened.')}
          onViewAllActivity={() => notify('Preview only — the activity log is not opened.')}
          preference={dashboardPreference}
          saveThemePref={handleThemePref}
          searchSlot={<PreviewSearchControl onOpen={() => notify('Preview only — search is disabled.')} />}
          notificationSlot={
            <PreviewNotificationControl onOpen={() => notify('Preview only — notifications are not opened.')} />
          }
          paymentReminderSlot={
            reminderDismissed ? null : (
              <PreviewPaymentReminder
                onAction={() => notify('Preview only — no invoice or payment was recorded.')}
                onDismiss={() => setReminderDismissed(true)}
              />
            )
          }
          alertsSlot={
            <PreviewAlerts
              readIds={readAlertIds}
              onToggle={(id) =>
                setReadAlertIds((current) =>
                  current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
                )
              }
            />
          }
          auditSlot={<PreviewAuditTrail />}
        />

        {createOpen ? (
          <>
            <div
              className="fixed inset-0 z-[45] bg-black/40"
              onClick={() => setCreateOpen(false)}
              aria-hidden="true"
            />
            <div
              id="dte-create-panel"
              role="dialog"
              aria-label="Create actions preview"
              className={cn(
                'fixed bottom-[calc(82px+60px+env(safe-area-inset-bottom,0px))] right-4 z-50 rounded-[18px] border border-bd-overlay-border bg-bd-overlay-bg p-1.5 shadow-2xl lg:bottom-auto lg:top-[calc(4rem+60px)] lg:right-8',
                isDesktop ? 'w-[min(20rem,calc(100vw-2rem))]' : 'w-[min(18rem,calc(100vw-1rem))]',
              )}
            >
              <div className="bd-custom-scrollbar max-h-[min(24rem,calc(100dvh-12rem))] space-y-1 overflow-y-auto">
                {createActions.map(
                  (action: { id: string; label: string; icon: React.ComponentType<{ className?: string }> }) => {
                    const Icon = action.icon
                    return (
                      <button
                        key={action.id}
                        type="button"
                        onClick={() => {
                          setCreateOpen(false)
                          notify('Preview only — no record was created.')
                        }}
                        className="flex w-full items-center gap-3 whitespace-nowrap rounded-xl border border-bd-surface-action-border bg-bd-surface-action px-3 py-2 text-left transition-all hover:bg-bd-surface-action-hover active:scale-[0.98]"
                      >
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-bd-action-icon-bg text-bd-action-icon-text shadow-sm [&_svg]:h-3.5 [&_svg]:w-3.5">
                          <Icon />
                        </span>
                        <span className="text-[12px] font-bold tracking-tight text-bd-surface-action-text">
                          {action.label}
                        </span>
                      </button>
                    )
                  },
                )}
              </div>
            </div>
          </>
        ) : null}

        <button
          type="button"
          onClick={() => setCreateOpen((open) => !open)}
          aria-expanded={createOpen}
          aria-haspopup="true"
          aria-controls="dte-create-panel"
          className="fixed right-4 z-50 grid h-[50px] w-[50px] place-items-center rounded-[18px] text-white transition active:scale-90 lg:right-8 lg:top-24"
          style={{
            bottom: 'calc(82px + env(safe-area-inset-bottom, 0px))',
            background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))',
            boxShadow: '0 10px 24px color-mix(in srgb, hsl(var(--primary)) 40%, transparent)',
          }}
          aria-label="Create new record (preview only)"
        >
          <Plus className="h-5 w-5" strokeWidth={2} />
        </button>
      </Layout>
      </ViewportStage>

      {/* Compact floating palette, outside the dashboard scroll flow. */}
      <div className="dte-dock">
        <button
          ref={paletteRef}
          type="button"
          className="dte-dock-btn active:scale-95"
          aria-expanded={paletteOpen}
          aria-controls="dte-palette"
          aria-label={paletteOpen ? 'Close theme palette' : 'Open theme palette'}
          onClick={() => setPaletteOpen((open) => !open)}
        >
          <Palette className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden="true" />
          <span className="dte-dock-dot" style={{ ['--swatch' as string]: familySwatch }} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="dte-dock-btn active:scale-95"
          aria-label="Close experiment and return to Design Lab"
          onClick={() => navigate('/design-lab')}
        >
          <X className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      {paletteOpen ? (
        <div ref={popoverRef} id="dte-palette" className="dte-pop" role="dialog" aria-label="Experiment theme palette">
          <div className="dte-pop-group" role="group" aria-label="Theme family">
            {PHOTO_HERO_FAMILY_META.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={family === item.id}
                aria-label={`Use ${item.label}`}
                onClick={() => setFamily(item.id)}
              >
                <span className="dte-pop-dot" style={{ ['--swatch' as string]: item.swatch }} aria-hidden="true" />
                {item.short}
              </button>
            ))}
          </div>

          <div className="dte-pop-group" role="group" aria-label="Appearance">
            <button
              type="button"
              aria-pressed={appearance === 'light'}
              aria-label="Use light appearance"
              onClick={() => setAppearance('light')}
            >
              <Sun className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              Light
            </button>
            <button
              type="button"
              aria-pressed={appearance === 'dark'}
              aria-label="Use dark appearance"
              onClick={() => setAppearance('dark')}
            >
              <Moon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              Dark
            </button>
          </div>

          <div className="dte-pop-group dte-pop-group--viewport">
            <ViewportSwitcher viewportId={viewportId} onSelect={setViewportId} />
          </div>

          <button
            type="button"
            className="dte-pop-close"
            onClick={() => {
              setPaletteOpen(false)
              paletteRef.current?.focus()
            }}
          >
            Close
          </button>
        </div>
      ) : null}

      {notice ? (
        <p className="dte-notice" role="status">
          {notice}
        </p>
      ) : null}
    </div>
  )
}

const PREVIEW_CSS = `
  /* Experiment scope. No rule here targets html, body, or :root. */
  .dte-root{position:relative;min-height:100dvh}
  .dte-vh{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}

  /* Design Lab canvas: the atmospheric scene replaces the flat app background. */
  .dte-root [data-bd-shell="app"]{
    background-color:transparent;
    background-image:var(--scene-intro);
    background-attachment:fixed;
    background-size:cover;
  }
  .dte-root::before,
  .dte-root::after{
    content:"";
    position:fixed;
    z-index:0;
    pointer-events:none;
    border-radius:999px;
    filter:blur(70px);
  }
  .dte-root::before{
    width:min(58vw,560px);
    height:min(42vh,420px);
    left:-14%;
    top:-8%;
    background:var(--field-a);
    opacity:.20;
  }
  .dte-root::after{
    width:min(52vw,500px);
    height:min(38vh,380px);
    right:-12%;
    bottom:-6%;
    background:var(--field-b);
    opacity:.16;
  }

  /* The dashboard's own chrome and cards carry the atmosphere. */
  .dte-root [data-bd-page="dashboard"] header{
    background:linear-gradient(180deg,hsl(var(--dlv-chrome,var(--bd-app-bg))/.82) 72%,hsl(var(--dte-chrome,var(--bd-app-bg))/0) 100%) !important;
    -webkit-backdrop-filter:blur(14px) saturate(140%);
    backdrop-filter:blur(14px) saturate(140%);
  }
  .dte-root[data-dte-appearance="dark"] [data-bd-page="dashboard"] header{
    background:linear-gradient(180deg,hsl(var(--dlv-chrome,var(--bd-app-bg))/.68) 72%,hsl(var(--dte-chrome,var(--bd-app-bg))/0) 100%) !important;
  }
  .dte-root [data-bd-page="dashboard"] article{
    border:1px solid var(--glass-line);
    -webkit-backdrop-filter:blur(12px) saturate(130%);
    backdrop-filter:blur(12px) saturate(130%);
  }

  /* Root .dark rules cannot follow the preview, so the two trend colours that
     the dashboard hardcodes are corrected for the selected appearance. */
  .dte-root[data-dte-appearance="dark"] .text-emerald-600,
  .dte-root[data-dte-appearance="dark"] .text-emerald-500,
  .dte-root[data-dte-appearance="dark"] .dark\\:text-emerald-400{color:#34d399}
  .dte-root[data-dte-appearance="dark"] .text-rose-600,
  .dte-root[data-dte-appearance="dark"] .dark\\:text-rose-400{color:#fb7185}
  .dte-root[data-dte-appearance="light"] .dark\\:text-emerald-400{color:#047857}
  .dte-root[data-dte-appearance="light"] .dark\\:text-rose-400{color:#be123c}

  /* Simulated viewports: the surface is a size container, so the production
     layout tiers are restated against it. Nothing is scaled; a wider preset
     scrolls horizontally instead. In actual-device mode these rules never
     match, and production media queries decide the composition. */
  @container dlv (max-width: 767.9px){
    [data-dlv-sim] .dte-root [data-bd-shell="app"]{flex-direction:column}
    [data-dlv-sim] .dte-root [data-bd-shell="app"] > aside{display:none}
    [data-dlv-sim] .dte-root [data-bd-shell="app"] > div.md\\:hidden{display:block}
    [data-dlv-sim] .dte-root [data-bd-shell="main"] > div.md\\:hidden{display:block}
    [data-dlv-sim] .dte-root [data-bd-shell="main"] > div.hidden.md\\:block{display:none}
    [data-dlv-sim] .dte-root .dlv-surface [class~="md:grid-cols-3"]{grid-template-columns:repeat(2,minmax(0,1fr))}
  }
  @container dlv (min-width: 768px){
    [data-dlv-sim] .dte-root [data-bd-shell="app"]{flex-direction:row}
    [data-dlv-sim] .dte-root [data-bd-shell="app"] > aside{display:flex}
    [data-dlv-sim] .dte-root [data-bd-shell="app"] > div.md\\:hidden{display:none}
    [data-dlv-sim] .dte-root [data-bd-shell="main"] > div.md\\:hidden{display:none}
    [data-dlv-sim] .dte-root [data-bd-shell="main"] > div.hidden.md\\:block{display:block}
    [data-dlv-sim] .dte-root .dlv-surface [class~="md:grid-cols-3"]{grid-template-columns:repeat(3,minmax(0,1fr))}
  }
  @container dlv (min-width: 1024px){
    [data-dlv-sim] .dte-root .dlv-surface [class~="md:grid-cols-3"]{grid-template-columns:repeat(4,minmax(0,1fr))}
  }

  /* Compact floating controls, bottom left, clear of the navigation and the FAB. */
  .dte-dock{
    position:fixed;
    z-index:70;
    left:12px;
    bottom:calc(84px + env(safe-area-inset-bottom,0px));
    display:flex;
    align-items:center;
    gap:8px;
  }
  .dte-dock-btn{
    position:relative;
    display:grid;
    width:44px;
    height:44px;
    place-items:center;
    border:1px solid var(--glass-line);
    border-radius:14px;
    background:var(--glass-bg);
    color:var(--glass-ink);
    -webkit-backdrop-filter:blur(18px) saturate(150%);
    backdrop-filter:blur(18px) saturate(150%);
    box-shadow:0 18px 44px var(--glass-shadow);
  }
  .dte-dock-dot{
    position:absolute;
    right:6px;
    bottom:6px;
    width:10px;
    height:10px;
    border-radius:999px;
    background:var(--swatch);
    box-shadow:0 0 0 2px var(--glass-bg);
  }
  .dte-pop{
    position:fixed;
    z-index:71;
    left:12px;
    bottom:calc(140px + env(safe-area-inset-bottom,0px));
    display:flex;
    flex-direction:column;
    gap:8px;
    width:min(340px,calc(100vw - 24px));
    max-height:calc(100dvh - 180px);
    overflow-y:auto;
    padding:8px;
    border:1px solid var(--glass-line);
    border-radius:18px;
    background:var(--glass-bg);
    color:var(--glass-ink);
    -webkit-backdrop-filter:blur(18px) saturate(150%);
    backdrop-filter:blur(18px) saturate(150%);
    box-shadow:0 18px 44px var(--glass-shadow);
  }
  .dte-pop-group{display:flex;align-items:center;flex-wrap:wrap;gap:4px}
  .dte-pop button{
    display:inline-flex;
    align-items:center;
    gap:7px;
    min-height:36px;
    padding:0 11px;
    border-radius:12px;
    color:var(--glass-ink);
    font-size:11px;
    font-weight:800;
    letter-spacing:.01em;
    opacity:.78;
    transition:background .16s ease,color .16s ease,opacity .16s ease;
  }
  .dte-pop button[aria-pressed="true"]{
    background:var(--chrome-ink);
    color:var(--primary-ink);
    opacity:1;
  }
  .dte-pop-dot{
    width:10px;
    height:10px;
    border-radius:999px;
    background:var(--swatch);
    box-shadow:0 0 0 2px rgba(128,128,128,.25),0 0 18px var(--swatch);
  }
  .dte-pop-close{
    justify-content:center;
    width:100%;
    border-top:1px solid var(--glass-line);
    border-radius:0 0 12px 12px;
  }
  .dte-notice{
    position:fixed;
    z-index:72;
    right:12px;
    bottom:calc(140px + env(safe-area-inset-bottom,0px));
    max-width:min(78vw,360px);
    margin:0;
    padding:10px 14px;
    border:1px solid var(--glass-line);
    border-radius:14px;
    background:var(--glass-bg);
    color:var(--chrome-ink);
    font-size:12px;
    font-weight:700;
    -webkit-backdrop-filter:blur(18px) saturate(150%);
    backdrop-filter:blur(18px) saturate(150%);
    box-shadow:0 18px 44px var(--glass-shadow);
  }
  .dte-root .dte-dock-btn:focus-visible,
  .dte-pop :focus-visible{
    outline:2px solid var(--hero-accent);
    outline-offset:2px;
  }

  /* The desktop sidebar takes the left column, so the dock moves into the
     content area on tablet and desktop frames. */
  @media (min-width:768px){
    .dte-dock{left:calc(16rem + 16px);bottom:20px}
    .dte-pop{left:calc(16rem + 16px);bottom:76px}
    .dte-notice{bottom:96px}
  }
  @media (prefers-reduced-transparency:reduce){
    .dte-dock-btn,.dte-pop,.dte-notice{
      -webkit-backdrop-filter:none;
      backdrop-filter:none;
      background:var(--scene-intro);
      color:var(--chrome-ink);
    }
    .dte-root [data-bd-page="dashboard"] article{-webkit-backdrop-filter:none;backdrop-filter:none}
  }
  @media (prefers-reduced-motion:reduce){
    .dte-dock-btn,.dte-pop button{transition:none}
  }
`
