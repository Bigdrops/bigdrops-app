import { Building2, Info, Lock, Mail, PenLine, Shield, Users, type LucideIcon } from 'lucide-react'

export type ActiveSectionId = 'user' | 'notifications' | 'workspace-switch' | 'team' | 'company-manage' | 'company' | 'branding' | 'banking' | 'signatories' | 'theme' | 'security'
export type LiveSettingsSection = 'workspace-switch' | 'team'

export function isLiveSettingsSection(id: ActiveSectionId | null): id is LiveSettingsSection {
  return id === 'workspace-switch' || id === 'team'
}

export type SettingsItem = {
  id: ActiveSectionId
  label: string
  icon: LucideIcon
  desc: string
  count?: number
  accent?: boolean
  gapAfter?: boolean
}
export type SettingsGroup = {
  id: 'account' | 'workspace' | 'company' | 'preferences'
  label: string
  items: SettingsItem[]
}

// Presentation contract: settings-unified-candidate.html. Only two rows navigate.
export const SETTINGS_GROUPS: SettingsGroup[] = [
  { id: 'account', label: 'Account', items: [
    { id: 'user', label: 'Profile & Security', icon: Users, desc: 'Sign-in and personal details' },
    { id: 'notifications', label: 'Notifications', icon: Mail, desc: 'Email and alert preferences' },
  ] },
  { id: 'workspace', label: 'Workspace', items: [
    { id: 'workspace-switch', label: 'Switch Workspace', icon: Building2, desc: '', accent: true, gapAfter: true },
    { id: 'team', label: 'Team Hub', icon: Users, desc: '', accent: true, gapAfter: true },
  ] },
  { id: 'company', label: 'Company', items: [
    { id: 'company-manage', label: 'Switch Company', icon: Building2, desc: '', accent: true, gapAfter: true },
    { id: 'company', label: 'Company Info', icon: Building2, desc: 'Business name, address, and tax details' },
    { id: 'branding', label: 'Logo & Branding', icon: Shield, desc: 'Logo used on documents' },
    { id: 'banking', label: 'Banking', icon: Mail, desc: 'Accounts that receive payments' },
    { id: 'signatories', label: 'Signatories', icon: PenLine, desc: 'Authorized people who can sign documents' },
  ] },
  { id: 'preferences', label: 'Preferences', items: [
    { id: 'theme', label: 'Theme & Appearance', icon: Info, desc: 'Colors, cards, and display preferences' },
    { id: 'security', label: 'App Lock', icon: Lock, desc: 'Biometric lock for device level security' },
  ] },
]

export function buildGroups(): SettingsGroup[] {
  return SETTINGS_GROUPS.map(group => ({ ...group, items: group.items.map(item => ({ ...item })) }))
}
