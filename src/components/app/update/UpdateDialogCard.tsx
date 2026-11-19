/**
 * Production Android update card.
 *
 * This is the approved Design Lab "Android Update Experience" composition,
 * rebuilt against the real `useAppUpdate` result. It renders only data the
 * hook or the validated policy supplies: no sample release, no invented
 * deadline, no guessed transfer size and no fabricated speed.
 *
 * The card is shared by the dashboard dialog (`UpdateModal`) and the
 * mandatory-update gate (`UpdateGate`). Dismissal is a callback owned by the
 * caller: closing the dialog never cancels the native download.
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
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { parseReleaseNotes } from '@/domain/appUpdate/changelog'
import {
  formatMegabytes,
  formatVersionLabel,
} from '@/domain/appUpdate/updateStateMachine'
import type { UseAppUpdateResult } from '@/hooks/useAppUpdate'
import {
  computePercentage,
  describeCountdown,
  formatTransferSpeed,
  primaryActionLabel,
  releaseNotesSummary,
  sampleTransferSpeed,
  type ByteSample,
} from './updateDialogModel'
import './update-dialog-card.css'

export interface UpdateDialogCardProps {
  update: UseAppUpdateResult
  /** Closes the containing dialog only; it must never cancel the download. */
  onDismiss?: () => void
  /** `gate` is the blocking page surface and never offers a dismiss control. */
  variant?: 'dialog' | 'gate'
  titleId?: string
  descriptionId?: string
}

export default function UpdateDialogCard({
  update,
  onDismiss,
  variant = 'dialog',
  titleId = 'udl-title',
  descriptionId = 'udl-subtitle',
}: UpdateDialogCardProps) {
  const {
    state,
    release,
    downloadPhase,
    startInAppDownload,
    cancelInAppDownload,
    installDownloadedApk,
    openWebDownload,
  } = update

  const policy = state.policy
  const versionLabel = formatVersionLabel(policy?.versionName, policy?.versionCode)
  const deadlineMs = state.graceDeadlineMs
  const webUrl = policy?.webReleaseUrl ?? release?.webUrl ?? null
  const assetSizeBytes = release?.assets[0]?.sizeBytes ?? null

  const [nowMs, setNowMs] = React.useState(() => Date.now())
  const [notesOpen, setNotesOpen] = React.useState(false)
  const [speed, setSpeed] = React.useState<number | null>(null)
  const sampleRef = React.useRef<ByteSample | null>(null)
  const downloadedRef = React.useRef<number | null>(null)
  const notesPanelId = React.useId()

  const changelog = React.useMemo(() => parseReleaseNotes(policy?.releaseNotes), [policy?.releaseNotes])

  // The live countdown is the only always-on clock. It reads the real grace
  // deadline from the hook; no deadline means no countdown is rendered.
  React.useEffect(() => {
    if (deadlineMs === null) return
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [deadlineMs])

  const downloadedBytes =
    downloadPhase.kind === 'downloading' ? downloadPhase.downloadedBytes : null
  downloadedRef.current = downloadedBytes

  // Speed is sampled from the real cumulative byte count on a JS timer. Two
  // readings at least 300ms apart are required before a number is shown, so
  // no fast progress stream can force a first-frame guess.
  React.useEffect(() => {
    if (downloadPhase.kind !== 'downloading') {
      sampleRef.current = null
      setSpeed(null)
      return
    }
    const sample = () => {
      const bytes = downloadedRef.current
      if (bytes === null) return
      const current = { bytes, atMs: Date.now() }
      const measured = sampleTransferSpeed(sampleRef.current, current)
      sampleRef.current = current
      if (measured !== null) setSpeed(measured)
    }
    // Establish the first sample, then measure across later intervals.
    sample()
    const timer = window.setInterval(sample, 400)
    return () => window.clearInterval(timer)
  }, [downloadPhase.kind])

  const countdown = deadlineMs === null ? null : describeCountdown(deadlineMs, nowMs)
  // A mandatory policy inside its grace window still shows the live countdown;
  // enforcement copy appears once the deadline passes or the gate is shown.
  const enforced =
    countdown?.expired === true ||
    (policy?.mandatory === true && state.status === 'blocked') ||
    variant === 'gate'
  const dismissible = !enforced && typeof onDismiss === 'function'

  const isDownloading = downloadPhase.kind === 'downloading'
  const isDownloaded = downloadPhase.kind === 'downloaded'
  const isInstalling = downloadPhase.kind === 'installing'
  const isFailed = downloadPhase.kind === 'failed'

  const totalBytes = isDownloading ? downloadPhase.totalBytes : null
  const percentage = isDownloading ? computePercentage(downloadedBytes ?? 0, totalBytes) : null
  const primaryLabel = primaryActionLabel(downloadPhase, versionLabel)

  const onPrimary = () => {
    if (isDownloading) return void cancelInAppDownload()
    if (isDownloaded) return void installDownloadedApk()
    if (isInstalling) return
    void startInAppDownload()
  }

  const title = (
    <>
      {variant === 'gate' ? (
        <h1 id={titleId} className="udl-title">
          Update available
        </h1>
      ) : (
        <DialogTitle id={titleId} className="udl-title">
          Update available
        </DialogTitle>
      )}
      {variant === 'gate' ? (
        <p id={descriptionId} className="udl-subtitle">
          BOUXRE release {versionLabel}
        </p>
      ) : (
        <DialogDescription id={descriptionId} className="udl-subtitle">
          BOUXRE release {versionLabel}
        </DialogDescription>
      )}
    </>
  )

  return (
    <div
      className="udl-container"
      data-udl-variant={variant}
      data-udl-phase={downloadPhase.kind}
    >
      <div className="udl-card">
      {/* Two-layer organic sweep from the approved design. The layers are
          wider than the viewBox so the transform never exposes an edge. */}
      <svg
        className="udl-wave"
        viewBox="0 0 400 120"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id="udl-wave-body" x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0%" stopColor="hsl(var(--udl-accent))" stopOpacity="0.06" />
            <stop offset="48%" stopColor="hsl(var(--udl-accent))" stopOpacity="0.38" />
            <stop offset="100%" stopColor="hsl(var(--udl-accent-strong))" stopOpacity="0.80" />
          </linearGradient>
          <linearGradient id="udl-wave-crest" x1="0" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="hsl(var(--udl-solid))" stopOpacity="0" />
            <stop offset="60%" stopColor="hsl(var(--udl-solid))" stopOpacity="0.34" />
            <stop offset="100%" stopColor="hsl(var(--udl-accent))" stopOpacity="0.42" />
          </linearGradient>
        </defs>
        <g className="udl-wave-body-layer">
          <path
            d="M-40 0 L440 0 L440 54 C380 58 344 22 268 14 C206 7 150 2 96 2 C40 2 4 12 -40 22 Z"
            fill="url(#udl-wave-body)"
          />
        </g>
        <g className="udl-wave-crest-layer">
          <path
            d="M-40 0 L440 0 L440 30 C382 34 350 10 282 6 C220 2 168 0 112 0 C52 0 8 8 -40 14 Z"
            fill="url(#udl-wave-crest)"
          />
        </g>
      </svg>

      <header className="udl-head">
        <span className="udl-badge">
          {/* Authentic BOUXRE ribbon from the repository's public asset. */}
          <img
            src="/favicon.svg"
            alt="BOUXRE"
            className="udl-badge-img"
            width="52"
            height="52"
          />
        </span>
        <div className="udl-head-text">{title}</div>
        {dismissible ? (
          <button
            type="button"
            className="udl-close"
            aria-label="Dismiss update notice"
            onClick={onDismiss}
          >
            <X className="udl-close-icon" aria-hidden="true" />
          </button>
        ) : null}
      </header>

      <div className="udl-body">
        <div className="udl-status" data-udl-status={downloadPhase.kind}>
          {countdown || variant === 'gate' ? (
            <div className={`udl-countdown${enforced ? ' udl-countdown-expired' : ''}`}>
              <span className="udl-countdown-ring" aria-hidden="true">
                <Clock className="udl-countdown-icon" />
              </span>
              <span className="udl-countdown-divider" aria-hidden="true" />
              <div className="udl-countdown-body">
                <p className="udl-countdown-value">
                  {enforced ? 'Grace period ended' : (countdown?.label ?? '')}
                </p>
                <p className="udl-countdown-caption">
                  {enforced
                    ? 'Update required to keep using BOUXRE'
                    : 'Time left before the update pauses'}
                </p>
              </div>
            </div>
          ) : null}

          {isDownloading ? (
            <div className="udl-transfer">
              <div className="udl-transfer-head">
                <span className="udl-transfer-title">Downloading update…</span>
                {percentage !== null ? (
                  <span className="udl-transfer-percent">{Math.round(percentage)}%</span>
                ) : null}
              </div>
              <div
                className="udl-bar"
                role="progressbar"
                aria-label="Update download progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percentage === null ? undefined : Math.round(percentage)}
              >
                <span
                  className="udl-bar-fill"
                  style={{ width: percentage === null ? '0%' : `${percentage}%` }}
                />
              </div>
              <div className="udl-transfer-meta">
                <span className="udl-transfer-bytes">
                  <ArrowDownToLine className="udl-meta-icon" aria-hidden="true" />
                  {formatMegabytes(totalBytes)
                    ? `${formatMegabytes(downloadedBytes ?? 0) ?? '0.0 MB'} of ${formatMegabytes(totalBytes)}`
                    : (formatMegabytes(downloadedBytes ?? 0) ?? '0.0 MB')}
                </span>
                <span className="udl-transfer-speed">
                  <Zap className="udl-meta-icon" aria-hidden="true" />
                  {formatTransferSpeed(speed)}
                </span>
              </div>
            </div>
          ) : isDownloaded ? (
            <div className="udl-transfer">
              <div className="udl-transfer-head">
                <span className="udl-transfer-title">Download complete</span>
                <span className="udl-transfer-percent">100%</span>
              </div>
              <div
                className="udl-bar"
                role="progressbar"
                aria-label="Update download progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={100}
              >
                <span className="udl-bar-fill" style={{ width: '100%' }} />
              </div>
              <p className="udl-transfer-ready">
                <Check className="udl-meta-icon" aria-hidden="true" />
                Ready to install BOUXRE {versionLabel}
              </p>
              {downloadPhase.message ? (
                <p className="udl-error" role="alert">
                  {downloadPhase.message}
                </p>
              ) : null}
            </div>
          ) : isInstalling ? (
            <div className="udl-transfer">
              <div className="udl-transfer-head">
                <span className="udl-transfer-title">Installing…</span>
                <span className="udl-transfer-percent">100%</span>
              </div>
              <div
                className="udl-bar"
                role="progressbar"
                aria-label="Update install progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={100}
              >
                <span className="udl-bar-fill" style={{ width: '100%' }} />
              </div>
            </div>
          ) : isFailed ? (
            <div className="udl-transfer">
              <p className="udl-error" role="alert">
                {downloadPhase.message}
              </p>
              <button type="button" className="udl-retry" onClick={() => void startInAppDownload()}>
                <RotateCcw className="udl-meta-icon" aria-hidden="true" />
                Retry download
              </button>
            </div>
          ) : (
            <p className="udl-asset-line">
              <ArrowDownToLine className="udl-meta-icon" aria-hidden="true" />
              {formatMegabytes(assetSizeBytes)
                ? `${formatMegabytes(assetSizeBytes)} · Android package`
                : 'Android package'}
            </p>
          )}
        </div>

        <div className="udl-content">
          <div className={`udl-notes${notesOpen ? ' udl-notes-open' : ''}`}>
            <button
              type="button"
              className="udl-notes-toggle"
              aria-expanded={notesOpen}
              aria-controls={notesPanelId}
              onClick={() => setNotesOpen((open) => !open)}
            >
              <span className="udl-notes-tile" aria-hidden="true">
                <FileText className="udl-notes-icon" />
              </span>
              <span className="udl-notes-text">
                <span className="udl-notes-title">BOUXRE {versionLabel}</span>
                <span className="udl-notes-summary">{releaseNotesSummary(changelog.entries)}</span>
              </span>
              <ChevronDown className="udl-notes-chevron" aria-hidden="true" />
            </button>
            {notesOpen ? (
              <div id={notesPanelId} className="udl-notes-panel">
                <ChangelogTimeline
                  entries={changelog.entries}
                  versionLabel={versionLabel}
                  variant="compact"
                />
              </div>
            ) : null}
          </div>

          <div className="udl-actions">
            <button
              type="button"
              className="udl-btn udl-btn-primary"
              onClick={onPrimary}
              disabled={isInstalling}
            >
              {primaryLabel}
            </button>
            {webUrl ? (
              <button
                type="button"
                className="udl-btn udl-btn-secondary"
                onClick={() => void openWebDownload()}
              >
                <Globe className="udl-btn-icon" aria-hidden="true" />
                Download on Web
              </button>
            ) : null}
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
