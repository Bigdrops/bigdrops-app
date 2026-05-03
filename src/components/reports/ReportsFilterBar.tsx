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
  clients?: string[] // Optional list of clients for a dropdown if we want to expand later
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
}: ReportsFilterBarProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Primary Filters Row */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 group">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--bd-text-muted))] opacity-40 group-focus-within:opacity-100 transition-opacity">
            <Search size={14} />
          </div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search report data..."
            className="h-10 pl-10 pr-4 rounded-xl border-[hsl(var(--bd-border)/0.6)] bg-[hsl(var(--bd-surface-muted)/0.3)] text-xs font-medium placeholder:text-[hsl(var(--bd-text-muted))]/50 transition-all focus:bg-white focus:ring-4 focus:ring-[hsl(var(--bd-button-primary-bg)/0.04)]"
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[hsl(var(--bd-surface-muted))] text-[hsl(var(--bd-text-muted))]"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Date Preset Selection */}
        <div className="flex bg-[hsl(var(--bd-surface-muted)/0.4)] rounded-xl p-1 border border-[hsl(var(--bd-border)/0.4)]">
          {(['this_month', 'last_month', 'this_quarter', 'custom'] as DatePreset[]).map((p) => (
            <button
              key={p}
              onClick={() => setDatePreset(p)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                datePreset === p 
                  ? "bg-white text-[hsl(var(--bd-text))] shadow-sm" 
                  : "text-[hsl(var(--bd-text-muted))] hover:text-[hsl(var(--bd-text))]"
              )}
            >
              {p.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Secondary/Custom Filters Row */}
      {(datePreset === 'custom' || clientFilter !== 'all') && (
        <div className="flex flex-wrap items-center gap-3 animate-in slide-in-from-top-1 duration-300">
          {datePreset === 'custom' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-blue-100 bg-blue-50/40">
              <Calendar size={12} className="text-blue-600" />
              <div className="flex items-center gap-1">
                <input 
                  type="date" 
                  value={customStart} 
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="bg-transparent text-[10px] font-bold text-blue-700 outline-none"
                />
                <span className="text-[10px] text-blue-300 font-black">TO</span>
                <input 
                  type="date" 
                  value={customEnd} 
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="bg-transparent text-[10px] font-bold text-blue-700 outline-none"
                />
              </div>
            </div>
          )}

          {/* Client Filter (Simple Version for Shell Rebuild) */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[hsl(var(--bd-border)/0.5)] bg-[hsl(var(--bd-surface-muted)/0.3)]">
            <Users size={12} className="text-[hsl(var(--bd-text-muted))]" />
            <select 
              value={clientFilter} 
              onChange={(e) => setClientFilter(e.target.value)}
              className="bg-transparent text-[10px] font-bold text-[hsl(var(--bd-text))] outline-none appearance-none cursor-pointer"
            >
              <option value="all">All Clients</option>
              {/* Clients will be populated by internals, shell just provides the container for now or we keep it simple */}
            </select>
            {clientFilter !== 'all' && (
              <button onClick={() => setClientFilter('all')} className="ml-1 text-red-500 hover:text-red-600">
                <X size={10} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
