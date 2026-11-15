import { ArrowUpRight, X } from 'lucide-react'
import { useId, type CSSProperties } from 'react'

import launcherBot from '@/assets/clerk-launcher-bot.svg'
import type { ClerkState } from './types'

export type ClerkMode = 'auto' | ClerkState

export const CLERK_STATES: { id: ClerkState; label: string; line: string }[] = [
  {
    id: 'idle',
    label: 'Idle',
    line: 'Ready when you are. I read the invoice form; you approve every change.',
  },
  {
    id: 'listening',
    label: 'Listening',
    line: 'Listening. Confirm or reject the card above, or tell me what to change.',
  },
  {
    id: 'thinking',
    label: 'Thinking',
    line: 'Checking the invoice rules and reading the form.',
  },
  {
    id: 'responding',
    label: 'Responding',
    line: 'Writing the reply. The app computes the totals; I never do.',
  },
  {
    id: 'success',
    label: 'Success',
    line: 'Filed. The invoice is saved and the manual form stays yours.',
  },
]

const SKIN = '#8a5a3f'
const SKIN_LIGHT = '#a97452'
const SKIN_SHADOW = '#6f462d'
const HAIR = '#241a16'
const BLAZER_LIGHT = '#35686c'
const LIP = '#7d3a30'
const MOUTH = '#4a211d'
const TEETH = '#f6efe6'
const GOLD = '#d8a24a'

/**
 * The digital clerk vector portrait
 */
export function ClerkAvatar({
  size = 32,
  state = 'idle',
  animated = true,
  phase = 0,
  className = '',
  label,
}: {
  size?: number
  state?: ClerkState
  animated?: boolean
  phase?: number
  className?: string
  label?: string
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const skinId = `clerk-skin-${uid}`
  const hairId = `clerk-hair-${uid}`
  const blazerId = `clerk-blazer-${uid}`
  const cheekId = `clerk-cheek-${uid}`
  const style = { '--clerk-delay': `${-((phase % 5) * 1.13)}s` } as CSSProperties

  return (
    <span
      className={`ac-clerk ${className}`.trim()}
      data-state={animated ? state : 'idle'}
      data-static={animated ? undefined : 'true'}
      style={{ ...style, width: size, height: size }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <span className="ac-clerk-glow" aria-hidden="true" />
      <svg viewBox="0 0 96 96" width={size} height={size} aria-hidden="true">
        <defs>
          <linearGradient id={skinId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={SKIN_LIGHT} />
            <stop offset="1" stopColor={SKIN} />
          </linearGradient>
          <linearGradient id={hairId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3b2a22" />
            <stop offset="1" stopColor={HAIR} />
          </linearGradient>
          <linearGradient id={blazerId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2b5c60" />
            <stop offset="1" stopColor="#173c3f" />
          </linearGradient>
          <radialGradient id={cheekId} cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#b65a44" stopOpacity="0.45" />
            <stop offset="1" stopColor="#b65a44" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g className="ac-clerk-head">
          <ellipse cx="48" cy="88" rx="28" ry="14" fill={`url(#${blazerId})`} />
          <path d="M42 76h12v10H42z" fill={SKIN_SHADOW} />
          <path d="M48 83l-5 8h10z" fill={TEETH} />
          <path d="M36 84l12 11 12-11" stroke={GOLD} strokeWidth="1.2" fill="none" />

          {/* Hair back */}
          <path d="M22 48c0-16 11-28 26-28s26 12 26 28c0 14-4 26-9 30-3-10-8-14-17-14s-14 4-17 14c-5-4-9-16-9-30z" fill={`url(#${hairId})`} />

          {/* Face base */}
          <ellipse cx="48" cy="51" rx="20" ry="23" fill={`url(#${skinId})`} />
          <circle cx="36" cy="56" r="5" fill={`url(#${cheekId})`} />
          <circle cx="60" cy="56" r="5" fill={`url(#${cheekId})`} />

          {/* Hair front / afro curls */}
          <path d="M26 40c-2-8 3-17 12-20 8-3 18-3 24 2 7 5 10 13 8 20-3-4-8-7-14-7-8 0-14 4-18 8-4-1-8-2-12-3z" fill={`url(#${hairId})`} />

          {/* Eyebrows */}
          <g className="ac-clerk-brows">
            <path className="ac-clerk-brow ac-clerk-brow--left" d="M34 41c3-2 7-2 10 0" stroke={HAIR} strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <path className="ac-clerk-brow ac-clerk-brow--right" d="M52 41c3-2 7-2 10 0" stroke={HAIR} strokeWidth="2.2" strokeLinecap="round" fill="none" />
          </g>

          {/* Eyes */}
          <g className="ac-clerk-eyes">
            <ellipse cx="39" cy="48" rx="4.5" ry="3.8" fill="#fff" />
            <ellipse cx="57" cy="48" rx="4.5" ry="3.8" fill="#fff" />
            <g className="ac-clerk-gaze">
              <circle cx="39" cy="48" r="2.4" fill="#2d1a0e" />
              <circle cx="40" cy="47" r="0.8" fill="#fff" />
              <circle cx="57" cy="48" r="2.4" fill="#2d1a0e" />
              <circle cx="58" cy="47" r="0.8" fill="#fff" />
            </g>
            <path className="ac-clerk-lid ac-clerk-lid--left" d="M34 47c1.5-2.5 7.5-2.5 9.5 0" stroke={SKIN_SHADOW} strokeWidth="1.8" fill="none" />
            <path className="ac-clerk-lid ac-clerk-lid--right" d="M52.5 47c1.5-2.5 7.5-2.5 9.5 0" stroke={SKIN_SHADOW} strokeWidth="1.8" fill="none" />
          </g>

          {/* Nose */}
          <path d="M47 51c.5 3 0 5-2 6h6c-1.8-1-2.2-3-2-6z" fill={SKIN_SHADOW} opacity="0.6" />

          {/* Mouth */}
          <g className="ac-clerk-mouth">
            <path className="ac-clerk-lip" d="M41 64c3 1.5 11 1.5 14 0" stroke={LIP} strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <path className="ac-clerk-smile" d="M42 63c2 3.5 10 3.5 12 0" fill={MOUTH} />
          </g>

          {/* Glasses frame */}
          <g className="ac-clerk-glasses" stroke={GOLD} strokeWidth="1.4" fill="none">
            <rect x="32" y="42" width="13" height="11" rx="3.5" />
            <rect x="51" y="42" width="13" height="11" rx="3.5" />
            <path d="M45 46h6" />
          </g>
        </g>
      </svg>
    </span>
  )
}

const LABEL: Record<ClerkState, string> = {
  idle: 'idle',
  listening: 'listening',
  thinking: 'working',
  responding: 'replying',
  success: 'filed',
}

export function ClerkLauncher({
  state,
  open,
  onToggle,
  variant = 'default',
  controls,
  label,
}: {
  state: ClerkState
  open: boolean
  onToggle: () => void
  variant?: 'default' | 'restrained'
  controls?: string | null
  label?: string
}) {
  const mask = `url(${launcherBot})`
  return (
    <button
      type="button"
      className="ac-launcher"
      data-state={state}
      data-open={open}
      data-variant={variant}
      aria-expanded={controls ? open : undefined}
      aria-controls={controls ?? undefined}
      aria-label={label ?? (open ? 'Close Bolu assistant' : `Open Bolu assistant (${LABEL[state]})`)}
      onClick={onToggle}
    >
      <span className="ac-launcher-aura" aria-hidden="true" />
      <span className="ac-launcher-float" aria-hidden="true">
        <span className="ac-launcher-pad">
          {open ? (
            <X className="ac-launcher-x" aria-hidden="true" />
          ) : (
            <span
              className="ac-launcher-body"
              style={{ WebkitMaskImage: mask, maskImage: mask }}
            />
          )}
        </span>
      </span>
      <span className="ac-launcher-shadow" aria-hidden="true" />
      {open ? null : <span className="ac-launcher-dot" data-state={state} aria-hidden="true" />}
    </button>
  )
}

export function ClerkDock({
  state,
  busy,
  onClose,
  onPrompt,
  onOpenChat,
}: {
  state: ClerkState
  busy: boolean
  onClose: () => void
  onPrompt: (text: string) => void
  onOpenChat: () => void
}) {
  const meta = CLERK_STATES.find((entry) => entry.id === state) ?? CLERK_STATES[0]
  return (
    <section className="ac-clerk-dock" id="ac-clerk-dock" aria-label="Bolu operations clerk">
      <header className="ac-clerk-dock-head">
        <div>
          <p className="ac-clerk-eyebrow">Digital clerk</p>
          <p className="ac-clerk-state" data-state={state} role="status" aria-live="polite">
            {meta.label}
          </p>
        </div>
        <button type="button" className="ac-icon-btn" aria-label="Close the clerk" onClick={onClose}>
          <X className="size-4" aria-hidden="true" />
        </button>
      </header>

      <div className="ac-clerk-hero">
        <ClerkAvatar size={100} state={state} phase={1} label={`Bolu clerk, ${meta.label.toLowerCase()}`} />
        <div className="ac-clerk-intro">
          <p className="ac-clerk-name">Bolu Assistant</p>
          <p className="ac-clerk-line">{meta.line}</p>
        </div>
      </div>

      <div className="ac-clerk-actions">
        <p className="ac-clerk-label">Quick Operations</p>
        <button type="button" className="ac-clerk-action" disabled={busy} onClick={() => onPrompt('Show outstanding invoices')}>
          Show outstanding invoices
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="ac-clerk-action"
          disabled={busy}
          onClick={() => onPrompt('Find an invoice')}
        >
          Find an invoice
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </button>
      </div>

      <footer className="ac-clerk-foot">
        <p>Tenant-scoped session. Totals computed authoritatively by Calculations.ts.</p>
        <button type="button" onClick={onOpenChat}>
          Open chat
        </button>
      </footer>
    </section>
  )
}
