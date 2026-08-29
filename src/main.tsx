import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Dark mode: manual class toggle on <html>, persisted in localStorage
import { OperationProvider } from '@/context/OperationContext'
import OperationOverlay from '@/components/ui/OperationOverlay'
import '@fontsource-variable/inter'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/700.css'
import '@fontsource/open-sans/400.css'
import '@fontsource/open-sans/700.css'
import '@fontsource/lato/400.css'
import '@fontsource/lato/700.css'
import '@fontsource/montserrat/400.css'
import '@fontsource/montserrat/700.css'
import '@fontsource/poppins/400.css'
import '@fontsource/poppins/700.css'
import '@fontsource/raleway/400.css'
import '@fontsource/raleway/700.css'
import '@fontsource/orbitron/400.css'
import '@fontsource/orbitron/700.css'
import '@fontsource/source-sans-pro/400.css'
import '@fontsource/source-sans-pro/700.css'
import '@fontsource/roboto-condensed/400.css'
import '@fontsource/roboto-condensed/700.css'
import 'goey-toast/styles.css'
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

// Initialize dark mode from system preference before render.
// The user-scoped theme preference is resolved by AppThemeManager after auth.
// We do NOT read from localStorage here to prevent cross-user theme leakage
// on shared devices (localStorage is not scoped by user ID at this point).
if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
  document.documentElement.classList.add('dark')
} else {
  document.documentElement.classList.remove('dark')
}

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
