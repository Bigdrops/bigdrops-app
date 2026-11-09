import AppUpdateModalPreview from '@/components/design-lab/app-update-modal-preview'

/**
 * Design Lab route: App Update Modal (`/design-lab/app-update-modal`).
 *
 * Self-contained preview of two update sheet designs. It mounts no
 * production update services and performs no real download or install;
 * the download, install, failure, and web fallback states are simulated.
 */
export default function AppUpdateModalExperiment() {
  return <AppUpdateModalPreview />
}