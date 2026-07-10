import {
  Home,
  FolderKanban,
  Receipt,
  Users,
  MoreHorizontal,
  ClipboardCheck,
  BarChart3,
  Settings,
  LogOut,
  LayoutDashboard,
  ClipboardList,
  Package,
  FileSignature,
  Truck,
  FileText,
  Mail,
  X,
  ChevronDown,
  ChevronRight,
  UserRound,
} from 'lucide-react'

/**
 * Icon Registry
 * Single source of truth for all navigation and system icons.
 */
export const Icons = {
  // Navigation / Tabs
  dashboard: LayoutDashboard,
  home: Home,
  projects: FolderKanban,
  sales: Receipt,
  clients: Users,
  more: MoreHorizontal,
  itemLibrary: Package,

  // Modules
  invoice: Receipt,
  quotation: FileSignature,
  csr: ClipboardCheck,
  waybill: Truck,
  letter: Mail,
  rfq: FileText,
  boq: ClipboardList,
  report: BarChart3,
  compliance: ClipboardCheck,
  receipts: Receipt,

  // System / UI
  settings: Settings,
  signout: LogOut,
  close: X,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  user: UserRound,
  add: ClipboardList, // Placeholder or specific add icon if preferred
}

export type IconKey = keyof typeof Icons
