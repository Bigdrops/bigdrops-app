import type { ReactNode } from 'react'
import { Check, Loader2 } from 'lucide-react'

export function SettingsField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}

export function SettingsInput({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value?: string | null
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={value || ''}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
    />
  )
}

export function SettingsSaveButton({
  saving,
  saved,
  onClick,
}: {
  saving: boolean
  saved: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
    >
      {saving ? (
        <Loader2 size={15} className="animate-spin" />
      ) : saved ? (
        <Check size={15} />
      ) : null}
      {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
    </button>
  )
}

export function SettingsSummaryField({
  label,
  value,
}: {
  label: string
  value?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/50 px-4 py-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-foreground">{value || 'Not set'}</div>
    </div>
  )
}
