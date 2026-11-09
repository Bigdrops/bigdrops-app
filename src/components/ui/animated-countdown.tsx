'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export type CountdownVariant = 'modern' | 'digital' | 'minimal' | 'classic'
export type CountdownSize = 'sm' | 'md' | 'lg'

export interface AnimatedCountdownProps {
  targetDate: Date | string | number
  variant?: CountdownVariant
  size?: CountdownSize
  className?: string
  showLabels?: boolean
  onComplete?: () => void
}

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
  totalMs: number
  isComplete: boolean
}

function parseTargetTime(target: Date | string | number): number {
  if (target instanceof Date) return target.getTime()
  if (typeof target === 'string') {
    const parsed = new Date(target).getTime()
    return Number.isFinite(parsed) ? parsed : Date.now()
  }
  return typeof target === 'number' && Number.isFinite(target) ? target : Date.now()
}

function calculateTimeLeft(targetTime: number): TimeLeft {
  const diff = Math.max(0, targetTime - Date.now())
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    totalMs: diff,
    isComplete: diff <= 0,
  }
}

interface DigitSlotProps {
  value: number
  size: CountdownSize
  variant: CountdownVariant
}

function DigitSlot({ value, size, variant }: DigitSlotProps) {
  const formatted = String(value).padStart(2, '0')

  const sizeBoxClasses: Record<CountdownSize, string> = {
    sm: 'h-9 w-9 rounded-lg text-sm',
    md: 'h-12 w-12 rounded-xl text-lg',
    lg: 'h-16 w-16 rounded-2xl text-2xl',
  }

  const variantBoxClasses: Record<CountdownVariant, string> = {
    modern:
      'bg-card text-card-foreground border border-border shadow-xs dark:border-border/60',
    digital:
      'bg-muted font-mono tracking-wider text-foreground border border-border/80 shadow-inner',
    minimal:
      'bg-transparent text-foreground border-0 shadow-none font-semibold',
    classic:
      'bg-card text-card-foreground border border-border/90 shadow-sm rounded-xl',
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden flex items-center justify-center font-mono tabular-nums font-bold select-none',
        sizeBoxClasses[size],
        variantBoxClasses[variant],
      )}
      style={{
        background: variant === 'minimal' ? 'transparent' : 'var(--au-surface, hsl(var(--card)))',
        color: 'var(--au-ink, hsl(var(--card-foreground)))',
        borderColor: 'var(--au-line, hsl(var(--border)))',
      }}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={formatted}
          initial={{ y: '50%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          exit={{ y: '-50%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className="inline-block"
        >
          {formatted}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}

/**
 * AnimatedCountdown component.
 *
 * Counts down live second-by-second toward a target date with smooth
 * Framer Motion spring transitions. Supports multiple theme-aware
 * variants (modern, digital, minimal, classic) and scales across sizes.
 */
export function AnimatedCountdown({
  targetDate,
  variant = 'modern',
  size = 'md',
  className,
  showLabels = true,
  onComplete,
}: AnimatedCountdownProps) {
  const targetTime = useMemo(() => parseTargetTime(targetDate), [targetDate])
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft(targetTime))

  useEffect(() => {
    setTimeLeft(calculateTimeLeft(targetTime))

    const interval = window.setInterval(() => {
      const next = calculateTimeLeft(targetTime)
      setTimeLeft(next)
      if (next.isComplete) {
        window.clearInterval(interval)
        onComplete?.()
      }
    }, 1000)

    return () => window.clearInterval(interval)
  }, [targetTime, onComplete])

  const units = [
    { key: 'days', label: 'Days', value: timeLeft.days },
    { key: 'hours', label: 'Hours', value: timeLeft.hours },
    { key: 'mins', label: 'Mins', value: timeLeft.minutes },
    { key: 'secs', label: 'Secs', value: timeLeft.seconds },
  ]

  const gapClasses: Record<CountdownSize, string> = {
    sm: 'gap-1.5',
    md: 'gap-2.5',
    lg: 'gap-3.5',
  }

  const labelSizeClasses: Record<CountdownSize, string> = {
    sm: 'text-[9px] mt-1',
    md: 'text-[10px] mt-1.5',
    lg: 'text-xs mt-2',
  }

  const colonSizeClasses: Record<CountdownSize, string> = {
    sm: 'text-xs pb-4',
    md: 'text-base pb-5',
    lg: 'text-xl pb-6',
  }

  return (
    <div
      role="timer"
      aria-label={`${timeLeft.days} days, ${timeLeft.hours} hours, ${timeLeft.minutes} minutes, ${timeLeft.seconds} seconds remaining`}
      className={cn('inline-flex items-center justify-center', gapClasses[size], className)}
    >
      {units.map((unit, index) => (
        <React.Fragment key={unit.key}>
          <div className="flex flex-col items-center">
            <DigitSlot value={unit.value} size={size} variant={variant} />
            {showLabels && (
              <span
                className={cn(
                  'font-medium tracking-tight text-muted-foreground select-none',
                  labelSizeClasses[size],
                )}
                style={{ color: 'var(--au-muted, hsl(var(--muted-foreground)))' }}
              >
                {unit.label}
              </span>
            )}
          </div>
          {index < units.length - 1 && variant !== 'minimal' && (
            <span
              className={cn(
                'font-mono font-bold text-muted-foreground/60 select-none',
                colonSizeClasses[size],
              )}
              style={{ color: 'var(--au-faint, hsl(var(--muted-foreground) / 0.5))' }}
              aria-hidden="true"
            >
              :
            </span>
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

export default AnimatedCountdown
