import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import {
  Calendar,
  FileText,
  FolderKanban,
  Plus,
  Search,
  SlidersHorizontal,
  MoreHorizontal,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'

const STATUS_CONFIG = {
  active: {
    label: 'Active',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50',
    dotClass: 'bg-emerald-500',
  },
  completed: {
    label: 'Completed',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-50',
    dotClass: 'bg-sky-500',
  },
  on_hold: {
    label: 'On Hold',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50',
    dotClass: 'bg-amber-500',
  },
  cancelled: {
    label: 'Cancelled',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-50',
    dotClass: 'bg-rose-500',
  },
}

const STATUS_OPTIONS = [
  { label: 'All', value: 'All' },
  { label: 'Active', value: 'Active' },
  { label: 'Completed', value: 'Completed' },
  { label: 'On Hold', value: 'On Hold' },
  { label: 'Cancelled', value: 'Cancelled' },
]

const DATE_OPTIONS = [
  { label: 'All Time', value: 'All Time' },
  { label: 'This Month', value: 'This Month' },
  { label: 'Last Month', value: 'Last Month' },
  { label: 'This Year', value: 'This Year' },
]

const SORT_OPTIONS = [
  { label: 'Newest', value: 'Newest' },
  { label: 'Oldest', value: 'Oldest' },
  { label: 'Highest Value', value: 'Highest Value' },
  { label: 'Lowest Value', value: 'Lowest Value' },
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
  const [showSearch, setShowSearch] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [docCounts, setDocCounts] = useState({})

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    setLoading(true)

    const { data } = await supabase
      .from('projects')
      .select('*')
      .is('archived_at', null)
      .order('created_at', { ascending: false })

    setProjects(data || [])

    if (data?.length) {
      const ids = data.map((p) => p.id)

      const [invRes, csrRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('project_id')
          .in('project_id', ids)
          .is('archived_at', null),
        supabase.from('csrs').select('project_id').in('project_id', ids),
      ])

      const counts = {}
      ids.forEach((id) => {
        counts[id] = 0
      })

      ;(invRes.data || []).forEach((r) => {
        counts[r.project_id] = (counts[r.project_id] || 0) + 1
      })
      ;(csrRes.data || []).forEach((r) => {
        counts[r.project_id] = (counts[r.project_id] || 0) + 1
      })

      setDocCounts(counts)
    } else {
      setDocCounts({})
    }

    setLoading(false)
  }

  const clientOptions = useMemo(() => {
    return Array.from(new Set(projects.map((p) => p.client_name).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    )
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

    const list = projects.filter((project) => {
      const normalizedStatus = (project.status || '').replace('_', ' ')
      const matchSearch =
        !searchTerm ||
        project.name?.toLowerCase().includes(searchTerm) ||
        project.client_name?.toLowerCase().includes(searchTerm)

      const matchClient = clientFilter === 'All' || (project.client_name || '') === clientFilter
      const matchStatus =
        statusFilter === 'All' || normalizedStatus === statusFilter.toLowerCase()
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
    const confirmed = window.confirm('Delete this project permanently? This cannot be undone.')
    if (!confirmed) return

    await supabase.from('projects').delete().eq('id', project.id)
    await fetchProjects()
  }

  const handleArchive = async (project) => {
    await supabase
      .from('projects')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', project.id)

    await fetchProjects()
  }

  const updateProjectStatus = async (projectId, status) => {
    await supabase.from('projects').update({ status }).eq('id', projectId)
    await fetchProjects()
  }

  const hasActiveFilters =
    !!search || clientFilter !== 'All' || statusFilter !== 'All' || dateFilter !== 'All Time'

  const formatProjectValue = (value) => {
    const amount = Number(value || 0)
    if (!amount) return ''
    if (amount >= 1_000_000) return '\u20A6' + (amount / 1_000_000).toFixed(1) + 'M'
    return '\u20A6' + amount.toLocaleString()
  }

  const LoadingCard = () => (
    <Card className="rounded-3xl border">
      <CardContent className="space-y-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3 flex-1">
            <div className="flex gap-2">
              <div className="h-6 w-16 rounded-full bg-muted animate-pulse" />
              <div className="h-6 w-24 rounded-full bg-muted animate-pulse" />
            </div>
            <div className="h-7 w-3/4 rounded-lg bg-muted animate-pulse" />
            <div className="h-5 w-1/2 rounded-lg bg-muted animate-pulse" />
          </div>
          <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="h-16 rounded-2xl bg-muted animate-pulse" />
          <div className="h-16 rounded-2xl bg-muted animate-pulse" />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="h-8 w-28 rounded-lg bg-muted animate-pulse" />
          <div className="h-6 w-24 rounded-full bg-muted animate-pulse" />
        </div>
      </CardContent>
    </Card>
  )

  return (
    <Layout title="Projects">
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Projects</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {projects.length} project{projects.length !== 1 ? 's' : ''} total
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowSearch((p) => !p)}
              className="rounded-xl"
            >
              <Search className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters((p) => !p)}
              className="rounded-xl"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>

            <Button onClick={() => navigate('/projects/new')} className="rounded-xl px-4">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </div>
        </div>

        {showSearch && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects or clients..."
              className="h-11 rounded-xl pl-10"
            />
          </div>
        )}

        {showFilters && (
          <Card className="rounded-2xl border shadow-sm">
            <CardContent className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-5">
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Clients</SelectItem>
                  {clientOptions.map((client) => (
                    <SelectItem key={client} value={client}>
                      {client}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" className="h-11 rounded-xl" onClick={resetFilters}>
                <X className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <LoadingCard key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="rounded-3xl border border-dashed">
            <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-muted">
                <FolderKanban className="h-8 w-8 text-muted-foreground" />
              </div>

              <h3 className="text-lg font-semibold tracking-tight">
                {hasActiveFilters ? 'No projects match your filters' : 'No projects yet'}
              </h3>

              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                {hasActiveFilters
                  ? 'Try adjusting your search or filters.'
                  : 'Create your first project to get started.'}
              </p>

              <div className="mt-6">
                {hasActiveFilters ? (
                  <Button variant="outline" onClick={resetFilters} className="rounded-xl">
                    Reset Filters
                  </Button>
                ) : (
                  <Button onClick={() => navigate('/projects/new')} className="rounded-xl">
                    <Plus className="mr-2 h-4 w-4" />
                    New Project
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filtered.map((project) => {
              const st = STATUS_CONFIG[project.status] || STATUS_CONFIG.active
              const count = docCounts[project.id] || 0
              const formattedValue = formatProjectValue(project.project_value)

              const startedText = project.start_date
                ? new Date(project.start_date).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : null

              return (
                <Card
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="group relative cursor-pointer overflow-hidden rounded-3xl border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-sky-500 to-violet-500" />

                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className="rounded-full border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary"
                          >
                            PROJ
                          </Badge>

                          <Badge
                            variant="outline"
                            className={`rounded-full px-3 py-1 ${st.badgeClass}`}
                          >
                            {st.label}
                          </Badge>
                        </div>

                        <h3 className="line-clamp-2 text-lg font-semibold tracking-tight text-foreground">
                          {project.name}
                        </h3>

                        {project.client_name && (
                          <p className="mt-1 truncate text-sm font-medium text-muted-foreground">
                            {project.client_name}
                          </p>
                        )}
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl border bg-background/70"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent
                          align="end"
                          className="w-56 rounded-2xl"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenuItem onClick={() => navigate(`/projects/${project.id}`)}>
                            Edit
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Status</DropdownMenuLabel>

                          {[
                            { label: 'Active', value: 'active' },
                            { label: 'Completed', value: 'completed' },
                            { label: 'On Hold', value: 'on_hold' },
                            { label: 'Cancelled', value: 'cancelled' },
                          ].map((action) => (
                            <DropdownMenuItem
                              key={action.value}
                              onClick={() => updateProjectStatus(project.id, action.value)}
                              className="flex items-center justify-between"
                            >
                              <span>{action.label}</span>
                              {project.status === action.value && (
                                <span className="text-emerald-600">✓</span>
                              )}
                            </DropdownMenuItem>
                          ))}

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={() => handleArchive(project)}
                            className="text-amber-600 focus:text-amber-700"
                          >
                            Archive
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => handleDelete(project)}
                            className="text-destructive focus:text-destructive"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="flex items-center gap-3 rounded-2xl border bg-muted/40 px-3 py-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background shadow-sm">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Linked Documents</p>
                          <p className="text-sm font-semibold text-foreground">
                            {count} linked doc{count !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 rounded-2xl border bg-muted/40 px-3 py-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background shadow-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Started</p>
                          <p className="truncate text-sm font-semibold text-foreground">
                            {startedText || 'Not set'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xl font-semibold tracking-tight text-foreground">
                        {formattedValue || '—'}
                      </div>

                      <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${st.dotClass} ${
                            project.status === 'active' ? 'animate-pulse' : ''
                          }`}
                        />
                        <span className="text-sm font-medium text-muted-foreground">
                          {st.label}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}