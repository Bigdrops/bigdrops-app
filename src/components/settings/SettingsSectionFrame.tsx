import { cn } from '@/lib/utils'
import { ChevronLeft, type LucideIcon } from 'lucide-react'
import type { SettingsItem } from '@/pages/settings/settings-config'

interface SettingsSectionFrameProps {
  section: SettingsItem
  onBack?: () => void
  children: React.ReactNode
  showBackButton?: boolean
}

export function SettingsSectionFrame({ 
  section, 
  onBack, 
  children, 
  showBackButton = false 
}: SettingsSectionFrameProps) {
  const Icon = section.icon

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-2 duration-300">
      {/* Compact Header Area */}
      <div className="flex flex-col gap-1 mb-6 px-4 md:px-0">
        <div className="flex items-center gap-3">
          {showBackButton && onBack && (
            <button
              onClick={onBack}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--bd-surface-muted))/0.5] text-bd-text transition-all active:scale-95"
              aria-label="Back"
            >
              <ChevronLeft size={18} />
            </button>
          )}

          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn(
              "flex items-center justify-center rounded-[var(--bd-radius-sm)] bg-bd-surface-muted text-bd-button-primary-bg",
              showBackButton ? "h-7 w-7" : "h-9 w-9"
            )}>
              <Icon size={showBackButton ? 14 : 18} />
            </div>
            <h2 className={cn(
              "font-bold tracking-tight text-bd-text truncate",
              showBackButton ? "text-lg" : "text-xl"
            )}>
              {section.label}
            </h2>
          </div>
        </div>
        
        <div className={cn(
          "mt-0.5 opacity-70",
          showBackButton ? "ml-12" : "ml-11.5",
          "max-md:ml-0"
        )}>
          <p className="text-[12px] font-medium text-bd-text-muted max-w-2xl leading-relaxed">
            {section.desc}
          </p>
        </div>
      </div>

      {/* Content Surface */}
      <div className={cn(
        "bg-bd-card-bg md:rounded-[var(--bd-radius-xl)] border-y md:border border-[hsl(var(--bd-border)/0.5)] shadow-none overflow-hidden",
        "p-[var(--bd-card-padding,1.5rem)]",
        "max-md:border-x-0"
      )}>
        <div className="min-h-[200px]">
          {children}
        </div>
      </div>
    </div>
  )
}
