import React, { useEffect, useState } from 'react'
import { Archive, Eye, Pencil, Trash2, Loader2, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import ConfirmActionDialog from '@/components/ConfirmActionDialog'
import InvoiceListActionSheet from '@/components/invoice/InvoiceListActionSheet'
import MobileFab from '@/components/layout/MobileFab'
import ModuleShell from '@/components/layout/ModuleShell'
import ModuleRowCard from '@/components/layout/ModuleRowCard'
import { feedback } from '@/lib/feedback'
import { SkeletonRow } from '@/components/loading/AppLoadingStates'
import { supabase } from '@/supabase'
import { readListCache, writeListCache, isListCacheFresh, invalidateListCache } from '@/lib/cache/listCache'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { BoqEditor } from './BoqEditor'
import { createEmptyBoq } from '@/domain/boq/factories'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { getNextBoqNumber } from '@/domain/boq/storage'

const BOQ_CACHE_KEY = 'bd:list:boqs:v1:all'
const BOQ_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export function BoqList() {
  const navigate = useNavigate()
  const [boqs, setBoqs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeBoq, setActiveBoq] = useState<any | null>(null)
  const [archiveId, setArchiveId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isArchiving, setIsArchiving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [search, setSearch] = useState('')
  const [showCreateSheet, setShowCreateSheet] = useState(false)
  const [showEditSheet, setShowEditSheet] = useState(false)
  const [editBoqData, setEditBoqData] = useState<any | null>(null)

  const loadBoqs = async (options?: { background?: boolean }) => {
    if (!options?.background) {
      setLoading(true)
      const cached = readListCache<any>(BOQ_CACHE_KEY)
      if (cached) {
        setBoqs(cached.rows)
        if (isListCacheFresh(cached, BOQ_CACHE_TTL)) {
          setLoading(false)
          return
        }
      }
    }

    const { data, error } = await supabase
      .from('boqs')
      .select('*')
      .is('archived_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      feedback.error('Failed to load BOQs', { description: error.message })
    } else {
      const rows = data || []
      setBoqs(rows)
      writeListCache(BOQ_CACHE_KEY, rows)
    }
    setLoading(false)
  }

  useEffect(() => {
    void loadBoqs()
  }, [])

  const handleArchive = async () => {
    if (!archiveId) return
    setIsArchiving(true)
    const { error } = await supabase.from('boqs').update({ archived_at: new Date().toISOString() }).eq('id', archiveId)
    setIsArchiving(false)
    if (error) {
      feedback.error('Archive failed', { description: error.message })
      return
    }
    feedback.success('BOQ archived')
    setArchiveId(null)
    setActiveBoq(null)
    invalidateListCache(BOQ_CACHE_KEY)
    await loadBoqs({ background: true })
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    
    // Delete items first
    const { error: itemsError } = await supabase.from('boq_items').delete().eq('boq_id', deleteId)
    if (itemsError) {
      setIsDeleting(false)
      feedback.error('Delete failed', { description: itemsError.message })
      return
    }

    const { error } = await supabase.from('boqs').delete().eq('id', deleteId)
    setIsDeleting(false)
    if (error) {
      feedback.error('Delete failed', { description: error.message })
      return
    }
    feedback.success('BOQ deleted')
    setDeleteId(null)
    setActiveBoq(null)
    invalidateListCache(BOQ_CACHE_KEY)
    await loadBoqs({ background: true })
  }

  const handleSaveNew = async (boq: any) => {
    setIsDeleting(true)
    try {
      const nextNum = getNextBoqNumber()
      const payload = {
        ...boq,
        boq_number: boq.boq_number || nextNum,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      delete payload.id

      const { error } = await supabase.from('boqs').insert([payload])
      if (error) throw error

      feedback.success('BOQ created successfully')
      setShowCreateSheet(false)
      invalidateListCache(BOQ_CACHE_KEY)
      await loadBoqs()
    } catch (err: any) {
      feedback.error('Save failed', { description: getUserFacingMutationMessage(err, { action: 'save' }) })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleUpdate = async (boq: any) => {
    if (!boq.id) return
    setIsDeleting(true)
    try {
      const payload = {
        ...boq,
        updated_at: new Date().toISOString(),
      }
      const { error } = await supabase.from('boqs').update(payload).eq('id', boq.id)
      if (error) throw error

      feedback.success('BOQ updated successfully')
      setShowEditSheet(false)
      setEditBoqData(null)
      invalidateListCache(BOQ_CACHE_KEY)
      await loadBoqs()
    } catch (err: any) {
      feedback.error('Update failed', { description: getUserFacingMutationMessage(err, { action: 'save' }) })
    } finally {
      setIsDeleting(false)
    }
  }

  const openEdit = (boq: any) => {
    setEditBoqData(boq)
    setShowEditSheet(true)
    setActiveBoq(null)
  }

  const filtered = boqs.filter(b => 
    (b.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (b.boq_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (b.client_name || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <ModuleShell
      eyebrow="Documents"
      title="BOQs"
      summary={`${boqs.length} documents total`}
      tone="blue"
      onPrimaryAction={() => setShowCreateSheet(true)}
      primaryActionIcon="plus"
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search BOQs..."
      records={loading ? [] : filtered}
      renderRow={(boq) => (
        <ModuleRowCard
          key={boq.id}
          title={boq.client_name || boq.title || 'Untitled BOQ'}
          subtitle={boq.boq_number || 'BOQ'}
          tertiary={boq.status || 'open'}
          statusLabel={boq.status || 'open'}
          statusClassName={boq.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}
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

      <Sheet open={showCreateSheet} onOpenChange={setShowCreateSheet}>
        <SheetContent side="right" className="w-full sm:max-w-4xl p-0 border-l-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))]">
          <BoqEditor initialBoq={createEmptyBoq()} onSave={handleSaveNew} onCancel={() => setShowCreateSheet(false)} saving={isDeleting} />
        </SheetContent>
      </Sheet>

      <Sheet open={showEditSheet} onOpenChange={setShowEditSheet}>
        <SheetContent side="right" className="w-full sm:max-w-4xl p-0 border-l-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface))]">
          {editBoqData && (
            <BoqEditor 
              initialBoq={editBoqData} 
              onSave={handleUpdate} 
              onCancel={() => {
                setShowEditSheet(false)
                setEditBoqData(null)
              }}
              saving={isDeleting} 
            />
          )}
        </SheetContent>
      </Sheet>

      <InvoiceListActionSheet
        open={Boolean(activeBoq)}
        onOpenChange={(open) => !open && setActiveBoq(null)}
        eyebrow={`BOQ ${activeBoq?.boq_number}`}
        title={activeBoq?.title || 'Untitled BOQ'}
        subtitle={activeBoq?.client_name || undefined}
        actions={activeBoq ? [
          { key: 'view', label: 'View / Export', icon: <Eye className="h-6 w-6" />, onClick: () => navigate(`/boqs/${activeBoq.id}`) },
          { key: 'edit', label: 'Edit BOQ', icon: <Pencil className="h-6 w-6" />, onClick: () => openEdit(activeBoq) },
          { 
            key: 'archive', 
            label: isArchiving ? 'Archiving...' : 'Archive', 
            icon: isArchiving ? <Loader2 className="h-6 w-6 animate-spin" /> : <Archive className="h-6 w-6" />, 
            onClick: () => setArchiveId(activeBoq.id),
            closeOnClick: false
          },
        ] : []}
        deleteAction={activeBoq ? {
          key: 'delete',
          label: isDeleting ? 'Deleting...' : 'Delete BOQ',
          icon: isDeleting ? <Loader2 className="h-6 w-6 animate-spin" /> : <Trash2 className="h-6 w-6" />,
          onClick: () => setDeleteId(activeBoq.id),
          closeOnClick: false
        } : undefined}
      />

      <ConfirmActionDialog
        open={archiveId !== null}
        onOpenChange={(open) => !open && setArchiveId(null)}
        title="Archive this BOQ?"
        description="This will move the BOQ to the archive. You can restore it later from Settings."
        confirmLabel="Archive"
        loading={isArchiving}
        onConfirm={handleArchive}
      />

      <ConfirmActionDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete this BOQ?"
        description="This action is permanent and cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleDelete}
      />
    </ModuleShell>
  )
}
