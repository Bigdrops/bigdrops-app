import React, { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ReportsShellProps {
  children: ReactNode
  navigation: ReactNode
  header: ReactNode
  filterBar?: ReactNode
  className?: string
}

export function ReportsShell({
  children,
  navigation,
  header,
  filterBar,
  className,
}: ReportsShellProps) {
  return (
    <div className={cn("flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500", className)}>
      {header}
      <div className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border)/0.5)] bg-bd-card-bg p-1.5 shadow-sm overflow-x-auto no-scrollbar">
        {navigation}
      </div>
      {filterBar ? (
        <div className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border)/0.5)] bg-bd-card-bg p-4 shadow-sm">
          {filterBar}
        </div>
      ) : null}
      <main className="min-w-0">
        <div className="min-h-[400px]">
          {children}
        </div>
      </main>
    </div>
  )
}
