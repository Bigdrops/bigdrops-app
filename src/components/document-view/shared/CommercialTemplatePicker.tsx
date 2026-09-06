import { cn } from '@/lib/utils'

const TEMPLATE_OPTIONS = [
  { id: 'industry', label: 'Industry', accent: 'bg-slate-700' },
  { id: 'ledger', label: 'Ledger', accent: 'bg-[#D8C7A3]' },
  { id: 'crest', label: 'Crest', accent: 'bg-[#1e3a5f]' },
  { id: 'minimal', label: 'Minimal', accent: 'bg-[#111827]' },
  { id: 'evergreen', label: 'Evergreen', accent: 'bg-[#1f6e5c]' },
  { id: 'bolt', label: 'Bolt', accent: 'bg-[#2d6a4f]' },
  { id: 'ember', label: 'Ember', accent: 'bg-[#2c3e50]' },
] as const

interface CommercialTemplatePickerProps {
  value: string
  onChange: (id: string) => void
}

export default function CommercialTemplatePicker({ value, onChange }: CommercialTemplatePickerProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {TEMPLATE_OPTIONS.map((option) => {
        const active = value === option.id
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-xl border p-2.5 transition-all',
              active
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-border hover:border-border/80 hover:bg-muted/50',
            )}
          >
            <div className={cn('h-5 w-5 rounded-full', option.accent)} />
            <span className={cn(
              'text-[10px] font-semibold leading-tight',
              active ? 'text-primary' : 'text-muted-foreground',
            )}>
              {option.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
