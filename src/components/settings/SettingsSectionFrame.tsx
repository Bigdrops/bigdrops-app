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
      {/* Header Area */}
      <div className="flex flex-col gap-1 mb-8">
        <div className="flex items-center gap-4">
          {showBackButton && onBack && (
            <button
              onClick={onBack}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--bd-radius-md)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] text-[hsl(var(--bd-text))] transition-all hover:bg-[hsl(var(--bd-surface-muted))] active:scale-95 shadow-sm"
              aria-label="Back"
            >
              <ChevronLeft size={18} />
            </button>
          )}

          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--bd-radius-lg)] bg-[hsl(var(--bd-surface-muted))] text-[hsl(var(--bd-button-primary-bg))] border border-[hsl(var(--bd-border))]/50">
              <Icon size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-black tracking-tight text-[hsl(var(--bd-text))] truncate">
                {section.label}
              </h2>
            </div>
          </div>
        </div>
        
        <div className={cn(
          "mt-1",
          showBackButton ? "ml-[104px]" : "ml-[52px]",
          "max-md:ml-0" // Reset on very small screens if needed
        )}>
          <p className="text-[12px] font-medium text-[hsl(var(--bd-text-muted))] max-w-2xl leading-relaxed">
            {section.desc}
          </p>
        </div>
      </div>

      {/* Content Surface */}
      <div className={cn(
        "bg-[hsl(var(--bd-card-bg))] rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border))] shadow-sm overflow-hidden",
        "p-[var(--bd-card-padding,1.5rem)]"
      )}>
        <div className="min-h-[200px]">
          {children}
        </div>
      </div>
    </div>
  )
}
