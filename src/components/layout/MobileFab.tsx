import type { ReactNode } from 'react'

type MobileFabProps = {
  onClick: () => void
  children: ReactNode
  ariaLabel?: string
}

export default function MobileFab({ onClick, children, ariaLabel }: MobileFabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="fixed bottom-[94px] right-4 z-50 grid h-14 w-14 place-items-center rounded-[18px] border border-transparent surface-strong shadow-lg"
    >
      {children}
    </button>
  )
}
