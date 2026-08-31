'use client'

import * as React from 'react'
import { CircuitBoard } from '@/components/ui/circuit-board'
import { cn } from '@/lib/utils'
import QuickTipCard from '@/components/app/QuickTipCard'

type SplashOverlayProps = {
  visible?: boolean
  tip?: string
  /** Educational tip to display below the loading indicator. */
  quickTip?: string | null
  showProgress?: boolean
  /**
   * Kept for backwards compatibility with existing callers.
   * The circuit splash no longer uses separate mark variants.
   */
  variant?: 'ordered-intake' | 'folder-tab'
  /**
   * Controls whether the circuit visual appears above or below the BigDrops wordmark.
   */
  circuitPosition?: 'above' | 'below'
  className?: string
}

export default function SplashOverlay({
  visible = true,
  tip = 'Preparing your workspace...',
  quickTip = null,
  showProgress = true,
  circuitPosition = 'above',
  className,
}: SplashOverlayProps) {
  const circuit = showProgress ? <SplashCircuit /> : null

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
      <div className="relative flex w-full max-w-3xl flex-col items-center">
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute left-1/2 top-1/2 -z-10 rounded-full',
            'h-[280px] w-[280px] -translate-x-1/2 -translate-y-[52%]',
            'sm:h-[360px] sm:w-[360px]',
            'md:h-[460px] md:w-[460px]',
            'bg-[radial-gradient(circle,hsl(var(--primary)_/_0.12)_0%,hsl(var(--primary)_/_0.06)_34%,transparent_74%)]',
            'animate-[bd-halo_3.2s_ease-in-out_infinite]',
          )}
        />

        <div className="flex flex-col items-center">
          {circuitPosition === 'above' ? circuit : null}

          <h1
            className={cn(
              'brand-wordmark text-[34px] font-semibold tracking-[-0.04em] text-foreground',
              'sm:text-[40px]',
              'md:text-[44px]',
              circuitPosition === 'above' ? 'mt-3' : '',
            )}
          >
            BigDrops
          </h1>

          <p className="mt-2 text-center text-[15px] leading-6 text-muted-foreground sm:text-[16px]">
            {tip}
          </p>

          {quickTip ? <QuickTipCard message={quickTip} /> : null}

          {circuitPosition === 'below' ? (
            <div className="mt-5">{circuit}</div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function SplashCircuit() {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative overflow-visible',
        'h-[150px] w-[320px]',
        'sm:h-[180px] sm:w-[420px]',
        'md:h-[220px] md:w-[560px]',
      )}
    >
      <div className="block sm:hidden">
        <CircuitBoard
          width={320}
          height={150}
          showGrid={false}
          variant="auto"
          pulseSpeed={1.6}
          traceWidth={2}
          nodes={[
            {
              id: 'session',
              x: 50,
              y: 75,
              label: 'Session',
              status: 'active',
              size: 'sm',
            },
            {
              id: 'auth',
              x: 160,
              y: 45,
              label: 'Auth',
              status: 'processing',
              size: 'md',
            },
            {
              id: 'workspace',
              x: 270,
              y: 75,
              label: 'Workspace',
              status: 'active',
              size: 'sm',
            },
          ]}
          connections={[
            {
              from: 'session',
              to: 'auth',
              animated: true,
            },
            {
              from: 'auth',
              to: 'workspace',
              animated: true,
            },
          ]}
          className="absolute inset-0"
        />
      </div>

      <div className="hidden sm:block md:hidden">
        <CircuitBoard
          width={420}
          height={180}
          showGrid={false}
          variant="auto"
          pulseSpeed={1.7}
          traceWidth={2}
          nodes={[
            {
              id: 'session',
              x: 65,
              y: 90,
              label: 'Session',
              status: 'active',
              size: 'sm',
            },
            {
              id: 'auth',
              x: 210,
              y: 55,
              label: 'Auth',
              status: 'processing',
              size: 'md',
            },
            {
              id: 'workspace',
              x: 355,
              y: 90,
              label: 'Workspace',
              status: 'active',
              size: 'sm',
            },
          ]}
          connections={[
            {
              from: 'session',
              to: 'auth',
              animated: true,
            },
            {
              from: 'auth',
              to: 'workspace',
              animated: true,
            },
          ]}
          className="absolute inset-0"
        />
      </div>

      <div className="hidden md:block">
        <CircuitBoard
          width={560}
          height={220}
          showGrid={false}
          variant="auto"
          pulseSpeed={1.8}
          traceWidth={2}
          nodes={[
            {
              id: 'session',
              x: 80,
              y: 110,
              label: 'Session',
              status: 'active',
              size: 'md',
            },
            {
              id: 'auth',
              x: 280,
              y: 65,
              label: 'Authenticate',
              status: 'processing',
              size: 'lg',
            },
            {
              id: 'workspace',
              x: 480,
              y: 110,
              label: 'Workspace',
              status: 'active',
              size: 'md',
            },
          ]}
          connections={[
            {
              from: 'session',
              to: 'auth',
              animated: true,
            },
            {
              from: 'auth',
              to: 'workspace',
              animated: true,
            },
          ]}
          className="absolute inset-0"
        />
      </div>
    </div>
  )
}