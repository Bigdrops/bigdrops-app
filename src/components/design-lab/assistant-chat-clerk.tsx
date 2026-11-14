import { ArrowUpRight, X } from 'lucide-react'
import { useId, type CSSProperties } from 'react'

import launcherBot from '../../assets/clerk-launcher-bot.svg'
import { SAMPLE_SENTENCE, type TurnId } from './assistant-chat-script'
import type { ChatMessage } from './assistant-chat-thread'

export type ClerkState = 'idle' | 'listening' | 'thinking' | 'responding' | 'success'
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

/**
 * Auto follows the conversation. A pinned state is a review aid for the
 * Design Lab; production would not expose it.
 */
export function deriveClerkState(
  mode: ClerkMode,
  input: { busy: boolean; awaiting: boolean; filed: boolean; messages: ChatMessage[] },
): ClerkState {
  if (mode !== 'auto') return mode
  if (input.awaiting) return 'listening'
  if (input.busy) {
    const last = [...input.messages].reverse().find((message) => message.role === 'assistant')
    const writing =
      last?.role === 'assistant' &&
      last.blocks.some((block) => block.kind === 'text' && block.text.trim().length > 0)
    return writing ? 'responding' : 'thinking'
  }
  return input.filed ? 'success' : 'idle'
}

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
 * The digital clerk: one layered vector portrait, so the same character reads
 * at 26px in a turn and at 104px in the dock. State only moves parts that
 * exist in the drawing (lids, brows, gaze, mouth, posture); there is no image
 * swap and no external asset.
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
          <radialGradient id={cheekId} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#d98b6f" />
            <stop offset="1" stopColor="#d98b6f" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g transform="translate(48 48) scale(1.12) translate(-48 -48)">
        <g className="clerk-torso">
          <path
            d="M16 97c.5-5.6 2.1-10 4.6-13.4 2.7-3.6 7.4-5.6 12.6-5.6h29.6c5.2 0 9.9 2 12.6 5.6 2.5 3.4 4.1 7.8 4.6 13.4Z"
            fill={`url(#${blazerId})`}
          />
          <path
            d="M16.4 88.2c3.2-1.2 6.3-1.8 9.4-1.8m53.8 1.8c-3.2-1.2-6.3-1.8-9.4-1.8"
            stroke="#123234"
            strokeWidth="0.8"
            strokeLinecap="round"
            fill="none"
            opacity="0.45"
          />
          <path
            d="M48 75.6c2.6 0 4.8.5 6.5 1.4l-2.8 6.4-3.7 2.6-3.7-2.6-2.8-6.4c1.7-.9 3.9-1.4 6.5-1.4Z"
            fill="#f2ecdf"
          />
          <path
            d="M40.4 76.3 37 80.9l4.2 3.2m15.2-7.8 3.4 4.6-4.2 3.2"
            stroke="#d8cfbd"
            strokeWidth="0.8"
            strokeLinejoin="round"
            fill="none"
          />
          <path d="M48 78.4v7.6" stroke="#d8cfbd" strokeWidth="0.7" />
          <path
            d="M36.6 79.2c3.7.9 6.8 3 8.9 5.7l-2.7 3.9-8.7-6c-1.9-1.3-1-4 2.5-3.6Z"
            fill={BLAZER_LIGHT}
          />
          <path
            d="M59.4 79.2c-3.7.9-6.8 3-8.9 5.7l2.7 3.9 8.7-6c1.9-1.3 1-4-2.5-3.6Z"
            fill={BLAZER_LIGHT}
          />
          <path
            d="M40.6 80.4c.4 3.4 1.6 6.5 3.6 9.2"
            stroke="#b4553f"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M55.4 80.4c-.4 3.4-1.6 6.5-3.6 9.2"
            stroke="#b4553f"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
          <rect x="43.4" y="87.1" width="9.2" height="5.6" rx="1.7" fill="#f4efe6" stroke="#d6ccb8" strokeWidth="0.6" />
          <path
            d="M46.4 88.8v3.2m0-3.2h1.2a.8.8 0 0 1 0 1.6h-1.2m0 0h1.4a.8.8 0 0 1 0 1.6h-1.4"
            stroke="#1f4a4d"
            strokeWidth="0.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>

        <g className="clerk-head">
          <g className="clerk-head-bob">
            <path d="M42 60.6h12v9.2c0 2.9-2.7 4.7-6 4.7s-6-1.8-6-4.7Z" fill={SKIN_SHADOW} />
            <path
              d="M43.4 60.6h9.2v6.4c-1.3 1.7-2.8 2.5-4.6 2.5s-3.3-.8-4.6-2.5Z"
              fill={SKIN}
              opacity="0.5"
            />

            <ellipse cx="28.4" cy="43.4" rx="3.3" ry="4.6" fill="#7b4c33" />
            <ellipse cx="67.6" cy="43.4" rx="3.3" ry="4.6" fill="#7b4c33" />
            <ellipse cx="28.6" cy="43.4" rx="1.5" ry="2.6" fill={SKIN_SHADOW} opacity="0.65" />
            <ellipse cx="67.4" cy="43.4" rx="1.5" ry="2.6" fill={SKIN_SHADOW} opacity="0.65" />
            <circle cx="27.6" cy="48.6" r="1" fill={GOLD} />
            <circle cx="68.4" cy="48.6" r="1" fill={GOLD} />

            <path
              d="M27.4 45.5c-2.2-16 6.4-28.8 20.6-28.8s22.8 12.5 20.6 28.8c-1-4.4-2.4-7.6-4.4-9.8l-1.4 7.8c-4.4 1.6-9.3 2.2-14.8 2.2s-10.4-.6-14.8-2.2l-1.4-7.8c-2 2.2-3.4 5.4-4.4 9.8Z"
              fill={`url(#${hairId})`}
            />

            <path
              d="M48 19c11.2 0 19.2 8.8 19.2 21 0 5.4-1.3 10.6-3.6 14.9-2.4 4.5-5.6 7.8-9.6 9.3-2 .8-4 1.2-6 1.2s-4-.4-6-1.2c-4-1.5-7.2-4.8-9.6-9.3C30.1 50.6 28.8 45.4 28.8 40c0-12.2 8-21 19.2-21Z"
              fill={`url(#${skinId})`}
            />

            <path
              d="M29.6 40.4C29.6 26.6 37.7 17.8 48 17.8s18.4 8.8 18.4 22.6c-1.7-4.4-3.2-7.6-5.1-9.4-.6 1.4-2.7 2.3-5.4 2.3-2.9 0-4.9-1-5.9-2.6-.9 1.6-3.4 2.7-6.6 2.7-3 0-5.3-1-6.3-2.5-1.7 1.8-3 4.8-4.5 9.5Z"
              fill={`url(#${hairId})`}
            />
            <path
              d="M30.6 39.4c-1.6.6-2.2 2.4-1.6 4.6.4 1.4 1.2 2.4 2.3 2.8"
              stroke={HAIR}
              strokeWidth="2.6"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M65.4 39.4c1.6.6 2.2 2.4 1.6 4.6-.4 1.4-1.2 2.4-2.3 2.8"
              stroke={HAIR}
              strokeWidth="2.6"
              strokeLinecap="round"
              fill="none"
            />

            <ellipse className="clerk-cheek" cx="34.4" cy="51.2" rx="4.2" ry="2.3" fill={`url(#${cheekId})`} opacity="0.4" />
            <ellipse className="clerk-cheek" cx="61.6" cy="51.2" rx="4.2" ry="2.3" fill={`url(#${cheekId})`} opacity="0.4" />

            <g className="clerk-brow clerk-brow--left">
              <path d="M36.2 37.4c1.7-1.4 4.5-1.7 7-.8" stroke="#2a1c16" strokeWidth="2.1" strokeLinecap="round" fill="none" />
            </g>
            <g className="clerk-brow clerk-brow--right">
              <path d="M52.8 36.6c2.5-.9 5.3-.6 7 .8" stroke="#2a1c16" strokeWidth="2.1" strokeLinecap="round" fill="none" />
            </g>

            <g className="clerk-eye">
              <ellipse cx="40.4" cy="43.5" rx="4.2" ry="2.7" fill="#f7f0e4" />
              <ellipse cx="55.6" cy="43.5" rx="4.2" ry="2.7" fill="#f7f0e4" />
              <g className="clerk-gaze">
                <circle cx="40.4" cy="43.7" r="2.55" fill="#3a2a1e" />
                <circle cx="55.6" cy="43.7" r="2.55" fill="#3a2a1e" />
                <circle cx="40.4" cy="43.7" r="1.15" fill="#1c120d" />
                <circle cx="55.6" cy="43.7" r="1.15" fill="#1c120d" />
                <circle cx="39.5" cy="42.7" r="0.8" fill="#ffffff" opacity="0.9" />
                <circle cx="54.7" cy="42.7" r="0.8" fill="#ffffff" opacity="0.9" />
              </g>
              <path d="M36.3 42.5c2.2-1.9 5.6-1.9 7.9 0" stroke="#2a1c16" strokeWidth="1.2" strokeLinecap="round" fill="none" />
              <path d="M51.5 42.5c2.2-1.9 5.6-1.9 7.9 0" stroke="#2a1c16" strokeWidth="1.2" strokeLinecap="round" fill="none" />
            </g>
            <g className="clerk-lid">
              <path d="M36.4 43.7c2.2-1.6 5.6-1.6 7.8 0" stroke="#2a1c16" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              <path d="M51.8 43.7c2.2-1.6 5.6-1.6 7.8 0" stroke="#2a1c16" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            </g>

            <path
              d="M47.4 46.8c-.6 2.2-.5 3.7.4 4.5.6.5 1.5.6 2.2.1"
              stroke={SKIN_SHADOW}
              strokeWidth="1.2"
              strokeLinecap="round"
              fill="none"
              opacity="0.85"
            />

            <g className="clerk-mouth clerk-mouth--idle">
              <path
                d="M42.8 57.4c1.6 1.8 3.4 2.7 5.2 2.7s3.6-.9 5.2-2.7"
                stroke={LIP}
                strokeWidth="1.9"
                strokeLinecap="round"
                fill="none"
              />
              <path d="M45.4 61.1c1.4.5 3.8.5 5.2 0" stroke="#c98a75" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
            </g>
            <g className="clerk-mouth clerk-mouth--listening">
              <path
                d="M43 56.6c1.5-.8 3.2-1.2 5-1.2s3.5.4 5 1.2c-1.4 2.6-3.1 3.9-5 3.9s-3.6-1.3-5-3.9Z"
                fill={LIP}
              />
              <path
                d="M45.3 57.6c.8.6 1.7.9 2.7.9s1.9-.3 2.7-.9c-.9-.3-1.8-.5-2.7-.5s-1.8.2-2.7.5Z"
                fill={MOUTH}
              />
            </g>
            <g className="clerk-mouth clerk-mouth--thinking">
              <path
                d="M43.4 58.3c1.9-.8 4-.9 6-.3 1.4.4 2.6 1 3.6 1.9"
                stroke={LIP}
                strokeWidth="1.8"
                strokeLinecap="round"
                fill="none"
              />
            </g>
            <g className="clerk-mouth clerk-mouth--responding">
              <ellipse cx="48" cy="58.4" rx="4.1" ry="3.1" fill={MOUTH} />
              <path d="M44.4 57.6c1.2-.4 2.4-.6 3.6-.6s2.4.2 3.6.6" stroke={TEETH} strokeWidth="1.5" strokeLinecap="round" />
              <ellipse cx="48" cy="60" rx="2.2" ry="1.1" fill="#a4544a" opacity="0.85" />
            </g>
            <g className="clerk-mouth clerk-mouth--success">
              <path
                d="M42.2 56.2c1.8 3.2 3.8 4.8 5.8 4.8s4-1.6 5.8-4.8c-1.9-.5-3.8-.8-5.8-.8s-3.9.3-5.8.8Z"
                fill={LIP}
              />
              <path
                d="M44.4 57c1.2-.3 2.4-.4 3.6-.4s2.4.1 3.6.4c-1 1.6-2.2 2.4-3.6 2.4S45.4 58.6 44.4 57Z"
                fill={TEETH}
              />
            </g>
          </g>
        </g>
        </g>

        <g className="clerk-thought">
          <circle cx="72.6" cy="27.4" r="1.5" fill="var(--ac-accent)" />
          <circle cx="77.4" cy="23.4" r="1.1" fill="var(--ac-accent)" />
          <circle cx="81.4" cy="27.8" r="0.85" fill="var(--ac-accent)" />
        </g>
        <g className="clerk-sparkle">
          <path d="M74 27.6l1.1 3.1 3.1 1.1-3.1 1.1-1.1 3.1-1.1-3.1-3.1-1.1 3.1-1.1Z" fill={GOLD} />
          <path d="M82.4 35.8l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7Z" fill={GOLD} opacity="0.75" />
        </g>
      </svg>
    </span>
  )
}

const CLERK_MODE_LABEL: Record<ClerkMode, string> = {
  auto: 'Auto',
  idle: 'Idle',
  listening: 'Listening',
  thinking: 'Thinking',
  responding: 'Responding',
  success: 'Success',
}

export function ClerkStatePicker({
  value,
  onChange,
}: {
  value: ClerkMode
  onChange: (value: ClerkMode) => void
}) {
  const options: ClerkMode[] = ['auto', ...CLERK_STATES.map((state) => state.id)]
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-medium text-muted-foreground">Clerk</span>
      <div
        role="group"
        aria-label="Clerk state"
        className="inline-flex flex-wrap rounded-full border border-border bg-card p-0.5"
      >
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
              value === option ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {CLERK_MODE_LABEL[option]}
          </button>
        ))}
      </div>
      <span className="text-[11px] text-muted-foreground">
        {value === 'auto' ? 'Follows the conversation' : 'Pinned for review'}
      </span>
    </div>
  )
}

const LABEL: Record<ClerkState, string> = {
  idle: 'Idle',
  listening: 'Listening',
  thinking: 'Thinking',
  responding: 'Responding',
  success: 'Success',
}

/**
 * Launcher: a freestanding character, never a container. The glyph is used as
 * a mask so the figure takes the theme ink while keeping the artwork's tonal
 * layers. Motion is slow and sparse; reduced-motion removes it entirely.
 */
export function ClerkLauncher({
  state,
  open,
  onToggle,
  variant = 'default',
  controls = 'ac-clerk-dock',
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
      aria-label={label ?? (open ? 'Close the BOURXE clerk' : `Open the BOURXE clerk (${LABEL[state]})`)}
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
  onPrompt: (text: string, turn: TurnId) => void
  onOpenChat: () => void
}) {
  const meta = CLERK_STATES.find((entry) => entry.id === state) ?? CLERK_STATES[0]
  return (
    <section className="ac-clerk-dock" id="ac-clerk-dock" aria-label="BOURXE digital clerk">
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
        <ClerkAvatar size={100} state={state} phase={1} label={`BOURXE clerk, ${meta.label.toLowerCase()}`} />
        <div className="ac-clerk-intro">
          <p className="ac-clerk-name">BOURXE Clerk</p>
          <p className="ac-clerk-line">{meta.line}</p>
        </div>
      </div>

      <div className="ac-clerk-actions">
        <p className="ac-clerk-label">Try the conversation</p>
        <button type="button" className="ac-clerk-action" disabled={busy} onClick={() => onPrompt(SAMPLE_SENTENCE, 'draft')}>
          Draft the sample invoice
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="ac-clerk-action"
          disabled={busy}
          onClick={() => onPrompt('The price is 95,000 not 9,500.', 'correct')}
        >
          Fix the unit price
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </button>
        <button type="button" className="ac-clerk-action" disabled={busy} onClick={() => onPrompt('File it', 'file')}>
          File this invoice
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </button>
      </div>

      <footer className="ac-clerk-foot">
        <p>Keys and drafts stay in this session. Totals are computed by the app.</p>
        <button type="button" onClick={onOpenChat}>
          Open chat
        </button>
      </footer>
    </section>
  )
}
