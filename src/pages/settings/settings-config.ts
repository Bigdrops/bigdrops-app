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
  Shield,
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
  | 'admin'
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

export type GroupId = 'account' | 'workspace' | 'preferences' | 'system'

export type SettingsGroup = {
  id: GroupId
  label: string
  items: SettingsItem[]
  variant?: 'system'
}

export const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    id: 'account',
    label: 'Account',
    items: [
      {
        id: 'user',
        label: 'User Profile',
        icon: FileText,
        desc: 'Update your personal info and avatar',
      },
    ],
  },
  {
    id: 'workspace',
    label: 'Workspace',
    items: [
      {
        id: 'workspace-switch',
        label: 'Switch Workspace',
        icon: Layers,
        desc: 'Change the active workspace',
      },
      {
        id: 'company',
        label: 'Company Info',
        icon: Building2,
        desc: 'Business name, address, and tax details',
      },
      {
        id: 'branding',
        label: 'Logo & Branding',
        icon: ImageIcon,
        desc: 'Manage your logo and document branding',
      },
      {
        id: 'banking',
        label: 'Banking',
        icon: CreditCard,
        desc: 'Bank accounts for documents and payments',
      },
      {
        id: 'signatories',
        label: 'Signatories',
        icon: UserCheck,
        desc: 'Authorized people who can sign documents',
      },
    ],
  },
  {
    id: 'preferences',
    label: 'Preferences',
    items: [
      {
        id: 'theme',
        label: 'Theme & Appearance',
        icon: Palette,
        desc: 'Colors, cards, and display preferences',
      },
      {
        id: 'notifications',
        label: 'Notifications',
        icon: Bell,
        desc: 'Manage email and push notification alerts',
      },
      {
        id: 'dashboard',
        label: 'Dashboard Layout',
        icon: LayoutDashboard,
        desc: 'Configure quick tiles on your dashboard',
      },
      {
        id: 'documents',
        label: 'Document Controls',
        icon: FolderKanban,
        desc: 'Set invoice, quotation, and PDF defaults',
      },
      {
      id: 'prefixes',
      label: 'Document Prefixes',
      icon: Hash,
      desc: 'Configure prefixes for auto-generated numbers',
    },
      {
        id: 'security',
        label: 'App Lock',
        icon: ShieldCheck,
        desc: 'Biometric lock for device-level security',
      },
  ],
},
]

export const SYSTEM_GROUP: SettingsGroup = {
  id: 'system',
  label: 'System',
  variant: 'system',
  items: [
    {
      id: 'team',
      label: 'Team',
      icon: Users,
      desc: 'Manage the people who have access to this business.',
    },
    {
      id: 'devices',
      label: 'Devices',
      icon: Smartphone,
      desc: 'Linked installations and device codes',
      adminOnly: true,
    },
    {
      id: 'archives',
      label: 'Archives',
      icon: ArchiveRestore,
      desc: 'Restore or remove archived records',
    },
    {
      id: 'tenant-debug',
      label: 'Tenant Debug',
      icon: Terminal,
      desc: 'Platform operator diagnostics',
      adminOnly: true,
      operatorOnly: true,
    },
  ],
}

export function buildGroups(isAdmin: boolean, isOperator: boolean): SettingsGroup[] {
  const systemItems = SYSTEM_GROUP.items.filter((item) => {
    if (item.operatorOnly) return isOperator
    if (item.adminOnly) return isAdmin
    return true
  })

  return [
    ...SETTINGS_GROUPS,
    {
      ...SYSTEM_GROUP,
      items: systemItems,
    },
  ].filter((group) => group.items.length > 0)
}
