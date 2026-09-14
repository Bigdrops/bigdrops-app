import { useEffect, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import UpdateSheet from '@/components/app/UpdateSheet'
import type { UseAppUpdateResult } from '@/hooks/useAppUpdate'

/**
 * Grace-period banner. Thin, dismissible, and non-blocking: the app stays
 * fully usable while it is visible. After the deadline the banner still
 * renders (the gate itself takes over blocking), so the user always has
 * visible access to update actions.
 */
export default function UpdateBanner({ update }: { update: UseAppUpdateResult }) {
  const { state, graceRemaining } = update
  const [dismissedThisSession, setDismissedThisSession] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  const expired = graceRemaining?.expired ?? false

  // Auto-reopen context: a dismissed banner must still let the deadline
  // transition be visible. When the state flips to blocked, the gate
  // replaces app content, so no banner action is needed here.
  useEffect(() => {
    if (state.status === 'up_to_date') setDismissedThisSession(false)
  }, [state.status])

  if (state.status !== 'grace' && state.status !== 'blocked') return null
  if (dismissedThisSession && state.status !== 'blocked') return null

  const daysLeft = expired ? 0 : (graceRemaining?.days ?? 0)
  const hoursLeft = expired ? 0 : (graceRemaining?.hours ?? 0)

  return (
    <>
      <div className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur px-4 py-2">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <RefreshCw className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {expired ? (
              <>Update required — install to continue using BIGDROPS.</>
            ) : (
              <>
                New version required: v{state.policy?.versionCode ?? ''} · {daysLeft}d {hoursLeft}h
                left to update
              </>
            )}
          </p>
          <Button size="sm" onClick={() => setSheetOpen(true)}>
            Update
          </Button>
          {state.status === 'grace' && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Dismiss update reminder"
              onClick={() => setDismissedThisSession(true)}
            >
              <X />
            </Button>
          )}
        </div>
      </div>

      <UpdateSheet open={sheetOpen} onOpenChange={setSheetOpen} update={update} />
    </>
  )
}
