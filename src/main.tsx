import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Dark mode: manual class toggle on <html>, persisted in localStorage
import { OperationProvider } from '@/context/OperationContext'
import OperationOverlay from '@/components/ui/OperationOverlay'
import UiSoundProvider from '@/components/UiSoundProvider'
import '@fontsource-variable/inter'
import './index.css'
import './styles/formTheme.css'
import App from './App.jsx'

import { initSentry } from '@/lib/sentry'

// Initialize Sentry before React component tree mounting
initSentry()

// Do NOT set dark class here. AppThemeManager is the single owner of
// document.documentElement class mutations for theme.
// Setting dark class here before React mounts causes a flash when the
// user's preference is light (class set → React mounts → class removed).
// AppThemeManager applies the correct class after preferences load.

const rootElement = document.getElementById('root')

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <OperationProvider>
        <UiSoundProvider>
          <App />
          <OperationOverlay />
        </UiSoundProvider>
      </OperationProvider>
    </StrictMode>,
  )
}
