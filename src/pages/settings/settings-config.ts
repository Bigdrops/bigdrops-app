import {
  ArchiveRestore,
  Building2,
  CreditCard,
  FileText,
  FolderKanban,
  Hash,
  ImageIcon,
  LayoutDashboard,
  Layers,
  Palette,
  ShieldCheck,
  Smartphone,
  Users,
  UserCheck,
  Bell,
  Terminal,
  type LucideIcon,
} from 'lucide-react'

export type ActiveSectionId =
  | 'user'
  | 'workspace-switch'
  | 'company-manage'
  | 'theme'
  | 'notifications'
  | 'company'
  | 'branding'
  | 'banking'
  | 'signatories'
  | 'documents'
  | 'prefixes'
  | 'dashboard'
  | 'archives'
  | 'team'
  | 'devices'
  | 'security'
  | 'tenant-debug'

export type SettingsItem = {
  id: ActiveSectionId
  label: string
  icon: LucideIcon
  desc: string
  adminOnly?: boolean
  operatorOnly?: boolean
}

export type GroupId = 'account' | 'workspace' | 'company' | 'system'

export type SettingsGroup = {
  id: GroupId
  label: string
  items: SettingsItem[]
  variant?: 'system'
}

export const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    id: 'account', label: 'Account', items: [
      { id: 'user', label: 'Profile & Security', icon: FileText, desc: 'Sign-in and personal details' },
      { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Email and alert preferences' },
      { id: 'theme', label: 'Theme & Appearance', icon: Palette, desc: 'Your theme and company custom colors' },
      { id: 'dashboard', label: 'Dashboard Layout', icon: LayoutDashboard, desc: 'Configure your dashboard tiles' },
    ],
  },
  {
    id: 'workspace', label: 'Workspace', items: [
      { id: 'workspace-switch', label: 'Switch Workspace', icon: Layers, desc: 'Choose where your work lives' },
      { id: 'team', label: 'Team Hub', icon: Users, desc: 'Members, invitations, roles, and access' },
      { id: 'devices', label: 'Devices', icon: Smartphone, desc: 'Linked installations and device codes', adminOnly: true },
    ],
  },
  {
    id: 'company', label: 'Company', items: [
      { id: 'company-manage', label: 'Switch Company', icon: Building2, desc: 'Switch, create, archive, or restore a company' },
      { id: 'company', label: 'Business Information', icon: Building2, desc: 'Business name, address, and tax details' },
      { id: 'branding', label: 'Logo & Branding', icon: ImageIcon, desc: 'Logo and branding used on documents' },
      { id: 'banking', label: 'Payment Destinations', icon: CreditCard, desc: 'Accounts that receive payments' },
      { id: 'signatories', label: 'Signatories', icon: UserCheck, desc: 'Authorized people who can sign documents' },
      { id: 'prefixes', label: 'Document Numbering', icon: Hash, desc: 'Invoice, waybill, and quote prefixes' },
      { id: 'documents', label: 'Document Controls', icon: FolderKanban, desc: 'Fillable writing for company documents' },
      { id: 'archives', label: 'Archives', icon: ArchiveRestore, desc: 'Restore or remove archived company records' },
    ],
  },
]

export const SYSTEM_GROUP: SettingsGroup = {
  id: 'system', label: 'System', variant: 'system', items: [
    { id: 'security', label: 'App Lock', icon: ShieldCheck, desc: 'Biometric security on this device' },
    { id: 'tenant-debug', label: 'Tenant Debug', icon: Terminal, desc: 'Platform operator diagnostics', adminOnly: true, operatorOnly: true },
  ],
}

export function buildGroups(isAdmin: boolean, isOperator: boolean): SettingsGroup[] {
  return [...SETTINGS_GROUPS, SYSTEM_GROUP]
    .map(group => ({
      ...group,
      items: group.items.filter(item => (!item.adminOnly || isAdmin) && (!item.operatorOnly || isOperator)),
    }))
    .filter(group => group.items.length > 0)
}
