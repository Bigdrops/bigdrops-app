import { ArrowLeft, RefreshCw } from 'lucide-react'

import { FamilyPicker, Segmented } from './assistant-chat-parts'
import { ClerkStatePicker, type ClerkMode } from './assistant-chat-clerk'
import { VIEWPORTS, type ViewportId } from './assistant-chat-layouts'
import type { PhotoHeroAppearance, PhotoHeroFamilyId } from '@/components/onboarding/photo-hero-v2-theme'

/**
 * Compact page chrome for the Assistant Chat experiment.
 * Matches the Onboarding V5 restraint: a slim strip with navigation and
 * reset only. No full header band — the conversation is the primary surface.
 */
export function AssistantChatHeader({ onBack, onReset }: { onBack: () => void; onReset: () => void }) {
  return (
    <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 pb-1 pt-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Design Lab
      </button>
      <p className="min-w-0 flex-1 truncate text-xs font-medium text-foreground/70">
        Assistant Chat
        <span className="ml-2 font-normal text-muted-foreground">· invoice conversation · four viewports</span>
      </p>
      <button
        type="button"
        onClick={onReset}
        className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <RefreshCw className="size-3.5" aria-hidden="true" />
        Reset
      </button>
    </div>
  )
}

export function AssistantChatControls({
  viewport,
  onViewport,
  appearance,
  onAppearance,
  family,
  onFamily,
  clerkMode,
  onClerkMode,
}: {
  viewport: ViewportId
  onViewport: (value: ViewportId) => void
  appearance: PhotoHeroAppearance
  onAppearance: (value: PhotoHeroAppearance) => void
  family: PhotoHeroFamilyId
  onFamily: (value: PhotoHeroFamilyId) => void
  clerkMode: ClerkMode
  onClerkMode: (value: ClerkMode) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented<ViewportId>
          label="Viewport"
          value={viewport}
          onChange={onViewport}
          options={VIEWPORTS.map((item) => ({
            value: item.id,
            label: item.label,
            icon: item.icon,
          }))}
        />
        <Segmented<PhotoHeroAppearance>
          label="Appearance"
          value={appearance}
          onChange={onAppearance}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
        <FamilyPicker family={family} onChange={onFamily} />
      </div>
      <ClerkStatePicker value={clerkMode} onChange={onClerkMode} />
    </div>
  )
}
