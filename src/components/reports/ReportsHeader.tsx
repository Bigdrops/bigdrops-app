import React from 'react'
import { Download, Sparkles, FileDown } from 'lucide-react'
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
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        {/* Left: Title Area */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-5 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-700 border border-emerald-100">
              <Sparkles size={10} className="fill-current" />
              Intelligence Hub
            </div>
            <div className="h-1 w-1 rounded-full bg-[hsl(var(--bd-border))]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--bd-text-muted))] opacity-50">Finance Reports</span>
          </div>
          
          <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-[hsl(var(--bd-text))]">
            {title}
          </h1>
          
          <p className="max-w-2xl text-xs lg:text-sm leading-relaxed text-[hsl(var(--bd-text-muted))] opacity-70">
            {description}
          </p>
        </div>

        {/* Right: Export Button */}
        <div className="shrink-0">
          <Button 
            variant="outline" 
            onClick={onExport}
            className="h-10 px-6 rounded-xl border-[hsl(var(--bd-border))] bg-white font-black uppercase tracking-widest text-[10px] shadow-sm transition-all hover:bg-[hsl(var(--bd-surface-muted)/0.5)] active:scale-[0.98] flex items-center gap-2.5"
          >
            <FileDown className="h-3.5 w-3.5" />
            Export Report
          </Button>
        </div>
      </div>
    </header>
  )
}