import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, FileText, ClipboardList, Wrench, Truck, FolderPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ClientRecord } from '@/domain/clientWorkspace'

interface Props {
  client: ClientRecord
  onEdit: () => void
}

export const ClientActionHeader: React.FC<Props> = ({ client, onEdit }) => {
  const navigate = useNavigate()

  const prefillState = {
    clientId: client.id,
    clientName: client.name,
  }

  const actions = [
    { label: 'Invoice', icon: FileText, path: '/invoices/new' },
    { label: 'Quotation', icon: ClipboardList, path: '/quotations/new' },
    { label: 'CSR', icon: Wrench, path: '/csr/new' },
    { label: 'Waybill', icon: WaybillIcon, path: '/waybills/new' },
    { label: 'Project', icon: FolderPlus, path: '/projects/new' },
  ]

  function WaybillIcon(props: any) {
    return <Truck {...props} />
  }

  return (
    <div className="sticky top-0 z-20 border-b border-border bg-background">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="rounded-full"
            onClick={() => navigate('/clients')}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0">
             <h1 className="truncate text-sm font-bold text-foreground">Client Workspace</h1>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="rounded-full"
          onClick={onEdit}
        >
          <Pencil className="size-4" />
        </Button>
      </div>

      <div className="flex w-full items-center gap-2 overflow-x-auto border-t border-border/50 px-4 py-3 no-scrollbar">
        {actions.map((action) => (
          <Button
            key={action.label}
            size="sm"
            variant="outline"
            className="shrink-0 gap-1.5 rounded-full border-border bg-muted/30 px-3 font-bold text-foreground hover:bg-muted/50"
            onClick={() => navigate(action.path, { state: prefillState })}
          >
            <action.icon className="size-3.5" />
            <span className="text-[11px] uppercase tracking-wide">{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}
