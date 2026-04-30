import {
  Home,
  FolderKanban,
  Users,
  MoreHorizontal,
  Receipt,
  ClipboardCheck,
  BarChart3,
  Settings,
  LogOut,
  LayoutDashboard,
  ClipboardList,
  Package,
  type LucideIcon,
} from 'lucide-react'
import { QUICK_TILE_REGISTRY } from '@/config/quickTiles'

export const APP_NAME = 'BIGDROPS'

export type TabKey = 'home' | 'projects' | 'sales' | 'clients' | 'more' | 'item-library'

export interface NavItem {
  key: string
  label: string
  icon: LucideIcon
  path?: string
}

export interface PickerItem extends NavItem {
  subtitle?: string
  tint?: string
  iconBg?: string
  // For mobile sheets
  description?: string
}

export interface NavGroup {
  group: string
  sheetLabel?: string
  items: PickerItem[]
}

export const tabs: NavItem[] = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'projects', label: 'Projects', icon: FolderKanban },
  { key: 'sales', label: 'Sales', icon: Receipt },
  { key: 'clients', label: 'Clients', icon: Users },
  { key: 'more', label: 'More', icon: MoreHorizontal },
]

export const salesPicker: PickerItem[] = [
  {
    key: 'invoices',
    label: 'Invoices',
    subtitle: 'Create, send, collect, and reconcile.',
    description: 'Create, send, collect, and reconcile.',
    icon: QUICK_TILE_REGISTRY.invoices.icon as LucideIcon,
    tint: QUICK_TILE_REGISTRY.invoices.tint,
    iconBg: QUICK_TILE_REGISTRY.invoices.iconBg,
  },
  {
    key: 'quotations',
    label: 'Quotations',
    subtitle: 'Prepare pricing and convert when approved.',
    description: 'Prepare pricing and convert when approved.',
    icon: QUICK_TILE_REGISTRY.quotations.icon as LucideIcon,
    tint: QUICK_TILE_REGISTRY.quotations.tint,
    iconBg: QUICK_TILE_REGISTRY.quotations.iconBg,
  },
  {
    key: 'csr',
    label: 'CSR',
    subtitle: 'Track service reports and client sign-off.',
    description: 'Track service reports and client sign-off.',
    icon: QUICK_TILE_REGISTRY.csr.icon as LucideIcon,
    tint: QUICK_TILE_REGISTRY.csr.tint,
    iconBg: QUICK_TILE_REGISTRY.csr.iconBg,
  },
  {
    key: 'waybills',
    label: 'Waybills',
    subtitle: 'Manage dispatch and proof of delivery.',
    description: 'Manage dispatch and proof of delivery.',
    icon: QUICK_TILE_REGISTRY.waybills.icon as LucideIcon,
    tint: QUICK_TILE_REGISTRY.waybills.tint,
    iconBg: QUICK_TILE_REGISTRY.waybills.iconBg,
  },
]

export const presalesPicker: PickerItem[] = [
  {
    key: 'rfqs',
    label: 'RFQ',
    subtitle: 'Source vendor pricing for procurement items.',
    icon: QUICK_TILE_REGISTRY.new_rfq.icon as LucideIcon,
    tint: QUICK_TILE_REGISTRY.new_rfq.tint,
    iconBg: QUICK_TILE_REGISTRY.new_rfq.iconBg,
  },
  {
    key: 'boqs',
    label: 'BOQ',
    subtitle: 'Build and review pre-sales bills of quantities.',
    icon: ClipboardList,
    tint: 'bg-slate-50 border-slate-200 dark:bg-slate-500/10 dark:border-slate-500/30',
    iconBg: 'bg-slate-700 text-white dark:bg-slate-500 dark:text-white',
  },
]

export const moreGroups: NavGroup[] = [
  {
    group: 'Finance',
    sheetLabel: 'Finance & reporting',
    items: [
      {
        key: 'reports',
        label: 'Reports',
        subtitle: 'Revenue, collections, workload, and trends.',
        icon: BarChart3,
        iconBg: 'bg-muted text-foreground',
      },
      {
        key: 'compliance',
        label: 'Compliance Hub',
        subtitle: 'Approvals, policy logs, and audit trail.',
        icon: ClipboardCheck,
        iconBg: 'bg-muted text-foreground',
      },
      {
        key: 'item-library',
        label: 'Item Library',
        subtitle: 'Review price history and master item usage.',
        icon: Package,
        iconBg: 'bg-muted text-foreground',
      },
    ],
  },
  {
    group: 'System',
    sheetLabel: 'Workspace',
    items: [
      {
        key: 'settings',
        label: 'Settings',
        subtitle: 'Roles, preferences, notifications, and workspace controls.',
        icon: Settings,
        iconBg: 'bg-muted text-foreground',
      },
      {
        key: 'signout',
        label: 'Sign Out',
        subtitle: 'Exit this workspace securely.',
        icon: LogOut,
        iconBg: 'bg-destructive/10 text-destructive',
      },
    ],
  },
]

export const desktopNav: NavItem[] = [
  { key: 'home', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'projects', label: 'Projects', icon: FolderKanban },
  { key: 'clients', label: 'Clients', icon: Users },
  { key: 'item-library', label: 'Item Library', icon: Package },
]

export const mobileDrawerPrimaryNav: NavItem[] = [
  { key: 'home', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { key: 'projects', label: 'Projects', icon: FolderKanban, path: '/projects' },
  { key: 'clients', label: 'Clients', icon: Users, path: '/clients' },
]

export const mobileDrawerUtilityNav: NavItem[] = [
  { key: 'reports', label: 'Reports', icon: BarChart3, path: '/reports' },
  { key: 'compliance', label: 'Compliance Hub', icon: ClipboardCheck, path: '/compliance' },
  { key: 'item-library', label: 'Item Library', icon: Package, path: '/item-library' },
  { key: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
]

export const activeNavItemClassName = 'bg-[hsl(var(--bd-nav-active-bg))] text-[hsl(var(--bd-nav-active-text))] shadow-sm'
export const activeNavIconClassName = 'bg-[hsl(var(--bd-nav-active-icon)/0.15)] text-[hsl(var(--bd-nav-active-icon))]'
export const inactiveNavItemClassName = 'text-[hsl(var(--bd-text-muted))] hover:bg-[hsl(var(--bd-nav-hover-bg))]'
export const inactiveNavIconClassName = 'bg-[hsl(var(--bd-surface-muted))]'
export const inactiveNavIconColorClassName = 'text-[hsl(var(--bd-text-muted))]'

export function getSalesPath(key: string): string {
  const pathByKey: Record<string, string> = {
    invoices: '/invoices',
    quotations: '/quotations',
    csr: '/csr',
    waybills: '/waybills',
  }

  return pathByKey[key] || '/'
}

export function getPreSalesPath(key: string): string {
  const pathByKey: Record<string, string> = {
    rfqs: '/rfqs',
    boqs: '/boqs',
  }

  return pathByKey[key] || '/'
}

export function isPathActive(pathname: string, path: string): boolean {
  if (path === '/') return pathname === '/'
  return pathname === path || pathname.startsWith(`${path}/`)
}

export function getActiveTab(pathname: string): TabKey {
  if (pathname === '/') return 'home'
  if (pathname.startsWith('/projects')) return 'projects'
  if (pathname.startsWith('/clients')) return 'clients'
  if (
    pathname.startsWith('/invoices') ||
    pathname.startsWith('/quotations') ||
    pathname.startsWith('/csr') ||
    pathname.startsWith('/waybills')
  ) return 'sales'
  if (
    pathname.startsWith('/rfqs') ||
    pathname.startsWith('/boqs') ||
    pathname.startsWith('/reports') ||
    pathname.startsWith('/compliance') ||
    pathname.startsWith('/item-library') ||
    pathname.startsWith('/settings')
  ) return 'more'
  return 'home'
}
