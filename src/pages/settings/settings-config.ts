import {
  ArchiveRestore,
  Building2,
  Hash,
  Info,
  LayoutDashboard,
  Lock,
  Mail,
  PenLine,
  Shield,
  Smartphone,
  Terminal,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type ActiveSectionId =
  | 'user'
  | 'notifications'
  | 'dashboard'
  | 'workspace-switch'
  | 'company-manage'
  | 'team'
  | 'devices'
  | 'company'
  | 'branding'
  | 'banking'
  | 'signatories'
  | 'prefixes'
  | 'archives'
  | 'theme'
  | 'security'
  | 'tenant-debug'

// All sections are live to preserve the 17-destination functional inventory
export type LiveSettingsSection = ActiveSectionId

export function isLiveSettingsSection(id: ActiveSectionId | null): id is LiveSettingsSection {
  return id !== null
}

export type SettingsItem = {
  id: ActiveSectionId
  label: string
  icon: LucideIcon
  desc: string
  count?: number
  accent?: boolean
  gapAfter?: boolean
  adminOnly?: boolean
  operatorOnly?: boolean
}

export type GroupId = 'account' | 'workspace' | 'company' | 'preferences' | 'system'

export type SettingsGroup = {
  id: GroupId
  label: string
  items: SettingsItem[]
}

export const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    id: 'account',
    label: 'Account',
    items: [
      { id: 'user', label: 'Profile & Security', icon: Users, desc: 'Sign-in and personal details' },
      { id: 'notifications', label: 'Notifications', icon: Mail, desc: 'Email and alert preferences' },
      { id: 'dashboard', label: 'Dashboard Layout', icon: LayoutDashboard, desc: 'Configure your dashboard tiles' },
    ],
  },
  {
    id: 'workspace',
    label: 'Workspace',
    items: [
      { id: 'workspace-switch', label: 'Switch Workspace', icon: Building2, desc: '', accent: true, gapAfter: true },
      { id: 'company-manage', label: 'Switch Company', icon: Building2, desc: '', accent: true, gapAfter: true },
      { id: 'team', label: 'Team Hub', icon: Users, desc: '', accent: true, gapAfter: true },
      { id: 'devices', label: 'Devices', icon: Smartphone, desc: 'Linked installations and device codes', adminOnly: true },
    ],
  },
  {
    id: 'company',
    label: 'Company',
    items: [
      { id: 'company', label: 'Company Info', icon: Building2, desc: 'Business name, address, and tax details' },
      { id: 'branding', label: 'Logo & Branding', icon: Shield, desc: 'Logo used on documents' },
      { id: 'banking', label: 'Banking', icon: Mail, desc: 'Accounts that receive payments' },
      { id: 'signatories', label: 'Signatories', icon: PenLine, desc: 'Authorized people who can sign documents' },
      { id: 'prefixes', label: 'Document Numbering', icon: Hash, desc: 'Invoice, waybill, and quote prefixes' },
      { id: 'archives', label: 'Archives', icon: ArchiveRestore, desc: 'Restore or remove archived company records' },
    ],
  },
  {
    id: 'preferences',
    label: 'Preferences',
    items: [
      { id: 'theme', label: 'Theme & Appearance', icon: Info, desc: 'Colors, cards, and display preferences' },
      { id: 'security', label: 'App Lock', icon: Lock, desc: 'Biometric lock for device level security' },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      { id: 'tenant-debug', label: 'Tenant Debug', icon: Terminal, desc: 'Platform operator diagnostics', adminOnly: true, operatorOnly: true },
    ],
  },
]

export function buildGroups(isAdmin?: boolean, isOperator?: boolean): SettingsGroup[] {
  return SETTINGS_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => (!item.adminOnly || isAdmin) && (!item.operatorOnly || isOperator)
    ),
  })).filter(group => group.items.length > 0)
}
