import { useEffect, useState } from 'react'

import { supabase } from '@/supabase'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Combobox } from '@/components/ui/combobox'
import ConfirmActionDialog from '@/components/ConfirmActionDialog'
import { cn } from '@/lib/utils'
import { getClientMismatchMessage, isClientMismatch } from '@/domain/projects'

interface Project {
  id: string
  project_code: string | null
  name: string
  client_id: string | null
  client_name: string | null
  created_at: string
}

interface DocumentRecord {
  id: string
  client_id: string | null
  client_name: string | null
  project_id: string | null
}

interface ProjectLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tableName: string
  recordId: string
  documentLabel: string
  onLinked?: () => void | Promise<void>
}

export default function ProjectLinkDialog({
  open,
  onOpenChange,
  tableName,
  recordId,
  documentLabel,
  onLinked,
}: ProjectLinkDialogProps) {
  const [query, setQuery] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [documentRecord, setDocumentRecord] = useState<DocumentRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmingReassign, setConfirmingReassign] = useState(false)
  const [confirmingDetach, setConfirmingDetach] = useState(false)
  const isFinancialDoc = tableName === 'invoices' || tableName === 'quotations'

  useEffect(() => {
    if (!open) {
      setQuery('')
      setProjects([])
      setSelectedProjectId('')
      setDocumentRecord(null)
      setLoading(false)
      setSaving(false)
      setError('')
      return
    }

    let active = true

    const load = async () => {
      setLoading(true)

      const [projectsResult, documentResult] = await Promise.all([
        supabase
          .from('projects')
          .select('id, project_code, name, client_id, client_name, created_at')
          .is('archived_at', null)
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from(tableName)
          .select('id, client_id, client_name, project_id')
          .eq('id', recordId)
          .maybeSingle(),
      ])

      if (!active) return

      setProjects(projectsResult.data || [])
      setDocumentRecord(documentResult.data || null)
      setSelectedProjectId(String(documentResult.data?.project_id || ''))
      setLoading(false)
    }

    void load()

    return () => {
      active = false
    }
  }, [open, recordId, tableName])

  useEffect(() => {
    if (!open) return

    const term = query.trim()
    const timer = setTimeout(async () => {
      setLoading(true)

      let request = supabase
        .from('projects')
        .select('id, project_code, name, client_id, client_name, created_at')
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(term ? 15 : 8)

      if (term) {
        request = request.or(`project_code.ilike.%${term}%,name.ilike.%${term}%,client_name.ilike.%${term}%`)
      }

      const { data } = await request
      setProjects((data as Project[]) || [])
      setLoading(false)
    }, 180)

    return () => clearTimeout(timer)
  }, [open, query])

  const handleLink = async () => {
    setError('')

    if (!recordId || !selectedProjectId) return

    if (
      documentRecord?.project_id &&
      String(documentRecord.project_id) !== String(selectedProjectId)
    ) {
      setConfirmingReassign(true)
      return
    }

    await executeLink()
  }

  const executeLink = async () => {
    setConfirmingReassign(false)

    const { data: confirmedProject, error: projectError } = await supabase
      .from('projects')
      .select('id, project_code, name, client_id, client_name')
      .eq('id', selectedProjectId)
      .maybeSingle()

    if (projectError || !confirmedProject) {
      setError(projectError?.message || 'Selected project could not be found.')
      return
    }

    if (
      isClientMismatch({
        documentClientId: documentRecord?.client_id,
        documentClientName: documentRecord?.client_name,
        projectClientId: confirmedProject.client_id,
        projectClientName: confirmedProject.client_name,
      })
    ) {
      setError(
        getClientMismatchMessage({
          documentClientName: documentRecord?.client_name,
          projectClientName: confirmedProject.client_name,
        }),
      )
      return
    }

    setSaving(true)
    const { error: updateError } = await supabase
      .from(tableName)
      .update({ project_id: confirmedProject.id })
      .eq('id', recordId)
    setSaving(false)

    if (updateError) {
      setError(updateError.message)
      toast({ title: 'Failed to link project', description: updateError.message, variant: 'destructive' })
      return
    }

    onOpenChange(false)
    toast({
      title: 'Project linked',
      description: `${documentLabel} is now attached to ${confirmedProject.project_code || confirmedProject.name}.`,
    })
    await onLinked?.()
  }

  const executeDetach = async () => {
    setConfirmingDetach(false)
    setSaving(true)
    const { error: updateError } = await supabase
      .from(tableName)
      .update({ project_id: null })
      .eq('id', recordId)
    setSaving(false)

    if (updateError) {
      setError(updateError.message)
      toast({ title: 'Failed to detach project', description: updateError.message, variant: 'destructive' })
      return
    }

    onOpenChange(false)
    toast({
      title: 'Project detached',
      description: `${documentLabel} is no longer attached to the project.`,
    })
    await onLinked?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link to Project</DialogTitle>
          <DialogDescription>
            Search by project code, name, or client. We will save the internal project record after you select it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-4">
            <Combobox
              options={projects.map((project) => ({
                value: project.id,
                label: project.project_code || project.name,
                description: `${project.name}${project.client_name ? ` • ${project.client_name}` : ''}`,
              }))}
              value={selectedProjectId}
              onChange={(id) => {
                setSelectedProjectId(id)
                setError('')
              }}
              searchPlaceholder="PRJ code, name, or client..."
              title="Link to Project"
              strategy="auto"
              desktopBehavior="inline"
              searchValue={query}
              onSearchValueChange={setQuery}
              filterOptions={false}
            />
            
            {selectedProjectId && projects.find(p => p.id === selectedProjectId) && (
              <div className={cn(
                "rounded-xl border p-3",
                isClientMismatch({
                  documentClientId: documentRecord?.client_id,
                  documentClientName: documentRecord?.client_name,
                  projectClientId: projects.find(p => p.id === selectedProjectId)?.client_id,
                  projectClientName: projects.find(p => p.id === selectedProjectId)?.client_name,
                }) ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"
              )}>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Selected Project
                </div>
                <div className="text-sm font-bold mt-1">
                  {projects.find(p => p.id === selectedProjectId)?.name}
                </div>
                {isClientMismatch({
                  documentClientId: documentRecord?.client_id,
                  documentClientName: documentRecord?.client_name,
                  projectClientId: projects.find(p => p.id === selectedProjectId)?.client_id,
                  projectClientName: projects.find(p => p.id === selectedProjectId)?.client_name,
                }) && (
                  <div className="mt-2 text-xs font-medium text-red-600">
                    Client does not match this document
                  </div>
                )}
              </div>
            )}
          </div>

          {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div> : null}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {documentRecord?.project_id ? (
              <Button type="button" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setConfirmingDetach(true)}>
                Unlink Project
              </Button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={() => void handleLink()} disabled={saving || !selectedProjectId}>
              {saving ? 'Linking...' : 'Link Project'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
      
      <ConfirmActionDialog
        open={confirmingReassign}
        onOpenChange={setConfirmingReassign}
        title={`Reassign ${documentLabel}?`}
        description={
          isFinancialDoc
            ? `This ${documentLabel.toLowerCase()} is already linked to a project. Are you sure you want to reassign it? The existing financial connection will be broken and moved to the new project. Make sure this is correct.`
            : `This ${documentLabel.toLowerCase()} is already linked to another project. Are you sure you want to reassign it?`
        }
        confirmLabel="Yes, Reassign"
        onConfirm={executeLink}
      />

      <ConfirmActionDialog
        open={confirmingDetach}
        onOpenChange={setConfirmingDetach}
        title={`Detach ${documentLabel}?`}
        description={
          isFinancialDoc
            ? `Are you sure you want to remove this ${documentLabel.toLowerCase()} from its project? Linked financial history is not deleted, but this document will no longer appear under the project.`
            : `Are you sure you want to remove this ${documentLabel.toLowerCase()} from its project?`
        }
        confirmLabel="Yes, Detach"
        onConfirm={executeDetach}
      />
    </Dialog>
  )
}
