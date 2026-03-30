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
      className="fixed bottom-[94px] right-4 z-50 grid h-14 w-14 place-items-center rounded-[18px] border border-slate-950 bg-slate-950 text-white shadow-[0_10px_30px_rgba(15,23,42,0.25)]"
    >
      {children}
    </button>
  )
}
