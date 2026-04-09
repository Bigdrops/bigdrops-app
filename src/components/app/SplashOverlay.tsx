import * as React from 'react'
import { cn } from '@/lib/utils'

type SplashOverlayProps = {
  visible?: boolean
  tip?: string
  showProgress?: boolean
  variant?: 'ordered-intake' | 'folder-tab'
  className?: string
}

export default function SplashOverlay({
  visible = true,
  tip = 'Preparing your workspace...',
  showProgress = true,
  variant = 'ordered-intake',
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
            'pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[200px] w-[200px] -translate-x-1/2 -translate-y-[56%] rounded-full',
            'bg-[radial-gradient(circle,hsl(var(--primary)_/_0.12)_0%,hsl(var(--primary)_/_0.06)_32%,transparent_72%)]',
            'animate-[bd-halo_3.2s_ease-in-out_infinite]',
          )}
        />

        <div className="flex flex-col items-center">
          {variant === 'ordered-intake' ? <OrderedIntakeMark /> : <FolderTabMark />}

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

function OrderedIntakeMark() {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative h-20 w-20 rounded-[22px] border border-border/70 bg-card',
        'shadow-[0_1px_0_hsl(var(--foreground)_/_0.03),0_12px_28px_hsl(var(--foreground)_/_0.05)]',
        'animate-[bd-mark_3.2s_ease-in-out_infinite]',
      )}
    >
      <div
        className={cn(
          'absolute left-[15px] top-[12px] h-[48px] w-[38px] rounded-[12px] border border-border/70 bg-background/90',
          'animate-[bd-sheet-rear_3.2s_cubic-bezier(.22,.61,.36,1)_infinite]',
        )}
      >
        <div className="absolute left-2.5 top-3 h-1 w-4 rounded-full bg-muted" />
        <div className="absolute left-2.5 top-6 h-1 w-5 rounded-full bg-muted/80" />
      </div>

      <div
        className={cn(
          'absolute left-[24px] top-[18px] h-[48px] w-[38px] rounded-[12px] border border-border bg-card',
          'shadow-[0_6px_16px_hsl(var(--foreground)_/_0.06)]',
          'animate-[bd-sheet-front_3.2s_cubic-bezier(.22,.61,.36,1)_infinite]',
        )}
      >
        <div className="absolute inset-x-0 top-0 h-[10px] rounded-t-[11px] bg-primary/14" />
        <div className="absolute left-2.5 top-[16px] h-[2px] w-6 rounded-full bg-foreground/12" />
        <div className="absolute left-2.5 top-[22px] h-[2px] w-4 rounded-full bg-foreground/10" />
        <div className="absolute left-2.5 top-[28px] h-[2px] w-5 rounded-full bg-foreground/10" />
      </div>
    </div>
  )
}

function FolderTabMark() {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative h-20 w-20 rounded-[22px] border border-border/70 bg-card',
        'shadow-[0_1px_0_hsl(var(--foreground)_/_0.03),0_12px_28px_hsl(var(--foreground)_/_0.05)]',
        'animate-[bd-mark_3.2s_ease-in-out_infinite]',
      )}
    >
      <div
        className={cn(
          'absolute left-[18px] top-[21px] h-[36px] w-[30px] rounded-[10px] border border-border/60 bg-background/90',
          'animate-[bd-sheet-rear_3.2s_cubic-bezier(.22,.61,.36,1)_infinite]',
        )}
      />
      <div
        className={cn(
          'absolute left-[25px] top-[18px] h-[40px] w-[34px] rounded-[12px] border border-border bg-card',
          'shadow-[0_6px_16px_hsl(var(--foreground)_/_0.05)]',
          'animate-[bd-sheet-front_3.2s_cubic-bezier(.22,.61,.36,1)_infinite]',
        )}
      >
        <div className="absolute left-[8px] top-0 h-[8px] w-[12px] rounded-b-[6px] bg-primary/16" />
        <div className="absolute inset-x-0 top-[8px] h-[8px] bg-primary/10" />
        <div className="absolute left-2.5 top-[22px] h-[2px] w-5 rounded-full bg-foreground/10" />
        <div className="absolute left-2.5 top-[28px] h-[2px] w-4 rounded-full bg-foreground/10" />
      </div>
    </div>
  )
}
