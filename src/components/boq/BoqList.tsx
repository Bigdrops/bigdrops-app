import React, { useEffect, useState } from 'react'
import { Eye, FileText, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import ConfirmActionDialog from '@/components/ConfirmActionDialog'
import InvoiceListActionSheet from '@/components/invoice/InvoiceListActionSheet'
import MobileFab from '@/components/layout/MobileFab'
import ModuleShell from '@/components/layout/ModuleShell'
import ModuleRowCard from '@/components/layout/ModuleRowCard'
import type { Boq } from '@/domain/boq/types'
import { deleteBoq, ensureBoqSeed } from '@/domain/boq/storage'
import { toast } from '@/hooks/use-toast'
import { SkeletonRow } from '@/components/loading/AppLoadingStates'

export function BoqList() {
  const navigate = useNavigate()
  const [boqs, setBoqs] = useState<Boq[]>([])
  const [loading, setLoading] = useState(true)
  const [activeBoq, setActiveBoq] = useState<Boq | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = () => {
    setBoqs(ensureBoqSeed())
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = boqs.filter(b => 
    (b.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (b.boq_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (b.vendor_name || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <ModuleShell
      eyebrow="Documents"
      title="BOQs"
      summary={`${boqs.length} local documents`}
      tone="blue"
      onPrimaryAction={() => navigate('/boqs/new')}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search BOQs..."
      records={loading ? [] : filtered}
      renderRow={(boq) => (
        <ModuleRowCard
          key={boq.id}
          title={boq.title || 'Untitled BOQ'}
          subtitle={boq.boq_number || 'BOQ'}
          tertiary={boq.vendor_name || 'Unassigned'}
          statusLabel="Local"
          statusClassName="bg-blue-100 text-blue-700"
          onClick={() => navigate(`/boqs/${boq.id}`)}
          onActionClick={() => setActiveBoq(boq)}
        />
      )}
    >
      {loading && (
        <div className="grid gap-3">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      )}

      <MobileFab onClick={() => navigate('/boqs/new')} ariaLabel="Create BOQ" />

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
    </ModuleShell>
  )
}
