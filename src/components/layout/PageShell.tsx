import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type PageShellProps = {
  children: ReactNode
  className?: string
  width?: 'default' | 'narrow' | 'wide' | 'full'
  padded?: boolean
}

const widthClassName: Record<NonNullable<PageShellProps['width']>, string> = {
  default: 'mx-auto w-full max-w-5xl',
  narrow: 'mx-auto w-full max-w-3xl',
  wide: 'mx-auto w-full max-w-6xl',
  full: 'w-full',
}

export function PageShell({
  children,
  className,
  width = 'default',
  padded = true,
}: PageShellProps) {
  return (
    <div
      data-slot="page-shell"
      className={cn(
        widthClassName[width],
        padded ? 'px-3 py-3 pb-28 sm:px-4 sm:py-5 md:px-6 md:py-6 md:pb-10' : '',
        className,
      )}
    >
      {children}
    </div>
  )
}
