import * as React from 'react'
import { Icons } from '@/lib/iconRegistry'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Sparkles, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkspace, useEntity } from '@/lib/tenant/contexts'
import {
  APP_NAME,
  mobileDrawerPrimaryNav,
  isPathActive,
  activeNavItemClassName,
  inactiveNavItemClassName,
  activeNavIconClassName,
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
  const workspaceName = String(workspace?.name || '').trim() || (isLoading ? 'Workspace loading…' : 'Workspace unavailable')
  const workspaceRole = formatWorkspaceRole(workspace?.role) || (isLoading ? 'Loading role…' : 'Role unavailable')
  const initials = workspaceName.slice(0, 2).toUpperCase()

  return (
    <div className="mt-auto border-t border-[hsl(var(--line))] px-3.5 py-3 flex items-center gap-2">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[hsl(var(--primary-soft))] text-[hsl(var(--primary))] text-[8px] font-[800]">
        {initials}
      </span>
      <div className="min-w-0">
        <div className="truncate text-[10px] font-[800] text-[hsl(var(--ink))]">{workspaceName}</div>
        <div className="truncate text-[8px] text-[hsl(var(--ink-3))] mt-px">{workspaceRole}</div>
      </div>
    </div>
  )
}

function formatWorkspaceRole(role: string | null | undefined) {
  const trimmed = String(role || '').trim()
  if (!trimmed) return ''
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

/**
 * Company Switcher row — sits between brand area and navigation rows.
 * Per PRD §4.2: displays current company with affordance to switch.
 */
function CompanySwitcherRow({ onOpenSheet }: { onOpenSheet: () => void }) {
  const { entity, entities, isLoading } = useEntity()
  const companyName = entity?.name || (isLoading ? 'Loading…' : 'No company')
  const hasMultiple = entities.length > 1

  return (
    <button
      type="button"
      onClick={hasMultiple ? onOpenSheet : undefined}
      className={cn(
        'flex w-full items-center gap-2 rounded-xl px-2.5 py-2.5 transition active:scale-[0.985]',
        hasMultiple
          ? 'bg-[hsl(var(--surface-muted))] hover:bg-[hsl(var(--surface-muted))]/80 cursor-pointer'
          : 'cursor-default',
      )}
      aria-label={`Current company: ${companyName}. ${hasMultiple ? 'Tap to switch.' : ''}`}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[7px] font-[800] uppercase tracking-[0.075em] text-[hsl(var(--ink-3))]">
          Current Company
        </div>
        <div className="mt-0.5 truncate text-[13px] font-[800] tracking-[-0.045em] text-[hsl(var(--ink))]">
          {companyName}
        </div>
      </div>
      {hasMultiple ? (
        <ChevronRight className="h-[17px] w-[17px] shrink-0 text-[hsl(var(--ink-3))]" />
      ) : null}
    </button>
  )
}

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
        {/* Drawer header — brand mark + name + subtitle */}
        <div className="flex items-center gap-2 border-b border-[hsl(var(--line))] px-3.5 py-3.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[11px] bg-[hsl(var(--gradient))] text-white">
            <Sparkles className="h-4 w-4" strokeWidth={1.9} />
          </span>
          <div className="min-w-0">
            <div className="text-[13px] font-[800] tracking-[-0.05em] text-[hsl(var(--ink))]">{APP_NAME}</div>
            <div className="mt-px text-[7px] font-[800] uppercase tracking-[0.09em] text-[hsl(var(--ink-3))]">Project finance workspace</div>
          </div>
        </div>

        {/* Company Switcher — between brand area and nav rows (PRD §4.2) */}
        <div className="px-2.5 pt-2.5 pb-1">
          <CompanySwitcherRow onOpenSheet={() => setCompanySheetOpen(true)} />
        </div>

        {/* Drawer nav list */}
        <div className="flex-1 overflow-y-auto px-2 py-2.5 bd-custom-scrollbar">
          {/* Navigation */}
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

          {/* Management — Reports, Compliance, Item Library */}
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

        {/* Drawer footer — user info */}
        <DrawerFooter />
      </SheetContent>

      {/* Company Selection Sheet — opens above drawer per PRD §5.2 */}
      <CompanySelectionSheet
        open={companySheetOpen}
        onOpenChange={setCompanySheetOpen}
      />
    </Sheet>
  )
}
