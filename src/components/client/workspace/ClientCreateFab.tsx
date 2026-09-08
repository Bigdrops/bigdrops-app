import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, FileText, FolderPlus, Truck, Wrench, X } from 'lucide-react'
import MobileFab from '@/components/layout/MobileFab'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

interface Props {
  clientId: string
  clientName: string | null | undefined
}

export const ClientCreateFab: React.FC<Props> = ({ clientId, clientName }) => {
  const navigate = useNavigate()
  const [open, setOpen] = React.useState(false)

  const destinations = [
    { label: 'Invoice', icon: FileText, path: '/invoices/new' },
    { label: 'Quotation', icon: ClipboardList, path: '/quotations/new' },
    { label: 'CSR', icon: Wrench, path: '/csr/new' },
    { label: 'Waybill', icon: Truck, path: '/waybills/new' },
    { label: 'Project', icon: FolderPlus, path: '/projects/new' },
  ]

  return (
    <>
      <MobileFab onClick={() => setOpen(true)} ariaLabel="Create new record for this client" />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" showCloseButton={false} className="rounded-t-[28px] px-4 pb-8 pt-2">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted" />
          <SheetHeader className="mb-4 flex flex-row items-center justify-between px-1 pb-0 pt-0 text-left">
            <SheetTitle className="text-base font-semibold">
              Create for {clientName || 'this client'}
            </SheetTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="min-h-[44px] min-w-[44px] rounded-full"
              onClick={() => setOpen(false)}
              aria-label="Close create menu"
            >
              <X className="size-4" />
            </Button>
          </SheetHeader>
          <div className="grid gap-1">
            {destinations.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setOpen(false)
                  navigate(item.path, { state: { clientId, clientName } })
                }}
                className="flex min-h-[52px] w-full items-center gap-3 rounded-xl px-3 text-left transition-colors hover:bg-muted active:bg-muted"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-bd-action-icon-bg text-bd-action-icon-text shadow-sm [&_svg]:size-5">
                  <item.icon />
                </span>
                <span className="flex-1 text-sm font-bold text-foreground">{item.label}</span>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
