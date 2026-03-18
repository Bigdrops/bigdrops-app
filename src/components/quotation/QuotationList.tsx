import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, Search, SlidersHorizontal } from 'lucide-react'
import { supabase } from '@/supabase'
import type { DbQuotation } from '@/domain/quotation'
import { mapDbQuotation } from '@/domain/quotation'
import { formatQuotationStatus, quotationStatusTone } from './quotationStatus'

export default function QuotationList() {
  const navigate = useNavigate()
  const [quotations, setQuotations] = useState<DbQuotation[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [sortBy, setSortBy] = useState('Newest')
  const [showSearch, setShowSearch] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    supabase.from('quotations').select('*').is('archived_at', null).order('created_at', { ascending: false }).then(({ data }) => {
      setQuotations((data || []) as DbQuotation[])
    })
  }, [])

  const filteredQuotations = useMemo(() => {
    const query = search.trim().toLowerCase()
    const next = quotations.filter((row) => {
      const quotation = mapDbQuotation(row)
      const number = String(quotation.quotation_number || '').toLowerCase()
      const clientName = String(quotation.client_name || '').toLowerCase()
      const poNumber = String(quotation.po_number || '').toLowerCase()
      const status = String(quotation.status || 'draft').toLowerCase()
      const matchesSearch =
        !query || number.includes(query) || clientName.includes(query) || poNumber.includes(query)
      const matchesStatus = statusFilter === 'All' || status === statusFilter.toLowerCase()
      return matchesSearch && matchesStatus
    })

    next.sort((a, b) => {
      if (sortBy === 'Oldest') {
        return new Date(a.created_at || a.issue_date || 0).getTime() - new Date(b.created_at || b.issue_date || 0).getTime()
      }
      if (sortBy === 'Highest Value') return Number(b.total || 0) - Number(a.total || 0)
      if (sortBy === 'Lowest Value') return Number(a.total || 0) - Number(b.total || 0)
      return new Date(b.created_at || b.issue_date || 0).getTime() - new Date(a.created_at || a.issue_date || 0).getTime()
    })

    return next
  }, [quotations, search, sortBy, statusFilter])

  const filterSelectClass = 'h-10 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-700 outline-none'
  const iconButtonClass = 'flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500'

  return (
    <div className="mx-auto max-w-6xl px-3 pb-32 pt-6 sm:px-4" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="m-0 text-[22px] font-extrabold text-slate-900">Quotations</h2>
          <p className="mt-1 text-[13px] text-slate-400">{quotations.length} quotation{quotations.length !== 1 ? 's' : ''} total</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSearch((prev) => !prev)} className={iconButtonClass} aria-label="Toggle search"><Search size={16} /></button>
          <button onClick={() => setShowFilters((prev) => !prev)} className={iconButtonClass} aria-label="Toggle filters"><SlidersHorizontal size={16} /></button>
          <button onClick={() => navigate('/quotations/new')} className="h-10 rounded-xl bg-slate-900 px-4 text-[13px] font-bold text-white">+ New Quotation</button>
        </div>
      </div>

      {showSearch && (
        <div className="mb-4">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search quotations, clients, or P.O. numbers..." className="h-11 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 outline-none" />
        </div>
      )}

      {showFilters && (
        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase text-zinc-400">Status</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={filterSelectClass}>
              {['All', 'Draft', 'Sent', 'Accepted', 'Rejected'].map((option) => <option key={option}>{option}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase text-zinc-400">Sort</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={filterSelectClass}>
              {['Newest', 'Oldest', 'Highest Value', 'Lowest Value'].map((option) => <option key={option}>{option}</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
        {filteredQuotations.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">No quotations yet. Create the first one when you are ready to send a quote.</div>
        ) : (
          filteredQuotations.map((row, index) => {
            const quotation = mapDbQuotation(row)
            return (
              <div
                key={quotation.id}
                onClick={() => navigate(`/quotations/${quotation.id}`)}
                className="grid cursor-pointer gap-3 border-b border-slate-100 px-4 py-4 transition-colors hover:bg-slate-50 sm:grid-cols-[48px_minmax(0,1fr)_auto] sm:gap-4 sm:px-5"
                style={{ borderBottom: index === filteredQuotations.length - 1 ? 'none' : undefined }}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                  <ClipboardList size={18} />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Quotation</span>
                    <span className="break-all text-base font-black tracking-[-0.02em] text-slate-900 sm:text-[17px]">
                      {quotation.quotation_number}
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-600">{quotation.client_name || 'No client selected'}</div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                    <span>Issue date: {quotation.issue_date || 'Not set'}</span>
                    {String(quotation.po_number || '').trim() ? <span>P.O.: {String(quotation.po_number || '').trim()}</span> : null}
                  </div>
                </div>

                <div className="flex flex-row items-start justify-between gap-3 sm:flex-col sm:items-end">
                  <div className={`rounded-full px-3 py-1 text-[11px] font-extrabold uppercase ${quotationStatusTone(quotation.status)}`}>
                    {formatQuotationStatus(quotation.status)}
                  </div>
                  <div className="text-[15px] font-black text-slate-900">₦{Number(quotation.total || 0).toLocaleString()}</div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
