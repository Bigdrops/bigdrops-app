import * as React from 'react'
import { Building2, ChevronDown, X, Check } from 'lucide-react'
import { useSettings } from '@/hooks/useSettings'

export function BusinessSwitcher() {
  const { settings } = useSettings()
  const [open, setOpen] = React.useState(false)
  const activeName = settings?.company_name || 'Unnamed business'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm"
      >
        <span className="grid h-6 w-6 place-items-center rounded-full surface-strong">
          <Building2 className="h-3.5 w-3.5" />
        </span>
        <span className="max-w-[140px] truncate">{activeName}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open ? (
        <div
          className="surface-overlay fixed inset-0 z-[70] flex items-end justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl border border-border bg-card shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <div className="text-sm font-bold text-foreground">Current Business</div>
                <div className="text-xs text-muted-foreground">Business profile</div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-muted text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5">
              <div className="rounded-2xl border border-border bg-muted/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl surface-strong">
                    {(settings?.company_name || 'B').charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-foreground">{activeName}</div>
                    <div className="text-xs text-muted-foreground">
                      Multi-business switching is not enabled.
                    </div>
                  </div>
                  <Check className="h-4 w-4 text-foreground" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
