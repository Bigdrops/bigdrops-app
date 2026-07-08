import { useCallback } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type IdentityLockDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDuplicate: () => void
}

export default function IdentityLockDialog({
  open,
  onOpenChange,
  onDuplicate,
}: IdentityLockDialogProps) {
  const handleDuplicate = useCallback(() => {
    onOpenChange(false)
    onDuplicate()
  }, [onOpenChange, onDuplicate])

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Identity Fields Locked</AlertDialogTitle>
          <AlertDialogDescription>
            Client and document number cannot be changed after a document is saved. To use different values, duplicate this document as a new draft with your current changes.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDuplicate}>
            Duplicate Current Changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
