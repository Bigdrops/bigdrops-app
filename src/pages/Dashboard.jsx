import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Layout from '../components/Layout'
import { FileText, Wrench, ClipboardList, Plus } from 'lucide-react'

const DOC_CONFIG = {
  Invoice:   { icon: FileText,      color: 'text-blue-600',   bg: 'bg-blue-50',   prefix: 'INV', path: 'invoices' },
  CSR:       { icon: Wrench,        color: 'text-amber-600',  bg: 'bg-amber-50',  prefix: 'CSR', path: 'csr' },
  Quotation: { icon: ClipboardList, color: 'text-purple-600', bg: 'bg-purple-50', prefix: 'QUO', path: 'quotations' },
}

export default function Dashboard({ session }) {
  const navigate = useNavigate()
  const [playground, setPlayground] = useState([])
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({ invoices: 0, csrs: 0, revenue: 0 })

  useEffect(() => {
    async function load() {
      // Fetch all three tables simultaneously, gracefully handle missing tables
      const [inv, csr, quot] = await Promise.all([
        supabase.from('invoices').select('id, invoice_number, client_name, total, status, created_at').order('created_at', { ascending: false }).limit(6),
        supabase.from('csrs').select('id, csr_number, client_name, status, created_at').order('created_at', { ascending: false }).limit(6).catch(() => ({ data: [] })),
        supabase.from('quotations').select('id, invoice_number, client_name, total, status, created_at').order('created_at', { ascending: false }).limit(6).catch(() => ({ data: [] })),
      ])

      // Combine, tag type, sort by date, take top 6
      const combined = [
        ...(inv.data || []).map(d => ({ ...d, _type: 'Invoice',   displayId: d.invoice_number })),
        ...(csr.data || []).map(d => ({ ...d, _type: 'CSR',       displayId: d.csr_number,     total: null })),
        ...(quot.data || []).map(d => ({ ...d, _type: 'Quotation', displayId: d.invoice_number })),
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6)

      setPlayground(combined)

      // Metrics
      const { count: invCount } = await supabase.from('invoices').select('id', { count: 'exact', head: true })
      const { count: csrCount } = await supabase.from('csrs').select('id', { count: 'exact', head: true }).catch(() => ({ count: 0 }))
      const { data: paid } = await supabase.from('invoices').select('total').eq('status', 'paid')
      const revenue = (paid || []).reduce((s, i) => s + Number(i.total || 0), 0)

      setMetrics({ invoices: invCount || 0, csrs: csrCount || 0, revenue })
      setLoading(false)
    }
    load()
  }, [])

  return (
    <Layout title="Overview" session={session}>
      {/* Metric strip */}
      <div className="flex items-center gap-6 mb-8 px-2 overflow-x-auto border-b border-slate-200 pb-4">
        <div className="shrink-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Invoices</span>
          <span className="text-lg font-bold">{metrics.invoices}</span>
        </div>
        <div className="shrink-0 text-slate-200">|</div>
        <div className="shrink-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">CSRs</span>
          <span className="text-lg font-bold">{metrics.csrs}</span>
        </div>
        <div className="shrink-0 text-slate-200">|</div>
        <div className="shrink-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Revenue</span>
          <span className="text-lg font-bold text-emerald-600">₦{(metrics.revenue / 1000000).toFixed(1)}M</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Invoice', icon: Plus,         path: '/invoices/new',    color: 'bg-slate-900' },
          { label: 'CSR',     icon: Wrench,        path: '/csr/new',         color: 'bg-slate-800' },
          { label: 'Quote',   icon: ClipboardList, path: '/quotations/new',  color: 'bg-slate-700' },
        ].map(btn => (
          <button key={btn.label} onClick={() => navigate(btn.path)}
            className={`${btn.color} text-white p-4 rounded-xl flex flex-col items-center gap-2 shadow-sm active:scale-95 transition-all hover:opacity-90`}>
            <btn.icon size={20} />
            <span className="text-[10px] font-bold uppercase">{btn.label}</span>
          </button>
        ))}
      </div>

      {/* The Playground */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Recent Activity</h3>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-10 text-center text-slate-400 text-xs animate-pulse font-bold">SYNCING DATA...</div>
          ) : playground.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs font-bold">NO ACTIVITY YET</div>
          ) : playground.map(doc => {
            const conf = DOC_CONFIG[doc._type]
            return (
              <div key={`${doc._type}-${doc.id}`}
                onClick={() => navigate(`/${conf.path}/${doc.id}`)}
                className="flex items-center gap-4 px-4 py-4 hover:bg-slate-50 cursor-pointer group">
                <div className={`w-10 h-10 rounded-lg ${conf.bg} ${conf.color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                  <conf.icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400">{conf.prefix}</span>
                    <span className="text-sm font-bold text-slate-900 truncate">{doc.displayId}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate font-medium">{doc.client_name || 'Walking Client'}</div>
                </div>
                <div className="text-right shrink-0">
                  {doc.total != null
                    ? <div className="text-sm font-black text-slate-900">₦{Number(doc.total).toLocaleString()}</div>
                    : <div className="text-xs font-bold text-slate-400 uppercase">{doc.status || '—'}</div>
                  }
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Layout>
  )
}
