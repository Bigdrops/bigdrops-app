/**
 * Android Update Experience — Design Lab prototype.
 *
 * A self-contained, interactive preview of the proposed BOUXRE Android update
 * dialog. It exists so the product owner can inspect the composition and every
 * state before any production implementation is authorised.
 *
 * Isolation contract:
 *  - No production updater state is read or written. Nothing here imports
 *    `useAppUpdate`, `src/lib/native/apkUpdate.ts`, the acknowledgement client,
 *    or the release-policy client.
 *  - No download, install, dismissal or acknowledgement can occur. Every action
 *    resolves to local preview state or to a preview-only notice.
 *  - Sample release data lives in this module and `preview-domain.ts`. It is
 *    never written to a policy row, fixture, or backend record.
 *  - The only production code reused is read-only presentation: the
 *    `ChangelogTimeline` component and the `parseReleaseNotes` /
 *    `describeGraceRemaining` helpers.
 *
 * Layout responds to the *simulated* viewport, not the host window: the stage
 * is a named size container (`aup`), so the Design Lab viewport switcher
 * genuinely changes the composition instead of scaling it.
 */

import * as React from 'react'
import {
  ArrowDownToLine,
  Check,
  ChevronDown,
  Clock,
  FileText,
  Globe,
  RotateCcw,
  X,
  Zap,
} from 'lucide-react'

import { ChangelogTimeline } from '@/components/app/update/ChangelogTimeline'
import {
  resolveAppearance,
  useExperimentThemeStyle,
} from '@/components/design-lab/design-lab-theme'
import { ViewportStage, ViewportSwitcher } from '@/components/design-lab/viewport-stage'
import {
  isPhotoHeroFamilyId,
  PHOTO_HERO_FAMILY_META,
  type PhotoHeroAppearance,
  type PhotoHeroFamilyId,
} from '@/components/onboarding/photo-hero-v2-theme'
import { useThemePreferenceContext } from '@/contexts/ThemePreferenceContext'
import { parseReleaseNotes } from '@/domain/appUpdate/changelog'
import { useDesignLabViewport } from '@/lib/designLabViewports'
import {
  PREVIEW_PHASES,
  PREVIEW_RELEASE,
  PREVIEW_RELEASE_NOTES,
  PREVIEW_RELEASE_SUMMARY,
  canDismiss,
  computePercentage,
  computeTransferBytesPerSecond,
  describeCountdown,
  formatAssetSize,
  formatTransferProgress,
  formatTransferSpeed,
  primaryActionLabel,
  type PreviewPhase,
} from './preview-domain'
import './android-update-preview.css'

type CountdownMode = 'normal' | 'expiring' | 'expired'

const COUNTDOWN_MODES: ReadonlyArray<{ id: CountdownMode; label: string }> = [
  { id: 'normal', label: 'Running' },
  { id: 'expiring', label: 'Expiring' },
  { id: 'expired', label: 'Expired' },
]

/** Simulated transfer cadence. 250ms ticks, ~1.2 MB/s nominal. */
const TICK_MS = 250
const NOMINAL_BYTES_PER_TICK = (1.2 * 1024 * 1024) / (1000 / TICK_MS)

function resolveFamily(value: unknown): PhotoHeroFamilyId {
  return isPhotoHeroFamilyId(value) ? value : 'slate-navy'
}

export default function AndroidUpdatePreview() {
  const { preference } = useThemePreferenceContext()
  // Seeded from the persisted preference once, then owned locally like the
  // sibling Design Lab experiments. Never writes back to the user preference.
  const [family, setFamily] = React.useState<PhotoHeroFamilyId>(() =>
    resolveFamily(preference.themePresetId),
  )
  const [appearance, setAppearance] = React.useState<PhotoHeroAppearance>(() =>
    resolveAppearance(preference.themeMode),
  )
  const { rootStyle } = useExperimentThemeStyle(family, appearance)
  const { viewportId, viewport, setViewportId } = useDesignLabViewport()

  const [phase, setPhase] = React.useState<PreviewPhase>('idle')
  const [countdownMode, setCountdownMode] = React.useState<CountdownMode>('normal')
  const [notesOpen, setNotesOpen] = React.useState(false)
  const [downloadedBytes, setDownloadedBytes] = React.useState(0)
  const [speed, setSpeed] = React.useState<number | null>(null)
  const [notice, setNotice] = React.useState<string | null>(null)

  const [nowMs, setNowMs] = React.useState(() => Date.now())
  const [deadlineMs, setDeadlineMs] = React.useState(
    () => Date.now() + PREVIEW_RELEASE.graceWindowMs,
  )

  const bytesRef = React.useRef(0)
  const sampleRef = React.useRef<{ bytes: number; atMs: number } | null>(null)

  const entries = React.useMemo(() => parseReleaseNotes(PREVIEW_RELEASE_NOTES).entries, [])

  // The countdown is the only thing that ticks while idle, so it runs for the
  // whole life of the preview.
  React.useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  // Simulated transfer. Progress advances from sampled byte counts; the speed
  // readout is measured from those samples, never invented.
  React.useEffect(() => {
    if (phase !== 'downloading') return
    const total = PREVIEW_RELEASE.totalBytes
    let tick = 0

    const timer = window.setInterval(() => {
      tick += 1
      const wobble = 1 + 0.18 * Math.sin(tick / 2)
      const step = Math.round(NOMINAL_BYTES_PER_TICK * wobble)
      const atMs = Date.now()
      const next = Math.min(total, bytesRef.current + step)
      const measured = computeTransferBytesPerSecond(sampleRef.current, { bytes: next, atMs })

      sampleRef.current = { bytes: next, atMs }
      bytesRef.current = next
      setDownloadedBytes(next)
      if (measured !== null) setSpeed(measured)
    }, TICK_MS)

    return () => window.clearInterval(timer)
  }, [phase])

  React.useEffect(() => {
    if (phase === 'downloading' && downloadedBytes >= PREVIEW_RELEASE.totalBytes) {
      setPhase('downloaded')
    }
  }, [phase, downloadedBytes])

  const resetDownload = React.useCallback(() => {
    bytesRef.current = 0
    sampleRef.current = null
    setDownloadedBytes(0)
    setSpeed(null)
  }, [])

  const startDownload = React.useCallback(() => {
    resetDownload()
    setNotice('Preview only — no file is downloaded.')
    setPhase('downloading')
  }, [resetDownload])

  const cancelDownload = React.useCallback(() => {
    resetDownload()
    setNotice('Preview only — the simulated download was cancelled.')
    setPhase('idle')
  }, [resetDownload])

  const installUpdate = React.useCallback(() => {
    setNotice('Preview only — no package installer was launched.')
    setPhase('installing')
  }, [])

  const applyCountdownMode = React.useCallback((mode: CountdownMode) => {
    const base = Date.now()
    setCountdownMode(mode)
    setDeadlineMs(
      mode === 'expired'
        ? base - 1000
        : mode === 'expiring'
          ? base + 45_000
          : base + PREVIEW_RELEASE.graceWindowMs,
    )
  }, [])

  const resetAll = React.useCallback(() => {
    resetDownload()
    setPhase('idle')
    setNotesOpen(false)
    setNotice(null)
    applyCountdownMode('normal')
  }, [applyCountdownMode, resetDownload])

  const countdown = describeCountdown(deadlineMs, nowMs)
  const dismissible = canDismiss(deadlineMs, nowMs)
  const percentage = computePercentage(downloadedBytes, PREVIEW_RELEASE.totalBytes)
  const isDownloading = phase === 'downloading'
  const isDownloaded = phase === 'downloaded'
  const isInstalling = phase === 'installing'

  const primaryLabel = primaryActionLabel(phase, PREVIEW_RELEASE.versionLabel)
  const onPrimary = () => {
    if (isDownloading) return cancelDownload()
    if (isDownloaded) return installUpdate()
    if (isInstalling) return
    return startDownload()
  }

  return (
    <div
      className="aup-root"
      style={rootStyle}
      data-aup-root="android-update-experience"
      data-aup-appearance={appearance}
      data-aup-phase={phase}
    >
      <h1 className="aup-vh">Android Update Experience</h1>

      {/* Reviewer console. Outside the dialog surface on purpose: the dialog is
          the design under review and must stay free of prototype chrome. */}
      <div className="aup-console">
        <div className="aup-console-head">
          <span className="aup-console-title">Reviewer controls</span>
          <span className="aup-chip">Preview data</span>
        </div>

        <div className="aup-console-row" role="group" aria-label="Update state">
          {PREVIEW_PHASES.map((item) => (
            <button
              key={item.id}
              type="button"
              className="aup-ctl"
              aria-pressed={phase === item.id}
              onClick={() => {
                if (item.id === 'downloading') return startDownload()
                resetDownload()
                setPhase(item.id)
                setNotice(`Preview only — showing the ${item.label.toLowerCase()} state.`)
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="aup-console-row" role="group" aria-label="Grace period">
          {COUNTDOWN_MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              className="aup-ctl"
              aria-pressed={countdownMode === item.id}
              onClick={() => applyCountdownMode(item.id)}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            className="aup-ctl"
            aria-pressed={notesOpen}
            onClick={() => setNotesOpen((open) => !open)}
          >
            {notesOpen ? 'Notes open' : 'Notes closed'}
          </button>
          <button type="button" className="aup-ctl aup-ctl-reset" onClick={resetAll}>
            <RotateCcw className="aup-ctl-icon" aria-hidden="true" />
            Reset
          </button>
        </div>

        <div className="aup-console-row" role="group" aria-label="Theme family">
          {PHOTO_HERO_FAMILY_META.map((item) => (
            <button
              key={item.id}
              type="button"
              className="aup-ctl"
              aria-pressed={family === item.id}
              aria-label={`Use ${item.label} theme`}
              onClick={() => setFamily(item.id)}
            >
              <span
                className="aup-ctl-dot"
                style={{ ['--swatch' as string]: item.swatch }}
                aria-hidden="true"
              />
              {item.short}
            </button>
          ))}
        </div>

        <div className="aup-console-row" role="group" aria-label="Appearance">
          <button
            type="button"
            className="aup-ctl"
            aria-pressed={appearance === 'light'}
            aria-label="Use light appearance"
            onClick={() => setAppearance('light')}
          >
            Light
          </button>
          <button
            type="button"
            className="aup-ctl"
            aria-pressed={appearance === 'dark'}
            aria-label="Use dark appearance"
            onClick={() => setAppearance('dark')}
          >
            Dark
          </button>
        </div>

        <div className="aup-console-row">
          <ViewportSwitcher viewportId={viewportId} onSelect={setViewportId} />
        </div>

        <p className="aup-notice" role="status">
          {notice ?? 'Sample release data. No download, install or acknowledgement occurs.'}
        </p>
      </div>

      <ViewportStage viewport={viewport} className="aup-stage">
        <div className="aup-scrim">
          <div className="aup-sheet">
            <div className="aup-card" role="dialog" aria-modal="false" aria-labelledby="aup-title">
              {/* Corner wave: the reference's organic amber sweep, drawn as
                  vector paths so the edge stays crisp at every width. */}
              <svg
                className="aup-wave"
                viewBox="0 0 400 120"
                preserveAspectRatio="none"
                aria-hidden="true"
                focusable="false"
              >
                <defs>
                  {/* Deeper amber liquid body. */}
                  <linearGradient id="aup-wave-body" x1="0" y1="0" x2="0.6" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--aup-accent))" stopOpacity="0.06" />
                    <stop offset="48%" stopColor="hsl(var(--aup-accent))" stopOpacity="0.38" />
                    <stop offset="100%" stopColor="hsl(var(--aup-accent-strong))" stopOpacity="0.80" />
                  </linearGradient>
                  {/* Softer translucent cream/milk crest riding on top. */}
                  <linearGradient id="aup-wave-crest" x1="0" y1="0" x2="0.5" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--aup-solid))" stopOpacity="0" />
                    <stop offset="60%" stopColor="hsl(var(--aup-solid))" stopOpacity="0.34" />
                    <stop offset="100%" stopColor="hsl(var(--aup-accent))" stopOpacity="0.42" />
                  </linearGradient>
                </defs>
                {/* Two paths, each wider than the viewBox, so the transform can
                    slide and tilt them without exposing an edge. */}
                <g className="aup-wave-body-layer">
                  <path
                    d="M-40 0 L440 0 L440 54 C380 58 344 22 268 14 C206 7 150 2 96 2 C40 2 4 12 -40 22 Z"
                    fill="url(#aup-wave-body)"
                  />
                </g>
                <g className="aup-wave-crest-layer">
                  <path
                    d="M-40 0 L440 0 L440 30 C382 34 350 10 282 6 C220 2 168 0 112 0 C52 0 8 8 -40 14 Z"
                    fill="url(#aup-wave-crest)"
                  />
                </g>
              </svg>
              {/* Header: brand badge, identity, dismiss */}
              <header className="aup-head">
                {/* Authentic BOUXRE ribbon icon from public/favicon.svg. Do not
                    hand-draw a replacement — it is the derived master asset. */}
                <span className="aup-badge">
                  <img
                    src="/favicon.svg"
                    alt="BOUXRE"
                    className="aup-badge-img"
                    width="52"
                    height="52"
                  />
                </span>
                <div className="aup-head-text">
                  <h2 id="aup-title" className="aup-title">
                    Update available
                  </h2>
                  <p className="aup-subtitle">
                    BOUXRE release {PREVIEW_RELEASE.versionLabel}
                  </p>
                </div>
                {dismissible ? (
                  <button
                    type="button"
                    className="aup-close"
                    aria-label="Dismiss update notice (preview only)"
                    onClick={() => setNotice('Preview only — nothing was dismissed.')}
                  >
                    <X className="aup-close-icon" aria-hidden="true" />
                  </button>
                ) : null}
              </header>

              <div className="aup-body">
                {/* Status area: countdown, then transfer */}
                <div className="aup-status" data-aup-status={phase}>
                  <div
                    className={`aup-countdown${countdown.expired ? ' aup-countdown-expired' : ''}`}
                  >
                    <span className="aup-countdown-ring" aria-hidden="true">
                      <Clock className="aup-countdown-icon" />
                    </span>
                    <span className="aup-countdown-divider" aria-hidden="true" />
                    <div className="aup-countdown-body">
                      {countdown.expired ? (
                        <p className="aup-countdown-value">Grace period ended</p>
                      ) : (
                        <p className="aup-countdown-value">
                          <span>
                            {countdown.days}d {countdown.hours}h {countdown.minutes}m
                          </span>{' '}
                          <span className="aup-countdown-seconds">{countdown.seconds}s</span>
                        </p>
                      )}
                      <p className="aup-countdown-caption">
                        {countdown.expired
                          ? 'Update required to keep using BOUXRE'
                          : 'Time left before the update pauses'}
                      </p>
                    </div>
                  </div>

                  {isDownloading ? (
                    <div className="aup-transfer">
                      <div className="aup-transfer-head">
                        <span className="aup-transfer-title">Downloading update…</span>
                        <span className="aup-transfer-percent">{Math.round(percentage)}%</span>
                      </div>
                      <div
                        className="aup-bar"
                        role="progressbar"
                        aria-label="Simulated download progress"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(percentage)}
                      >
                        <span className="aup-bar-fill" style={{ width: `${percentage}%` }} />
                      </div>
                      <div className="aup-transfer-meta">
                        <span className="aup-transfer-bytes">
                          <ArrowDownToLine className="aup-meta-icon" aria-hidden="true" />
                          {formatTransferProgress(downloadedBytes, PREVIEW_RELEASE.totalBytes)}
                        </span>
                        <span className="aup-transfer-speed">
                          <Zap className="aup-meta-icon" aria-hidden="true" />
                          {formatTransferSpeed(speed)}
                        </span>
                      </div>
                    </div>
                  ) : isDownloaded ? (
                    <div className="aup-transfer">
                      <div className="aup-transfer-head">
                        <span className="aup-transfer-title">Download complete</span>
                        <span className="aup-transfer-percent">100%</span>
                      </div>
                      <div
                        className="aup-bar"
                        role="progressbar"
                        aria-label="Simulated download progress"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={100}
                      >
                        <span className="aup-bar-fill" style={{ width: '100%' }} />
                      </div>
                      <p className="aup-transfer-ready">
                        <Check className="aup-meta-icon" aria-hidden="true" />
                        Ready to install BOUXRE {PREVIEW_RELEASE.versionLabel}
                      </p>
                    </div>
                  ) : isInstalling ? (
                    <div className="aup-transfer">
                      <div className="aup-transfer-head">
                        <span className="aup-transfer-title">Installing…</span>
                        <span className="aup-transfer-percent">100%</span>
                      </div>
                      <div
                        className="aup-bar"
                        role="progressbar"
                        aria-label="Simulated install progress"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={100}
                      >
                        <span className="aup-bar-fill" style={{ width: '100%' }} />
                      </div>
                      <p className="aup-transfer-ready">
                        The installer would open here. Nothing is launched in this preview.
                      </p>
                    </div>
                  ) : (
                    <p className="aup-asset-line">
                      <ArrowDownToLine className="aup-meta-icon" aria-hidden="true" />
                      {formatAssetSize(PREVIEW_RELEASE.totalBytes)} · Android package
                    </p>
                  )}
                </div>

                {/* Content area: release notes, then actions */}
                <div className="aup-content">
                  <div className={`aup-notes${notesOpen ? ' aup-notes-open' : ''}`}>
                    <button
                      type="button"
                      className="aup-notes-toggle"
                      aria-expanded={notesOpen}
                      aria-controls="aup-notes-panel"
                      onClick={() => setNotesOpen((open) => !open)}
                    >
                      <span className="aup-notes-tile" aria-hidden="true">
                        <FileText className="aup-notes-icon" />
                      </span>
                      <span className="aup-notes-text">
                        <span className="aup-notes-title">
                          BOUXRE {PREVIEW_RELEASE.versionLabel}
                        </span>
                        <span className="aup-notes-summary">{PREVIEW_RELEASE_SUMMARY}</span>
                      </span>
                      <ChevronDown className="aup-notes-chevron" aria-hidden="true" />
                    </button>

                    {notesOpen ? (
                      <div id="aup-notes-panel" className="aup-notes-panel">
                        <ChangelogTimeline
                          entries={entries}
                          versionLabel={PREVIEW_RELEASE.versionLabel}
                          variant="compact"
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="aup-actions">
                    <button
                      type="button"
                      className="aup-btn aup-btn-primary"
                      onClick={onPrimary}
                      disabled={isInstalling}
                    >
                      {primaryLabel}
                    </button>
                    <button
                      type="button"
                      className="aup-btn aup-btn-secondary"
                      onClick={() => setNotice('Preview only — no web download was opened.')}
                    >
                      <Globe className="aup-btn-icon" aria-hidden="true" />
                      Download on Web
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <p className="aup-footnote">
              Preview only. Sample release data; no download, install or acknowledgement occurs.
            </p>
          </div>
        </div>
      </ViewportStage>
    </div>
  )
}

