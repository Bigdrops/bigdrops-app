import * as React from 'react'
import { Icons } from '@/lib/iconRegistry'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Sparkles, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkspace, useEntity } from '@/lib/tenant/contexts'
import {
  APP_NAME,
  mobileDrawerPrimaryNav,
  isPathActive,
  activeNavItemClassName,
  inactiveNavItemClassName,
  inactiveNavIconClassName,
  inactiveNavIconColorClassName,
  salesPicker,
  getSalesPath,
  presalesPicker,
  getPreSalesPath,
  mobileDrawerUtilityNav,
} from './navData'
import { CompanySelectionSheet } from './CompanySelectionSheet'

interface MobileSidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pathname: string
  navigate: (path: string) => void
  drawerSalesOpen: boolean
  setDrawerSalesOpen: React.Dispatch<React.SetStateAction<boolean>>
  salesRouteActive: boolean
  presalesRouteActive: boolean
  handleSalesPick: (key: string) => void
  handleMorePick: (key: string) => Promise<void>
}

function DrawerLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 pt-3 pb-1 text-[7px] font-[800] uppercase tracking-[0.1em] text-[hsl(var(--ink-3))]">
      {children}
    </div>
  )
}

function DrawerFooter() {
  const { workspace, isLoading } = useWorkspace()
  const workspaceName = String(workspace?.name || '').trim() || (isLoading ? 'Loading…' : '—')
  const initials = workspaceName.slice(0, 2).toUpperCase()

  return (
    <div className="mt-auto border-t border-[hsl(var(--line))] px-3.5 py-3 flex items-center gap-2">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[hsl(var(--primary-soft))] text-[hsl(var(--primary))] text-[8px] font-[800]">
        {initials}
      </span>
      <div className="min-w-0">
        <div className="truncate text-[10px] font-[800] text-[hsl(var(--ink))]">{workspaceName}</div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Compact Company Switcher — conventional SaaS account-style control */
/* ------------------------------------------------------------------ */

function CompanySwitcher({ onOpenSheet }: { onOpenSheet: () => void }) {
  const { entity, entities, isLoading } = useEntity()
  const name = entity?.name || (isLoading ? 'Loading…' : '—')
  const initials = (name || '?').charAt(0).toUpperCase()
  const hasMultiple = entities.length > 1

  return (
    <button
      type="button"
      onClick={onOpenSheet}
      aria-label={`Current company: ${name}. ${hasMultiple ? 'Tap to switch.' : 'Tap to manage.'}`}
      className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 transition-all hover:bg-[hsl(var(--surface-muted))]/60 active:scale-[0.985]"
    >
      {/* Avatar / initials */}
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[hsl(var(--primary-soft))] text-[hsl(var(--primary))] text-[10px] font-[800]">
        {initials}
      </span>
      {/* Name */}
      <span className="flex-1 min-w-0 truncate text-[12px] font-[800] tracking-[-0.03em] text-[hsl(var(--ink))]">
        {name}
      </span>
      {/* Chevron affordance — only when multiple companies exist */}
      {hasMultiple ? (
        <ChevronDown className="h-4 w-4 shrink-0 text-[hsl(var(--ink-3))]" aria-hidden="true" />
      ) : null}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Main Drawer                                                        */
/* ------------------------------------------------------------------ */

export function MobileSidebar({
  open,
  onOpenChange,
  pathname,
  navigate,
  drawerSalesOpen,
  setDrawerSalesOpen,
  salesRouteActive,
  presalesRouteActive,
  handleSalesPick,
  handleMorePick,
}: MobileSidebarProps) {
  const [companySheetOpen, setCompanySheetOpen] = React.useState(false)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-[min(84%,340px)] p-0 sm:max-w-[340px] overflow-y-auto bd-custom-scrollbar rounded-none border-0 border-r border-[hsl(var(--line))]"
        showCloseButton={false}
      >
        {/* Brand area */}
        <div className="flex items-center gap-2.5 border-b border-[hsl(var(--line))] px-3.5 py-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[11px] bg-[hsl(var(--gradient))] text-white">
            <Sparkles className="h-4 w-4" strokeWidth={1.9} />
          </span>
          <div className="min-w-0">
            <div className="text-[13px] font-[800] tracking-[-0.05em] text-[hsl(var(--ink))]">{APP_NAME}</div>
          </div>
        </div>

        {/* Company Switcher — compact, conventional */}
        <div className="px-2.5 pt-2 pb-0.5">
          <CompanySwitcher onOpenSheet={() => setCompanySheetOpen(true)} />
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-2 py-1.5 bd-custom-scrollbar">
          <DrawerLabel>Navigation</DrawerLabel>
          {mobileDrawerPrimaryNav.map((item) => {
            const Icon = item.icon
            const isActive = isPathActive(pathname, item.path || '')
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  navigate(item.path || '')
                  onOpenChange(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-xl px-2 py-[9px] text-[11px] font-[700] transition active:scale-[0.985]',
                  isActive ? activeNavItemClassName : inactiveNavItemClassName,
                )}
              >
                <Icon className={cn('h-4 w-4', isActive ? '' : inactiveNavIconColorClassName)} strokeWidth={1.9} />
                {item.label}
              </button>
            )
          })}

          {/* Sales — collapsible */}
          <DrawerLabel>Sales</DrawerLabel>
          <button
            type="button"
            onClick={() => setDrawerSalesOpen((prev) => !prev)}
            className={cn(
              'flex w-full items-center gap-2 rounded-xl px-2 py-[9px] text-[11px] font-[700] transition active:scale-[0.985]',
              salesRouteActive ? activeNavItemClassName : inactiveNavItemClassName,
            )}
          >
            <Icons.sales className={cn('h-4 w-4', salesRouteActive ? '' : inactiveNavIconColorClassName)} strokeWidth={1.9} />
            Sales
            <Icons.chevronDown className={cn('ml-auto h-3.5 w-3.5 transition-transform', drawerSalesOpen ? 'rotate-180' : '')} />
          </button>
          {drawerSalesOpen ? (
            <div className="ml-3 space-y-0.5 pb-1">
              {salesPicker.map((item) => {
                const Icon = item.icon
                const isActive = isPathActive(pathname, getSalesPath(item.key))
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleSalesPick(item.key)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-xl px-2 py-[9px] text-[11px] font-[700] transition active:scale-[0.985]',
                      isActive ? activeNavItemClassName : inactiveNavItemClassName,
                    )}
                  >
                    <Icon className={cn('h-4 w-4', isActive ? '' : inactiveNavIconColorClassName)} strokeWidth={1.9} />
                    {item.label}
                    <Icons.chevronRight className="ml-auto h-3.5 w-3.5" />
                  </button>
                )
              })}
            </div>
          ) : null}

          {/* Pre-Sales */}
          <DrawerLabel>Pre-Sales</DrawerLabel>
          <div className="space-y-0.5 pb-1">
            {presalesPicker.map((item) => {
              const Icon = item.icon
              const isActive = isPathActive(pathname, getPreSalesPath(item.key))
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    navigate(getPreSalesPath(item.key))
                    onOpenChange(false)
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-xl px-2 py-[9px] text-[11px] font-[700] transition active:scale-[0.985]',
                    isActive ? activeNavItemClassName : inactiveNavItemClassName,
                  )}
                >
                  <Icon className={cn('h-4 w-4', isActive ? '' : inactiveNavIconColorClassName)} strokeWidth={1.9} />
                  {item.label}
                </button>
              )
            })}
          </div>

          {/* Management */}
          <DrawerLabel>Management</DrawerLabel>
          {mobileDrawerUtilityNav.filter((item) => item.key !== 'settings').map((item) => {
            const Icon = item.icon
            const isActive = isPathActive(pathname, item.path || '')
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  navigate(item.path || '')
                  onOpenChange(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-xl px-2 py-[9px] text-[11px] font-[700] transition active:scale-[0.985]',
                  isActive ? activeNavItemClassName : inactiveNavItemClassName,
                )}
              >
                <Icon className={cn('h-4 w-4', isActive ? '' : inactiveNavIconColorClassName)} strokeWidth={1.9} />
                {item.label}
              </button>
            )
          })}

          {/* Workspace Settings */}
          <DrawerLabel>Workspace</DrawerLabel>
          {mobileDrawerUtilityNav.filter((item) => item.key === 'settings').map((item) => {
            const Icon = item.icon
            const isActive = isPathActive(pathname, item.path || '')
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  navigate(item.path || '')
                  onOpenChange(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-xl px-2 py-[9px] text-[11px] font-[700] transition active:scale-[0.985]',
                  isActive ? activeNavItemClassName : inactiveNavItemClassName,
                )}
              >
                <Icon className={cn('h-4 w-4', isActive ? '' : inactiveNavIconColorClassName)} strokeWidth={1.9} />
                {item.label}
              </button>
            )
          })}

          {/* Sign Out */}
          <div className="mt-1 border-t border-[hsl(var(--line))] pt-2">
            <button
              type="button"
              onClick={() => handleMorePick('signout')}
              className="flex w-full items-center gap-2 rounded-xl px-2 py-[9px] text-[11px] font-[700] text-[hsl(var(--ink-2))] transition active:scale-[0.985] hover:bg-[hsl(var(--surface-muted))]/50"
            >
              <Icons.signout className="h-4 w-4" strokeWidth={1.9} />
              Sign Out
            </button>
          </div>
        </div>

        {/* Footer — workspace identity only */}
        <DrawerFooter />
      </SheetContent>

      {/* Canonical Company Selection Sheet */}
      <CompanySelectionSheet
        open={companySheetOpen}
        onOpenChange={setCompanySheetOpen}
      />
    </Sheet>
  )
}
