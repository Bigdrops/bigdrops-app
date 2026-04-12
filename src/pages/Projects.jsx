import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import ConfirmActionDialog from '../components/ConfirmActionDialog'
import Layout from '../components/Layout'
import { Archive, Eye, FolderKanban, Pencil, Plus, Trash2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import ListActionSheet from '../components/layout/ListActionSheet'
import MobileFab from '../components/layout/MobileFab'
import MobileListPageShell from '../components/layout/MobileListPageShell'
import { EmptyState } from '@/components/layout/EmptyState'

const STATUS_CONFIG = {
  active: { label: 'Active' },
  completed: { label: 'Completed' },
  on_hold: { label: 'On Hold' },
  cancelled: { label: 'Cancelled' },
}

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
          <EmptyState
            icon={<FolderKanban className="h-6 w-6 text-muted-foreground" />}
            title={hasActiveFilters ? 'No results found' : 'No projects yet'}
            description={hasActiveFilters ? 'Try adjusting your filters.' : 'Create your first project to get started.'}
            actionLabel={hasActiveFilters ? 'Clear filters' : 'Create Project'}
            onAction={hasActiveFilters ? resetFilters : () => navigate('/projects/new')}
          />
        ) : (
          <div className="grid gap-3">
            {filtered.map(project => {
              const count = docCounts[project.id] || 0
              const formattedValue = formatProjectValue(project.project_value)
              const startedText = project.start_date
                ? new Date(project.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : null

              return (
                <div
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="relative cursor-pointer rounded-[22px] border border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)]"
                >
                  <div className="absolute inset-y-0 left-0 w-1 rounded-l-[22px] bg-emerald-500" />
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex h-7 items-center rounded-full bg-emerald-100 px-2.5 text-xs font-semibold text-emerald-700">
                      {(STATUS_CONFIG[project.status] || STATUS_CONFIG.active).label}
                    </span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        setActiveProject(project)
                      }}
                      className="grid h-10 w-10 place-items-center rounded-[14px] border border-border bg-background text-[20px] leading-none text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.05)]"
                      aria-label={`Open actions for ${project.name}`}
                    >
                      ⋯
                    </button>
                  </div>
                  <div className="mt-3 text-lg font-bold leading-[1.18] tracking-[-0.03em] text-foreground">{project.name}</div>
                  {project.project_code ? (
                    <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{project.project_code}</div>
                  ) : null}
                  <div className="mt-1 text-sm text-muted-foreground">{project.client_name || 'No client'}</div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] leading-[1.45] text-muted-foreground">
                    <span>{count} doc{count !== 1 ? 's' : ''}</span>
                    {startedText ? (
                      <>
                        <span>•</span>
                        <span>{startedText}</span>
                      </>
                    ) : null}
                  </div>
                  <div className="mt-[14px] flex items-center justify-between gap-3 border-t border-border pt-[14px]">
                    <span className="inline-flex h-7 items-center rounded-full border border-border bg-muted px-2.5 text-xs font-semibold text-muted-foreground">
                      Open project
                    </span>
                    <div className="text-base font-extrabold tracking-[-0.03em] text-foreground">{formattedValue}</div>
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
      <ListActionSheet
        open={Boolean(activeProject)}
        onOpenChange={(open) => {
          if (!open) setActiveProject(null)
        }}
        eyebrow={activeProject ? `Project ${activeProject.name}` : 'Project'}
        title={activeProject?.client_name || 'No client'}
        amount={activeProject ? formatProjectValue(activeProject.project_value) : null}
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
          label: 'Delete Project',
          icon: <Trash2 className="h-6 w-6" />,
          onClick: () => setProjectToDelete(activeProject),
        } : undefined}
      />
    </Layout>
  )
}
