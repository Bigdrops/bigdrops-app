import AndroidUpdatePreview from '@/components/design-lab/android-update/android-update-preview'

/**
 * Design Lab route: Android Update Experience (`/design-lab/android-update`).
 *
 * The preview is self-contained. It renders the proposed Android update dialog
 * from sample data with local prototype state, so it reads no release policy,
 * starts no download, launches no installer, and writes no acknowledgement or
 * dismissal. The production updater, `ApkUpdatePlugin.java`, and the native
 * DownloadManager path are untouched.
 */
export default function AndroidUpdateExperiment() {
  return <AndroidUpdatePreview />
}
