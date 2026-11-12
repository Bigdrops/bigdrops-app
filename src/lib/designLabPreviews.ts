import type { LucideIcon } from 'lucide-react'
import { Clapperboard, ClipboardList, Download, FileText, LayoutDashboard, Mail, Network, PanelsTopLeft, ShoppingBag, Sparkles } from 'lucide-react'

export interface DesignLabPreview {
  id: string
  name: string
  eyebrow: string
  description: string
  route: string
  icon: LucideIcon
  capabilities: readonly string[]
}

export const DESIGN_LAB_PREVIEWS: DesignLabPreview[] = [
  {
    id: 'onboarding-v2',
    name: 'Onboarding Experience',
    eyebrow: 'Onboarding',
    description: 'Themes, appearance, login and signup.',
    route: '/photohero-preview',
    icon: PanelsTopLeft,
    capabilities: ['Themes', 'Light/Dark', 'Login', 'Signup'],
  },
  {
    id: 'onboarding-v4-source',
    name: 'Onboarding Experience V4',
    eyebrow: 'Onboarding',
    description: 'Source-led adaptation of the outsourced ultimate onboarding prototype.',
    route: '/design-lab/onboarding-v4',
    icon: Sparkles,
    capabilities: ['Source HTML', '5 themes', 'Light/Dark', '6 viewports', 'Auth preview'],
  },
  {
    id: 'onboarding-v5-cinematic',
    name: 'Onboarding Experience V5',
    eyebrow: 'Onboarding',
    description: 'Cinematic business story with animated operations, logistics and field service.',
    route: '/design-lab/onboarding-v5',
    icon: Clapperboard,
    capabilities: ['Cinematic story', '5 themes', 'Light/Dark', '6 viewports', 'Auth preview'],
  },
  {
    id: 'dashboard-theme',
    name: 'Dashboard Theme Experiment',
    eyebrow: 'Dashboard',
    description: 'The live dashboard structure under every Design Lab theme.',
    route: '/design-lab/dashboard-theme',
    icon: LayoutDashboard,
    capabilities: ['5 themes', 'Light/Dark', '5 viewports'],
  },
  {
    id: 'invoice-theme',
    name: 'Invoice Form Theme Experiment',
    eyebrow: 'Invoice',
    description: 'The live invoice form under every Design Lab theme.',
    route: '/design-lab/invoice-theme',
    icon: FileText,
    capabilities: ['5 themes', 'Light/Dark', '5 viewports'],
  },
  {
    id: 'csr-theme',
    name: 'Customer Service Report',
    eyebrow: 'CSR',
    description: 'Explore the CSR form with Design Lab themes and responsive layouts.',
    route: '/design-lab/csr-theme',
    icon: ClipboardList,
    capabilities: ['5 themes', 'Light/Dark', '6 viewports', 'Form preview'],
  },
  {
    id: 'cold-launch-tree',
    name: 'Cold Launch Tenant Tree',
    eyebrow: 'Startup',
    description: 'Production tenant-tree boot presentation with theme, network, and layout simulation.',
    route: '/design-lab/cold-launch',
    icon: Network,
    capabilities: ['Tenant tree', '5 themes', 'Light/Dark', 'Network states', 'Quick Tips'],
  },
  {
    id: 'document-email',
    name: 'Document Email & Sharing Experience',
    eyebrow: 'Sharing & Email',
    description: 'Refrens-inspired streamlined email composer, rich prefilled message, and executive HTML preview with real invoice data.',
    route: '/design-lab/document-email',
    icon: Mail,
    capabilities: ['Real SASINV-000130 data', 'Executive HTML', 'Composer & Recipient views', 'Mobile/Desktop', 'Attachment badge'],
  },
  {
    id: 'app-update-modal',
    name: 'App Update Modal',
    eyebrow: 'App Update',
    description: 'Two contrasting update sheet designs with simulated download, install, and web fallback states.',
    route: '/design-lab/app-update-modal',
    icon: Download,
    capabilities: ['2 variants', 'Light/Dark', 'Download states', 'Web fallback', 'Version guard'],
  },
  {
    id: 'po-view',
    name: 'Purchase Order View Redesign',
    eyebrow: 'Purchase Order',
    description: 'Invoice-view-derived procurement document experience: procurement semantics, lifecycle simulation, and an Invoice reference for comparison.',
    route: '/design-lab/po-view',
    icon: ShoppingBag,
    capabilities: ['5 themes', 'Light/Dark', '6 viewports', 'Lifecycle simulation', 'Invoice comparison', 'Procurement semantics'],
  },
]
