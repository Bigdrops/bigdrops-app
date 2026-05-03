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
  Bell,
  type LucideIcon,
} from 'lucide-react'

export type ActiveSectionId =
  | 'user'
  | 'theme'
  | 'notifications'
  | 'company'
  | 'branding'
  | 'banking'
  | 'signatories'
  | 'documents'
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
