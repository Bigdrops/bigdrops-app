import React from 'react'
import { cn } from '@/lib/utils'
import { MetricTone } from './reportTypes'

interface MetricItemProps {
  label: string
  value: string | number
  description?: string
  icon: React.ReactNode
  tone: MetricTone
}

function MetricItem({ label, value, description, icon, tone }: MetricItemProps) {
  const tones = {
    green: "border-emerald-100 bg-emerald-50/30 text-emerald-700",
    red: "border-red-100 bg-red-50/30 text-red-700",
    amber: "border-amber-100 bg-amber-50/30 text-amber-700",
    blue: "border-blue-100 bg-blue-50/30 text-blue-700",
  }

  const iconTones = {
    green: "bg-emerald-100 text-emerald-600",
    red: "bg-red-100 text-red-600",
    amber: "bg-amber-100 text-amber-600",
    blue: "bg-blue-100 text-blue-600",
  }

  return (
    <div className={cn(
      "flex flex-col gap-3 p-5 rounded-[var(--bd-radius-xl)] border transition-all hover:shadow-md hover:-translate-y-0.5",
      tones[tone]
    )}>
      <div className="flex items-center justify-between gap-4">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", iconTones[tone])}>
          {icon}
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-60 leading-none mb-1.5">{label}</p>
          <p className="text-xl lg:text-2xl font-black tracking-tight leading-none text-[hsl(var(--bd-text))]">{value}</p>
        </div>
      </div>
      {description && (
        <p className="text-[10px] font-bold text-[hsl(var(--bd-text-muted))] opacity-60 border-t border-current/10 pt-2">
          {description}
        </p>
      )}
    </div>
  )
}

interface ReportsMetricStripProps {
  metrics: MetricItemProps[]
}

export function ReportsMetricStrip({ metrics }: ReportsMetricStripProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, idx) => (
        <MetricItem key={idx} {...metric} />
      ))}
    </div>
  )
}
