import BoluInfraPreview from '@/components/bolu-infra-experiment/bolu-infra-preview'

/**
 * Design Lab route: Bolu AI Infrastructure Experiment (`/design-lab/bolu-infra`).
 *
 * Isolated evaluation of three mobile-first architectural approaches:
 *  - Approach 1: Reference design reproduction
 *  - Approach 2: Top tab hub (Overview, Connections, Models, Activity) with 44px touch targets
 *  - Approach 3: Drill-down master-detail list
 *
 * Production Settings routes and data layers are completely untouched.
 */
export default function BoluInfraExperiment() {
  return <BoluInfraPreview />
}
