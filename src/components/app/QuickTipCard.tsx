/**
 * Reusable Quick Tip card for loading surfaces.
 *
 * Extracted from SplashOverlay so any Level 4/5 loading surface can display
 * educational tips during long-running operations.
 *
 * @see docs/prd/Adaptive\ Mobile-First\ UIUX\ Facelift\ PRD/10-loading-and-refresh.md §4
 */

type QuickTipCardProps = {
  message: string
  className?: string
}

export default function QuickTipCard({ message, className }: QuickTipCardProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={className ?? 'mt-5 w-full max-w-[280px] rounded-[18px] border border-border bg-card px-3 py-2.5'}
    >
      <p className="text-center text-[8px] font-extrabold uppercase tracking-[0.11em] text-muted-foreground/60">
        QUICK TIP
      </p>
      <p className="mt-1 text-center text-xs font-semibold leading-relaxed text-muted-foreground">
        {message}
      </p>
    </div>
  )
}
