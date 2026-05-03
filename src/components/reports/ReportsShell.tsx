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
      {/* Header Area */}
      {header}

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 items-start">
        {/* Sidebar Navigation */}
        <aside className="sticky top-24 z-10 hidden lg:block">
          <div className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border)/0.5)] bg-[hsl(var(--bd-card-bg))] p-2 shadow-sm">
            {navigation}
          </div>
        </aside>

        {/* Mobile Navigation (Scrollable) */}
        <div className="lg:hidden">
          <div className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border)/0.5)] bg-[hsl(var(--bd-card-bg))] p-1.5 shadow-sm overflow-x-auto no-scrollbar">
            {navigation}
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex flex-col gap-6 min-w-0">
          {filterBar && (
            <div className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border)/0.5)] bg-[hsl(var(--bd-card-bg))] p-4 shadow-sm">
              {filterBar}
            </div>
          )}
          
          <div className="min-h-[400px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
