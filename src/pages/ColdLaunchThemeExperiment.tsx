import ColdLaunchExperimentPreview from '@/components/cold-launch/ColdLaunchExperimentPreview'

/**
 * Design Lab route: Cold Launch Tenant Tree Experiment (`/design-lab/cold-launch`).
 *
 * This preview is self-contained. It mounts no production startup providers,
 * reads no live tenant session, and allows interactive simulation of network states,
 * five theme palettes, and viewport sizes. The production startup screen in App.tsx
 * is untouched.
 */
export default function ColdLaunchThemeExperiment() {
  return <ColdLaunchExperimentPreview />
}
