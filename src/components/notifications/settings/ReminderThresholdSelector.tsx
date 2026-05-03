import { Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ReminderOption = {
  value: number
  label: string
}

export function ReminderThresholdSelector({
  title,
  description,
  options,
  selectedDays,
  onToggleDay,
  customValue,
  onCustomValueChange,
  onAddCustomDay,
  customError,
  helperText,
}: {
  title: string
  description?: string
  options: ReminderOption[]
  selectedDays: number[]
  onToggleDay: (day: number) => void
  customValue?: string
  onCustomValueChange?: (value: string) => void
  onAddCustomDay?: () => void
  customError?: string | null
  helperText?: string
}) {
  return (
    <div className="rounded-[var(--notification-radius)] border border-[var(--notification-border)] bg-[var(--notification-bg)]">
      <div className="border-b border-[var(--notification-border)] px-4 py-3.5">
        <div className="text-sm font-bold text-[var(--notification-text)]">{title}</div>
        {description ? (
          <div className="mt-0.5 text-[12px] leading-5 text-[var(--notification-muted-text)]">
            {description}
          </div>
        ) : null}
      </div>

      <div className="space-y-4 px-4 py-4">
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const active = selectedDays.includes(option.value)

            return (
              <button
                key={`${title}-${option.value}`}
                type="button"
                onClick={() => onToggleDay(option.value)}
                aria-pressed={active}
                className={cn(
                  'inline-flex items-center rounded-full border px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'border-[var(--notification-active-bg)] bg-[var(--notification-active-bg)] text-[var(--notification-active-text)]'
                    : 'border-[var(--notification-border)] bg-[var(--notification-bg)] text-[var(--notification-text)] hover:opacity-80',
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>

        {helperText ? (
          <div className="flex items-center gap-2 text-[11px] text-[var(--notification-muted-text)]">
            <Badge variant="outline" className="bg-[var(--notification-bg)] border-[var(--notification-border)]">
              Multi-select
            </Badge>
            <span>{helperText}</span>
          </div>
        ) : null}

        {onCustomValueChange && onAddCustomDay ? (
          <div className="rounded-[var(--notification-radius)] border border-dashed border-[var(--notification-border)] bg-[var(--notification-bg)] p-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={customValue || ''}
                onChange={(event) => onCustomValueChange(event.target.value)}
                placeholder="Add custom day"
                inputMode="numeric"
                className="bg-[var(--notification-bg)] border-[var(--notification-border)] text-[var(--notification-text)]"
              />
              <Button
                type="button"
                variant="outline"
                onClick={onAddCustomDay}
                className="sm:w-auto border-[var(--notification-border)] text-[var(--notification-text)] hover:bg-[var(--notification-muted-text)]/10"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add custom day
              </Button>
            </div>
            {customError ? (
              <div className="mt-2 text-[11px] font-medium text-[var(--notification-danger)]">
                {customError}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
