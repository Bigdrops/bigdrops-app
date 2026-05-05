import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Archive, Eye, FolderKanban, FolderOpen, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { feedback } from '@/lib/feedback'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import { getStatusTone, getStatusClasses } from "@/lib/statusTheme"
import { isListCacheFresh, readListCache, writeListCache } from '@/lib/cache/listCache'

import InvoiceListActionSheet from '@/components/invoice/InvoiceListActionSheet'
import LinkedDocumentsSheet from '@/components/document/LinkedDocumentsSheet'
import MobileFab from '@/components/layout/MobileFab'
import ModuleShell from '@/components/layout/ModuleShell'
import ModuleRowCard from '@/components/layout/ModuleRowCard'
import { SkeletonRow } from '@/components/loading/AppLoadingStates'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ProjectRecord } from '@/domain/clientWorkspace'
import ConfirmActionDialog from '../components/ConfirmActionDialog'
import Layout from '../components/Layout'
import { supabase } from '../supabase'
import { cn } from '@/lib/utils'

type StatusKey = keyof typeof STATUS_CONFIG
type StatusFilterOption = 'All' | 'Active' | 'Completed' | 'On Hold' | 'Cancelled'
type DateFilterOption = 'All Time' | 'This Month' | 'Last Month' | 'This Year'
type SortOption = 'Newest' | 'Oldest' | 'Highest Value' | 'Lowest Value'

type ProjectRow = ProjectRecord & {
  client_name?: string | null
  created_at?: string | null
  archived_at?: string | null
}

type ProjectIdRow = {
  project_id?: string | null
}

const STATUS_CONFIG = {
  active: { label: 'Active' },
  completed: { label: 'Completed' },
  on_hold: { label: 'On Hold' },
  cancelled: { label: 'Cancelled' },
} as const

const PROJECTS_LIST_CACHE_KEY = 'bd:list:projects:v1:all'
const PROJECTS_LIST_CACHE_TTL_MS = 5 * 60 * 1000

function getCachedDocCounts(meta?: Record<string, unknown>) {
  const rawDocCounts = meta?.docCounts
  if (!rawDocCounts || typeof rawDocCounts !== 'object' || Array.isArray(rawDocCounts)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(rawDocCounts).map(([projectId, count]) => [projectId, Number(count) || 0]),
  ) as Record<string, number>
}

export default function Projects() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [search, setSearch] = useState<string>('')
  const [clientFilter, setClientFilter] = useState<string>('All')
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>('All')
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('All Time')
  const [sortBy, setSortBy] = useState<SortOption>('Newest')
  const [showFilters, setShowFilters] = useState<boolean>(false)
  const [docCounts, setDocCounts] = useState<Record<string, number>>({})
  const [projectToDelete, setProjectToDelete] = useState<ProjectRow | null>(null)
  const [activeProject, setActiveProject] = useState<ProjectRow | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)

  useEffect(() => {
    let mounted = true

    const cachedEntry = readListCache<ProjectRow>(PROJECTS_LIST_CACHE_KEY)
    if (cachedEntry) {
      setProjects(cachedEntry.rows)
      setDocCounts(getCachedDocCounts(cachedEntry.meta))
      setLoading(false)

      if (!isListCacheFresh(cachedEntry, PROJECTS_LIST_CACHE_TTL_MS)) {
        void fetchProjects({ background: true, isMounted: () => mounted })
      }
    } else {
      void fetchProjects({ isMounted: () => mounted })
    }

    return () => {
      mounted = false
    }
  }, [])

  const fetchProjects = async (options?: { background?: boolean; isMounted?: () => boolean }): Promise<void> => {
    if (!options?.background) {
      setLoading(true)
    }

    const { data } = await supabase
      .from('projects')
      .select('id, name, project_code, status, project_value, start_date, created_at, client_name')
      .is('archived_at', null)
      .order('start_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (options?.isMounted && !options.isMounted()) return

    const projectRows = (data || []) as ProjectRow[]

    let counts: Record<string, number> = {}
    if (projectRows.length > 0) {
      const ids = projectRows.map((project) => project.id)
      const [invRes, csrRes, quotationRes, waybillRes] = await Promise.all([
        supabase.from('invoices').select('project_id').in('project_id', ids).is('archived_at', null),
        supabase.from('csrs').select('project_id').in('project_id', ids),
        supabase.from('quotations').select('project_id').in('project_id', ids),
        supabase.from('waybills').select('project_id').in('project_id', ids),
      ])

      ids.forEach((id) => { counts[id] = 0 })
      ;((invRes.data || []) as ProjectIdRow[]).forEach((row) => { if (row.project_id) counts[row.project_id] = (counts[row.project_id] || 0) + 1 })
      ;((csrRes.data || []) as ProjectIdRow[]).forEach((row) => { if (row.project_id) counts[row.project_id] = (counts[row.project_id] || 0) + 1 })
      ;((quotationRes.data || []) as ProjectIdRow[]).forEach((row) => { if (row.project_id) counts[row.project_id] = (counts[row.project_id] || 0) + 1 })
      ;((waybillRes.data || []) as ProjectIdRow[]).forEach((row) => { if (row.project_id) counts[row.project_id] = (counts[row.project_id] || 0) + 1 })
    }

    if (options?.isMounted && !options.isMounted()) return

    setProjects(projectRows)
    setDocCounts(counts)
    writeListCache(PROJECTS_LIST_CACHE_KEY, projectRows, { docCounts: counts })
    setLoading(false)
  }

  const clientOptions = useMemo<string[]>(() => {
    return Array.from(new Set(projects.map((project) => project.client_name).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b))
  }, [projects])

  const filtered = useMemo<ProjectRow[]>(() => {
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    const currentYearStart = new Date(now.getFullYear(), 0, 1)
    const searchTerm = search.trim().toLowerCase()

    const matchesDateRange = (value?: string | null, fallback?: string | null) => {
      if (dateFilter === 'All Time') return true
      const date = new Date(value || fallback || 0)
      if (Number.isNaN(date.getTime())) return false
      if (dateFilter === 'This Month') return date >= currentMonthStart
      if (dateFilter === 'Last Month') return date >= lastMonthStart && date <= lastMonthEnd
      if (dateFilter === 'This Year') return date >= currentYearStart
      return true
    }

    const list = projects.filter((project) => {
      const normalizedStatus = String(project.status || '').replace('_', ' ')
      const matchSearch = !searchTerm
        || project.project_code?.toLowerCase().includes(searchTerm)
        || project.name?.toLowerCase().includes(searchTerm)
        || project.client_name?.toLowerCase().includes(searchTerm)
      const matchClient = clientFilter === 'All' || (project.client_name || '') === clientFilter
      const matchStatus = statusFilter === 'All' || normalizedStatus === statusFilter.toLowerCase()
      const matchDate = matchesDateRange(project.start_date, project.created_at)
      return Boolean(matchSearch && matchClient && matchStatus && matchDate)
    })

    list.sort((a, b) => {
      const aTime = new Date(a.start_date || a.created_at || 0).getTime()
      const bTime = new Date(b.start_date || b.created_at || 0).getTime()
      if (sortBy === 'Oldest') return aTime - bTime
      if (sortBy === 'Highest Value') return Number(b.project_value || 0) - Number(a.project_value || 0)
      if (sortBy === 'Lowest Value') return Number(a.project_value || 0) - Number(b.project_value || 0)
      return bTime - aTime
    })

    return list
  }, [clientFilter, dateFilter, projects, search, sortBy, statusFilter])

  const resetFilters = () => {
    setSearch('')
    setClientFilter('All')
    setStatusFilter('All')
    setDateFilter('All Time')
    setSortBy('Newest')
  }

  const handleDelete = async (project: ProjectRow): Promise<void> => {
    try {
      setIsDeleting(true)
      const { error } = await supabase.from('projects').delete().eq('id', project.id)
      if (error) throw error
      const nextProjects = projects.filter((row) => row.id !== project.id)
      const nextDocCounts = { ...docCounts }
      delete nextDocCounts[project.id]
      setProjects(nextProjects)
      setDocCounts(nextDocCounts)
      writeListCache(PROJECTS_LIST_CACHE_KEY, nextProjects, { docCounts: nextDocCounts })
      feedback.success('Project deleted')
      setProjectToDelete(null)
      setActiveProject(null)
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
      const nextProjects = projects.filter((row) => row.id !== project.id)
      const nextDocCounts = { ...docCounts }
      delete nextDocCounts[project.id]
      setProjects(nextProjects)
      setDocCounts(nextDocCounts)
      writeListCache(PROJECTS_LIST_CACHE_KEY, nextProjects, { docCounts: nextDocCounts })
      feedback.success('Project archived')
      setActiveProject(null)
    } catch (err: any) {
      feedback.error(getUserFacingMutationMessage(err, { action: 'save' }))
    } finally {
      setIsArchiving(false)
    }
  }

  const hasActiveFilters = !!search || clientFilter !== 'All' || statusFilter !== 'All' || dateFilter !== 'All Time' || sortBy !== 'Newest'
  const formatProjectValue = (value?: number | null) => {
    const amount = Number(value || 0)
    if (!amount) return '₦0'
    if (amount >= 1_000_000) return '₦' + (amount / 1_000_000).toFixed(1) + 'M'
    if (amount >= 1_000) return '₦' + (amount / 1_000).toFixed(1) + 'K'
    return '₦' + amount.toLocaleString()
  }

  const filterOptions = [
    {
      label: 'Client',
      value: clientFilter,
      options: ['All', ...clientOptions],
      onChange: setClientFilter,
    },
    {
      label: 'Status',
      value: statusFilter,
      options: ['All', 'Active', 'Completed', 'On Hold', 'Cancelled'],
      onChange: (v: string) => setStatusFilter(v as StatusFilterOption),
    },
    {
      label: 'Period',
      value: dateFilter,
      options: ['All Time', 'This Month', 'Last Month', 'This Year'],
      onChange: (v: string) => setDateFilter(v as DateFilterOption),
    },
    {
      label: 'Sort',
      value: sortBy,
      options: ['Newest', 'Oldest', 'Highest Value', 'Lowest Value'],
      onChange: (v: string) => setSortBy(v as SortOption),
    },
  ]

  return (
    <Layout title="Projects" session={null} hidePageHeader>
      <ModuleShell
        eyebrow="Projects"
        title="Projects"
        summary={`${projects.length} projects total`}
        tone="emerald"
        onPrimaryAction={() => navigate('/projects/new')}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search projects..."
        filters={filterOptions}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={resetFilters}
        records={loading ? [] : filtered}
        renderRow={(project) => {
          const count = docCounts[project.id] || 0
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
                    <span className="font-bold text-primary">{count} documents</span>
                    {startedText && <span>· Started {startedText}</span>}
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
    </Layout>
  )
}
