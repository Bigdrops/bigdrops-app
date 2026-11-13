import { Check, Loader2, type LucideIcon } from 'lucide-react'

import type { ChangeCard } from './assistant-chat-script'
import {
  PHOTO_HERO_FAMILY_META,
  type PhotoHeroFamilyId,
} from '@/components/onboarding/photo-hero-v2-theme'

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string; icon?: LucideIcon }[]
  label: string
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex rounded-full border border-border bg-card p-0.5"
    >
      {options.map((option) => {
        const Icon = option.icon
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              value === option.value
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {Icon ? <Icon className="size-3.5" aria-hidden="true" /> : null}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function FamilyPicker({
  family,
  onChange,
}: {
  family: PhotoHeroFamilyId
  onChange: (family: PhotoHeroFamilyId) => void
}) {
  return (
    <div
      role="group"
      aria-label="Theme family"
      className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1"
    >
      {PHOTO_HERO_FAMILY_META.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={family === item.id}
          aria-label={`Use ${item.label} palette`}
          title={item.label}
          onClick={() => onChange(item.id)}
          className={`grid size-6 place-items-center rounded-full transition-transform ${
            family === item.id ? 'scale-110 ring-2 ring-foreground/40' : 'hover:scale-105'
          }`}
        >
          <span className="size-3.5 rounded-full" style={{ background: item.swatch }} aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}

/**
 * The BOUXRE mark: a geometric B drawn in two bowls around one stem. It carries
 * no image asset, so it stays crisp at every size and follows the family accent.
 */
export function AssistantMark({
  size = 28,
  tone = 'soft',
  className = '',
  title,
}: {
  size?: number
  tone?: 'soft' | 'solid'
  className?: string
  title?: string
}) {
  return (
    <span
      className={`ac-mark ac-mark--${tone} ${className}`.trim()}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.3) }}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <svg viewBox="0 0 32 32" width={size} height={size} fill="none" aria-hidden="true">
        <path
          d="M11 7v18M11 7h7.5a5.5 5.5 0 0 1 0 11H11M11 18h8.5a5 5 0 0 1 0 10H11"
          stroke="currentColor"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

export function StatusRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="ac-status" data-done={done}>
      <span className="ac-status-icon" aria-hidden="true">
        {done ? <Check className="size-3.5" strokeWidth={2.6} /> : <Loader2 className="ac-spin size-3.5" />}
      </span>
      <span>{label}</span>
    </div>
  )
}

const KIND_LABEL: Record<ChangeCard['kind'], string> = {
  'set-client': 'Client',
  'add-line': 'Line item',
  'set-delivery': 'Extra charge',
  'update-price': 'Unit price',
  'set-due': 'Due date',
  file: 'Save',
}

export function ChangeCardView({
  card,
  onDecide,
  compact = false,
}: {
  card: ChangeCard
  onDecide?: (accepted: boolean) => void
  compact?: boolean
}) {
  const pending = card.status === 'pending'
  return (
    <article
      className={`ac-card${compact ? ' ac-card--compact' : ''}`}
      data-status={card.status}
      aria-label={`${KIND_LABEL[card.kind]} change`}
    >
      <div className="ac-card-head">
        <span className="ac-card-kind">{KIND_LABEL[card.kind]}</span>
        {pending ? (
          <span className="ac-card-flag">Waiting</span>
        ) : (
          <span className="ac-card-flag" data-tone={card.status === 'accepted' ? 'ok' : 'off'}>
            {card.status === 'accepted' ? 'Applied' : 'Rejected'}
          </span>
        )}
      </div>

      <h3 className="ac-card-title">{card.title}</h3>

      {card.from !== undefined && card.to !== undefined ? (
        <p className="ac-card-change">
          <span className="ac-card-from">{card.from}</span>
          <span className="ac-card-arrow" aria-hidden="true">
            &rarr;
          </span>
          <span className="ac-card-to">{card.to}</span>
        </p>
      ) : null}

      {card.money ? (
        <div className="ac-card-money">
          <span>{card.moneyLabel ?? 'Amount'}</span>
          <strong>{card.money}</strong>
        </div>
      ) : null}

      {card.description ? <p className="ac-card-desc">{card.description}</p> : null}
      {card.note ? <p className="ac-card-note">{card.note}</p> : null}

      {pending && onDecide ? (
        <div className="ac-card-actions">
          <button type="button" className="ac-btn ac-btn--ghost" onClick={() => onDecide(false)}>
            {card.rejects}
          </button>
          <button type="button" className="ac-btn ac-btn--solid" onClick={() => onDecide(true)}>
            {card.accepts}
          </button>
        </div>
      ) : null}
    </article>
  )
}
