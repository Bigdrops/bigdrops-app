import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type PageShellProps = {
  children: ReactNode
  className?: string
  width?: 'default' | 'narrow' | 'wide' | 'full'
  padded?: boolean
}

const widthClasses: Record<NonNullable<PageShellProps['width']>, string> = {
  default: 'mx-auto w-full max-w-[520px]',
  narrow: 'mx-auto w-full max-w-[440px]',
  wide: 'mx-auto w-full max-w-[560px]',
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
        widthClasses[width],
        'shell-surface-info min-h-screen font-["DM_Sans",sans-serif]',
        padded && 'px-4 pb-[120px] pt-5',
        className,
      )}
    >
      {children}
    </div>
  )
}
