import UpdateDialogCard from '@/components/app/update/UpdateDialogCard'
import type { UseAppUpdateResult } from '@/hooks/useAppUpdate'

/**
 * Mandatory-update gate. Rendered instead of normal app content once the
 * grace period expires. The update actions remain fully usable — the gate
 * never blocks its own escape paths. The blocking surface uses the same
 * approved card as the dialog, with no dismiss control.
 */
export default function UpdateGate({ update }: { update: UseAppUpdateResult }) {
  return (
    <main className="udl-gate-page">
      <UpdateDialogCard update={update} variant="gate" />
    </main>
  )
}
