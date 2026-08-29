import * as React from 'react'
import { ArrowRight, BellRing, X, CircleDotDashed } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

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
      className="relative overflow-hidden rounded-[18px] border border-[hsl(var(--line))] bg-[hsl(var(--surface))] shadow-md"
      style={{
        boxShadow: '0 12px 28px color-mix(in srgb, var(--primary) 8%, transparent), 0 2px 6px rgba(15,23,42,.04)',
      }}
    >
      {/* V6 decorative corner ring */}
      <div
        className="pointer-events-none absolute -right-[36px] -top-[48px] h-[120px] w-[120px] rounded-full border-[18px] border-transparent opacity-85"
        style={{
          background: 'conic-gradient(from 180deg, hsl(var(--primary)/0.14), hsl(var(--secondary)/0.13), hsl(var(--primary)/0.14)) border-box',
          WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 18px), #000 calc(100% - 18px))',
          mask: 'radial-gradient(farthest-side, transparent calc(100% - 18px), #000 calc(100% - 18px))',
        }}
      />

      <div className="relative z-10 flex items-start gap-[9px] p-3 md:p-4">
        {/* V6 gradient icon */}
        <div
          className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[12px] text-white"
          style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))' }}
        >
          <BellRing size={16} strokeWidth={1.9} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[7px] font-[800] uppercase tracking-[0.11em] text-[hsl(var(--ink-3))]">
            Smart banner
          </div>
          <h2 className="mt-[3px] text-[12px] font-[800] tracking-[-.04em] text-[hsl(var(--ink))] md:text-[14px]">
            Keep payments recorded as they land
          </h2>
          <p className="mt-[2px] text-[9px] leading-[1.4] text-[hsl(var(--ink-2))] md:text-[11px]">
            Record each invoice payment promptly so your books stay accurate.
          </p>

          <div className="mt-[9px] flex items-center gap-[6px]">
            <button
              type="button"
              onClick={() => navigate('/invoices')}
              className="inline-flex items-center gap-[6px] rounded-[10px] px-[10px] py-[7px] text-[8px] font-[800] uppercase tracking-[0.065em] text-white transition active:scale-[0.96] md:px-4 md:py-2.5 md:text-[10px]"
              style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))' }}
            >
              Record payments
              <ArrowRight size={12} strokeWidth={1.9} />
            </button>
            <span className="inline-flex items-center gap-[3px] text-[7px] font-[700] text-[hsl(var(--ink-2))]">
              <CircleDotDashed size={11} strokeWidth={1.9} />
              Evergreen
            </span>
          </div>
        </div>

        <button
          type="button"
          aria-label="Dismiss payment reminder"
          onClick={dismiss}
          className="grid h-[28px] w-[28px] shrink-0 place-items-center rounded-full text-[hsl(var(--ink-3))] transition hover:text-[hsl(var(--ink-2))] active:scale-95"
        >
          <X size={14} strokeWidth={1.9} />
        </button>
      </div>
    </section>
  )
}
