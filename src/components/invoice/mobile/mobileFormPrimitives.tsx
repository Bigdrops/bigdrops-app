import type {
  ButtonHTMLAttributes,
  ChangeEventHandler,
  ComponentType,
  InputHTMLAttributes,
  ReactNode,
} from 'react'

import { ChevronRight, ChevronUp } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatNaira } from '@/lib/formatters/money'

export const pageCardCls =
  'rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] shadow-none'
export const fieldCls =
  'h-11 rounded-[var(--bd-radius-md)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] px-3 text-[14px] text-[hsl(var(--bd-text))] shadow-none transition placeholder:text-[hsl(var(--bd-text-muted))] focus:border-[hsl(var(--bd-button-primary-bg))] focus:bg-[hsl(var(--bd-card-bg))] focus:ring-0 focus-visible:ring-2 focus-visible:ring-[hsl(var(--bd-button-primary-bg))]/15'
export const labelCls = 'mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[hsl(var(--bd-text-muted))]'

export function getSectionDotClass(color?: string) {
  const c = String(color).toLowerCase()
  if (c === 'text') return 'bg-[hsl(var(--bd-text))]'
  if (c === 'violet') return 'bg-[hsl(var(--bd-violet))]'
  if (c === 'muted') return 'bg-[hsl(var(--bd-text-muted))]'
  if (c === 'emerald') return 'bg-[hsl(var(--bd-emerald))]'
  if (c === 'amber') return 'bg-[hsl(var(--bd-amber))]'
  if (c === 'indigo') return 'bg-[hsl(var(--bd-indigo))]'
  if (c === '#0f172a') return 'bg-[hsl(var(--bd-text))]'
  if (c === '#7c3aed') return 'bg-[hsl(var(--bd-violet))]'
  if (c === '#475569') return 'bg-[hsl(var(--bd-text-muted))]'
  if (c === '#059669') return 'bg-[hsl(var(--bd-emerald))]'
  if (c === '#d97706') return 'bg-[hsl(var(--bd-amber))]'
  if (c === '#2563eb') return 'bg-[hsl(var(--bd-indigo))]'
  return 'bg-[hsl(var(--bd-text-soft))]'
}

interface IconTone {
  bg?: string
  fg?: string
}

function getIconToneClass(iconTone?: IconTone) {
  const bg = String(iconTone?.bg).toLowerCase()
  const fg = String(iconTone?.fg).toLowerCase()

  if (bg === 'violet' || fg === 'violet') return 'bg-[hsl(var(--bd-violet-bg))] text-[hsl(var(--bd-violet))]'
  if (bg === 'indigo' || fg === 'indigo') return 'bg-[hsl(var(--bd-indigo-bg))] text-[hsl(var(--bd-indigo))]'
  if (bg === 'emerald' || fg === 'emerald') return 'bg-[hsl(var(--bd-emerald-bg))] text-[hsl(var(--bd-emerald))]'
  if (bg === 'amber' || fg === 'amber') return 'bg-[hsl(var(--bd-amber-bg))] text-[hsl(var(--bd-amber))]'
  if (bg === 'amber-strong' || fg === 'amber-strong') return 'bg-[hsl(var(--bd-amber-bg))] text-[hsl(var(--bd-amber-dark))]'
  if (bg === 'muted' || fg === 'muted') return 'bg-[hsl(var(--bd-surface-muted))] text-[hsl(var(--bd-text-muted))]'
  if (bg === '#f5f3ff' || fg === '#7c3aed') return 'bg-[hsl(var(--bd-violet-bg))] text-[hsl(var(--bd-violet))]'
  if (bg === '#eff6ff' || fg === '#2563eb') return 'bg-[hsl(var(--bd-indigo-bg))] text-[hsl(var(--bd-indigo))]'
  if (bg === '#f0fdf4' || fg === '#059669') return 'bg-[hsl(var(--bd-emerald-bg))] text-[hsl(var(--bd-emerald))]'
  if (bg === '#fff7ed' || fg === '#d97706') return 'bg-[hsl(var(--bd-amber-bg))] text-[hsl(var(--bd-amber))]'
  if (bg === '#ecfdf5' || fg === '#059669') return 'bg-[hsl(var(--bd-emerald-bg))] text-[hsl(var(--bd-emerald))]'
  if (bg === '#fef3c7' || fg === '#b45309') return 'bg-[hsl(var(--bd-amber-bg))] text-[hsl(var(--bd-amber-dark))]'
  if (bg === '#f0f4ff' || fg === '#4338ca') return 'bg-[hsl(var(--bd-indigo-bg))] text-[hsl(var(--bd-indigo))]'
  if (bg === '#f3f4f6' || fg === '#475569') return 'bg-[hsl(var(--bd-surface-muted))] text-[hsl(var(--bd-text-muted))]'
  if (bg === '#d1fae5' || fg === '#059669') return 'bg-[hsl(var(--bd-emerald-bg))] text-[hsl(var(--bd-emerald))]'
  
  return 'bg-[hsl(var(--bd-surface-muted))] text-[hsl(var(--bd-text-muted))]'
}

export function formatCurrency(value: number | string | null | undefined) {
  return formatNaira(value)
}

interface SectionLabelProps {
  color?: string
  children: ReactNode
  trailing?: ReactNode
}

export function SectionLabel({ color, children, trailing }: SectionLabelProps) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[hsl(var(--bd-text-muted))]">
        <span className={`h-1.5 w-1.5 rounded-full ${getSectionDotClass(color)}`} />
        <span>{children}</span>
      </div>
      {trailing}
    </div>
  )
}

interface ToggleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  className?: string
  children: ReactNode
}

export function ChipButton({ active = false, className = '', children, ...props }: ToggleButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex h-8 items-center gap-2 rounded-full border-[1.5px] px-[13px] text-[12px] font-bold transition ${
        active
          ? 'border-[hsl(var(--bd-button-primary-bg))] bg-[hsl(var(--bd-button-primary-bg))] text-[hsl(var(--bd-button-primary-text))]'
          : 'border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-surface-muted))] hover:text-[hsl(var(--bd-text))]'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function ToolbarButton({ active = false, className = '', children, ...props }: ToggleButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-[var(--bd-radius-md)] border px-3 text-[12px] font-semibold transition ${
        active
          ? 'border-[hsl(var(--bd-button-primary-bg))] bg-[hsl(var(--bd-button-primary-bg))] text-[hsl(var(--bd-button-primary-text))]'
          : 'border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))] text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-surface-muted))] hover:text-[hsl(var(--bd-text))]'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

interface Option {
  value: string
  label: string
}

interface SegmentedControlProps {
  value: string
  onChange: (value: string) => void
  options: Option[]
}

export function SegmentedControl({ value, onChange, options }: SegmentedControlProps) {
  return (
    <div className="flex gap-[3px] rounded-[var(--bd-radius-md)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] p-[3px]">
      {options.map((option) => {
        const active = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`h-8 flex-1 rounded-[var(--bd-radius-sm)] text-[12px] font-bold transition ${
              active
                ? 'border border-[hsl(var(--bd-button-primary-bg))] bg-[hsl(var(--bd-button-primary-bg))] text-[hsl(var(--bd-button-primary-text))] shadow-sm'
                : 'border border-transparent text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-surface))] hover:text-[hsl(var(--bd-text))]'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

interface CompactSelectFieldProps {
  value: string
  onChange: (value: string) => void
  options: Option[]
  className?: string
}

export function CompactSelectField({ value, onChange, options, className = '' }: CompactSelectFieldProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={`${fieldCls} min-w-0 justify-between px-3 ${className}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

interface CollapseCardProps {
  icon: ComponentType<{ className?: string }>
  iconTone?: IconTone
  title: string
  subtitle?: string
  open: boolean
  onToggle: () => void
  children: ReactNode
  sectionColor?: string
}

export function CollapseCard({ icon: Icon, iconTone, title, subtitle, open, onToggle, children, sectionColor }: CollapseCardProps) {
  return (
    <div className="border-b border-[hsl(var(--bd-border))] bg-transparent">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-[30px] w-[30px] items-center justify-center rounded-[8px] ${getIconToneClass(iconTone)}`}
          >
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="text-[13px] font-bold text-[hsl(var(--bd-text))]">{title}</div>
            {subtitle ? <div className="text-[11px] text-[hsl(var(--bd-text-muted))]">{subtitle}</div> : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sectionColor ? <span className={`h-2 w-2 rounded-full ${getSectionDotClass(sectionColor)}`} /> : null}
          {open ? <ChevronUp className="h-4 w-4 text-[hsl(var(--bd-text-muted))]" /> : <ChevronRight className="h-4 w-4 text-[hsl(var(--bd-text-muted))]" />}
        </div>
      </button>
      {open ? <div className="pb-4 pt-1">{children}</div> : null}
    </div>
  )
}

export interface LinkAttachment {
  label: string
  url: string
  _uiKey?: string
}

export function asLinkAttachment(entry: unknown): LinkAttachment {
  if (!entry || typeof entry !== 'object') return { label: '', url: '' }
  const candidate = entry as Partial<LinkAttachment>
  return {
    label: typeof candidate.label === 'string' ? candidate.label : '',
    url: typeof candidate.url === 'string' ? candidate.url : '',
    _uiKey: typeof candidate._uiKey === 'string' ? candidate._uiKey : undefined,
  }
}

interface MobileFieldProps {
  label: string
  children: ReactNode
}

export function MobileField({ label, children }: MobileFieldProps) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  )
}

interface MobileTextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  onChange?: ChangeEventHandler<HTMLInputElement>
}

export function MobileTextField({ label, className = '', ...props }: MobileTextFieldProps) {
  return (
    <MobileField label={label}>
      <Input {...props} className={`${fieldCls}${className ? ` ${className}` : ''}`} />
    </MobileField>
  )
}
