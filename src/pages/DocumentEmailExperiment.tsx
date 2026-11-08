import DocumentEmailPreview from '@/components/design-lab/DocumentEmailPreview'

/**
 * Design Lab route: Document Email & Sharing Experience (`/design-lab/document-email`).
 *
 * This preview is self-contained. It mounts no production sharing services,
 * writes no emails or database records, and provides an interactive Refrens-inspired
 * email composer, live executive HTML recipient view with real SASINV-000130 data,
 * and failure root-cause analysis.
 */
export default function DocumentEmailExperiment() {
  return <DocumentEmailPreview />
}
