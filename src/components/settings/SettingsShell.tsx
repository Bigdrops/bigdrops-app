import * as React from 'react'
import { Search } from 'lucide-react'
import { SidebarToggleIcon } from '@/components/unlumen-ui/sidebar-toggle-icon'
import { cn } from '@/lib/utils'
import { SettingsNav } from './SettingsNav'
import { SettingsSectionFrame } from './SettingsSectionFrame'
import type { SettingsGroup, ActiveSectionId } from '@/pages/settings/settings-config'
import { MobileChromeContext } from '@/components/Layout'
import { Button } from '@/components/ui/button'

interface SettingsShellProps {
  groups: SettingsGroup[]
  activeSection: ActiveSectionId | null
  setActiveSection: (id: ActiveSectionId | null) => void
  renderContent: () => React.ReactNode
  isAdmin: boolean
  /** Optional slot rendered above the settings navigation (e.g. Workspace Switcher). */
  headerSlot?: React.ReactNode
}

export function SettingsShell({
  groups,
  activeSection,
  setActiveSection,
  renderContent,
  isAdmin,
  headerSlot,
}: SettingsShellProps) {
  const [viewportWidth, setViewportWidth] = React.useState(typeof window !== 'undefined' ? window.innerWidth : 1200)
  const { openSidebar, sidebarOpen } = React.useContext(MobileChromeContext)

  const lastWidth = React.useRef(typeof window !== 'undefined' ? window.innerWidth : 1200)

  React.useEffect(() => {
    const handleResize = () => {
      const currentWidth = window.innerWidth
      if (currentWidth === lastWidth.current) return
      lastWidth.current = currentWidth
      setViewportWidth(currentWidth)
    }
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
      <div className="flex flex-col min-h-[100dvh] w-full bg-bd-surface">
        {/* Compact Mobile Header */}
        {!activeSection && (
          <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-bd-surface border-b border-[hsl(var(--bd-border)/0.5)]">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={openSidebar}
                className="h-9 w-9 rounded-full bg-[hsl(var(--bd-surface-muted))/0.5] text-bd-text"
              >
                <SidebarToggleIcon
                  isOpen={sidebarOpen}
                  strokeWidth={2}
                  className="size-5 text-bd-text"
                />
              </Button>
              <h1 className="text-lg font-bold tracking-tight text-bd-text">Settings</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-bd-text-muted"
            >
              <Search size={18} />
            </Button>
          </header>
        )}

        <div className={cn(
          "flex-1 w-full",
          !activeSection ? "px-4 pt-4 pb-24" : "px-0 pb-24"
        )}>
          {!activeSection ? (
            <>
              {headerSlot ? (
                <div className="mb-4 px-1">{headerSlot}</div>
              ) : null}
              <SettingsNav 
                groups={groups} 
                activeSection={null} 
                onSelect={(id) => setActiveSection(id)} 
                variant="list" 
              />
            </>
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
        {headerSlot && !activeSection ? (
          <div className="mb-4">{headerSlot}</div>
        ) : null}
        {currentSection ? (
          <SettingsSectionFrame section={currentSection}>
            {renderContent()}
          </SettingsSectionFrame>
        ) : (
          <div className="flex h-[400px] items-center justify-center rounded-[var(--bd-radius-xl)] border border-bd-border bg-bd-surface-muted/30 shadow-sm">
            <p className="text-sm font-medium text-bd-text-muted">Select a setting to manage</p>
          </div>
        )}
        <Footer />
      </main>
    </div>
  )
}

function Footer() {
  return (
    <p className="text-center text-[10px] text-bd-text-muted font-black uppercase tracking-[0.3em] mt-12 pb-6 opacity-40">
      BIGDROPS ERP
    </p>
  )
}
