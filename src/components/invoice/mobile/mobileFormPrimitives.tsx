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

export const pageCardCls =
  'rounded-[20px] border border-[#e2e8f0] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)]'
export const fieldCls =
  'h-11 rounded-[12px] border-[1.5px] border-[#e2e8f0] bg-[#f8fafc] px-3 text-[14px] text-[#0f172a] shadow-none transition focus:border-[#94a3b8] focus:bg-white focus:ring-0 focus-visible:ring-0'
export const labelCls = 'mb-1 block text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#94a3b8]'

export function getSectionDotClass(color?: string) {
  return {
    '#0f172a': 'bg-slate-900',
    '#7c3aed': 'bg-violet-600',
    '#475569': 'bg-slate-600',
    '#059669': 'bg-emerald-600',
    '#d97706': 'bg-amber-600',
    '#2563eb': 'bg-blue-600',
  }[color || ''] || 'bg-slate-400'
}

interface IconTone {
  bg?: string
  fg?: string
}

function getIconToneClass(iconTone?: IconTone) {
  const key = `${iconTone?.bg || ''}|${iconTone?.fg || ''}`
  return {
    '#f5f3ff|#7c3aed': 'bg-violet-50 text-violet-600',
    '#eff6ff|#2563eb': 'bg-blue-50 text-blue-600',
    '#f0fdf4|#059669': 'bg-emerald-50 text-emerald-600',
  }[key] || 'bg-slate-100 text-slate-600'
}

export function formatCurrency(value: number | string | null | undefined) {
  return `NGN ${Number(value || 0).toLocaleString()}`
}

interface SectionLabelProps {
  color?: string
  children: ReactNode
  trailing?: ReactNode
}

export function SectionLabel({ color, children, trailing }: SectionLabelProps) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3 px-0.5">
      <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#64748b]">
        <span className={`h-2 w-2 rounded-full ${getSectionDotClass(color)}`} />
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
          ? 'border-[#0f172a] bg-[#0f172a] text-white'
          : 'border-[#e2e8f0] bg-white text-[#334155]'
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
      className={`inline-flex h-[42px] items-center justify-center gap-2 rounded-[14px] border-[1.5px] px-3 text-[13px] font-bold transition ${
        active
          ? 'border-[#0f172a] bg-[#0f172a] text-white'
          : 'border-[#e2e8f0] bg-white text-[#334155]'
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
    <div className="flex gap-[3px] rounded-[12px] border-[1.5px] border-[#e2e8f0] bg-[#f8fafc] p-[3px]">
      {options.map((option) => {
        const active = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`h-9 flex-1 rounded-[9px] text-[12px] font-extrabold transition ${
              active ? 'bg-[#0f172a] text-white' : 'text-[#64748b]'
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
  subtitle: string
  open: boolean
  onToggle: () => void
  children: ReactNode
  sectionColor?: string
}

export function CollapseCard({ icon: Icon, iconTone, title, subtitle, open, onToggle, children, sectionColor }: CollapseCardProps) {
  return (
    <div className={pageCardCls}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-[38px] w-[38px] items-center justify-center rounded-[11px] ${getIconToneClass(iconTone)}`}
          >
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="text-[14px] font-bold text-[#0f172a]">{title}</div>
            <div className="text-[11px] text-[#94a3b8]">{subtitle}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sectionColor ? <span className={`h-2 w-2 rounded-full ${getSectionDotClass(sectionColor)}`} /> : null}
          {open ? <ChevronUp className="h-4 w-4 text-[#94a3b8]" /> : <ChevronRight className="h-4 w-4 text-[#94a3b8]" />}
        </div>
      </button>
      {open ? <div className="border-t border-[#e2e8f0] px-4 pb-4 pt-4">{children}</div> : null}
    </div>
  )
}

export interface LinkAttachment {
  label: string
  url: string
}

export function asLinkAttachment(entry: unknown): LinkAttachment {
  if (!entry || typeof entry !== 'object') return { label: '', url: '' }
  const candidate = entry as Partial<LinkAttachment>
  return {
    label: typeof candidate.label === 'string' ? candidate.label : '',
    url: typeof candidate.url === 'string' ? candidate.url : '',
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
