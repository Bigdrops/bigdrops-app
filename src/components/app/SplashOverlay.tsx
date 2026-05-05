'use client'

import * as React from 'react'
import { CircuitPattern } from '@/components/ui/circuit-board'
import { cn } from '@/lib/utils'

type SplashOverlayProps = {
  visible?: boolean
  tip?: string
  showProgress?: boolean
  /**
   * Kept for backwards compatibility with existing callers.
   * The circuit splash no longer uses separate mark variants.
   */
  variant?: 'ordered-intake' | 'folder-tab'
  className?: string
}

export default function SplashOverlay({
  visible = true,
  tip = 'Preparing your workspace...',
  showProgress = true,
  className,
}: SplashOverlayProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={!visible}
      aria-label={tip}
      className={cn(
        'fixed inset-0 z-[9999] bg-background px-6 transition-[opacity,visibility] duration-300 ease-out',
        'flex items-center justify-center',
        visible ? 'pointer-events-auto visible opacity-100' : 'pointer-events-none invisible opacity-0',
        className,
      )}
    >
      <div className="relative flex w-full max-w-sm flex-col items-center">
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[260px] w-[260px] -translate-x-1/2 -translate-y-[54%] rounded-full',
            'bg-[radial-gradient(circle,hsl(var(--primary)_/_0.12)_0%,hsl(var(--primary)_/_0.06)_34%,transparent_74%)]',
            'animate-[bd-halo_3.2s_ease-in-out_infinite]',
          )}
        />

        <div className="flex flex-col items-center">
          <div aria-hidden="true" className="relative h-[140px] w-[260px] overflow-visible">
            <CircuitPattern
              pattern="network"
              width={260}
              height={140}
              showGrid={false}
              variant="auto"
              pulseSpeed={1.8}
              traceWidth={1.8}
              className="absolute inset-0"
            />
          </div>

          <h1 className="brand-wordmark mt-4 text-[20px] font-semibold tracking-[-0.02em] text-foreground">
            BigDrops
          </h1>

          <p className="mt-1.5 text-center text-[13px] leading-5 text-muted-foreground">
            {tip}
          </p>

          {showProgress ? (
            <div
              aria-hidden="true"
              className="relative mt-3.5 h-0.5 w-[112px] overflow-hidden rounded-full bg-border/70"
            >
              <div className="absolute inset-y-0 left-[-30%] w-[38%] rounded-full bg-primary/70 animate-[bd-progress_1.8s_ease-in-out_infinite]" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}