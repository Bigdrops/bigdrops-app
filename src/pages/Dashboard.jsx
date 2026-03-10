import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import {
  FileText, Users, Wrench, ClipboardList,
  TrendingUp, TrendingDown, Plus, ArrowRight,
  Clock, CheckCircle, AlertCircle
} from 'lucide-react'

const STATUS_CONFIG = {
  paid:      { label: 'Paid',      bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-100' },
  sent:      { label: 'Sent',      bg: 'bg-blue-50',     text: 'text-blue-700',    border: 'border-blue-100' },
  overdue:   { label: 'Overdue',   bg: 'bg-rose-50',     text: 'text-rose-700',    border: 'border-rose-100' },
  draft:     { label: 'Draft',     bg: 'bg-slate-50',    text: 'text-slate-600',   border: 'border-slate-200' },
}

function StatCard({ icon: Icon, label, value, trend, trendLabel, delay }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:border-slate-300 transition-all group">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition-colors">
          <Icon size={20} strokeWidth={2} />
        </div>
        {trend && (
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
      <div className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wider">{label}</div>
    </div>
  )
}

function RecentInvoiceRow({ invoice, onClick }) {
  const cfg = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.draft
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 px-4 py-4 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors group"
    >
      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-white group-hover:shadow-sm transition-all">
        <FileText size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-slate-900 truncate">{invoice.invoice_number}</div>
        <div className="text-xs text-slate-500 truncate">{invoice.client_name || 'Walking Client'}</div>
      </div>
      <div className="text-right shrink-0 mr-2">
        <div className="text-sm font-bold text-slate-900">₦{Number(invoice.total || 0).toLocaleString()}</div>
        <div className={`text-[10px] font-bold px-2 py-0.5 rounded border ${cfg.bg} ${cfg.text} ${cfg.border} mt-1 inline-block`}>
          {cfg.label}
        </div>
      </div>
      <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
    </div>
  )
}

export default function Dashboard({ session }) {
  const navigate = useNavigate()
  const [data, setData] = useState({ invoices: 0, revenue: 0, pending: 0, clients: 0 })
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboard() {
      const [inv, cl, rec] = await Promise.all([
        supabase.from('invoices').select('total, status'),
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('invoices').select('*').order('created_at', { ascending: false }).limit(5)
      ])

      const paidRev = (inv.data || []).filter(i => i.status === 'paid').reduce((acc, curr) => acc + Number(curr.total || 0), 0)
      const pending = (inv.data || []).filter(i => ['sent', 'draft'].includes(i.status)).length

      setData({
        invoices: inv.data?.length || 0,
        revenue: paidRev,
        pending: pending,
        clients: cl.count || 0
      })
      setRecent(rec.data || [])
      setLoading(false)
    }
    fetchDashboard()
  }, [])

  return (
    <Layout title="Overview" session={session}>
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={FileText} label="Total Invoices" value={data.invoices} trend={12} />
        <StatCard icon={TrendingUp} label="Revenue" value={`₦${(data.revenue/1000).toFixed(1)}k`} trend={8} />
        <StatCard icon={Clock} label="Awaiting Payment" value={data.pending} />
        <StatCard icon={Users} label="Total Clients" value={data.clients} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main List */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Recent Activity</h3>
            <button onClick={() => navigate('/invoices')} className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors">View All</button>
          </div>
          <div>
            {loading ? (
              <div className="p-10 text-center text-slate-400 text-sm animate-pulse">Loading records...</div>
            ) : recent.map(inv => (
              <RecentInvoiceRow key={inv.id} invoice={inv} onClick={() => navigate(`/invoices/${inv.id}`)} />
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-xl p-6 text-white shadow-lg">
            <h3 className="text-sm font-bold mb-4 opacity-90">Quick Create</h3>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => navigate('/invoices/new')}
                className="flex flex-col items-center gap-2 p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <Plus size={20} />
                <span className="text-[11px] font-medium">Invoice</span>
              </button>
              <button 
                onClick={() => navigate('/clients/new')}
                className="flex flex-col items-center gap-2 p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <Users size={20} />
                <span className="text-[11px] font-medium">Client</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">System Health</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Database Connection</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Vercel Deployment</span>
                <span className="text-emerald-600 font-bold">Stable</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
