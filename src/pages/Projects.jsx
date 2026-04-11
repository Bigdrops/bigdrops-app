import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import ConfirmActionDialog from '../components/ConfirmActionDialog'
import Layout from '../components/Layout'
import { Archive, Eye, FolderKanban, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import MobileFab from '../components/layout/MobileFab'
import MobileListPageShell from '../components/layout/MobileListPageShell'
import InvoiceListActionSheet from '@/components/invoice/InvoiceListActionSheet'

const STATUS_CONFIG = {
  active: { label: 'Active' },
  completed: { label: 'Completed' },
  on_hold: { label: 'On Hold' },
  cancelled: { label: 'Cancelled' },
}

const ACCENT_VARIANTS = [
  {
    rail: 'bg-emerald-500',
    tile: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
    eyebrow: 'text-emerald-700',
    meta: 'text-emerald-700/80',
    chip: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
    value: 'text-emerald-700',
  },
  {
    rail: 'bg-emerald-600',
    tile: 'bg-emerald-200 text-emerald-800 ring-1 ring-emerald-300',
    eyebrow: 'text-emerald-800',
    meta: 'text-emerald-800/80',
    chip: 'border border-emerald-300 bg-emerald-100 text-emerald-800',
    value: 'text-emerald-800',
  },
  {
    rail: 'bg-green-500',
    tile: 'bg-green-100 text-green-700 ring-1 ring-green-200',
    eyebrow: 'text-green-700',
    meta: 'text-green-700/80',
    chip: 'border border-green-200 bg-green-50 text-green-700',
    value: 'text-green-700',
  },
  {
    rail: 'bg-green-600',
    tile: 'bg-green-200 text-green-800 ring-1 ring-green-300',
    eyebrow: 'text-green-800',
    meta: 'text-green-800/80',
    chip: 'border border-green-300 bg-green-100 text-green-800',
    value: 'text-green-800',
  },
  {
    rail: 'bg-emerald-700',
    tile: 'bg-emerald-200 text-emerald-900 ring-1 ring-emerald-300',
    eyebrow: 'text-emerald-900',
    meta: 'text-emerald-900/80',
    chip: 'border border-emerald-300 bg-emerald-100 text-emerald-900',
    value: 'text-emerald-900',
  },
]

export default function Projects() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [clientFilter, setClientFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [dateFilter, setDateFilter] = useState('All Time')
  const [sortBy, setSortBy] = useState('Newest')
  const [showFilters, setShowFilters] = useState(false)
  const [docCounts, setDocCounts] = useState({})
  const [projectToDelete, setProjectToDelete] = useState(null)
  const [activeProject, setActiveProject] = useState(null)

  useEffect(() => { fetchProjects() }, [])

  const fetchProjects = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('projects')
      .select('*')
      .is('archived_at', null)
      .order('created_at', { ascending: false })
    setProjects(data || [])

    if (data?.length) {
      const ids = data.map(p => p.id)
      const [invRes, csrRes, quotationRes, waybillRes] = await Promise.all([
        supabase.from('invoices').select('project_id').in('project_id', ids).is('archived_at', null),
        supabase.from('csrs').select('project_id').in('project_id', ids),
        supabase.from('quotations').select('project_id').in('project_id', ids),
        supabase.from('waybills').select('project_id').in('project_id', ids),
      ])
      const counts = {}
      ids.forEach(id => { counts[id] = 0 })
      ;(invRes.data || []).forEach(r => { counts[r.project_id] = (counts[r.project_id] || 0) + 1 })
      ;(csrRes.data || []).forEach(r => { counts[r.project_id] = (counts[r.project_id] || 0) + 1 })
      ;(quotationRes.data || []).forEach(r => { counts[r.project_id] = (counts[r.project_id] || 0) + 1 })
      ;(waybillRes.data || []).forEach(r => { counts[r.project_id] = (counts[r.project_id] || 0) + 1 })
      setDocCounts(counts)
    } else {
      setDocCounts({})
    }
    setLoading(false)
  }

  const clientOptions = useMemo(() => {
    return Array.from(new Set(projects.map(p => p.client_name).filter(Boolean))).sort((a, b) => a.localeCompare(b))
  }, [projects])

  const filtered = useMemo(() => {
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    const currentYearStart = new Date(now.getFullYear(), 0, 1)
    const searchTerm = search.trim().toLowerCase()

    const matchesDateRange = (value, fallback) => {
      if (dateFilter === 'All Time') return true
      const date = new Date(value || fallback || 0)
      if (Number.isNaN(date.getTime())) return false
      if (dateFilter === 'This Month') return date >= currentMonthStart
      if (dateFilter === 'Last Month') return date >= lastMonthStart && date <= lastMonthEnd
      if (dateFilter === 'This Year') return date >= currentYearStart
      return true
    }

    const list = projects.filter(project => {
      const normalizedStatus = (project.status || '').replace('_', ' ')
      const matchSearch = !searchTerm
        || project.project_code?.toLowerCase().includes(searchTerm)
        || project.name?.toLowerCase().includes(searchTerm)
        || project.client_name?.toLowerCase().includes(searchTerm)
      const matchClient = clientFilter === 'All' || (project.client_name || '') === clientFilter
      const matchStatus = statusFilter === 'All' || normalizedStatus === statusFilter.toLowerCase()
      const matchDate = matchesDateRange(project.start_date, project.created_at)
      return matchSearch && matchClient && matchStatus && matchDate
    })

    list.sort((a, b) => {
      if (sortBy === 'Oldest') return new Date(a.created_at || 0) - new Date(b.created_at || 0)
      if (sortBy === 'Highest Value') return Number(b.project_value || 0) - Number(a.project_value || 0)
      if (sortBy === 'Lowest Value') return Number(a.project_value || 0) - Number(b.project_value || 0)
      return new Date(b.created_at || 0) - new Date(a.created_at || 0)
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

  const handleDelete = async (project) => {
    await supabase.from('projects').delete().eq('id', project.id)
    setProjectToDelete(null)
    setActiveProject(null)
    await fetchProjects()
  }

  const handleArchive = async (project) => {
    await supabase.from('projects').update({ archived_at: new Date().toISOString() }).eq('id', project.id)
    setActiveProject(null)
    await fetchProjects()
  }

  const hasActiveFilters = !!search || clientFilter !== 'All' || statusFilter !== 'All' || dateFilter !== 'All Time' || sortBy !== 'Newest'
  const activeFilterCount = [search, clientFilter !== 'All', statusFilter !== 'All', dateFilter !== 'All Time', sortBy !== 'Newest'].filter(Boolean).length

  const formatProjectValue = (value) => {
    const amount = Number(value || 0)
    if (!amount) return '₦0'
    if (amount >= 1_000_000) return '₦' + (amount / 1_000_000).toFixed(1) + 'M'
    if (amount >= 1_000) return '₦' + (amount / 1_000).toFixed(1) + 'K'
    return '₦' + amount.toLocaleString()
  }

  return (
    <Layout title="Projects" hidePageHeader>
      <MobileListPageShell
          eyebrow="Projects"
          title="Projects"
          summary={`${projects.length} projects total`}
          tone="emerald"
          onPrimaryAction={() => navigate('/projects/new')}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search projects..."
          onFilterClick={() => setShowFilters((p) => !p)}
          filterPanel={showFilters ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Client</div>
                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger className="h-10 rounded-xl bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All</SelectItem>
                    {clientOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Status</div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-10 rounded-xl bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['All', 'Active', 'Completed', 'On Hold', 'Cancelled'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Period</div>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="h-10 rounded-xl bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['All Time', 'This Month', 'Last Month', 'This Year'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Sort</div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-10 rounded-xl bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Newest', 'Oldest', 'Highest Value', 'Lowest Value'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="h-10 rounded-xl border border-border px-4 text-xs font-bold uppercase text-muted-foreground transition hover:bg-muted/50 sm:col-span-2"
                >
                  Clear
                </button>
              ) : null}
            </div>
          ) : null}
      >
        {loading ? (
          <div className="rounded-[22px] border border-border bg-card px-5 py-16 text-center text-sm text-muted-foreground">Loading projects...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-border bg-card px-6 py-16 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <FolderKanban className="h-7 w-7" />
            </div>
            <div className="text-base font-semibold text-foreground">{hasActiveFilters ? 'No matches found' : 'No projects yet'}</div>
            <div className="mt-1 text-sm text-muted-foreground">{hasActiveFilters ? 'Try adjusting your filters' : 'Create your first project to get started'}</div>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((project, index) => {
              const accent = ACCENT_VARIANTS[index % ACCENT_VARIANTS.length]
              const count = docCounts[project.id] || 0
              const formattedValue = formatProjectValue(project.project_value)
              const startedText = project.start_date
                ? new Date(project.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : null
              const statusLabel = (STATUS_CONFIG[project.status] || STATUS_CONFIG.active).label
              const statusTone =
                project.status === 'completed'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : project.status === 'on_hold'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                    : project.status === 'cancelled'
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300'

              return (
                <div
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="relative cursor-pointer overflow-hidden rounded-[22px] border border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)]"
                >
                  <div className={`absolute inset-y-0 left-0 w-1 rounded-l-[22px] ${accent.rail}`} />
                  <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
                    <div className={`grid h-12 w-12 place-items-center rounded-2xl ${accent.tile}`}>
                      <FolderKanban className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className={`text-[11px] font-bold uppercase tracking-[0.16em] ${accent.eyebrow}`}>Project</div>
                      <div className="mt-1 text-[17px] font-bold leading-[1.22] tracking-[-0.03em] text-foreground">
                        {project.project_code ? `${project.project_code} · ` : ''}{project.name}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">{project.client_name || 'No client'}</div>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        setActiveProject(project)
                      }}
                      className="grid h-10 w-10 place-items-center rounded-[14px] border border-border bg-background text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.05)]"
                      aria-label={`Open actions for ${project.name}`}
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] leading-[1.5]">
                    <span className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-semibold ${accent.chip}`}>
                      {count} linked document{count !== 1 ? 's' : ''}
                    </span>
                    {startedText ? (
                      <span className={accent.meta}>Started {startedText}</span>
                    ) : null}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/80 pt-4">
                    <span className={`inline-flex h-7 items-center rounded-full px-2.5 text-xs font-semibold ${statusTone}`}>
                      {statusLabel}
                    </span>
                    <div className={`text-base font-extrabold tracking-[-0.03em] ${accent.value}`}>{formattedValue}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </MobileListPageShell>

      <MobileFab onClick={() => navigate('/projects/new')} ariaLabel="Create project">
        <Plus size={32} />
      </MobileFab>
      <ConfirmActionDialog
        open={Boolean(projectToDelete)}
        onOpenChange={(open) => {
          if (!open) setProjectToDelete(null)
        }}
        title="Delete this project?"
        description="Delete this project permanently? This cannot be undone."
        confirmLabel="Delete Project"
        onConfirm={() => {
          if (projectToDelete) void handleDelete(projectToDelete)
        }}
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
            onClick: () => handleArchive(activeProject),
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
