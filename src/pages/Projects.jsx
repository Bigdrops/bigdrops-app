import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { Calendar, FileText, FolderKanban, Plus, Search, SlidersHorizontal, MoreVertical, ArrowUpDown, X, ChevronDown, Briefcase, Building2 } from 'lucide-react'

const STATUS_CONFIG = {
 active:    { label: 'Active',    bg: 'bg-emerald-50', color: 'text-emerald-600', border: 'border-emerald-100', dot: 'bg-emerald-500' },
 completed: { label: 'Completed', bg: 'bg-sky-50', color: 'text-sky-600', border: 'border-sky-100', dot: 'bg-sky-500' },
 on_hold:   { label: 'On Hold',   bg: 'bg-amber-50', color: 'text-amber-600', border: 'border-amber-100', dot: 'bg-amber-500' },
 cancelled: { label: 'Cancelled', bg: 'bg-rose-50', color: 'text-rose-600', border: 'border-rose-100', dot: 'bg-rose-500' },
}

const STATUS_OPTIONS = [
 { value: 'active', label: 'Active' },
 { value: 'completed', label: 'Completed' },
 { value: 'on_hold', label: 'On Hold' },
 { value: 'cancelled', label: 'Cancelled' },
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
 const [openMenuId, setOpenMenuId] = useState(null)
 const [docCounts, setDocCounts] = useState({})
 const [activeTab, setActiveTab] = useState('all')

 useEffect(() => { fetchProjects() }, [])

 useEffect(() => {
   const handleOutsideClick = (e) => {
     if (!e.target.closest('.menu-container')) setOpenMenuId(null)
   }
   document.addEventListener('mousedown', handleOutsideClick)
   return () => document.removeEventListener('mousedown', handleOutsideClick)
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

   let list = projects.filter(project => {
     const normalizedStatus = (project.status || '').replace('_', ' ')
     const matchSearch = !searchTerm
       || project.name?.toLowerCase().includes(searchTerm)
       || project.client_name?.toLowerCase().includes(searchTerm)
     const matchClient = clientFilter === 'All' || (project.client_name || '') === clientFilter
     const matchStatus = statusFilter === 'All' || normalizedStatus === statusFilter.toLowerCase()
     const matchDate = matchesDateRange(project.start_date, project.created_at)
     const matchTab = activeTab === 'all' || project.status === activeTab
     return matchSearch && matchClient && matchStatus && matchDate && matchTab
   })

   list.sort((a, b) => {
     if (sortBy === 'Oldest') return new Date(a.created_at || 0) - new Date(b.created_at || 0)
     if (sortBy === 'Highest Value') return Number(b.project_value || 0) - Number(a.project_value || 0)
     if (sortBy === 'Lowest Value') return Number(a.project_value || 0) - Number(b.project_value || 0)
     return new Date(b.created_at || 0) - new Date(a.created_at || 0)
   })

   return list
 }, [clientFilter, dateFilter, projects, search, sortBy, statusFilter, activeTab])

 const resetFilters = () => {
   setSearch('')
   setClientFilter('All')
   setStatusFilter('All')
   setDateFilter('All Time')
   setSortBy('Newest')
   setActiveTab('all')
 }

 const handleDelete = async (project) => {
   const confirmed = window.confirm('Delete this project permanently? This cannot be undone.')
   if (!confirmed) return
   await supabase.from('projects').delete().eq('id', project.id)
   setOpenMenuId(null)
   await fetchProjects()
 }

 const handleArchive = async (project) => {
   await supabase.from('projects').update({ archived_at: new Date().toISOString() }).eq('id', project.id)
   setOpenMenuId(null)
   await fetchProjects()
 }

 const handleStatusUpdate = async (projectId, newStatus) => {
   await supabase.from('projects').update({ status: newStatus }).eq('id', projectId)
   setOpenMenuId(null)
   await fetchProjects()
 }

 const hasActiveFilters = !!search || clientFilter !== 'All' || statusFilter !== 'All' || dateFilter !== 'All Time' || activeTab !== 'all'

 const formatProjectValue = (value) => {
   const amount = Number(value || 0)
   if (!amount) return '—'
   if (amount >= 1_000_000) return '₦' + (amount / 1_000_000).toFixed(1) + 'M'
   return '₦' + amount.toLocaleString()
 }

 const formatDate = (dateStr) => {
   if (!dateStr) return null
   const date = new Date(dateStr)
   return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
 }

 const getStatusCount = (status) => {
   return projects.filter(p => p.status === status).length
 }

 return (
   <Layout title="Projects">
     <div className="min-h-screen bg-gray-50/50">
       {/* Sticky Header */}
       <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/80">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex items-center justify-between h-16 gap-4">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200">
                 <Briefcase className="w-5 h-5 text-white" />
               </div>
               <div>
                 <h1 className="text-xl font-bold text-gray-900 tracking-tight">Projects</h1>
                 <p className="text-xs text-gray-500 font-medium">{projects.length} total</p>
               </div>
             </div>
             
             <button
               onClick={() => navigate('/projects/new')}
               className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-all active:scale-95 shadow-lg shadow-gray-900/20"
             >
               <Plus className="w-4 h-4" />
               <span className="hidden sm:inline">New Project</span>
               <span className="sm:hidden">New</span>
             </button>
           </div>

           {/* Filter Tabs */}
           <div className="flex items-center gap-1 py-3 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
             {[
               { id: 'all', label: 'All', count: projects.length },
               { id: 'active', label: 'Active', count: getStatusCount('active') },
               { id: 'completed', label: 'Completed', count: getStatusCount('completed') },
               { id: 'on_hold', label: 'On Hold', count: getStatusCount('on_hold') },
             ].map(tab => (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id)}
                 className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                   activeTab === tab.id
                     ? 'bg-gray-900 text-white shadow-md'
                     : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                 }`}
               >
                 {tab.label}
                 <span className={`text-xs px-2 py-0.5 rounded-full ${
                   activeTab === tab.id ? 'bg-white/20' : 'bg-white'
                 }`}>
                   {tab.count}
                 </span>
               </button>
             ))}
           </div>
         </div>
       </div>

       {/* Search & Filters Bar */}
       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
         <div className="flex flex-col sm:flex-row gap-3">
           <div className="relative flex-1">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
             <input
               value={search}
               onChange={e => setSearch(e.target.value)}
               placeholder="Search projects..."
               className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all"
             />
             {search && (
               <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                 <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
               </button>
             )}
           </div>
           
           <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
             <select 
               value={clientFilter} 
               onChange={e => setClientFilter(e.target.value)}
               className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900/10 min-w-[120px]"
             >
               <option value="All">All Clients</option>
               {clientOptions.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
             
             <select 
               value={sortBy} 
               onChange={e => setSortBy(e.target.value)}
               className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
             >
               <option>Newest</option>
               <option>Oldest</option>
               <option>Highest Value</option>
               <option>Lowest Value</option>
             </select>

             {hasActiveFilters && (
               <button 
                 onClick={resetFilters}
                 className="px-3 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap"
               >
                 Clear
               </button>
             )}
           </div>
         </div>
       </div>

       {/* Content */}
       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
         {loading ? (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {[1,2,3].map(i => (
               <div key={i} className="bg-white rounded-2xl p-6 border border-gray-200 animate-pulse">
                 <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                 <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                 <div className="h-4 bg-gray-200 rounded w-1/2"></div>
               </div>
             ))}
           </div>
         ) : filtered.length === 0 ? (
           <div className="text-center py-20">
             <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
               <FolderKanban className="w-10 h-10 text-gray-400" />
             </div>
             <h3 className="text-lg font-semibold text-gray-900 mb-1">
               {hasActiveFilters ? 'No matches found' : 'No projects yet'}
             </h3>
             <p className="text-gray-500 mb-6">
               {hasActiveFilters ? 'Try adjusting your filters' : 'Create your first project to get started'}
             </p>
             {!hasActiveFilters && (
               <button
                 onClick={() => navigate('/projects/new')}
                 className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
               >
                 <Plus className="w-4 h-4" />
                 Create Project
               </button>
             )}
           </div>
         ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {filtered.map(project => {
               const st = STATUS_CONFIG[project.status] || STATUS_CONFIG.active
               const count = docCounts[project.id] || 0
               
               return (
                 <div
                   key={project.id}
                   onClick={() => navigate(`/projects/${project.id}`)}
                   className="group bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-xl hover:shadow-gray-900/5 hover:border-gray-300 transition-all duration-300 cursor-pointer relative overflow-hidden"
                 >
                   {/* Status Indicator Line */}
                   <div className={`absolute top-0 left-0 right-0 h-1 ${st.dot}`} />
                   
                   <div className="flex items-start justify-between mb-4">
                     <div className="flex items-center gap-2">
                       <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${st.bg} ${st.color} border ${st.border}`}>
                         {st.label}
                       </span>
                     </div>
                     
                     <div className="menu-container relative" onClick={e => e.stopPropagation()}>
                       <button
                         onClick={() => setOpenMenuId(openMenuId === project.id ? null : project.id)}
                         className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                       >
                         <MoreVertical className="w-4 h-4 text-gray-400" />
                       </button>
                       
                       {openMenuId === project.id && (
                         <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-2xl border border-gray-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                           <button
                             onClick={() => navigate(`/projects/${project.id}`)}
                             className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 font-medium"
                           >
                             Edit Project
                           </button>
                           <div className="h-px bg-gray-100 my-1" />
                           <div className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                             Set Status
                           </div>
                           {STATUS_OPTIONS.map(opt => (
                             <button
                               key={opt.value}
                               onClick={() => handleStatusUpdate(project.id, opt.value)}
                               className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between ${
                                 project.status === opt.value 
                                   ? 'bg-gray-50 text-gray-900 font-medium' 
                                   : 'text-gray-600 hover:bg-gray-50'
                               }`}
                             >
                               {opt.label}
                               {project.status === opt.value && (
                                 <span className="w-1.5 h-1.5 rounded-full bg-gray-900" />
                               )}
                             </button>
                           ))}
                           <div className="h-px bg-gray-100 my-1" />
                           <button
                             onClick={() => handleArchive(project)}
                             className="w-full px-4 py-2 text-left text-sm text-amber-600 hover:bg-amber-50 font-medium"
                           >
                             Archive
                           </button>
                           <button
                             onClick={() => handleDelete(project)}
                             className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 font-medium"
                           >
                             Delete
                           </button>
                         </div>
                       )}
                     </div>
                   </div>

                   <h3 className="font-bold text-gray-900 text-lg mb-1 line-clamp-1 group-hover:text-gray-700 transition-colors">
                     {project.name}
                   </h3>
                   
                   {project.client_name && (
                     <div className="flex items-center gap-1.5 text-gray-500 text-sm mb-4">
                       <Building2 className="w-3.5 h-3.5" />
                       <span className="line-clamp-1">{project.client_name}</span>
                     </div>
                   )}

                   <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                     {count > 0 && (
                       <div className="flex items-center gap-1.5">
                         <FileText className="w-3.5 h-3.5" />
                         <span>{count} docs</span>
                       </div>
                     )}
                     {project.start_date && (
                       <div className="flex items-center gap-1.5">
                         <Calendar className="w-3.5 h-3.5" />
                         <span>{formatDate(project.start_date)}</span>
                       </div>
                     )}
                   </div>

                   <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                     <span className="text-2xl font-bold text-gray-900 tracking-tight">
                       {formatProjectValue(project.project_value)}
                     </span>
                     <div className={`w-2 h-2 rounded-full ${st.dot} ${project.status === 'active' ? 'animate-pulse' : ''}`} />
                   </div>
                 </div>
               )
             })}
           </div>
         )}
       </div>
     </div>
   </Layout>
 )
}
