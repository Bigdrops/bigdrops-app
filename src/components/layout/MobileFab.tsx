import { Plus, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import './fabFloat.css'

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
      <div className="fixed bottom-[94px] right-4 z-50 md:hidden">
        {/* Subtle halo glow behind FAB */}
        <div
          className="csr-fab-halo absolute inset-[-6px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(30,58,95,0.35) 0%, rgba(30,58,95,0) 70%)',
            filter: 'blur(6px)',
          }}
        />
        <button
          type="button"
          onClick={onClick}
          aria-label={ariaLabel}
          disabled={disabled}
          className="csr-fab-float relative grid h-[50px] w-[50px] place-items-center rounded-[18px] bg-bd-button-primary-bg text-bd-button-primary-text shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 outline-none active:outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:shadow-lg dark:shadow-black/20 dark:focus-visible:ring-offset-slate-950"
        >
          <Icon aria-hidden="true" className="h-5 w-5 stroke-[2]" />
        </button>
      </div>
    </>
  )
}
