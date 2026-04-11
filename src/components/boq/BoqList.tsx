import React, { useEffect, useState } from 'react'
import { Eye, FileText, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import ConfirmActionDialog from '@/components/ConfirmActionDialog'
import InvoiceListActionSheet from '@/components/invoice/InvoiceListActionSheet'
import MobileFab from '@/components/layout/MobileFab'
import MobileListPageShell from '@/components/layout/MobileListPageShell'
import type { Boq } from '@/domain/boq/types'
import { deleteBoq, ensureBoqSeed, listBoqs } from '@/domain/boq/storage'
import { toast } from '@/hooks/use-toast'

export function BoqList() {
  const navigate = useNavigate()
  const [boqs, setBoqs] = useState<Boq[]>([])
  const [activeBoq, setActiveBoq] = useState<Boq | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const load = () => {
    setBoqs(ensureBoqSeed())
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <MobileListPageShell
      eyebrow="Documents"
      title="BOQs"
      summary={`${boqs.length} local documents`}
      tone="blue"
      onPrimaryAction={() => navigate('/boqs/new')}
      searchValue=""
      onSearchChange={() => {}}
      searchPlaceholder="Search BOQs..."
    >
      <div className="px-1">
        <div className="overflow-hidden rounded-[24px] border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
          {boqs.map((boq, index) => (
            <div key={boq.id} onClick={() => navigate(`/boqs/${boq.id}`)} className={`cursor-pointer px-4 py-4 transition hover:bg-muted/20 ${index === 0 ? '' : 'border-t border-border/80'}`}>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="flex min-w-0 gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-100 text-sky-700">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">BOQ</div>
                    <div className="mt-1 truncate text-[15px] font-extrabold leading-5 tracking-[-0.02em] text-foreground">{boq.title || 'Untitled BOQ'}</div>
                    <div className="mt-1 truncate text-[13px] leading-5 text-muted-foreground">{boq.vendor_name || 'Unassigned'}</div>
                    <div className="mt-1 truncate text-[12px] leading-5 text-muted-foreground">{boq.boq_number}</div>
                  </div>
                </div>
                <button type="button" onClick={(event) => { event.stopPropagation(); setActiveBoq(boq) }} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-background text-foreground shadow-sm">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <MobileFab onClick={() => navigate('/boqs/new')} ariaLabel="Create BOQ">
        <Plus className="h-7 w-7" />
      </MobileFab>

      <InvoiceListActionSheet
        open={Boolean(activeBoq)}
        onOpenChange={(open) => !open && setActiveBoq(null)}
        eyebrow={`BOQ ${activeBoq?.boq_number}`}
        title={activeBoq?.title || 'Untitled BOQ'}
        subtitle={activeBoq?.vendor_name || undefined}
        actions={activeBoq ? [
          { key: 'view', label: 'View / Export', icon: <Eye className="h-6 w-6" />, onClick: () => navigate(`/boqs/${activeBoq.id}`) },
          { key: 'edit', label: 'Edit BOQ', icon: <Pencil className="h-6 w-6" />, onClick: () => navigate(`/boqs/edit/${activeBoq.id}`) },
        ] : []}
        deleteAction={activeBoq ? {
          key: 'delete',
          label: 'Delete BOQ',
          icon: <Trash2 className="h-6 w-6" />,
          onClick: () => setDeleteId(activeBoq.id),
        } : undefined}
      />

      <ConfirmActionDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete this BOQ?"
        description="This local BOQ will be removed from this device."
        confirmLabel="Delete BOQ"
        onConfirm={() => {
          if (!deleteId) return
          deleteBoq(deleteId)
          toast({ title: 'BOQ deleted' })
          setDeleteId(null)
          setActiveBoq(null)
          load()
        }}
      />
    </MobileListPageShell>
  )
}
