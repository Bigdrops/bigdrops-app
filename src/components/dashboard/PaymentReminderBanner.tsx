import * as React from 'react'
import { AlertCircle, ArrowRight, BellRing, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { cn } from '@/lib/utils'

const STORAGE_KEY = 'bd:dashboard:payment-reminder-dismissed:v1'

function readDismissedState() {
  if (typeof window === 'undefined') return false
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function PaymentReminderBanner() {
  const navigate = useNavigate()
  const [dismissed, setDismissed] = React.useState(readDismissedState)

  if (dismissed) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      window.sessionStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // Session persistence is best-effort only.
    }
  }

  return (
    <section
      aria-label="Payment reminder"
      className="relative overflow-hidden rounded-[var(--bd-radius-xl)] border border-[hsl(var(--border))] bg-[linear-gradient(135deg,hsl(var(--primary)/0.08),hsl(var(--card))_45%,hsl(var(--muted)/0.35))] px-4 py-4 shadow-sm md:px-5"
    >
      <div className="pointer-events-none absolute inset-y-0 right-0 w-28 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.16),transparent_70%)]" />

      <div className="relative flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[hsl(var(--border))] bg-card text-[hsl(var(--primary))] shadow-sm">
          <BellRing className="size-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
            Smart Banner
          </div>
          <h2 className="mt-1 text-[14px] font-black tracking-tight text-foreground">
            Keep payments recorded as they land
          </h2>
          <p className="mt-1 max-w-[44rem] text-[12px] leading-5 text-muted-foreground">
            Record each invoice payment promptly so your books stay accurate and follow-ups stay clean.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/invoices')}
              className={cn(
                'inline-flex items-center gap-2 rounded-full bg-[hsl(var(--foreground))] px-3.5 py-2 text-[11px] font-black uppercase tracking-wider text-[hsl(var(--background))] transition active:scale-[0.98]',
                'hover:opacity-95',
              )}
            >
              Record payments
              <ArrowRight className="size-3.5" />
            </button>

            <div className="inline-flex items-center gap-2 rounded-full border border-dashed border-border bg-background/80 px-3 py-2 text-[11px] font-semibold text-muted-foreground">
              <AlertCircle className="size-3.5" />
              Evergreen reminder
            </div>
          </div>
        </div>

        <button
          type="button"
          aria-label="Dismiss payment reminder"
          onClick={dismiss}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-card text-muted-foreground transition hover:text-foreground active:scale-95"
        >
          <X className="size-4" />
        </button>
      </div>
    </section>
  )
}
