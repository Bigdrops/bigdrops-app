import type { LucideIcon } from 'lucide-react'

/**
 * IconAction — one icon-only action for a Bolu message row.
 *
 * Action label rules (FR-52): message actions never show visible text. The
 * accessible name and tooltip carry the meaning, and the same target size as
 * the copy control keeps every action comfortable on a phone.
 */
export function IconAction({
  icon: Icon,
  label,
  title,
  onClick,
  disabled = false,
  active = false,
  className = '',
}: {
  icon: LucideIcon
  label: string
  title?: string
  onClick?: () => void
  disabled?: boolean
  active?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      className={`ac-icon-action${className ? ` ${className}` : ''}`}
      aria-label={label}
      title={title ?? label}
      disabled={disabled}
      data-active={active ? 'true' : undefined}
      onClick={onClick}
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  )
}
