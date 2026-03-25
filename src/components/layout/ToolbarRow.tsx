import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type ToolbarRowProps = {
  children: ReactNode
  className?: string
}

export function ToolbarRow({ children, className }: ToolbarRowProps) {
  return (
    <div
      data-slot="toolbar-row"
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      {children}
    </div>
  )
}
