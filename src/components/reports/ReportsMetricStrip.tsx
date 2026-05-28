import React from 'react'
import { cn } from '@/lib/utils'
import { ArrowDownLeft, Wallet, Briefcase, FileText } from 'lucide-react'
import { MetricTone } from './reportTypes'

interface MetricItemProps {
  label: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  tone?: MetricTone
  trend?: string
  subValue?: string
}

// Old simplified MetricItem for backward compatibility
interface SimpleMetricItem {
  label: string
  value: string
  description?: string
  icon?: React.ReactNode
  tone?: MetricTone
}

const iconTones = {
  green: "bg-bd-status-success-bg text-bd-status-success-text",
  red: "bg-bd-status-danger-bg text-bd-status-danger-text",
  amber: "bg-bd-status-warning-bg text-bd-status-warning-text",
  blue: "bg-bd-status-info-bg text-bd-status-info-text",
}

const iconBgTones = {
  green: "bg-bd-status-success-bg text-bd-status-success-text",
  red: "bg-bd-status-danger-bg text-bd-status-danger-text",
  amber: "bg-bd-status-warning-bg text-bd-status-warning-text",
  blue: "bg-bd-status-info-bg text-bd-status-info-text",
}

function SimpleMetricItemCard({ label, value, description, icon, tone = 'blue' }: SimpleMetricItem) {
  return (
    <div className={cn(
      "flex flex-col gap-3 p-5 rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border)/0.5)] bg-bd-card-bg transition-all hover:shadow-md hover:-translate-y-0.5",
    )}>
      <div className="flex items-center justify-between gap-4">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", iconBgTones[tone])}>
          {icon || <ArrowDownLeft size={20} />}
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-60 leading-none mb-1.5">{label}</p>
          <p className="text-xl lg:text-2xl font-black tracking-tight leading-none text-bd-text">{value}</p>
        </div>
      </div>
      {description && (
        <p className="text-[10px] font-bold text-bd-text-muted opacity-60 border-t border-[hsl(var(--bd-border)/0.3)] pt-2">
          {description}
        </p>
      )}
    </div>
  )
}

// New compact KPI metric for command-center style
function CompactMetricCard({ label, value, description, tone = 'blue', trend, subValue }: MetricItemProps) {
  return (
    <div className={cn(
      "flex flex-col gap-2 p-4 rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-border)/0.3)] bg-bd-card-bg transition-all",
    )}>
      <p className="text-[10px] font-black uppercase tracking-widest text-bd-text-muted opacity-50">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className={cn(
          "text-lg font-black tracking-tight leading-none",
          tone === 'green' && "text-bd-status-success-text",
          tone === 'red' && "text-bd-status-danger-text",
          tone === 'amber' && "text-bd-status-warning-text",
          tone === 'blue' && "text-bd-text",
        )}>
          {value}
        </p>
        {trend && (
          <span className={cn(
            "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full",
            trend.startsWith('+') 
              ? "border border-bd-status-success-border bg-bd-status-success-bg text-bd-status-success-text"
              : "border border-bd-status-danger-border bg-bd-status-danger-bg text-bd-status-danger-text"
          )}>
            {trend}
          </span>
        )}
      </div>
      {description && (
        <p className="text-[10px] text-bd-text-muted opacity-50">{description}</p>
      )}
      {subValue && (
        <p className="text-[10px] font-bold text-bd-text-muted opacity-40 border-t border-[hsl(var(--bd-border)/0.2)] pt-1.5 mt-1">
          {subValue}
        </p>
      )}
    </div>
  )
}

interface ReportsMetricStripProps {
  metrics?: SimpleMetricItem[]
  compactMetrics?: MetricItemProps[]
}

export function ReportsMetricStrip({ metrics, compactMetrics }: ReportsMetricStripProps) {
  // New compact format takes priority if provided
  if (compactMetrics) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {compactMetrics.map((metric, idx) => (
          <CompactMetricCard key={idx} {...metric} />
        ))}
      </div>
    )
  }

  // Original format for backward compatibility
  if (metrics) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, idx) => (
          <SimpleMetricItemCard key={idx} {...metric} />
        ))}
      </div>
    )
  }

  // Fallback default metrics for initial state
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <SimpleMetricItemCard
        label="Total Receivables"
        value="₦0.00"
        description="Outstanding across all clients"
        icon={<ArrowDownLeft size={20} />}
        tone="blue"
      />
      <SimpleMetricItemCard
        label="Collections"
        value="₦0.00"
        description="Cash received in selected period"
        icon={<Wallet size={20} />}
        tone="green"
      />
      <SimpleMetricItemCard
        label="Project Revenue"
        value="₦0.00"
        description="Total invoiced value"
        icon={<Briefcase size={20} />}
        tone="amber"
      />
      <SimpleMetricItemCard
        label="Tax Liability"
        value="₦0.00"
        description="Estimated VAT/WHT position"
        icon={<FileText size={20} />}
        tone="red"
      />
    </div>
  )
}
