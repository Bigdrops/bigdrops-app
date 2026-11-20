import { Dialog, DialogContent } from '@/components/ui/dialog'
import UpdateDialogCard from '@/components/app/update/UpdateDialogCard'
import type { UseAppUpdateResult } from '@/hooks/useAppUpdate'

/**
 * The update "reading room".
 *
 * Presents the approved Android update card inside the shared dialog shell.
 * Dismissing closes the dialog only. It must never cancel the download: the
 * OS transfer and the native completion receiver own that lifecycle, and the
 * Settings card remains the re-entry point.
 */
export default function UpdateModal({
  open,
  onOpenChange,
  update,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  update: UseAppUpdateResult
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="udl-dialog flex max-h-[92dvh] w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden rounded-[26px] border-0 bg-transparent p-0 sm:max-w-[34rem] lg:max-w-[40rem]"
        showCloseButton={false}
      >
        <UpdateDialogCard
          update={update}
          variant="dialog"
          onDismiss={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
