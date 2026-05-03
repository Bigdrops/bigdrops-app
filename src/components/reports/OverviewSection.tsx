import React from 'react'
import { ArrowDownLeft, Wallet, Briefcase, FileText } from 'lucide-react'
import { ReportsMetricStrip } from './ReportsMetricStrip'

interface OverviewSectionProps {
  isActive: boolean
}

export function OverviewSection({ isActive }: OverviewSectionProps) {
  if (!isActive) return null

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <ReportsMetricStrip 
        metrics={[
          {
            label: 'Total Receivables',
            value: '₦0.00',
            description: 'Outstanding across all clients',
            icon: <ArrowDownLeft size={20} />,
            tone: 'blue'
          },
          {
            label: 'Collections',
            value: '₦0.00',
            description: 'Cash received in selected period',
            icon: <Wallet size={20} />,
            tone: 'green'
          },
          {
            label: 'Project Revenue',
            value: '₦0.00',
            description: 'Total invoiced value',
            icon: <Briefcase size={20} />,
            tone: 'amber'
          },
          {
            label: 'Tax Liability',
            value: '₦0.00',
            description: 'Estimated VAT/WHT position',
            icon: <FileText size={20} />,
            tone: 'red'
          }
        ]}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border)/0.5)] bg-[hsl(var(--bd-card-bg))] p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
           <div className="h-16 w-16 rounded-full bg-[hsl(var(--bd-surface-muted))] flex items-center justify-center mb-4">
              <BarChart3 size={32} className="text-[hsl(var(--bd-text-muted))] opacity-20" />
           </div>
           <h3 className="text-sm font-bold text-[hsl(var(--bd-text))]">Financial Trend</h3>
           <p className="text-xs text-[hsl(var(--bd-text-muted))] mt-2">Visual trend analysis will be available in the next phase.</p>
        </div>
        
        <div className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border)/0.5)] bg-[hsl(var(--bd-card-bg))] p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
           <div className="h-16 w-16 rounded-full bg-[hsl(var(--bd-surface-muted))] flex items-center justify-center mb-4">
              <FileText size={32} className="text-[hsl(var(--bd-text-muted))] opacity-20" />
           </div>
           <h3 className="text-sm font-bold text-[hsl(var(--bd-text))]">Recent Activity</h3>
           <p className="text-xs text-[hsl(var(--bd-text-muted))] mt-2">Historical report activity log coming soon.</p>
        </div>
      </div>
    </div>
  )
}

import { BarChart3 } from 'lucide-react'
