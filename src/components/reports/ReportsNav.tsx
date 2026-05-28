import React from 'react'
import { 
  BarChart3, 
  Wallet, 
  ArrowDownLeft, 
  Briefcase, 
  FileText,
  LucideIcon 
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ReportTab } from './reportTypes'

interface NavItem {
  id: ReportTab
  label: string
  icon: LucideIcon
  description?: string
}

const NAV_ITEMS: NavItem[] = [
  { 
    id: 'overview', 
    label: 'Overview', 
    icon: BarChart3,
    description: 'Finance Summary'
  },
  { 
    id: 'receivables', 
    label: 'Receivables', 
    icon: ArrowDownLeft,
    description: 'Unpaid & Aging'
  },
  { 
    id: 'collections', 
    label: 'Collections', 
    icon: Wallet,
    description: 'Payment History'
  },
  { 
    id: 'projects', 
    label: 'Projects', 
    icon: Briefcase,
    description: 'P&L by Project'
  },
  { 
    id: 'tax', 
    label: 'Tax Positions', 
    icon: FileText,
    description: 'VAT & WHT'
  },
]

interface ReportsNavProps {
  activeTab: ReportTab
  onTabChange: (tab: ReportTab) => void
}

export function ReportsNav({ activeTab, onTabChange }: ReportsNavProps) {
  return (
    <nav className="flex flex-row lg:flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        const isActive = activeTab === item.id
        
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "group relative flex flex-col lg:flex-row lg:items-center gap-3 px-4 py-3 rounded-[var(--bd-radius-lg)] transition-all outline-none text-left whitespace-nowrap lg:whitespace-normal",
              isActive 
                ? "bg-[hsl(var(--bd-button-primary-bg)/0.04)] text-bd-button-primary-bg" 
                : "text-bd-text-muted hover:bg-[hsl(var(--bd-surface-muted)/0.5)] hover:text-bd-text"
            )}
          >
            {/* Active Indicator (Desktop Only) */}
            {isActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-bd-button-primary-bg rounded-r-full hidden lg:block" />
            )}
            
            <div className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-all",
              isActive 
                ? "border-[hsl(var(--bd-button-primary-bg)/0.2)] bg-white shadow-sm" 
                : "border-transparent bg-[hsl(var(--bd-surface-muted)/0.3)] group-hover:bg-bd-surface-muted"
            )}>
              <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            
            <div className="min-w-0">
              <div className="text-[11px] lg:text-[13px] font-bold tracking-tight">
                {item.label}
              </div>
              <div className="hidden lg:block text-[10px] opacity-60 font-medium">
                {item.description}
              </div>
            </div>
          </button>
        )
      })}
    </nav>
  )
}
