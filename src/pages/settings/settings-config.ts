import {
  ArchiveRestore,
  Building2,
  CreditCard,
  FileText,
  FolderKanban,
  ImageIcon,
  LayoutDashboard,
  Palette,
  Shield,
  UserCheck,
  type LucideIcon,
} from 'lucide-react'

export type ActiveSectionId =
  | 'user'
  | 'theme'
  | 'company'
  | 'branding'
  | 'banking'
  | 'documents'
  | 'signatories'
  | 'dashboard'
  | 'archives'
  | 'admin'

export type SettingsItem = {
  id: ActiveSectionId
  label: string
  icon: LucideIcon
  desc: string
  adminOnly?: boolean
}

export type GroupId = 'account' | 'workspace' | 'operations' | 'interface' | 'system'

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
        label: 'User Settings',
        icon: FileText,
        desc: 'Profile, password, and notifications',
      },
      {
        id: 'theme',
        label: 'Theme & Appearance',
        icon: Palette,
        desc: 'Colors, cards, and display preferences',
      },
    ],
  },
  {
    id: 'workspace',
    label: 'Workspace',
    items: [
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
        desc: 'Logo and document branding',
      },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      {
        id: 'banking',
        label: 'Banking',
        icon: CreditCard,
        desc: 'Bank accounts for documents and payments',
      },
      {
        id: 'documents',
        label: 'Document Controls',
        icon: FolderKanban,
        desc: 'Invoice, quotation, and PDF defaults',
      },
      {
        id: 'signatories',
        label: 'Signatories',
        icon: UserCheck,
        desc: 'People who can sign documents',
      },
    ],
  },
  {
    id: 'interface',
    label: 'Interface',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard Layout',
        icon: LayoutDashboard,
        desc: 'Quick tiles on your dashboard',
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
      id: 'archives',
      label: 'Archives',
      icon: ArchiveRestore,
      desc: 'Restore or remove archived records',
    },
    {
      id: 'admin',
      label: 'Admin Panel',
      icon: Shield,
      desc: 'Users, devices, and admin controls',
      adminOnly: true,
    },
  ],
}

export function buildGroups(isAdmin: boolean): SettingsGroup[] {
  const systemItems = SYSTEM_GROUP.items.filter((item) =>
    item.adminOnly ? isAdmin : true
  )

  return [
    ...SETTINGS_GROUPS,
    {
      ...SYSTEM_GROUP,
      items: systemItems,
    },
  ].filter((group) => group.items.length > 0)
}
