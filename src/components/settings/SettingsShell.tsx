import * as React from 'react'
import { cn } from '@/lib/utils'
import { SettingsNav } from './SettingsNav'
import { SettingsSectionFrame } from './SettingsSectionFrame'
import type { SettingsGroup, SettingsItem, ActiveSectionId } from '@/pages/settings/settings-config'

interface SettingsShellProps {
  groups: SettingsGroup[]
  activeSection: ActiveSectionId | null
  setActiveSection: (id: ActiveSectionId | null) => void
  renderContent: () => React.ReactNode
  isAdmin: boolean
}

export function SettingsShell({
  groups,
  activeSection,
  setActiveSection,
  renderContent,
  isAdmin
}: SettingsShellProps) {
  const [viewportWidth, setViewportWidth] = React.useState(typeof window !== 'undefined' ? window.innerWidth : 1200)

  React.useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isMobile = viewportWidth < 768
  const isTablet = viewportWidth >= 768 && viewportWidth < 1200
  const isDesktop = viewportWidth >= 1200

  // Automatically select first section on Desktop if none selected
  React.useEffect(() => {
    if (!isMobile && !activeSection) {
      const firstItem = groups[0]?.items[0]
      if (firstItem) setActiveSection(firstItem.id)
    }
  }, [isMobile, activeSection, groups, setActiveSection])

  const allSections = groups.flatMap(g => g.items)
  const currentSection = allSections.find(s => s.id === activeSection)

  // Mobile View: Drill-down logic
  if (isMobile) {
    return (
      <div className="w-full pb-10">
        {!activeSection ? (
          <SettingsNav 
            groups={groups} 
            activeSection={null} 
            onSelect={(id) => setActiveSection(id)} 
            variant="list" 
          />
        ) : (
          currentSection && (
            <SettingsSectionFrame 
              section={currentSection} 
              onBack={() => setActiveSection(null)} 
              showBackButton={true}
            >
              {renderContent()}
            </SettingsSectionFrame>
          )
        )}
        <Footer />
      </div>
    )
  }

  // Desktop & Tablet View: Sidebar + Content
  return (
    <div className={cn(
      "grid w-full max-w-7xl mx-auto items-start",
      "gap-[var(--bd-section-gap,2rem)]",
      isTablet ? "grid-cols-[200px,1fr]" : "grid-cols-[260px,1fr]"
    )}>
      {/* Sidebar Nav */}
      <aside className="sticky top-6">
        <SettingsNav 
          groups={groups} 
          activeSection={activeSection} 
          onSelect={(id) => setActiveSection(id)} 
          variant="sidebar" 
          isTablet={isTablet}
        />
      </aside>

      {/* Main Content Area */}
      <main className="min-w-0">
        {currentSection ? (
          <SettingsSectionFrame section={currentSection}>
            {renderContent()}
          </SettingsSectionFrame>
        ) : (
          <div className="flex h-[400px] items-center justify-center rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))]/30 shadow-sm">
            <p className="text-sm font-medium text-[hsl(var(--bd-text-muted))]">Select a setting to manage</p>
          </div>
        )}
        <Footer />
      </main>
    </div>
  )
}

function Footer() {
  return (
    <p className="text-center text-[10px] text-[hsl(var(--bd-text-muted))] font-black uppercase tracking-[0.3em] mt-12 pb-6 opacity-40">
      BIGDROPS ERP
    </p>
  )
}
