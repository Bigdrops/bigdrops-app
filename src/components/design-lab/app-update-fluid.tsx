import { useState } from 'react'
import { Check, Download, Globe, Loader2, ShieldCheck } from 'lucide-react'

import { BxLogo } from '@/components/layout/bx-logo'
import { formatVersionLabel } from '@/domain/appUpdate/updateStateMachine'
import { describeDownloadFailure } from '@/domain/appUpdate/downloadFailure'
import { formatDownloadProgress } from '@/domain/appUpdate/updateStateMachine'
import {
  GRACE_TOTAL_HOURS,
  formatGraceShort,
  type PreviewRelease,
  type SimulatedDownload,
} from './app-update-preview-model'

const GLIDE = 'cubic-bezier(0.16, 1, 0.3, 1)'

/**
 * Compact grace ring lifted from Water-melon `ShareSheet`
 * (share-sheet/base.tsx): r=22, strokeWidth 3, track at 15% opacity,
 * full-circumference dash with an animated offset, rotated to 12 o'clock.
 */
function GraceRing({ hours }: { hours: number }) {
  const fraction = Math.max(0, Math.min(1, hours / GRACE_TOTAL_HOURS))
  const radius = 22
  const circumference = 2 * Math.PI * radius
  const days = Math.floor(hours / 24)
  return (
    <div className="relative grid size-14 shrink-0 place-items-center">
      <svg viewBox="0 0 56 56" className="size-14 -rotate-90" aria-hidden="true">
        <circle cx="28" cy="28" r={radius} fill="none" strokeWidth="3" stroke="var(--au-accent)" strokeOpacity="0.15" />
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          stroke="var(--au-accent)"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          style={{ transition: `stroke-dashoffset .6s ${GLIDE}` }}
        />
      </svg>
      <span className="absolute text-sm font-bold tracking-tight" style={{ color: 'var(--au-ink)' }}>{days}d</span>
    </div>
  )
}

/**
 * Variant 2 — Water-Melon foundation.
 * Geometry + type: `DialogStack` soft elevated sheet (rounded-2xl, shadow-2xl),
 * `Sheet` side=bottom rounded top, `Notification2` rounded-4xl card rhythm,
 * `DeploymentCard` eyebrow -> title -> body -> caption ramp (sentence case).
 * Ring: `ShareSheet`. CTA pulse states: `InlineAction` loading pulse + success
 * shimmer, `ShimmerButton` hover sweep, stats-2 `pulse-glow` keyframe.
 * Every colour comes from the Onboarding v5 palette aliases (`--au-*`).
 */
export default function AppUpdateFluid({
  release,
  sim,
}: {
  release: PreviewRelease
  sim: SimulatedDownload
}) {
  const [webOpened, setWebOpened] = useState(false)
  const versionLabel = formatVersionLabel(release.versionName, release.versionCode)
  const { phase, downloadedBytes, progressPercent, start, install, reset } = sim
  const downloading = phase === 'downloading'
  const busy = phase === 'installing'
  const failed = phase === 'failed'
  const sizeMb = (release.sizeBytes / (1024 * 1024)).toFixed(1)

  return (
    <div
      className="auf-root w-full overflow-hidden rounded-t-[26px]"
      style={{
        background: 'var(--au-surface)',
        color: 'var(--au-ink)',
        boxShadow: '0 0 0 1px var(--au-hairline), 0 -22px 54px color-mix(in srgb, var(--au-ink) 30%, transparent)',
      }}
    >
      <style>{`
        .auf-root{animation:auf-rise .5s ${GLIDE} both}
        @keyframes auf-rise{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        .auf-cta{position:relative;overflow:hidden;transition:transform .3s ${GLIDE},box-shadow .3s ease,background-color .3s ease}
        .auf-cta:active:not(:disabled){transform:scale(.97)}
        .auf-shimmer::after{content:"";position:absolute;inset:0;transform:translateX(-100%);
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent);
          transition:transform .7s ${GLIDE}}
        .auf-shimmer:hover::after{transform:translateX(100%)}
        .auf-thumb{animation:auf-pulse-slide .8s ease-in-out infinite alternate}
        @keyframes auf-pulse-slide{from{left:0%}to{left:70%}}
        .auf-glow{animation:auf-pulse-glow 1.4s ease-in-out infinite}
        @keyframes auf-pulse-glow{0%,100%{opacity:0}50%{opacity:1}}
        .auf-success{animation:auf-sweep .7s ${GLIDE} .1s both}
        @keyframes auf-sweep{from{transform:translateX(-120%) skewX(-40deg)}to{transform:translateX(220%) skewX(-40deg)}}
      `}</style>

      {/* soft sheet handle */}
      <div className="flex justify-center pt-3" aria-hidden="true">
        <span className="h-1 w-10 rounded-full" style={{ background: 'var(--au-hairline)' }} />
      </div>

      <div className="space-y-4 px-5 pb-8 pt-4">
        {/* DeploymentCard type ramp, sentence case (no uppercase) */}
        <header className="flex flex-col items-center gap-2 text-center">
          <BxLogo className="size-14 shrink-0 rounded-[18px]" />
          <p className="text-[11px] font-bold tracking-tight" style={{ color: 'var(--au-accent)' }}>Approved release</p>
          <h2 className="text-[22px] font-semibold leading-tight tracking-tight" style={{ color: 'var(--au-ink)' }}>Update available</h2>
          <div className="flex items-center gap-2">
            <span className="rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: 'var(--au-raised)', color: 'var(--au-muted)', boxShadow: '0 0 0 1px var(--au-hairline)' }}>
              {versionLabel}
            </span>
            <span className="rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: 'var(--au-accent-soft)', color: 'var(--au-accent)' }}>
              {sizeMb} MB
            </span>
          </div>
        </header>

        {/* grace period: ShareSheet ring + sentence-case copy */}
        <div className="flex items-center gap-4 rounded-[20px] p-4" style={{ background: 'var(--au-raised)', boxShadow: '0 0 0 1px var(--au-hairline)' }}>
          <GraceRing hours={release.graceRemainingHours} />
          <div className="min-w-0">
            <p className="text-sm font-medium leading-snug" style={{ color: 'var(--au-ink)' }}>
              {formatGraceShort(release.graceRemainingHours)} left to update
            </p>
            <p className="mt-0.5 text-xs leading-5" style={{ color: 'var(--au-muted)' }}>
              BOURXE pauses after that until you install this version.
            </p>
          </div>
        </div>

        {/* Notification2 soft card rhythm */}
        <section aria-label="What is new" className="space-y-2">
          <h3 className="text-xs font-medium" style={{ color: 'var(--au-muted)' }}>What's new</h3>
          {release.notes.map((note) => (
            <div key={note.title} className="flex items-start gap-3 rounded-[18px] px-3.5 py-2.5" style={{ background: 'var(--au-raised)', boxShadow: '0 0 0 1px var(--au-hairline)' }}>
              <Check className="mt-0.5 size-4 shrink-0" style={{ color: 'var(--au-accent)' }} aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug" style={{ color: 'var(--au-ink)' }}>{note.title}</p>
                <p className="text-xs leading-5" style={{ color: 'var(--au-muted)' }}>{note.detail}</p>
              </div>
            </div>
          ))}
        </section>

        {downloading && (
          <div className="space-y-1.5" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--au-muted-surface)' }}>
              <div className="h-full rounded-full transition-[width] duration-300 ease-out" style={{ width: `${progressPercent}%`, background: 'linear-gradient(90deg, var(--au-accent), var(--au-accent-2))' }} />
            </div>
            <p className="text-center text-xs" style={{ color: 'var(--au-muted)' }}>
              {formatDownloadProgress(downloadedBytes, release.sizeBytes)} ({progressPercent}%)
            </p>
          </div>
        )}

        {failed && (
          <p className="rounded-[18px] px-3.5 py-2.5 text-xs leading-5" style={{ background: 'color-mix(in srgb, var(--au-danger) 10%, var(--au-surface))', color: 'var(--au-ink)' }} role="alert">
            {describeDownloadFailure('Could not enqueue download: Invalid value for visibility: 2', { webFallbackAvailable: true })}
          </p>
        )}

        {phase === 'installed' && (
          <p className="flex items-center justify-center gap-2 rounded-[18px] px-3.5 py-2.5 text-xs font-medium" style={{ background: 'var(--au-accent-soft)', color: 'var(--au-accent)' }} role="status">
            <Check className="size-4" aria-hidden="true" /> Update installed. Restart to finish.
          </p>
        )}

        {/* InlineAction CTA pulse states + ShimmerButton hover sweep */}
        <div className="space-y-2">
          {phase === 'idle' && (
            <button type="button" onClick={() => start()} className="auf-cta auf-shimmer flex w-full items-center justify-center gap-2 rounded-[18px] px-5 py-3.5 text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, var(--au-accent), var(--au-accent-2))', color: 'var(--au-cta-ink)', boxShadow: '0 14px 32px color-mix(in srgb, var(--au-accent) 30%, transparent)' }}>
              <Download className="size-4" aria-hidden="true" /> Download and install
            </button>
          )}
          {downloading && (
            <button type="button" onClick={reset} className="auf-cta flex w-full flex-col items-center justify-center gap-2 rounded-[18px] px-5 py-3 text-sm font-semibold"
              style={{ background: 'var(--au-raised)', color: 'var(--au-muted)', boxShadow: '0 0 0 1px var(--au-line)' }}>
              <span>Downloading {progressPercent}% (tap to cancel)</span>
              <span className="relative h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'color-mix(in srgb, var(--au-accent) 18%, transparent)' }} aria-hidden="true">
                <span className="auf-thumb absolute top-0 bottom-0 w-[30%] rounded-full" style={{ background: 'var(--au-accent)' }} />
              </span>
            </button>
          )}
          {phase === 'downloaded' && (
            <button type="button" onClick={install} className="auf-cta flex w-full items-center justify-center gap-2 rounded-[18px] px-5 py-3.5 text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, var(--au-accent), var(--au-accent-2))', color: 'var(--au-cta-ink)', boxShadow: '0 14px 32px color-mix(in srgb, var(--au-accent) 30%, transparent)' }}>
              <span className="auf-success pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent, color-mix(in srgb, var(--au-cta-ink) 45%, transparent), transparent)' }} aria-hidden="true" />
              <Check className="relative size-4" aria-hidden="true" /> <span className="relative">Install update</span>
            </button>
          )}
          {busy && (
            <button type="button" disabled className="auf-cta flex w-full items-center justify-center gap-2 rounded-[18px] px-5 py-3.5 text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, var(--au-accent), var(--au-accent-2))', color: 'var(--au-cta-ink)' }}>
              <span className="auf-glow pointer-events-none absolute inset-0" style={{ background: 'color-mix(in srgb, var(--au-cta-ink) 22%, transparent)' }} aria-hidden="true" />
              <Loader2 className="relative size-4 animate-spin" aria-hidden="true" /> <span className="relative">Installing…</span>
            </button>
          )}
          {phase === 'installed' && (
            <button type="button" onClick={reset} className="auf-cta flex w-full items-center justify-center gap-2 rounded-[18px] px-5 py-3.5 text-sm font-semibold"
              style={{ background: 'var(--au-raised)', color: 'var(--au-muted)', boxShadow: '0 0 0 1px var(--au-line)' }}>
              Replay preview
            </button>
          )}
          {failed && (
            <button type="button" onClick={() => start()} className="auf-cta auf-shimmer flex w-full items-center justify-center gap-2 rounded-[18px] px-5 py-3.5 text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, var(--au-accent), var(--au-accent-2))', color: 'var(--au-cta-ink)' }}>
              <Download className="size-4" aria-hidden="true" /> Retry download
            </button>
          )}

          <button
            type="button"
            onClick={() => setWebOpened(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-colors"
            style={failed ? { background: 'color-mix(in srgb, var(--au-danger) 10%, var(--au-surface))', color: 'var(--au-ink)' } : { color: 'var(--au-muted)' }}
          >
            <Globe className="size-3.5" aria-hidden="true" />
            {webOpened ? 'Web download opened (simulated)' : 'Download via web'}
          </button>
        </div>
      </div>
    </div>
  )
}