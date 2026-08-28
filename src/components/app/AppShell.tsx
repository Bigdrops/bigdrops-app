import { lazy, Suspense, useEffect, useMemo, type ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import ErrorBoundary from '@/components/ErrorBoundary'
import PageLoader from '@/components/app/PageLoader'
import { isAndroidNative } from '@/lib/native/capacitor'
import { useSettings } from '@/hooks/useSettings'
import { normalizeHexColor, hexToHslTriplet } from '@/lib/colorTheme'

import { BASE_THEME_MODE, getThemePreset, resolveThemeMode } from '@/lib/themePresets'
import {
  applyThemeTokenBundle,
  clearThemeTokenBundle,
  normalizeThemeTokenBundle,
  type ThemeTokenBundle,
} from '@/lib/themeTokens'
import {
  AuthorizationProvider,
} from '@/lib/tenant/contexts'

const AndroidSystemBars = lazy(() => import('@/components/app/AndroidSystemBars'))
const AndroidFoldAwareness = lazy(() => import('@/components/app/AndroidFoldAwareness'))
const KeyboardAwareness = lazy(() => import('@/components/app/KeyboardAwareness'))
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
const ItemLibraryPage = lazy(() => import('@/modules/item-library/pages/ItemLibraryPage'))
const Waybills = lazy(() => import('@/pages/Waybills'))
const NewWaybill = lazy(() => import('@/pages/NewWaybill'))
const EditWaybill = lazy(() => import('@/pages/EditWaybill'))
const ViewWaybill = lazy(() => import('@/pages/ViewWaybill'))
const Rfqs = lazy(() => import('@/pages/Rfqs'))
const NewRfq = lazy(() => import('@/pages/NewRfq'))
const EditRfq = lazy(() => import('@/pages/EditRfq'))
const ViewRfq = lazy(() => import('@/pages/ViewRfq'))
const Boqs = lazy(() => import('@/pages/Boqs'))
const NewBoq = lazy(() => import('@/pages/NewBoq'))
const EditBoq = lazy(() => import('@/pages/EditBoq'))
const ViewBoq = lazy(() => import('@/pages/ViewBoq'))
const Receipts = lazy(() => import('@/pages/Receipts'))
const ViewReceipt = lazy(() => import('@/pages/ViewReceipt'))
const Letters = lazy(() => import('@/pages/Letters'))
const NewLetter = lazy(() => import('@/pages/NewLetter'))
const EditLetter = lazy(() => import('@/pages/EditLetter'))
const ViewLetter = lazy(() => import('@/pages/ViewLetter'))
const NotificationSettingsPage = lazy(() => import('@/pages/settings/NotificationSettingsPage'))
const SetPasswordModal = lazy(() => import('@/components/app/SetPasswordModal'))
const TenantDebug = lazy(() => import('@/pages/debug/TenantDebug'))

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

// Theme application consumes useSettings(), which resolves the tenant client
// through useEntity(). It must therefore render inside EntityProvider.
function AppThemeManager() {
  const { settings } = useSettings()

  // Read dark mode from <html> class, re-apply on mutation
  const getPresetId = () =>
    document.documentElement.classList.contains('dark') ? 'bmw' : 'modern-minimalist'

  useEffect(() => {
    let currentPreset = getPresetId()

    const applyTokens = (presetId: string) => {
      const bundleToApply = getThemePreset(presetId)?.bundle ?? {}

      // Resolve Density & Padding
      const density = bundleToApply['bd-layout-density'] || 'standard'
      if (!bundleToApply['bd-layout-padding']) {
        const paddingMap: Record<string, string> = {
          compact: '0.5rem',
          standard: '1.5rem',
          comfortable: '2rem',
        }
        bundleToApply['bd-layout-padding'] = paddingMap[density] || '1.5rem'
      }

      const applied = applyThemeTokenBundle(bundleToApply)

      // Apply visibility classes
      const showSidebar = bundleToApply['bd-layout-sidebar'] !== 'hidden'
      const showBottomNav = bundleToApply['bd-layout-nav'] !== 'hidden'
      document.documentElement.classList.toggle('bd-sidebar-hidden', !showSidebar)
      document.documentElement.classList.toggle('bd-nav-hidden', !showBottomNav)

      return applied
    }

    let applied = applyTokens(currentPreset)

    // Watch for dark class changes on <html>
    const observer = new MutationObserver(() => {
      const next = getPresetId()
      if (next !== currentPreset) {
        clearThemeTokenBundle(applied)
        currentPreset = next
        applied = applyTokens(currentPreset)
      }
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => {
      observer.disconnect()
      clearThemeTokenBundle(applied)
      document.documentElement.classList.remove('bd-sidebar-hidden', 'bd-nav-hidden')
    }
  }, [])

  return null
}

export default function AppShell({ session, profile, onProfileUpdate }: AppShellProps) {
  const provider = session?.user?.app_metadata?.provider
  const showSetPassword = Boolean(profile && !profile.has_password && provider !== 'email')
  const showAndroidBackHandler = isAndroidNative()

  return (
    <>
      <Suspense fallback={null}>
        <KeyboardAwareness />
      </Suspense>
      {showAndroidBackHandler && (
        <Suspense fallback={null}>
          <>
            <AndroidSystemBars />
            <AndroidFoldAwareness />
          </>
        </Suspense>
      )}
      {showSetPassword && (
        <Suspense fallback={null}>
          <SetPasswordModal onComplete={onProfileUpdate} />
        </Suspense>
      )}
      <Suspense fallback={<PageLoader />}>
        <AppThemeManager />
        <AuthorizationProvider userId={session.user.id}>
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
          <Route path="/settings/notifications" element={withBoundary(<NotificationSettingsPage />)} />
          <Route path="/projects" element={withBoundary(<Projects />)} />
          <Route path="/projects/new" element={withBoundary(<NewProject />)} />
          <Route
            path="/projects/:projectId/documents/:documentId"
            element={withBoundary(<ProjectDocumentView />)}
          />
          <Route path="/projects/:id" element={withBoundary(<ProjectDetail />)} />
          <Route path="/reports" element={withBoundary(<Reports />)} />
          <Route path="/compliance" element={withBoundary(<ComplianceHub />)} />
          <Route path="/item-library" element={withBoundary(<ItemLibraryPage />)} />
          <Route path="/waybills" element={withBoundary(<Waybills />)} />
          <Route path="/waybills/new" element={withBoundary(<NewWaybill />)} />
          <Route path="/waybills/:id/edit" element={withBoundary(<EditWaybill />)} />
          <Route path="/waybills/:id" element={withBoundary(<ViewWaybill />)} />
          <Route path="/rfqs" element={withBoundary(<Rfqs />)} />
          <Route path="/rfqs/new" element={withBoundary(<NewRfq />)} />
          <Route path="/rfqs/edit/:id" element={withBoundary(<EditRfq />)} />
          <Route path="/rfqs/:id" element={withBoundary(<ViewRfq />)} />
          <Route path="/boqs" element={withBoundary(<Boqs />)} />
          <Route path="/boqs/new" element={withBoundary(<NewBoq />)} />
          <Route path="/boqs/edit/:id" element={withBoundary(<EditBoq />)} />
          <Route path="/boqs/:id" element={withBoundary(<ViewBoq />)} />
          <Route path="/receipts" element={withBoundary(<Receipts />)} />
          <Route path="/receipts/:id" element={withBoundary(<ViewReceipt />)} />
          <Route path="/letters" element={withBoundary(<Letters />)} />
          <Route path="/letters/new" element={withBoundary(<NewLetter />)} />
          <Route path="/letters/edit/:id" element={withBoundary(<EditLetter />)} />
          <Route path="/letters/:id" element={withBoundary(<ViewLetter />)} />
          <Route path="/debug/tenant" element={withBoundary(<TenantDebug session={session} />)} />
            </Routes>
          </AuthorizationProvider>
      </Suspense>
    </>
  )
}