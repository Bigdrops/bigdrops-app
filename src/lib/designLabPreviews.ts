import type { LucideIcon } from 'lucide-react'
import { Clapperboard, FileText, LayoutDashboard, PanelsTopLeft, Sparkles } from 'lucide-react'

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
]
