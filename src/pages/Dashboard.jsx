import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import {
  FileText, Users, Wrench, ClipboardList,
  TrendingUp, TrendingDown, Plus, ArrowRight,
  Clock, CheckCircle, AlertCircle, XCircle
} from 'lucide-react'

const STATUS_CONFIG = {
  draft:     { label: 'Draft',     color: 'bg-slate-100 text-slate-600' },
  sent:      { label: 'Sent',      color: 'bg-blue-100 text-blue-700' },
  paid:      { label: 'Paid',      color: 'bg-emerald-100 text-emerald-700' },
  overdue:   { label: 'Overdue',   color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelled', color: 'bg-neutral-100 text-neutral-500' },
}

function StatCard({ icon: Icon, label, value, trend, trendLabel, gradient, delay }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg"
      style={{
        background: gradient,
        animationDelay: delay,
        animation: 'fadeSlideUp 0.5s ease forwards',
        opacity: 0,
      }}
    >
      {/* Background decoration */}
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 bg-white" />
      <div className="absolute -right-2 bottom-2 w-14 h-14 rounded-full opacity-10 bg-white" />

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <Icon size={18} strokeWidth={2} />
          </div>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${trend >= 0 ? 'bg-white/20' : 'bg-black/10'}`}>
              {trend >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        <div className="text-3xl font-bold tracking-tight mb-1">{value}</div>
        <div className="text-sm opacity-80 font-medium">{label}</div>
        {trendLabel && <div className="text-xs opacity-60 mt-1">{trendLabel}</div>}
      </div>
    </div>
  )
}

function RecentInvoiceRow({ invoice, onClick }) {
  const cfg = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.draft
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 px-4 py-3 hover:bg-neutral-50 cursor-pointer rounded-xl transition-colors group"
    >
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-orange-400 flex items-center justify-center shrink-0 shadow-sm">
        <FileText size={15} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-neutral-800 truncate">{invoice.invoice_number}</div>
        <div className="text-xs text-neutral-400 truncate">{invoice.client_name || 'No client'}</div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-bold text-neutral-800">
          ₦{Number(invoice.total || 0).toLocaleString()}
        </div>
        <div className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-0.5 ${cfg.color}`}>
          {cfg.label}
        </div>
      </div>
      <ArrowRight size={14} className="text-neutral-200 group-hover:text-neutral-400 transition-colors shrink-0" />
    </div>
  )
}

function QuickAction({ icon: Icon, label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-neutral-100 hover:shadow-md transition-all hover:-translate-y-0.5 group"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <span className="text-xs font-semibold text-neutral-600 group-hover:text-neutral-800 transition-colors">{label}</span>
    </button>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [counts, setCounts] = useState({ invoices: 0, clients: 0, csrs: 0, quotations: 0 })
  const [recentInvoices, setRecentInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const load = async () => {
      const [
        { count: invCount },
        { count: clientCount },
        { count: csrCount },
        { data: recent },
        { data: allInvoices },
      ] = await Promise.all([
        supabase.from('invoices').select('id', { count: 'exact', head: true }),
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('csrs').select('id', { count: 'exact', head: true }).catch(() => ({ count: 0 })),
        supabase.from('invoices').select('id, invoice_number, client_name, total, status, issue_date').order('created_at', { ascending: false }).limit(6),
        supabase.from('invoices').select('total, status'),
      ])

      setCounts({ invoices: invCount || 0, clients: clientCount || 0, csrs: csrCount || 0, quotations: 0 })
      setRecentInvoices(recent || [])

      if (allInvoices) {
        const revenue = allInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total || 0), 0)
        const pending = allInvoices.filter(i => ['sent', 'draft'].includes(i.status)).length
        setTotalRevenue(revenue)
        setPendingCount(pending)
      }
      setLoading(false)
    }
    load()
  }, [])

  const stats = [
    {
      icon: FileText,
      label: 'Total Invoices',
      value: counts.invoices,
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      trendLabel: 'All time',
      delay: '0ms',
    },
    {
      icon: TrendingUp,
      label: 'Revenue Collected',
      value: `₦${(totalRevenue / 1000).toFixed(0)}k`,
      gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
      trendLabel: 'From paid invoices',
      delay: '80ms',
    },
    {
      icon: Clock,
      label: 'Pending Invoices',
      value: pendingCount,
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      trendLabel: 'Awaiting payment',
      delay: '160ms',
    },
    {
      icon: Users,
      label: 'Active Clients',
      value: counts.clients,
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      trendLabel: 'In your database',
      delay: '240ms',
    },
  ]

  return (
    <Layout title="Dashboard">
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent Invoices */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-50">
            <h3 className="text-sm font-bold text-neutral-800">Recent Invoices</h3>
            <button
              onClick={() => navigate('/invoices')}
              className="text-xs text-violet-600 font-semibold hover:text-violet-700 flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="p-2">
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 rounded-full border-2 border-violet-200 border-t-violet-500 animate-spin" />
              </div>
            ) : recentInvoices.length === 0 ? (
              <div className="text-center py-10">
                <div className="w-12 h-12 rounded-2xl bg-neutral-50 flex items-center justify-center mx-auto mb-3">
                  <FileText size={20} className="text-neutral-300" />
                </div>
                <p className="text-sm text-neutral-400 font-medium">No invoices yet</p>
                <button
                  onClick={() => navigate('/invoices/new')}
                  className="mt-3 text-xs text-violet-600 font-semibold hover:underline"
                >
                  Create your first invoice →
                </button>
              </div>
            ) : (
              recentInvoices.map(inv => (
                <RecentInvoiceRow
                  key={inv.id}
                  invoice={inv}
                  onClick={() => navigate(`/invoices/${inv.id}`)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-4">
            <h3 className="text-sm font-bold text-neutral-800 mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <QuickAction icon={Plus} label="New Invoice" color="bg-gradient-to-br from-violet-500 to-purple-600" onClick={() => navigate('/invoices/new')} />
              <QuickAction icon={Users} label="Add Client" color="bg-gradient-to-br from-cyan-400 to-blue-500" onClick={() => navigate('/clients/new')} />
              <QuickAction icon={Wrench} label="New CSR" color="bg-gradient-to-br from-emerald-400 to-teal-500" onClick={() => navigate('/csr/new')} />
              <QuickAction icon={ClipboardList} label="Quotation" color="bg-gradient-to-br from-orange-400 to-rose-500" onClick={() => navigate('/quotations')} />
            </div>
          </div>

          {/* Invoice Status Breakdown */}
          <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-4 flex-1">
            <h3 className="text-sm font-bold text-neutral-800 mb-3">Invoice Status</h3>
            <div className="space-y-2.5">
              {[
                { label: 'Paid', icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                { label: 'Sent', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
                { label: 'Draft', icon: FileText, color: 'text-neutral-400', bg: 'bg-neutral-50' },
                { label: 'Overdue', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
              ].map(({ label, icon: Icon, color, bg }) => {
                const count = recentInvoices.filter(i => i.status === label.toLowerCase()).length
                return (
                  <div key={label} className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                      <Icon size={13} className={color} />
                    </div>
                    <span className="text-xs font-medium text-neutral-600 flex-1">{label}</span>
                    <span className="text-xs font-bold text-neutral-800">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
