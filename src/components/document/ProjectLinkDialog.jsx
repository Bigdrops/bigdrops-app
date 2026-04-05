import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Search } from 'lucide-react'

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
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { getClientMismatchMessage, isClientMismatch } from '@/domain/projects'

export default function ProjectLinkDialog({
  open,
  onOpenChange,
  tableName,
  recordId,
  documentLabel,
  onLinked,
}) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [documentRecord, setDocumentRecord] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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
      setProjects(data || [])
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
      setError(`This ${documentLabel.toLowerCase()} is already linked to a project. Open that project first before changing the assignment.`)
      return
    }

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
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setError('')
              }}
              placeholder="Search PRJ code, project name, or client"
              className="h-11 border-0 px-0 shadow-none focus-visible:ring-0"
              autoFocus
            />
          </div>

          {documentRecord?.client_name ? (
            <div className="text-xs text-muted-foreground">
              Document client: <span className="font-medium text-foreground">{documentRecord.client_name}</span>
            </div>
          ) : null}

          <div className="max-h-72 space-y-2 overflow-y-auto">
            {projects.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                {loading ? 'Loading projects...' : 'No matching projects found.'}
              </div>
            ) : (
              projects.map((project) => {
                const selected = String(project.id) === String(selectedProjectId)
                const hasMismatch = isClientMismatch({
                  documentClientId: documentRecord?.client_id,
                  documentClientName: documentRecord?.client_name,
                  projectClientId: project.client_id,
                  projectClientName: project.client_name,
                })

                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => {
                      setSelectedProjectId(project.id)
                      setError('')
                    }}
                    className={cn(
                      'w-full rounded-2xl border px-4 py-3 text-left transition',
                      selected
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-border bg-background hover:bg-muted/30',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          {project.project_code || 'Project'}
                        </div>
                        <div className="mt-1 truncate text-sm font-semibold text-foreground">{project.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{project.client_name || 'No client'}</div>
                        {hasMismatch ? (
                          <div className="mt-2 text-xs font-medium text-red-600">Client does not match this document</div>
                        ) : null}
                      </div>
                      {selected ? <Check className="mt-1 h-4 w-4 text-emerald-600" /> : null}
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div> : null}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => { onOpenChange(false); navigate('/projects') }}>
              Go to Projects
            </Button>
            <Button type="button" onClick={() => void handleLink()} disabled={saving || !selectedProjectId}>
              {saving ? 'Linking...' : 'Link Project'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
