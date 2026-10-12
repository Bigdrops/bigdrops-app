import InvoiceThemePreview from '@/components/invoice-theme/invoice-theme-preview'

/**
 * Design Lab route: Invoice Form Theme Experiment (`/design-lab/invoice-theme`).
 *
 * The preview is self-contained. It mounts the production invoice form
 * presentation with representative data through an inert tenant client, so it
 * reads no tenant data, creates no invoice, and writes no theme preference. The
 * production invoice routes and their business rules are untouched.
 */
export default function InvoiceThemeExperiment() {
  return <InvoiceThemePreview />
}
