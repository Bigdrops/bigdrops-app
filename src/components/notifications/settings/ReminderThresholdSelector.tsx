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
  description: string
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
    <div className="rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3.5">
        <div className="text-sm font-bold text-foreground">{title}</div>
        <div className="mt-0.5 text-[12px] leading-5 text-muted-foreground">
          {description}
        </div>
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
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground hover:bg-muted',
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>

        {helperText ? (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Badge variant="outline" className="bg-muted/50">
              Multi-select
            </Badge>
            <span>{helperText}</span>
          </div>
        ) : null}

        {onCustomValueChange && onAddCustomDay ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={customValue || ''}
                onChange={(event) => onCustomValueChange(event.target.value)}
                placeholder="Add custom day"
                inputMode="numeric"
              />
              <Button
                type="button"
                variant="outline"
                onClick={onAddCustomDay}
                className="sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add custom day
              </Button>
            </div>
            {customError ? (
              <div className="mt-2 text-[11px] font-medium text-destructive">
                {customError}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
