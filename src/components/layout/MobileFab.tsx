import { Plus, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type MobileFabProps = {
  onClick: () => void
  icon?: LucideIcon
  children?: ReactNode
  ariaLabel?: string
  disabled?: boolean
}

/**
 * Floating action button with subtle ambient motion.
 * The gentle float reinforces the primary action without distraction.
 * Respects prefers-reduced-motion — degrades to static with opacity transition only.
 */
export default function MobileFab({ onClick, icon: Icon = Plus, ariaLabel, disabled }: MobileFabProps) {
  return (
    <>
      <style>{`
        @keyframes csrFabFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
        @keyframes csrFabHaloPulse {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(1.08); }
        }
        @media (prefers-reduced-motion: reduce) {
          .csr-fab-float { animation: none !important; }
          .csr-fab-halo { animation: none !important; opacity: 0.4; }
        }
      `}</style>
      <div className="fixed bottom-[94px] right-4 z-50 md:hidden">
        {/* Subtle halo glow behind FAB */}
        <div
          className="csr-fab-halo absolute inset-[-6px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(30,58,95,0.35) 0%, rgba(30,58,95,0) 70%)',
            filter: 'blur(6px)',
            animation: 'csrFabHaloPulse 4s ease-in-out infinite',
          }}
        />
        <button
          type="button"
          onClick={onClick}
          aria-label={ariaLabel}
          disabled={disabled}
          className="csr-fab-float relative grid h-[50px] w-[50px] place-items-center rounded-[18px] bg-bd-button-primary-bg text-bd-button-primary-text shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 outline-none active:outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:shadow-lg dark:shadow-black/20 dark:focus-visible:ring-offset-slate-950"
          style={{ animation: 'csrFabFloat 4s ease-in-out infinite' }}
        >
          <Icon aria-hidden="true" className="h-5 w-5 stroke-[2]" />
        </button>
      </div>
    </>
  )
}
