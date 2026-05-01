import * as React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  X,
  ChevronRight,
  ChevronDown,
  Check,
  Building2,
  Receipt,
  LogOut,
  ClipboardList,
} from 'lucide-react'
import type { Session } from '@supabase/supabase-js'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import MobileBottomNav from '@/components/layout/MobileBottomNav'
import MobilePageHeader from '@/components/layout/MobilePageHeader'
import { useSettings } from '../hooks/useSettings'
import { supabase } from '../supabase'
import {
  APP_NAME,
  tabs,
  salesPicker,
  presalesPicker,
  moreGroups,
  desktopNav,
  mobileDrawerPrimaryNav,
  mobileDrawerUtilityNav,
  activeNavItemClassName,
  activeNavIconClassName,
  inactiveNavItemClassName,
  inactiveNavIconClassName,
  inactiveNavIconColorClassName,
  getSalesPath,
  getPreSalesPath,
  isPathActive,
  getActiveTab,
  type TabKey,
} from './layout/navData'
import { BusinessSwitcher } from './layout/BusinessSwitcher'
import { MobileSidebar } from './layout/MobileSidebar'
import { DesktopSidebar } from './layout/DesktopSidebar'
import { MobileSalesSheet } from './layout/MobileSalesSheet'
import { MobileMoreSheet } from './layout/MobileMoreSheet'

export interface MobileChromeContextValue {
  openSidebar: () => void
}

export const MobileChromeContext = React.createContext<MobileChromeContextValue>({ 
  openSidebar: () => {} 
})

interface LayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  children: React.ReactNode
  session?: Session | null
  hidePageHeader?: boolean
  hideMobileHomeHeader?: boolean
  contentClassName?: string
}

export default function Layout({
  title,
  children,
  session,
  hidePageHeader = false,
  hideMobileHomeHeader = false,
  contentClassName = '',
  ...props
}: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { settings } = useSettings()
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const [salesOpen, setSalesOpen] = React.useState(false)
  const [moreOpen, setMoreOpen] = React.useState(false)
  const [drawerSalesOpen, setDrawerSalesOpen] = React.useState(false)
  
  const activeTab = getActiveTab(location.pathname)
  const isHome = location.pathname === '/' || props['data-bd-page'] === 'dashboard'
  const salesRouteActive = activeTab === 'sales'
  const presalesRouteActive = isPathActive(location.pathname, '/rfqs') || isPathActive(location.pathname, '/boqs')
  
  const openSidebar = React.useCallback(() => setSidebarOpen(true), [])

  const handleSalesPick = (key: string) => {
    setSalesOpen(false)
    setSidebarOpen(false)
    navigate(getSalesPath(key))
  }

  const handleMorePick = async (key: string) => {
    if (key === 'signout') {
      await supabase.auth.signOut()
      navigate('/login')
      setMoreOpen(false)
      setSidebarOpen(false)
      return
    }

    const pathByKey: Record<string, string> = {
      rfqs: '/rfqs',
      boqs: '/boqs',
      reports: '/reports',
      compliance: '/compliance',
      'item-library': '/item-library',
      settings: '/settings',
    }
    setMoreOpen(false)
    setSidebarOpen(false)
    navigate(pathByKey[key] || '/')
  }

  const onTabClick = (key: string) => {
    if (key === 'sales') return setSalesOpen(true)
    if (key === 'more') return setMoreOpen(true)
    
    const pathByKey: Record<string, string> = {
      home: '/',
      projects: '/projects',
      clients: '/clients',
      'item-library': '/item-library',
    }
    navigate(pathByKey[key as keyof typeof pathByKey] || '/')
  }

  React.useEffect(() => {
    if (salesRouteActive) {
      setDrawerSalesOpen(true)
    }
  }, [salesRouteActive])

  const mobileChromeValue = React.useMemo(
    () => ({
      openSidebar,
    }),
    [openSidebar]
  )

  React.useEffect(() => {
    const handleExternalSidebarOpen = () => openSidebar()
    window.addEventListener('bigdrops:open-mobile-drawer', handleExternalSidebarOpen)
    return () => window.removeEventListener('bigdrops:open-mobile-drawer', handleExternalSidebarOpen)
  }, [openSidebar])

  return (
    <div className="app-ambient flex min-h-dvh flex-col bg-background text-foreground md:flex-row">
      {/* Desktop Navigation */}
      <DesktopSidebar
        session={session}
        activeTab={activeTab}
        onTabClick={onTabClick}
        handleSalesPick={handleSalesPick}
        handleMorePick={handleMorePick}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col">
        {/* Mobile Header (Home/Dashboard) */}
        <div className="md:hidden">
          {isHome && !hideMobileHomeHeader ? (
            <div className="w-full">
              <MobilePageHeader
                title={APP_NAME}
                subtitle={settings?.company_name || 'Invoicing and Projects'}
                accentClassName="tone-info-accent"
                onMenuClick={openSidebar}
                className="rounded-none border-x-0 border-t-0 shadow-none"
              />
            </div>
          ) : null}

          {/* Mobile Header (Page) */}
          {!isHome && !hidePageHeader ? (
            <div className="w-full px-4 pt-3">
              <MobilePageHeader
                title={title}
                onMenuClick={openSidebar}
              />
            </div>
          ) : null}
        </div>

        {/* Desktop Header (Page) */}
        <div className="hidden md:block">
          {!isHome && !hidePageHeader ? (
            <header className="mx-auto w-full max-w-[var(--bd-layout-content-max,1200px)] px-[var(--bd-layout-padding,1.5rem)] pt-[var(--bd-space-md)]">
              <div className="rounded-[var(--bd-radius-md)] border border-[hsl(var(--bd-border))] border-l-4 border-l-[hsl(var(--bd-status-info-text))] bg-[hsl(var(--bd-surface))] px-5 py-3 shadow-none">
                <h1 className="text-lg font-bold text-[hsl(var(--bd-text))]">{title}</h1>
              </div>
            </header>
          ) : null}
        </div>

        {/* Content Body */}
        <MobileChromeContext.Provider value={mobileChromeValue}>
          <div 
            {...props}
            data-bd-layout="content"
            className={cn(
              "flex-1 w-full",
              !isHome && "md:px-[var(--bd-layout-padding,1.5rem)] md:py-[var(--bd-space-md)]",
              "px-0 pb-24 pt-0", // Mobile defaults
              contentClassName
            )}
          >
            {children}
          </div>
        </MobileChromeContext.Provider>
      </div>

      {/* Mobile Navigation & Overlays */}
      <div className="md:hidden">
        <MobileBottomNav active={activeTab} onSelect={onTabClick} />
        
        <MobileSidebar
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          pathname={location.pathname}
          navigate={navigate}
          drawerSalesOpen={drawerSalesOpen}
          setDrawerSalesOpen={setDrawerSalesOpen}
          salesRouteActive={salesRouteActive}
          presalesRouteActive={presalesRouteActive}
          handleSalesPick={handleSalesPick}
          handleMorePick={handleMorePick}
        />

        <MobileSalesSheet
          open={salesOpen}
          onOpenChange={setSalesOpen}
          handleSalesPick={handleSalesPick}
        />

        <MobileMoreSheet
          open={moreOpen}
          onOpenChange={setMoreOpen}
          handleMorePick={handleMorePick}
        />
      </div>
    </div>
  )
}
