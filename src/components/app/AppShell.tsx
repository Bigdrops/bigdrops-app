import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import ErrorBoundary from '@/components/ErrorBoundary'
import PageLoader from '@/components/app/PageLoader'
import { isAndroidNative } from '@/lib/native/capacitor'
import { useSettings } from '@/hooks/useSettings'
import { normalizeHexColor, hexToHslTriplet } from '@/lib/colorTheme'

const Dashboard = lazy(() => import('@/pages/DashboardRedesign'))
const Invoices = lazy(() => import('@/pages/Invoices'))
const Quotations = lazy(() => import('@/pages/Quotations'))
const NewQuotation = lazy(() => import('@/pages/NewQuotation'))
const ViewQuotation = lazy(() => import('@/pages/ViewQuotation'))
const EditQuotation = lazy(() => import('@/pages/EditQuotation'))
const CSR = lazy(() => import('@/pages/CSR'))
const Clients = lazy(() => import('@/pages/Clients'))
const AddClient = lazy(() => import('@/pages/AddClient'))
const EditClient = lazy(() => import('@/pages/EditClient'))
const ClientDetail = lazy(() => import('@/pages/ClientDetail'))
const NewInvoice = lazy(() => import('@/pages/NewInvoice'))
const ViewInvoice = lazy(() => import('@/pages/ViewInvoice'))
const EditInvoice = lazy(() => import('@/pages/EditInvoice'))
const NewCSR = lazy(() => import('@/pages/NewCSR'))
const ViewCSR = lazy(() => import('@/pages/ViewCSR'))
const EditCSR = lazy(() => import('@/pages/EditCSR'))
const Settings = lazy(() => import('@/pages/Settings'))
const Projects = lazy(() => import('@/pages/Projects'))
const NewProject = lazy(() => import('@/pages/NewProject'))
const ProjectDetail = lazy(() => import('@/pages/ProjectDetail'))
const ProjectDocumentView = lazy(() => import('@/pages/ProjectDocumentView'))
const Reports = lazy(() => import('@/pages/Reports'))
const ComplianceHub = lazy(() => import('@/pages/ComplianceHub'))
const Waybills = lazy(() => import('@/pages/Waybills'))
const NewWaybill = lazy(() => import('@/pages/NewWaybill'))
const EditWaybill = lazy(() => import('@/pages/EditWaybill'))
const ViewWaybill = lazy(() => import('@/pages/ViewWaybill'))
const AndroidBackHandler = lazy(() => import('@/components/app/AndroidBackHandler'))
const SetPasswordModal = lazy(() => import('@/components/app/SetPasswordModal'))

type Profile = {
  id: string
  has_password?: boolean | null
  is_approved?: boolean | null
  email?: string | null
}

type AppShellProps = {
  session: Session
  profile: Profile | null
  onProfileUpdate: () => void | Promise<void>
}

const withBoundary = (element: ReactNode) => <ErrorBoundary>{element}</ErrorBoundary>

export default function AppShell({ session, profile, onProfileUpdate }: AppShellProps) {
  const { settings } = useSettings()
  const provider = session?.user?.app_metadata?.provider
  const showSetPassword = Boolean(profile && !profile.has_password && provider !== 'email')
  const showAndroidBackHandler = isAndroidNative()

  useEffect(() => {
    const bgSetting = settings?.app_background_color
    const cardSetting = settings?.app_card_color
    
    const normBg = bgSetting ? normalizeHexColor(bgSetting) : null
    const normCard = cardSetting ? normalizeHexColor(cardSetting) : null

    if (normBg) {
      document.documentElement.style.setProperty('--background', hexToHslTriplet(normBg))
    } else {
      document.documentElement.style.removeProperty('--background')
    }

    if (normCard) {
      const cardHsl = hexToHslTriplet(normCard)
      document.documentElement.style.setProperty('--card', cardHsl)
      document.documentElement.style.setProperty('--popover', cardHsl)
    } else {
      document.documentElement.style.removeProperty('--card')
      document.documentElement.style.removeProperty('--popover')
    }

    return () => {
      document.documentElement.style.removeProperty('--background')
      document.documentElement.style.removeProperty('--card')
      document.documentElement.style.removeProperty('--popover')
    }
  }, [settings?.app_background_color, settings?.app_card_color])

  return (
    <>
      {showAndroidBackHandler && (
        <Suspense fallback={null}>
          <AndroidBackHandler />
        </Suspense>
      )}
      {showSetPassword && (
        <Suspense fallback={null}>
          <SetPasswordModal onComplete={onProfileUpdate} />
        </Suspense>
      )}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={withBoundary(<Dashboard session={session} />)} />
          <Route path="/invoices" element={withBoundary(<Invoices />)} />
          <Route path="/invoices/new" element={withBoundary(<NewInvoice />)} />
          <Route path="/invoices/edit/:id" element={withBoundary(<EditInvoice />)} />
          <Route path="/invoices/:id" element={withBoundary(<ViewInvoice />)} />
          <Route path="/quotations" element={withBoundary(<Quotations />)} />
          <Route path="/quotations/new" element={withBoundary(<NewQuotation />)} />
          <Route path="/quotations/edit/:id" element={withBoundary(<EditQuotation />)} />
          <Route path="/quotations/:id" element={withBoundary(<ViewQuotation />)} />
          <Route path="/csr" element={withBoundary(<CSR />)} />
          <Route path="/csr/new" element={withBoundary(<NewCSR />)} />
          <Route path="/csr/edit/:id" element={withBoundary(<EditCSR />)} />
          <Route path="/csr/:id" element={withBoundary(<ViewCSR />)} />
          <Route path="/clients" element={withBoundary(<Clients />)} />
          <Route path="/clients/new" element={withBoundary(<AddClient />)} />
          <Route path="/clients/edit/:id" element={withBoundary(<EditClient />)} />
          <Route path="/clients/:id" element={withBoundary(<ClientDetail />)} />
          <Route path="/settings" element={withBoundary(<Settings />)} />
          <Route path="/projects" element={withBoundary(<Projects />)} />
          <Route path="/projects/new" element={withBoundary(<NewProject />)} />
          <Route
            path="/projects/:projectId/documents/:documentId"
            element={withBoundary(<ProjectDocumentView />)}
          />
          <Route path="/projects/:id" element={withBoundary(<ProjectDetail />)} />
          <Route path="/reports" element={withBoundary(<Reports />)} />
          <Route path="/compliance" element={withBoundary(<ComplianceHub />)} />
          <Route path="/waybills" element={withBoundary(<Waybills />)} />
          <Route path="/waybills/new" element={withBoundary(<NewWaybill />)} />
          <Route path="/waybills/:id/edit" element={withBoundary(<EditWaybill />)} />
          <Route path="/waybills/:id" element={withBoundary(<ViewWaybill />)} />
        </Routes>
      </Suspense>
    </>
  )
}
