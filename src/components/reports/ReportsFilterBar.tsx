import React from 'react'
import { Calendar, Search, Users, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { DatePreset } from './reportTypes'

interface ReportsFilterBarProps {
  datePreset: DatePreset
  setDatePreset: (val: DatePreset) => void
  customStart: string
  setCustomStart: (val: string) => void
  customEnd: string
  setCustomEnd: (val: string) => void
  clientFilter: string
  setClientFilter: (val: string) => void
  search: string
  setSearch: (val: string) => void
  clients?: string[]
}

export function ReportsFilterBar({
  datePreset,
  setDatePreset,
  customStart,
  setCustomStart,
  customEnd,
  setCustomEnd,
  clientFilter,
  setClientFilter,
  search,
  setSearch,
  clients = [],
}: ReportsFilterBarProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
        <div className="relative flex-1 group">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-bd-text-muted opacity-40 group-focus-within:opacity-100 transition-opacity">
            <Search size={14} />
          </div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search report data..."
            className="h-10 rounded-xl border-[hsl(var(--bd-border)/0.6)] bg-bd-surface pl-10 pr-4 text-xs font-medium placeholder:text-bd-text-muted/50 transition-all focus:bg-bd-card-bg focus:ring-4 focus:ring-[hsl(var(--bd-button-primary-bg)/0.08)]"
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-bd-surface-muted text-bd-text-muted"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-3 xl:justify-end">
          <div className="flex flex-wrap bg-[hsl(var(--bd-surface-muted)/0.4)] rounded-xl p-1 border border-[hsl(var(--bd-border)/0.4)]">
          {(['this_month', 'last_month', 'this_quarter', 'custom'] as DatePreset[]).map((p) => (
            <button
              key={p}
              onClick={() => setDatePreset(p)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                datePreset === p 
                  ? "bg-bd-card-bg text-bd-text shadow-sm" 
                  : "text-bd-text-muted hover:text-bd-text"
              )}
            >
              {p.replace('_', ' ')}
            </button>
          ))}
        </div>
          <div className="flex min-w-[180px] items-center gap-2 rounded-xl border border-[hsl(var(--bd-border)/0.5)] bg-bd-surface px-3 py-2">
            <Users size={12} className="text-bd-text-muted" />
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="w-full cursor-pointer bg-transparent text-[10px] font-bold uppercase tracking-widest text-bd-text outline-none"
            >
              <option value="all">All Clients</option>
              {clients.map((client) => (
                <option key={client} value={client}>
                  {client}
                </option>
              ))}
            </select>
            {clientFilter !== 'all' ? (
              <button onClick={() => setClientFilter('all')} className="text-bd-text-muted transition-colors hover:text-bd-text">
                <X size={10} />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {datePreset === 'custom' ? (
        <div className="flex flex-wrap items-center gap-3 animate-in slide-in-from-top-1 duration-300">
          {datePreset === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-bd-border bg-bd-surface px-3 py-2">
              <Calendar size={12} className="text-bd-text-muted" />
              <div className="flex items-center gap-1">
                <input 
                  type="date" 
                  value={customStart} 
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="bg-transparent text-[10px] font-bold text-bd-text outline-none"
                />
                <span className="text-[10px] font-black text-bd-text-muted">TO</span>
                <input 
                  type="date" 
                  value={customEnd} 
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="bg-transparent text-[10px] font-bold text-bd-text outline-none"
                />
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
