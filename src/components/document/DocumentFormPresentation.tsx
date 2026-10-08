import { ArrowLeft, MoreHorizontal, Save } from 'lucide-react'
import type { ReactNode } from 'react'
import { ThemeToggleButton } from '@/components/theme/ThemeToggleButton'

type DocumentSectionHeadProps = {
  number: string
  title: string
  meta?: ReactNode
}

export function DocumentSectionHead({ number, title, meta }: DocumentSectionHeadProps) {
  return (
    <div className="cps-sec-head">
      <span className="cps-secno">{number}</span>
      <h2>{title}</h2>
      <div className="rule" />
      {meta ? <div className="meta">{meta}</div> : null}
    </div>
  )
}

type DocumentTopBarProps = {
  title: string
  subtitle?: string
  saveLabel: string
  onBack: () => void
  onSave: () => void
  onOpenActions?: () => void
  disabled?: boolean
}

export function DocumentTopBar({
  title,
  subtitle,
  saveLabel,
  onBack,
  onSave,
  onOpenActions,
  disabled,
}: DocumentTopBarProps) {
  return (
    <header className="cps-form-topbar">
      <div className="cps-form-topbar-inner">
        <button type="button" className="cps-tb-btn" onClick={onBack} aria-label="Go back">
          <ArrowLeft className="h-[18px] w-[18px]" />
        </button>
        <div className="cps-tb-title">
          <h1>{title}</h1>
          {subtitle ? (
            <div className="cps-tb-meta">
              <span className="badge">{subtitle}</span>
            </div>
          ) : null}
        </div>
        {onOpenActions ? (
          <button type="button" className="cps-tb-btn" onClick={onOpenActions} aria-label="More actions">
            <MoreHorizontal className="h-[18px] w-[18px]" />
          </button>
        ) : null}
        {/* Shared theme toggle — exposed in every form using this header.
            It reuses the Dashboard preference; `type="button"` means it can
            neither submit nor save the form. Geometry matches `.cps-tb-btn`. */}
        <ThemeToggleButton className="h-10 w-10 rounded-[11px]" />
        <button type="button" className="cps-save" onClick={onSave} disabled={disabled}>
          <Save className="h-[16px] w-[16px]" />
          <span>{saveLabel}</span>
        </button>
      </div>
    </header>
  )
}

