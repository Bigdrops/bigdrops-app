import React from 'react'
import { Download, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ReportsHeaderProps {
  title: string
  description: string
  onExport?: () => void
}

export function ReportsHeader({
  title,
  description,
  onExport,
}: ReportsHeaderProps) {
  return (
    <header className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border)/0.5)] bg-[hsl(var(--bd-card-bg))] p-6 lg:p-8 shadow-sm overflow-hidden relative">
      {/* Decorative Accent */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[hsl(var(--bd-button-primary-bg)/0.03)] rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 items-center gap-1.5 rounded-full bg-[hsl(var(--bd-button-primary-bg)/0.08)] px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-[hsl(var(--bd-button-primary-bg))]">
              <Sparkles size={10} className="fill-current" />
              Intelligence Hub
            </div>
            <div className="h-1 w-1 rounded-full bg-[hsl(var(--bd-border))]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--bd-text-muted))] opacity-60">Finance Reports</span>
          </div>
          
          <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-[hsl(var(--bd-text))]">
            {title}
          </h1>
          
          <p className="max-w-2xl text-xs lg:text-sm leading-relaxed text-[hsl(var(--bd-text-muted))]">
            {description}
          </p>
        </div>

        <div className="flex shrink-0">
          <Button 
            variant="outline" 
            onClick={onExport}
            className="w-full md:w-auto h-11 px-8 rounded-xl border-[hsl(var(--bd-border))] bg-white font-black uppercase tracking-widest text-[10px] shadow-sm transition-all hover:bg-[hsl(var(--bd-surface-muted)/0.5)] active:scale-[0.98] flex items-center gap-2.5"
          >
            <Download className="h-3.5 w-3.5" />
            Export Data
          </Button>
        </div>
      </div>
    </header>
  )
}
