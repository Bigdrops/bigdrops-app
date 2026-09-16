import { Fragment } from 'react'
import { ChevronRight } from 'lucide-react'
import { isLiveSettingsSection, type SettingsGroup, type ActiveSectionId, type LiveSettingsSection } from '@/pages/settings/settings-config'

interface SettingsNavProps {
  groups: SettingsGroup[]
  activeSection: ActiveSectionId | null
  onSelect: (id: LiveSettingsSection) => void
}

export function SettingsNav({ groups, activeSection, onSelect }: SettingsNavProps) {
  return <nav aria-label="Settings">
    {groups.map(group => <section key={group.id} className="su-scope" aria-labelledby={`settings-${group.id}`}>
      <div className="su-scope-head"><h2 className="su-scope-title" id={`settings-${group.id}`}>{group.label}</h2></div>
      <div className="su-scope-card">
        {group.items.map(item => {
          const Icon = item.icon
          const content = <>
            <span className={`su-srow-icon${item.accent ? ' accent' : ''}`}><Icon aria-hidden="true" strokeWidth={1.9} /></span>
            <span className="su-srow-main"><span className="su-srow-label">{item.label}</span><span className="su-srow-meta">{item.desc}</span></span>
            <span className="su-srow-end">{item.count !== undefined && <span className="su-srow-count">{item.count}</span>}<ChevronRight aria-hidden="true" /></span>
          </>
          return <Fragment key={item.id}>
            {isLiveSettingsSection(item.id)
              ? <button type="button" className={`su-srow${activeSection === item.id ? ' active-nav' : ''}`} aria-current={activeSection === item.id ? 'page' : undefined} onClick={() => { if (isLiveSettingsSection(item.id)) onSelect(item.id) }}>{content}</button>
              : <div className="su-srow" aria-disabled="true">{content}</div>}
            {item.gapAfter && <div className="su-groupline" aria-hidden="true" />}
          </Fragment>
        })}
      </div>
    </section>)}
  </nav>
}
