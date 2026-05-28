import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Archive, Eye, FolderOpen, Pencil, Trash2 } from 'lucide-react'
import { feedback } from '@/lib/feedback'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { getStatusTone, getStatusClasses } from "@/lib/statusTheme"
import { invalidateListCache } from '@/lib/cache/listCache'

import InvoiceListActionSheet from '@/components/invoice/InvoiceListActionSheet'
import MobileFab from '@/components/layout/MobileFab'
import ModuleShell from '@/components/layout/ModuleShell'
import ModuleRowCard from '@/components/layout/ModuleRowCard'
import { SkeletonRow } from '@/components/loading/AppLoadingStates'
import type { ProjectRecord } from '@/domain/clientWorkspace'
import ConfirmActionDialog from '../components/ConfirmActionDialog'
import Layout from '../components/Layout'
import { supabase } from '../supabase'
import { DocumentQueryProvider, useDocumentQuery } from '@/context/DocumentQueryContext'
import QueryFilterOverlay from '@/components/query/QueryFilterOverlay'
import { ContextualExportDropdown } from '@/components/export/ContextualExportDropdown'

type ProjectRow = ProjectRecord & {
  client_name?: string | null
  created_at?: string | null
  archived_at?: string | null
}

const STATUS_CONFIG = {
  active: { label: 'Active' },
  completed: { label: 'Completed' },
  on_hold: { label: 'On Hold' },
  cancelled: { label: 'Cancelled' },
} as const

type StatusKey = keyof typeof STATUS_CONFIG

function ProjectsContent() {
  const navigate = useNavigate()

  // ─── QUERY PLATFORM BINDING (single source of truth) ───
  const { state, patchUpdate, reset, results, loading } = useDocumentQuery("projects")

  // ─── NON-FILTER STATE (page-specific) ───
  const [projectToDelete, setProjectToDelete] = useState<ProjectRow | null>(null)
  const [activeProject, setActiveProject] = useState<ProjectRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [showFilterOverlay, setShowFilterOverlay] = useState(false)

  // ─── Typed results ───
  const projects = results as ProjectRow[]

  const hasActiveFilters = state.statuses.length > 0 || state.dateRange.from !== null || state.dateRange.to !== null

  const handleDelete = async (project: ProjectRow): Promise<void> => {
    try {
      setIsDeleting(true)
      const { error } = await supabase.from('projects').delete().eq('id', project.id)
      if (error) throw error
      invalidateListCache('bd:list:projects:v1:all')
      feedback.success('Project deleted')
      setProjectToDelete(null)
      setActiveProject(null)
      // Trigger re-fetch
      patchUpdate({ search: state.search } as any)
    } catch (err: any) {
      feedback.error(getUserFacingMutationMessage(err, { action: 'save' }))
    } finally {
      setIsDeleting(false)
    }
  }

  const handleArchive = async (project: ProjectRow): Promise<void> => {
    try {
      setIsArchiving(true)
      const { error } = await supabase.from('projects').update({ archived_at: new Date().toISOString() }).eq('id', project.id)
      if (error) throw error
      invalidateListCache('bd:list:projects:v1:all')
      feedback.success('Project archived')
      setActiveProject(null)
      patchUpdate({ search: state.search } as any)
    } catch (err: any) {
      feedback.error(getUserFacingMutationMessage(err, { action: 'save' }))
    } finally {
      setIsArchiving(false)
    }
  }

  const formatProjectValue = (value?: number | null) => {
    const amount = Number(value || 0)
    if (!amount) return '₦0'
    if (amount >= 1_000_000) return '₦' + (amount / 1_000_000).toFixed(1) + 'M'
    if (amount >= 1_000) return '₦' + (amount / 1_000).toFixed(1) + 'K'
    return '₦' + amount.toLocaleString()
  }

  return (
    <>
      <ModuleShell
        eyebrow="Projects"
        title="Projects"
        summary={`${projects.length} projects total`}
        tone="emerald"
        onPrimaryAction={() => navigate('/projects/new')}
        searchValue={state.search}
        onSearchChange={(value) => patchUpdate({ search: value } as any)}
        searchPlaceholder="Search projects..."
        hasActiveFilters={hasActiveFilters}
        onResetFilters={reset}
        onFilterClick={() => setShowFilterOverlay(true)}
        headerActions={
          <ContextualExportDropdown
            domain="PROJECTS"
            data={projects as unknown as Record<string, unknown>[]}
            supportedFormats={['CSV_SUMMARY', 'JSON_RAW']}
            recordCount={projects.length}
          />
        }
        records={loading ? [] : projects}
        filterOverlay={
          <QueryFilterOverlay open={showFilterOverlay} onClose={() => setShowFilterOverlay(false)} module="projects" />
        }
        renderRow={(project) => {
          const formattedValue = formatProjectValue(project.project_value)
          const startedText = project.start_date
            ? new Date(project.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : null
          const statusKey = (project.status in STATUS_CONFIG ? project.status : 'active') as StatusKey
          const statusLabel = STATUS_CONFIG[statusKey].label
          const tone = getStatusTone(project.status)
          const statusClasses = getStatusClasses(tone)

          return (
            <ModuleRowCard
              key={project.id}
              title={project.name || 'Untitled project'}
              subtitle={
                <div className="flex flex-col gap-0.5">
                  <div className="font-bold">{project.project_code || 'No code'}</div>
                  <div>{project.client_name || 'No client'}</div>
                </div>
              }
              tertiary={
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    {startedText && <span>Started {startedText}</span>}
                  </div>
                </div>
              }
              amount={formattedValue}
              statusLabel={statusLabel}
              statusClassName={statusClasses}
              onClick={() => navigate(`/projects/${project.id}`)}
              onActionClick={() => setActiveProject(project)}
            />
          )
        }}
        emptyState={
          <div className="rounded-[var(--bd-overlay-radius)] border border-dashed border-border bg-card p-16 text-center shadow-inner">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[var(--bd-radius-lg)] bg-[hsl(var(--bd-surface-muted))] text-[hsl(var(--bd-text-muted))]">
              <FolderOpen className="h-7 w-7" />
            </div>
            <div className="text-base font-bold text-[hsl(var(--bd-text))]">
              {hasActiveFilters ? 'No projects found' : 'No projects yet'}
            </div>
            <div className="mt-1 text-sm text-[hsl(var(--bd-text-muted))]">
              {hasActiveFilters ? 'Try a different search or filter.' : 'Create your first project to start organizing activity.'}
            </div>
          </div>
        }
      >
        {loading && (
           <div className="grid gap-3">
              {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
           </div>
        )}
      </ModuleShell>

      <MobileFab onClick={() => navigate('/projects/new')} ariaLabel="Create project" />
      <ConfirmActionDialog
        open={Boolean(projectToDelete)}
        onOpenChange={(open: boolean) => {
          if (!open) setProjectToDelete(null)
        }}
        title="Delete this project?"
        description="Delete this project permanently? This cannot be undone."
        confirmLabel="Delete Project"
        onConfirm={() => {
          if (projectToDelete) void handleDelete(projectToDelete)
        }}
        loading={isDeleting}
      />
      <InvoiceListActionSheet
        open={Boolean(activeProject)}
        onOpenChange={(open) => {
          if (!open) setActiveProject(null)
        }}
        eyebrow={activeProject?.project_code ? `Project ${activeProject.project_code}` : 'Project'}
        title={activeProject?.name || 'Untitled project'}
        subtitle={
          activeProject
            ? `${activeProject.client_name || 'No client'}${activeProject.project_value ? ` · ${formatProjectValue(activeProject.project_value)}` : ''}`
            : undefined
        }
        actions={activeProject ? [
          {
            key: 'view',
            label: 'View',
            icon: <Eye className="h-6 w-6" />,
            onClick: () => navigate(`/projects/${activeProject.id}`),
          },
          {
            key: 'edit',
            label: 'Edit',
            icon: <Pencil className="h-6 w-6" />,
            onClick: () => navigate(`/projects/${activeProject.id}`),
          },
          {
            key: 'archive',
            label: 'Archive',
            icon: <Archive className="h-6 w-6" />,
            onClick: () => void handleArchive(activeProject),
          },
        ] : []}
        deleteAction={activeProject ? {
          key: 'delete',
          label: 'Delete Project',
          icon: <Trash2 className="h-6 w-6" />,
          onClick: () => setProjectToDelete(activeProject),
        } : undefined}
      />

    </>
  )
}

// ─── EXPORTED PAGE (wrapped with DocumentQueryProvider) ───
export default function Projects() {
  return (
    <Layout title="Projects" session={null} hidePageHeader>
      <DocumentQueryProvider module="projects">
        <ProjectsContent />
      </DocumentQueryProvider>
    </Layout>
  )
}
