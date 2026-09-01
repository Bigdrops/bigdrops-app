/**
 * Contextual Loading Tips with avatar animations.
 *
 * Extends the splash-only quick tips into a shared component usable by
 * any Level 4/5 loading surface (TenantGate, PageLoader, etc.).
 *
 * Avatar animations are grouped by family (payment, document, search,
 * archive, compliance/import, workspace) and use pure CSS — runs
 * off the main thread during loading.
 *
 * @see docs/prd/Adaptive Mobile-First UIUX Facelift PRD/10-loading-and-refresh.md §4, §6, §8
 */

import { useLoadingTip } from '@/hooks/useLoadingTip'
import { cn } from '@/lib/utils'
import type { LoadingTip } from '@/lib/tipContent'

// ── Animation families ──────────────────────────────────────────────

type AnimationFamily = 'payment' | 'document' | 'search' | 'archive' | 'compliance' | 'workspace'

const CONTEXT_FAMILY_MAP: Record<string, AnimationFamily> = {
  invoices: 'payment',
  waybills: 'document',
  clients: 'search',
  projects: 'archive',
  compliance: 'compliance',
  csr: 'compliance',
  quotations: 'document',
}

function resolveFamily(tip: LoadingTip | null): AnimationFamily {
  if (!tip?.context) return 'workspace'
  return CONTEXT_FAMILY_MAP[tip.context] ?? 'workspace'
}

// ── Avatar icon per family ──────────────────────────────────────────

function AvatarIcon({ family }: { family: AnimationFamily }) {
  switch (family) {
    case 'payment':
      // Credit card → receipt flow
      return (
        <div className="relative h-8 w-8" aria-hidden="true">
          <div className="bd-avatar-payment absolute inset-0 flex items-center justify-center text-lg">
            💳
          </div>
        </div>
      )
    case 'document':
      // Document with checkmark
      return (
        <div className="relative h-8 w-8" aria-hidden="true">
          <div className="bd-avatar-document absolute inset-0 flex items-center justify-center text-lg">
            📄
          </div>
        </div>
      )
    case 'search':
      // Magnifying glass scanning
      return (
        <div className="relative h-8 w-8" aria-hidden="true">
          <div className="bd-avatar-search absolute inset-0 flex items-center justify-center text-lg">
            🔍
          </div>
        </div>
      )
    case 'archive':
      // Archive box opening
      return (
        <div className="relative h-8 w-8" aria-hidden="true">
          <div className="bd-avatar-archive absolute inset-0 flex items-center justify-center text-lg">
            📦
          </div>
        </div>
      )
    case 'compliance':
      // Shield with checkmark
      return (
        <div className="relative h-8 w-8" aria-hidden="true">
          <div className="bd-avatar-compliance absolute inset-0 flex items-center justify-center text-lg">
            🛡️
          </div>
        </div>
      )
    case 'workspace':
    default:
      // Gear / workspace loading
      return (
        <div className="relative h-8 w-8" aria-hidden="true">
          <div className="bd-avatar-workspace absolute inset-0 flex items-center justify-center text-lg">
            ⚙️
          </div>
        </div>
      )
  }
}

// ── Props ───────────────────────────────────────────────────────────

type LoadingTipsProps = {
  /** Current pathname for contextual tip selection. */
  pathname: string
  /** Whether the loading state is active. */
  active: boolean
  /** Override rotation interval. Defaults to 8s per §6. */
  rotationInterval?: number
  /** Optional extra class on the outer wrapper. */
  className?: string
}

// ── Component ───────────────────────────────────────────────────────

export default function LoadingTips({
  pathname,
  active,
  rotationInterval,
  className,
}: LoadingTipsProps) {
  const { tip } = useLoadingTip({
    pathname,
    active,
    ...(rotationInterval !== undefined && { rotationInterval }),
  })

  if (!active || !tip) return null

  const family = resolveFamily(tip)

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center gap-3 rounded-[18px] border border-border bg-card px-4 py-3',
        'w-full max-w-[320px]',
        className,
      )}
    >
      <AvatarIcon family={family} />
      <div className="min-w-0 flex-1">
        <p className="text-[8px] font-extrabold uppercase tracking-[0.11em] text-muted-foreground/60">
          QUICK TIP
        </p>
        <p className="mt-0.5 text-xs font-semibold leading-relaxed text-muted-foreground">
          {tip.message}
        </p>
      </div>
    </div>
  )
}
