import { useState } from 'react'
import {
  Check,
  Download,
  Feather,
  Globe,
  Loader2,
  ShieldCheck,
  Zap,
} from 'lucide-react'

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

const NOTE_ICONS = [Zap, ShieldCheck, Feather]
// kinetics base.css motion token
const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)'
const STEPS = ['Get', 'Download', 'Ready'] as const

/**
 * Authentic Countdown Ring from Kinetics effect #22 (`effects-b.css` / `main.js`).
 * Drains a circular SVG ring as the grace period progresses, displaying the days
 * remaining in the center tabular numeral.
 */
function KineticsCountdownRing({ hours }: { hours: number }) {
  const fraction = Math.max(0, Math.min(1, hours / GRACE_TOTAL_HOURS))
  // Kinetics #22 geometry: r=34 => circumference 2 * PI * 34 = 213.628
  const radius = 34
  const circumference = 2 * Math.PI * radius
  const days = Math.floor(hours / 24)
  const restHours = hours % 24

  return (
    <div
      className="flex items-center gap-4 rounded-[14px] p-3.5"
      style={{
        background: 'var(--au-raised)',
        boxShadow: '0 0 0 1px var(--au-hairline)',
      }}
    >
      <div className="relative grid size-14 shrink-0 place-items-center">
        <svg viewBox="0 0 80 80" className="size-14 -rotate-90" aria-hidden="true">
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            strokeWidth="5"
            stroke="var(--au-muted-surface)"
          />
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            strokeWidth="5"
            strokeLinecap="round"
            stroke="var(--au-accent)"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - fraction)}
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
          />
        </svg>
        <div
          className="absolute inset-0 grid place-items-center font-mono text-sm font-bold tracking-tight"
          style={{ color: 'var(--au-ink)' }}
        >
          {days}d
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold" style={{ color: 'var(--au-ink)' }}>
            Grace period countdown
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ background: 'var(--au-accent-soft)', color: 'var(--au-accent)' }}
          >
            {days} days remaining
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--au-muted)' }}>
          {days} days and {restHours} hours left to update before BOURXE pauses.
        </p>
      </div>
    </div>
  )
}

/**
 * Variant 1 — Kinetics / Bigdrops-Free foundation.
 * Card rhythm: bigdrops-free Nova `Card` (hairline ring, rounded-xl, 16px
 * sections), `c-card-16` header badge + footer action, `Item` list rows.
 * Badges + action flow: kinetics `.demo-chip`, `.demo-status-pill` live dot,
 * `.demo-steps` track, `.demo-loaddone-btn` states, `.demo-sheen` CTA sweep.
 * Every colour comes from the Onboarding v5 palette aliases (`--au-*`).
 */
export default function AppUpdateStructural({
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
  const ready = phase === 'downloaded' || busy || phase === 'installed'
  const sizeMb = (release.sizeBytes / (1024 * 1024)).toFixed(1)
  const daysLeft = Math.floor(release.graceRemainingHours / 24)

  // kinetics .demo-steps: discrete fill per active node
  const stepIndex = ready ? 2 : downloading ? 1 : 0
  const fill = stepIndex / (STEPS.length - 1)

  return (
    <div
      className="aus-root w-full overflow-hidden rounded-t-[16px]"
      style={{
        background: 'var(--au-surface)',
        color: 'var(--au-ink)',
        boxShadow: '0 -1px 0 var(--au-line), 0 -18px 44px color-mix(in srgb, var(--au-ink) 26%, transparent)',
      }}
    >
      <style>{`
        .aus-root{animation:aus-rise .45s ${SPRING} both}
        @keyframes aus-rise{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        .aus-chip{animation:aus-chip-pop .4s ${SPRING} both;transition:transform .3s ${SPRING},border-color .2s ease}
        .aus-chip:hover{transform:translateY(-1px)}
        @keyframes aus-chip-pop{from{opacity:0;transform:scale(.82)}to{opacity:1;transform:scale(1)}}
        .aus-step{transition:transform .4s ${SPRING},background-color .3s ease,border-color .3s ease,color .3s ease}
        .aus-fill{transition:transform .5s ${SPRING}}
        .aus-cta{position:relative;overflow:hidden;transition:transform .3s ${SPRING},box-shadow .3s ease,background-color .2s ease}
        .aus-cta:hover:not(:disabled){transform:translateY(-2px)}
        .aus-cta:active:not(:disabled){transform:scale(.98)}
        .aus-sheen::after{content:"";position:absolute;top:0;left:-60%;width:50%;height:100%;
          background:linear-gradient(100deg,transparent,rgba(255,255,255,.22),transparent);
          transform:skewX(-18deg);transition:left .7s cubic-bezier(0.16,1,0.3,1)}
        .aus-sheen:hover::after{left:120%}
        .aus-check{stroke-dasharray:30;stroke-dashoffset:30;animation:aus-draw .4s ${SPRING} forwards}
        @keyframes aus-draw{to{stroke-dashoffset:0}}
      `}</style>

      {/* primary signal bar */}
      <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, var(--au-accent), var(--au-accent-2))' }} aria-hidden="true" />

      <div className="flex justify-center pt-2.5" aria-hidden="true">
        <span className="h-1 w-9 rounded-full" style={{ background: 'var(--au-hairline)' }} />
      </div>

      <div className="space-y-3.5 px-4 pb-7 pt-3">
        {/* c-card-16 header: badge + title */}
        <header className="flex items-center gap-3">
          <BxLogo className="size-11 shrink-0 rounded-[12px]" />
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-semibold leading-tight tracking-tight" style={{ color: 'var(--au-ink)' }}>Update available</h2>
            <p className="text-xs" style={{ color: 'var(--au-muted)' }}>Approved BOURXE release</p>
          </div>
          <span
            className="shrink-0 rounded-full px-2.5 py-1 font-mono text-[11px] font-medium"
            style={{ background: 'var(--au-raised)', color: 'var(--au-ink)', boxShadow: '0 0 0 1px var(--au-hairline)' }}
          >
            {versionLabel}
          </span>
        </header>

        {/* Authentic Kinetics countdown ring */}
        <KineticsCountdownRing hours={release.graceRemainingHours} />

        {/* What's new: kinetics feature badges + bigdrops-free Item rows */}
        <section aria-label="What is new" className="space-y-2">
          <h3 className="text-xs font-medium" style={{ color: 'var(--au-muted)' }}>What's new</h3>
          <div className="flex flex-wrap gap-1.5">
            {release.notes.map((note, index) => {
              const Icon = NOTE_ICONS[index % NOTE_ICONS.length]
              return (
                <span
                  key={note.title}
                  className="aus-chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
                  style={{
                    animationDelay: `${index * 70}ms`,
                    background: 'var(--au-accent-soft)',
                    color: 'var(--au-accent)',
                    boxShadow: '0 0 0 1px var(--au-accent-line)',
                  }}
                >
                  <Icon className="size-3" aria-hidden="true" />
                  {note.title}
                </span>
              )
            })}
          </div>
          <ul
            className="divide-y overflow-hidden rounded-[14px]"
            style={{ background: 'var(--au-raised)', boxShadow: '0 0 0 1px var(--au-hairline)', borderColor: 'var(--au-line)' }}
          >
            {release.notes.map((note, index) => {
              const Icon = NOTE_ICONS[index % NOTE_ICONS.length]
              return (
                <li key={note.title} className="flex items-center gap-3 px-3 py-2.5" style={{ borderColor: 'var(--au-line)' }}>
                  <span className="grid size-7 shrink-0 place-items-center rounded-[8px]" style={{ background: 'var(--au-muted-surface)', color: 'var(--au-muted)' }}>
                    <Icon className="size-3.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-snug" style={{ color: 'var(--au-ink)' }}>{note.title}</p>
                    <p className="text-xs" style={{ color: 'var(--au-muted)' }}>{note.detail}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        {/* kinetics .demo-steps action flow: Idle -> Downloading % -> Ready */}
        <div className="space-y-2" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100} aria-label="Download progress">
          <div className="relative flex items-center justify-between px-1">
            <span className="absolute inset-x-4 top-1/2 h-[3px] -translate-y-1/2 rounded-full" style={{ background: 'var(--au-muted-surface)' }} aria-hidden="true" />
            <span
              className="aus-fill absolute inset-x-4 top-1/2 h-[3px] -translate-y-1/2 origin-left rounded-full"
              style={{ background: 'var(--au-accent)', transform: `translateY(-50%) scaleX(${fill})` }}
              aria-hidden="true"
            />
            {STEPS.map((label, index) => {
              const active = index <= stepIndex
              return (
                <span key={label} className="relative z-10 flex flex-col items-center gap-1">
                  <span
                    className="aus-step grid size-6 place-items-center rounded-full text-[10px] font-bold"
                    style={{
                      background: active ? 'var(--au-accent)' : 'var(--au-raised)',
                      color: active ? 'var(--au-cta-ink)' : 'var(--au-faint)',
                      boxShadow: active ? 'none' : '0 0 0 1px var(--au-line)',
                      transform: index === stepIndex ? 'scale(1.18)' : 'scale(1)',
                    }}
                  >
                    {index < stepIndex || (index === 2 && ready) ? <Check className="size-3" aria-hidden="true" /> : index + 1}
                  </span>
                  <span className="text-[10px] font-medium" style={{ color: index === stepIndex ? 'var(--au-accent)' : 'var(--au-faint)' }}>{label}</span>
                </span>
              )
            })}
          </div>
          {downloading && (
            <div className="flex items-center justify-between font-mono text-[11px]" style={{ color: 'var(--au-muted)' }}>
              <span>{formatDownloadProgress(downloadedBytes, release.sizeBytes)}</span>
              <span className="font-semibold" style={{ color: 'var(--au-accent)' }}>{progressPercent}%</span>
            </div>
          )}
        </div>

        {failed && (
          <p
            className="rounded-[12px] px-3 py-2.5 text-xs leading-5"
            style={{ background: 'color-mix(in srgb, var(--au-danger) 10%, var(--au-surface))', color: 'var(--au-ink)', boxShadow: '0 0 0 1px color-mix(in srgb, var(--au-danger) 32%, transparent)' }}
            role="alert"
          >
            {describeDownloadFailure('Could not enqueue download: Invalid value for visibility: 2', { webFallbackAvailable: true })}
          </p>
        )}

        {phase === 'installed' && (
          <p className="flex items-center gap-2 rounded-[12px] px-3 py-2.5 text-xs font-medium" style={{ background: 'var(--au-accent-soft)', color: 'var(--au-accent)' }} role="status">
            <Check className="size-4" aria-hidden="true" /> Update installed. Restart to finish.
          </p>
        )}

        {/* kinetics .demo-loaddone-btn + .btn-primary spring + .demo-sheen sweep */}
        <div className="space-y-2 pt-0.5">
          {phase === 'idle' && (
            <button type="button" onClick={() => start()} className="aus-cta aus-sheen flex w-full items-center justify-center gap-2 rounded-[14px] px-5 py-3 text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, var(--au-accent), var(--au-accent-2))', color: 'var(--au-cta-ink)', boxShadow: '0 12px 28px color-mix(in srgb, var(--au-accent) 30%, transparent)' }}>
              <Download className="size-4" aria-hidden="true" /> Download and install
            </button>
          )}
          {downloading && (
            <button type="button" onClick={reset} className="aus-cta flex w-full items-center justify-center gap-2 rounded-[14px] px-5 py-3 text-sm font-semibold"
              style={{ background: 'var(--au-raised)', color: 'var(--au-muted)', boxShadow: '0 0 0 1px var(--au-line)' }}>
              <Loader2 className="size-4 animate-spin text-current" aria-hidden="true" />
              Downloading {progressPercent}% (tap to cancel)
            </button>
          )}
          {phase === 'downloaded' && (
            <button type="button" onClick={install} className="aus-cta aus-sheen flex w-full items-center justify-center gap-2 rounded-[14px] px-5 py-3 text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, var(--au-accent), var(--au-accent-2))', color: 'var(--au-cta-ink)', boxShadow: '0 12px 28px color-mix(in srgb, var(--au-accent) 30%, transparent)' }}>
              <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden="true">
                <path className="aus-check" d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Ready to install
            </button>
          )}
          {busy && (
            <button type="button" disabled className="flex w-full items-center justify-center gap-2 rounded-[14px] px-5 py-3 text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, var(--au-accent), var(--au-accent-2))', color: 'var(--au-cta-ink)', opacity: 0.78 }}>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Installing…
            </button>
          )}
          {phase === 'installed' && (
            <button type="button" onClick={reset} className="aus-cta flex w-full items-center justify-center gap-2 rounded-[14px] px-5 py-3 text-sm font-semibold"
              style={{ background: 'var(--au-raised)', color: 'var(--au-muted)', boxShadow: '0 0 0 1px var(--au-line)' }}>
              Replay preview
            </button>
          )}
          {failed && (
            <button type="button" onClick={() => start()} className="aus-cta aus-sheen flex w-full items-center justify-center gap-2 rounded-[14px] px-5 py-3 text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, var(--au-accent), var(--au-accent-2))', color: 'var(--au-cta-ink)' }}>
              <Download className="size-4" aria-hidden="true" /> Retry download
            </button>
          )}

          <button
            type="button"
            onClick={() => setWebOpened(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-colors"
            style={failed ? { background: 'var(--au-accent-soft)', color: 'var(--au-accent)' } : { color: 'var(--au-muted)' }}
          >
            <Globe className="size-3.5" aria-hidden="true" />
            {webOpened ? 'Web download opened (simulated)' : 'Download via web'}
          </button>
        </div>
      </div>
    </div>
  )
}