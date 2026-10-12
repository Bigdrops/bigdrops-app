import DashboardThemePreview from '@/components/dashboard-theme/dashboard-theme-preview'

/**
 * Design Lab route: Dashboard Theme Experiment (`/design-lab/dashboard-theme`).
 *
 * The preview is self-contained. It mounts no production dashboard providers,
 * reads no tenant data, and writes no theme preference. The production
 * dashboard route (`/`), its layout, and its business rules are untouched.
 */
export default function DashboardThemeExperiment() {
  return <DashboardThemePreview />
}
