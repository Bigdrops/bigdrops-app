import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Dark mode: manual class toggle on <html>, persisted in localStorage
import { OperationProvider } from '@/context/OperationContext'
import OperationOverlay from '@/components/ui/OperationOverlay'
import '@fontsource-variable/inter'
import './index.css'
import './styles/formTheme.css'
import App from './App.jsx'

// TODO: Prepare Sentry frontend integration
// import * as Sentry from "@sentry/react";
// if (import.meta.env.VITE_SENTRY_DSN) {
//   Sentry.init({
//     dsn: import.meta.env.VITE_SENTRY_DSN,
//     integrations: [
//       Sentry.browserTracingIntegration(),
//       Sentry.replayIntegration(),
//     ],
//     tracesSampleRate: 1.0,
//   });
// }

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
        <App />
        <OperationOverlay />
      </OperationProvider>
    </StrictMode>,
  )
}
