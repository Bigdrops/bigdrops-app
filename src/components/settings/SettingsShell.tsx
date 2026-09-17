import type { ReactNode } from 'react'
import { ChevronLeft, Info, Moon, Sun } from 'lucide-react'
import './settings.css'
import { SettingsNav } from './SettingsNav'
import type { SettingsGroup, LiveSettingsSection } from '@/pages/settings/settings-config'

interface SettingsShellProps {
  groups: SettingsGroup[]
  activeSection: LiveSettingsSection | null
  setActiveSection: (id: LiveSettingsSection | null) => void
  children: ReactNode
  workspaceName: string
  companyName: string
  dark: boolean
  onToggleTheme: () => void
  detailTitle?: string
  onBack?: () => void
}

export function SettingsShell({ groups, activeSection, setActiveSection, children, workspaceName, companyName, dark, onToggleTheme, detailTitle, onBack }: SettingsShellProps) {
  return <div className="bd-settings-surface su-device" data-subpage={!!activeSection}>
    <header className="su-topbar">
      {activeSection && <button type="button" className="su-iconbtn su-backbtn" aria-label={onBack ? 'Back to Team Hub' : 'Back to Settings'} onClick={onBack ?? (() => setActiveSection(null))}><ChevronLeft /></button>}
      <div className="su-identity">
        <h1 className="su-identity-name">{detailTitle ?? (activeSection === 'team' ? 'Team & Access' : activeSection === 'workspace-switch' ? 'Switch Workspace' : 'Settings')}</h1>
        {!activeSection && <div className="su-identity-context"><span>Workspace: <b>{workspaceName}</b></span><span className="sep">·</span><span>Company: <b>{companyName}</b></span></div>}
      </div>
      <button type="button" className="su-iconbtn" aria-label={dark ? 'Use light theme' : 'Use dark theme'} onClick={onToggleTheme}>{dark ? <Sun /> : <Moon />}</button>
    </header>
    <div className="su-pane-container">
      <div className="su-screen su-pane-nav"><SettingsNav groups={groups} activeSection={activeSection} onSelect={setActiveSection} /><SettingsFooter /></div>
      <div className="su-screen su-pane-detail">
        {activeSection ? <>{children}<SettingsFooter /></> : <div className="su-empty-pane"><Info aria-hidden="true" /><h3>Select an Option</h3><p>Choose an item from the menu on the left to view details.</p></div>}
      </div>
    </div>
  </div>
}

export function SettingsFooter() {
  return <p className="su-footer">BIGDROPS ERP</p>
}
