import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type ActionBarProps = {
  children: ReactNode
  className?: string
  align?: 'start' | 'end' | 'between'
}

const alignClassName: Record<NonNullable<ActionBarProps['align']>, string> = {
  start: 'justify-start',
  end: 'justify-end',
  between: 'justify-between',
}

export function ActionBar({
  children,
  className,
  align = 'end',
}: ActionBarProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center',
        alignClassName[align],
        className,
      )}
    >
      {children}
    </div>
  )
}
