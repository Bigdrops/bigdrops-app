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
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [invResult, quotationResult, csrResult] = await Promise.all([
          supabase
            .from('invoices')
            .select('id, invoice_number, client_name, total, status, created_at')
            .order('created_at', { ascending: false })
            .limit(8),
          supabase
            .from('quotations')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(8),
          supabase
            .from('csrs')
            .select('id, csr_number, client_name, status, created_at, date')
            .order('date', { ascending: false })
            .limit(8),
        ])

        const invData = invResult.data || []
        const quotationData = quotationResult.data || []
        const csrData = csrResult.data || []

        const tagged = [
          ...invData.map((d) => ({
            ...d,
            _type: 'Invoice',
            displayId: d.invoice_number,
            sortKey: d.created_at,
          })),
          ...quotationData.map((d) => ({
            ...d,
            _type: 'Quotation',
            displayId:
              d.quotation_number ||
              d.quote_number ||
              d.quotation_no ||
              d.quote_no ||
              d.reference ||
              `Quotation ${d.id}`,
            sortKey: d.created_at || d.date,
          })),
          ...csrData.map((d) => ({
            ...d,
            _type: 'CSR',
            displayId: d.csr_number,
            sortKey: d.created_at || d.date,
            total: null,
          })),
        ]
          .filter((d) => d.sortKey)
          .sort((a, b) => new Date(b.sortKey) - new Date(a.sortKey))
          .slice(0, 6)

        setPlayground(tagged)
      } catch (err) {
        console.error('Dashboard load error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  return (
    <Layout title="Overview" session={session}>
      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Invoice', icon: Plus,          path: '/invoices/new',   color: 'bg-slate-900' },
          { label: 'CSR',     icon: Wrench,         path: '/csr/new',        color: 'bg-slate-800' },
          { label: 'Quote',   icon: ClipboardList,  path: '/quotations/new', color: 'bg-slate-700' },
        ].map((btn) => (
          <button
            key={btn.label}
            onClick={() => navigate(btn.path)}
            className={`${btn.color} text-white p-4 rounded-xl flex flex-col items-center gap-2 shadow-sm active:scale-95 transition-all hover:opacity-90`}
          >
            <btn.icon size={20} />
            <span className="text-[10px] font-bold uppercase">{btn.label}</span>
          </button>
        ))}
      </div>

      {/* The Playground */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Recent Activity</h3>
          <div className={`w-2 h-2 rounded-full ${loading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
        </div>

        {error && (
          <div className="px-5 py-3 bg-red-50 text-red-600 text-xs font-medium border-b border-red-100">
            Error loading data: {error}
          </div>
        )}

        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-10 text-center text-slate-400 text-xs animate-pulse font-bold">
              SYNCING DATA...
            </div>
          ) : playground.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-slate-400 text-xs font-bold mb-2">NO ACTIVITY YET</p>
              <button
                onClick={() => navigate('/invoices/new')}
                className="text-xs text-blue-600 font-semibold hover:underline"
              >
                Create your first invoice →
              </button>
            </div>
          ) : playground.map((doc) => {
            const conf = DOC_CONFIG[doc._type]
            return (
              <div
                key={`${doc._type}-${doc.id}`}
                onClick={() => navigate(`/${conf.path}/${doc.id}`)}
                className="flex items-center gap-4 px-4 py-4 hover:bg-slate-50 cursor-pointer group"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/${conf.path}/${doc.id}`)}
              >
                <div className={`w-10 h-10 rounded-lg ${conf.bg} ${conf.color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                  <conf.icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400">{conf.prefix}</span>
                    <span className="text-sm font-bold text-slate-900 truncate">{doc.displayId}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate font-medium">
                    {doc.client_name || 'Walking Client'}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {doc.total != null
                    ? <div className="text-sm font-black text-slate-900">₦{Number(doc.total).toLocaleString()}</div>
                    : <div className="text-xs font-bold text-amber-600 uppercase">{doc.status || '—'}</div>
                  }
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                    {doc.sortKey ? new Date(doc.sortKey).toLocaleDateString() : '—'}
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
