import CsrThemePreview from '@/components/csr-theme/csr-theme-preview'

/**
 * Design Lab route: CSR Form Theme Experiment (`/design-lab/csr-theme`).
 *
 * The preview is self-contained and preview-local: representative mock
 * state drives every control, and save/cancel/import/signature actions
 * resolve to preview notices or preview-only dialogs. It creates no CSR,
 * reads no tenant data, and writes no theme preference. The production CSR
 * routes, styling, and business rules are untouched.
 */
export default function CsrThemeExperiment() {
  return <CsrThemePreview />
}
