import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FileOutput, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  clientName: string
  statusLine: string | null
  onEdit: () => void
}

export const ClientIdentityBar: React.FC<Props> = ({ clientName, statusLine, onEdit }) => {
  const navigate = useNavigate()

  return (
    <div className="sticky top-0 z-20 border-b border-bd-border bg-bd-surface">
      <div className="mx-auto flex min-h-[56px] w-full max-w-5xl items-center gap-1 px-2 py-1.5 md:px-4">
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
          <h1 className="truncate text-[12px] font-bold leading-tight text-foreground">
            {clientName}
          </h1>
          {statusLine && (
            <p className="truncate text-[10px] font-semibold leading-tight text-muted-foreground">
              {statusLine}
            </p>
          )}
        </div>
        {/* UI-only until the statement report architecture is ready. No
            workflow, navigation, query, or state change is attached. */}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="min-h-[44px] min-w-[44px] shrink-0 rounded-full opacity-60"
          aria-label="Export statement"
          aria-disabled="true"
          title="Export statement (coming soon)"
          onClick={() => {}}
        >
          <FileOutput className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="min-h-[44px] min-w-[44px] shrink-0 rounded-full"
          onClick={onEdit}
          aria-label="Edit client"
        >
          <Pencil className="size-4" />
        </Button>
      </div>
    </div>
  )
}
