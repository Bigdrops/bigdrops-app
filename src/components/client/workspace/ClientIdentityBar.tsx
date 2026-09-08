import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, EllipsisVertical, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Props {
  clientName: string
  statusLine: string | null
  onEdit: () => void
}

export const ClientIdentityBar: React.FC<Props> = ({ clientName, statusLine, onEdit }) => {
  const navigate = useNavigate()

  return (
    <div className="sticky top-0 z-20 border-b border-bd-border bg-bd-surface">
      <div className="mx-auto flex min-h-[60px] w-full max-w-5xl items-center gap-1 px-2 py-2 md:px-4">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="min-h-[44px] min-w-[44px] shrink-0 rounded-full"
          onClick={() => navigate('/clients')}
          aria-label="Back to clients"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1 px-1">
          <h1 className="truncate text-[15px] font-black tracking-tight text-foreground">
            {clientName}
          </h1>
          {statusLine && (
            <p className="truncate text-[11px] font-semibold text-muted-foreground">
              {statusLine}
            </p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="min-h-[44px] min-w-[44px] shrink-0 rounded-full"
              aria-label="Client options"
            >
              <EllipsisVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[200px]">
            <DropdownMenuItem onSelect={onEdit} className="min-h-[44px] gap-2 text-sm font-semibold">
              <Pencil className="size-4" />
              Edit client
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
