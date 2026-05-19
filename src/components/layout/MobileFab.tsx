import { Plus, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type MobileFabProps = {
  onClick: () => void
  icon?: LucideIcon
  children?: ReactNode
  ariaLabel?: string
  disabled?: boolean
}

export default function MobileFab({ onClick, icon: Icon = Plus, ariaLabel, disabled }: MobileFabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
      className="fixed bottom-[94px] right-4 z-50 grid h-14 w-14 place-items-center rounded-2xl border border-transparent bg-[hsl(var(--bd-fab-bg))] text-[hsl(var(--bd-fab-text))] shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 md:hidden"
    >
      <Icon aria-hidden="true" className="h-7 w-7 stroke-[2.4]" />
    </button>
  )
}
