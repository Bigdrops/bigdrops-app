import { Plus, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type MobileFabProps = {
  onClick: () => void
  icon?: LucideIcon
  children?: ReactNode
  ariaLabel?: string
}

export default function MobileFab({ onClick, icon: Icon = Plus, ariaLabel }: MobileFabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="fixed bottom-[94px] right-4 z-50 grid h-14 w-14 place-items-center rounded-[var(--bd-overlay-radius)] border border-transparent bg-[hsl(var(--bd-fab-bg))] text-[hsl(var(--bd-fab-text))] shadow-lg md:hidden"
    >
      <Icon aria-hidden="true" className="h-7 w-7 stroke-[2.4]" />
    </button>
  )
}
