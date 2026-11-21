import React from 'react'
import { cn } from '@/lib/utils'

interface SpeakingSpeedSegmentedControlProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  touchTargetMin44?: boolean
}

export function SpeakingSpeedSegmentedControl({
  value,
  onChange,
  disabled = false,
  touchTargetMin44 = false,
}: SpeakingSpeedSegmentedControlProps) {
  const options = [0.8, 1.0, 1.2, 1.4]

  return (
    <div
      role="group"
      aria-label="Speaking speed"
      className={cn(
        'inline-flex items-center rounded-lg border border-bd-border bg-muted p-0.5 gap-0.5',
        touchTargetMin44 ? 'min-h-[44px]' : 'h-8',
      )}
    >
      {options.map((rate) => {
        const isSelected = Math.abs(value - rate) < 0.05
        return (
          <button
            key={rate}
            type="button"
            aria-pressed={isSelected}
            disabled={disabled}
            onClick={() => onChange(rate)}
            className={cn(
              'min-w-0 rounded-md px-2.5 text-xs font-semibold transition-all',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              'disabled:pointer-events-none disabled:opacity-50 select-none',
              touchTargetMin44 ? 'min-h-[40px] flex-1 sm:flex-initial' : 'h-7',
              isSelected
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {rate.toFixed(1)}×
          </button>
        )
      })}
    </div>
  )
}
