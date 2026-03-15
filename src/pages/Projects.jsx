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
  MoreVertical,
  Check,
  X,
} from 'lucide-react'

// shadcn/ui components
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'
import { Card, CardContent, CardFooter, CardHeader } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Separator } from '../components/ui/separator'

const STATUS_CONFIG = {
  active:    { label: 'Active',    bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-600' },
  completed: { label: 'Completed', bg: 'bg-blue-100',  text: 'text-blue-700',  dot: 'bg-blue-600'  },
  on_hold:   { label: 'On Hold',   bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-600' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-100',   text: 'text-red-700',   dot: 'bg-red-600'   },
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
  const [showSearch, setShowSearch] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [docCounts, setDocCounts] = useState({})

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
      const [invRes, csrRes] = await Promise.all([
        supabase.from('invoices').select('project_id').in('project_id', ids).is('archived_at', null),
        supabase.from('csrs').select('project_id').in('project_id', ids),
      ])
      const counts = {}
      ids.forEach(id => { counts[id] = 0 })
      ;(invRes.data || []).forEach(r => { counts[r.project_id] = (counts[r.project_id] || 0) + 1 })
      ;(csrRes.data || []).forEach(r => { counts[r.project_id] = (counts[r.project_id] || 0) + 1 })
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
    const confirmed = window.confirm('Delete this project permanently? This cannot be undone.')
    if (!confirmed) return
    await supabase.from('projects').delete().eq('id', project.id)
    await fetchProjects()
  }

  const handleArchive = async (project) => {
    await supabase.from('projects').update({ archived_at: new Date().toISOString() }).eq('id', project.id)
    await fetchProjects()
  }

  const handleStatusChange = async (projectId, newStatus) => {
    await supabase.from('projects').update({ status: newStatus }).eq('id', projectId)
    await fetchProjects()
  }

  const hasActiveFilters = !!search || clientFilter !== 'All' || statusFilter !== 'All' || dateFilter !== 'All Time'

  const formatProjectValue = (value) => {
    const amount = Number(value || 0)
    if (!amount) return ''
    if (amount >= 1_000_000) return '₦' + (amount / 1_000_000).toFixed(1) + 'M'
    return '₦' + amount.toLocaleString()
  }

  return (
    <Layout title="Projects">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {projects.length} project{projects.length !== 1 ? 's' : ''} total
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setShowSearch(!showSearch)}>
              <Search className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)}>
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
            <Button onClick={() => navigate('/projects/new')}>
              <Plus className="h-4 w-4 mr-2" /> New Project
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects or clients..."
              className="pl-9"
            />
          </div>
        )}

        {/* Filters Panel */}
        {showFilters && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase text-muted-foreground">Client</span>
                  <Select value={clientFilter} onValueChange={setClientFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All</SelectItem>
                      {clientOptions.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase text-muted-foreground">Status</span>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['All', 'Active', 'Completed', 'On Hold', 'Cancelled'].map(o => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase text-muted-foreground">Date</span>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['All Time', 'This Month', 'Last Month', 'This Year'].map(o => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase text-muted-foreground">Sort</span>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['Newest', 'Oldest', 'Highest Value', 'Lowest Value'].map(o => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button variant="ghost" size="sm" onClick={resetFilters} className="h-9">
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Projects List */}
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading projects...</div>
        ) : filtered.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {hasActiveFilters ? 'No projects match' : 'No projects yet'}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                {hasActiveFilters ? 'Try a different search or filter' : 'Create your first project to get started'}
              </p>
              {!hasActiveFilters && (
                <Button onClick={() => navigate('/projects/new')}>
                  <Plus className="h-4 w-4 mr-2" /> New Project
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(project => {
              const st = STATUS_CONFIG[project.status] || STATUS_CONFIG.active
              const count = docCounts[project.id] || 0
              const formattedValue = formatProjectValue(project.project_value)
              const startedText = project.start_date
                ? new Date(project.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : null

              return (
                <Card key={project.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                  {/* Colored top bar */}
                  <div className="h-1 bg-gradient-to-r from-emerald-400 to-blue-500" />

                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200 text-xs">
                            PROJ
                          </Badge>
                          <Badge className={`${st.bg} ${st.text} border-0 text-xs`}>
                            {st.label}
                          </Badge>
                        </div>
                        <h2
                          className="text-xl font-bold tracking-tight hover:underline cursor-pointer"
                          onClick={() => navigate(`/projects/${project.id}`)}
                        >
                          {project.name}
                        </h2>
                        {project.client_name && (
                          <p className="text-sm font-medium text-muted-foreground mt-1 truncate">
                            {project.client_name}
                          </p>
                        )}
                      </div>

                      {/* Three-dot menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
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
                          ].map(action => (
                            <DropdownMenuItem
                              key={action.value}
                              onClick={() => handleStatusChange(project.id, action.value)}
                              className="flex items-center justify-between"
                            >
                              {action.label}
                              {project.status === action.value && <Check className="h-4 w-4 text-emerald-600" />}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleArchive(project)} className="text-amber-600">
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(project)} className="text-red-600">
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Stats row */}
                    <div className="flex flex-wrap gap-4 mt-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center">
                          <FileText className="h-3.5 w-3.5" />
                        </div>
                        <span>{count} linked doc{count !== 1 ? 's' : ''}</span>
                      </div>
                      {startedText && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center">
                            <Calendar className="h-3.5 w-3.5" />
                          </div>
                          <span>Started {startedText}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="px-5 py-4 border-t bg-muted/5 flex items-center justify-between">
                    <span className="text-2xl font-bold tracking-tight">{formattedValue}</span>
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${st.dot} ring-4 ring-${st.bg.replace('bg-', '')}/30`} />
                      <span className="text-sm font-medium">{st.label}</span>
                    </div>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}