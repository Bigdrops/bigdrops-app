import { useEffect, useRef, useState } from 'react'

import UpdateModal from '@/components/app/UpdateModal'
import { useAppUpdateContext } from '@/contexts/AppUpdateContext'
import { isAndroidNative } from '@/lib/native/capacitor'

/**
 * Dashboard-owned update prompt.
 *
 * Opens 1.5s after the dashboard's initial data fetch settles, so the
 * modal never interrupts the splash screen or the first paint. It opens
 * at most once per target version per app session; a dismissal is not a
 * cancel, and the Settings card stays as the re-entry point.
 */
export default function UpdateModalHost({ ready }: { ready: boolean }) {
  const update = useAppUpdateContext()
  const [open, setOpen] = useState(false)
  const promptedForRef = useRef<number | null>(null)

  const targetVersionCode = update.state.policy?.versionCode ?? null
  const status = update.state.status
  const isPending = status === 'available' || status === 'grace'

  useEffect(() => {
    if (!isAndroidNative() || !ready || !update.ready) return
    if (!isPending) return
    if (update.downloadPhase.kind === 'downloading') return
    if (targetVersionCode === null) return
    if (promptedForRef.current === targetVersionCode) return

    const timer = window.setTimeout(() => {
      promptedForRef.current = targetVersionCode
      setOpen(true)
    }, 1500)

    return () => window.clearTimeout(timer)
  }, [ready, update.ready, isPending, targetVersionCode, update.downloadPhase.kind])

  return <UpdateModal open={open} onOpenChange={setOpen} update={update} />
}
