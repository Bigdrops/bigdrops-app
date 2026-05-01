import * as React from 'react'
import { X, ChevronDown, Receipt, ClipboardList, LogOut, ChevronRight } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { BusinessSwitcher } from './BusinessSwitcher'
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
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] p-0 sm:max-w-[280px]" showCloseButton={false}>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-muted text-muted-foreground"
          aria-label="Close navigation menu"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="px-5 pb-5 pt-6">
          <div className="text-sm font-black tracking-[-0.03em] text-foreground">{APP_NAME}</div>
          <div className="mt-1 text-xs text-muted-foreground">Navigation</div>
        </div>

        <div className="space-y-2 px-4 pb-6">
          <div className="rounded-2xl border border-border bg-card px-3 py-3 shadow-sm">
            <div className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Business
            </div>
            <BusinessSwitcher />
          </div>

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
                  'flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm transition active:scale-[0.985]',
                  isActive ? activeNavItemClassName : inactiveNavItemClassName
                )}
              >
                <span
                  className={cn(
                    'grid h-9 w-9 place-items-center rounded-xl',
                    isActive ? activeNavIconClassName : inactiveNavIconClassName
                  )}
                >
                  <Icon className={cn('h-5 w-5', isActive ? '' : inactiveNavIconColorClassName)} />
                </span>
                <span className="font-semibold">{item.label}</span>
              </button>
            )
          })}

          <Separator className="my-3" />

          <div className="rounded-2xl border border-border bg-card p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setDrawerSalesOpen((prev) => !prev)}
              className={cn(
                'flex w-full items-center justify-between rounded-[18px] px-2 py-2 text-sm transition active:scale-[0.985]',
                salesRouteActive ? activeNavItemClassName : inactiveNavItemClassName
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'grid h-9 w-9 place-items-center rounded-xl',
                    salesRouteActive ? activeNavIconClassName : inactiveNavIconClassName
                  )}
                >
                  <Receipt className={cn('h-5 w-5', salesRouteActive ? '' : inactiveNavIconColorClassName)} />
                </span>
                <span className="font-semibold">Sales</span>
              </div>
              <ChevronDown className={cn('h-5 w-5 transition-transform', drawerSalesOpen ? 'rotate-180' : '')} />
            </button>

            {drawerSalesOpen ? (
              <div className="mt-1 space-y-1 pb-1 pl-2">
                {salesPicker.map((item) => {
                  const Icon = item.icon
                  const isActive = isPathActive(pathname, getSalesPath(item.key))
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleSalesPick(item.key)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-2xl px-4 py-2 text-left text-sm transition active:scale-[0.985]',
                        isActive ? activeNavItemClassName : inactiveNavItemClassName
                      )}
                    >
                      <span
                        className={cn(
                          'grid h-9 w-9 place-items-center rounded-xl',
                          isActive ? activeNavIconClassName : inactiveNavIconClassName
                        )}
                      >
                        <Icon className={cn('h-5 w-5', isActive ? '' : inactiveNavIconColorClassName)} />
                      </span>
                      <span className="font-semibold">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-border bg-card p-1 shadow-sm">
            <div
              className={cn(
                'flex w-full items-center justify-between rounded-[18px] px-2 py-2 text-sm transition',
                presalesRouteActive ? activeNavItemClassName : inactiveNavItemClassName
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'grid h-9 w-9 place-items-center rounded-xl',
                    presalesRouteActive ? activeNavIconClassName : inactiveNavIconClassName
                  )}
                >
                  <ClipboardList className={cn('h-5 w-5', presalesRouteActive ? '' : inactiveNavIconColorClassName)} />
                </span>
                <span className="font-semibold">Pre-Sales</span>
              </div>
            </div>

            <div className="mt-1 space-y-1 pb-1 pl-2">
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
                      'flex w-full items-center gap-3 rounded-2xl px-4 py-2 text-left text-sm transition',
                      isActive ? activeNavItemClassName : inactiveNavItemClassName
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-9 w-9 place-items-center rounded-xl',
                        isActive ? activeNavIconClassName : inactiveNavIconClassName
                      )}
                    >
                      <Icon className={cn('h-5 w-5', isActive ? '' : inactiveNavIconColorClassName)} />
                    </span>
                    <span className="font-semibold">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {mobileDrawerUtilityNav.map((item) => {
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
                  'flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm transition active:scale-[0.985]',
                  isActive ? activeNavItemClassName : inactiveNavItemClassName
                )}
              >
                <span
                  className={cn(
                    'grid h-9 w-9 place-items-center rounded-xl',
                    isActive ? activeNavIconClassName : inactiveNavIconClassName
                  )}
                >
                  <Icon className={cn('h-5 w-5', isActive ? '' : inactiveNavIconColorClassName)} />
                </span>
                <span className="font-semibold">{item.label}</span>
              </button>
            )
          })}

          <button
            type="button"
            onClick={() => handleMorePick('signout')}
            className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-3 py-2 text-sm shadow-sm transition hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-muted">
                <LogOut className="h-5 w-5 text-foreground/80" />
              </span>
              <span className="font-semibold text-foreground">Sign Out</span>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
