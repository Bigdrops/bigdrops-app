import * as React from 'react'
import { SensoryUIProvider } from '@/components/ui/sensory-ui/config/provider'
import { useUiSoundSettings } from '@/lib/uiSoundSettings'

/** Wraps the app in the sensory-ui provider, driven by the persisted sound settings. */
export default function UiSoundProvider({ children }: { children: React.ReactNode }) {
  const { enabled, volume } = useUiSoundSettings()
  // Minimal pack: quiet, business-appropriate. Hero sounds stay off by default.
  const config = React.useMemo(() => ({ enabled, volume, theme: 'minimal' }), [enabled, volume])
  return <SensoryUIProvider config={config}>{children}</SensoryUIProvider>
}
