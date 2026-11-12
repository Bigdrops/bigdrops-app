import PoDocumentLab from '@/components/purchase-order-theme/PoDocumentLab'

/**
 * Design Lab route: Purchase Order Document View (`/design-lab/po-view`).
 *
 * Invoice-view-derived PO concept. Procurement-adapted document presentation,
 * static specimen data, local-only lifecycle simulation, and an Invoice
 * reference toggle for side-by-side comparison. The production PO routes and
 * their business rules are untouched.
 */
export default function PoThemeExperiment() {
  return <PoDocumentLab />
}
