import { ArrowDownLeft, Wallet, Briefcase, FileText, TrendingUp, AlertTriangle, Clock, CheckCircle, Lightbulb, FileDown, BarChart3 } from 'lucide-react'
import { ReportsMetricStrip } from './ReportsMetricStrip'

interface OverviewSectionProps {
  isActive: boolean
}

// Sample data structure - in real impl this comes from props/context
interface OverviewMetrics {
  totalExposure: string
  exposureChange: string
  activeUnits: string
  riskLevel: string
  pastDue: string
  pastDuePercent: number
  collected: string
  collectedPercent: number
  agingBuckets: {
    label: string
    amount: string
    percent: number
    status: 'healthy' | 'warning' | 'critical'
  }[]
  taxPosition: string
  highRiskReceivables: {
    client: string
    invoiceId: string
    status: 'overdue' | 'pending' | 'critical' | 'grace'
    amount: string
  }[]
}

const defaultMetrics: OverviewMetrics = {
  totalExposure: '₦42.8M',
  exposureChange: '+12.4%',
  activeUnits: '1,248',
  riskLevel: 'Low',
  pastDue: '₦8.2M',
  pastDuePercent: 19,
  collected: '₦34.6M',
  collectedPercent: 81,
  agingBuckets: [
    { label: '0-30 Days', amount: '₦24.1M', percent: 56, status: 'healthy' },
    { label: '31-60 Days', amount: '₦12.5M', percent: 29, status: 'warning' },
    { label: '61-90 Days', amount: '₦4.2M', percent: 10, status: 'critical' },
  ],
  taxPosition: '₦4.2M',
  highRiskReceivables: [
    { client: 'Zenith Tech Solutions', invoiceId: '#INV-8821', status: 'overdue', amount: '₦2,400,000' },
    { client: 'Lumina Global', invoiceId: '#INV-8845', status: 'pending', amount: '₦1,150,000' },
    { client: 'Apex Logistics Ltd', invoiceId: '#INV-8910', status: 'critical', amount: '₦4,800,000' },
    { client: 'Nordic Interior Design', invoiceId: '#INV-9002', status: 'grace', amount: '₦850,000' },
  ],
}

const statusStyles = {
  overdue: 'bg-red-50 text-red-700 border-red-100',
  pending: 'bg-stone-100 text-stone-600 border-stone-200',
  critical: 'bg-red-50 text-red-700 border-red-100',
  grace: 'bg-stone-100 text-stone-600 border-stone-200',
}

const agingStatusStyles = {
  healthy: 'bg-emerald-500',
  warning: 'bg-amber-500',
  critical: 'bg-red-500',
}

export function OverviewSection({ isActive, metrics = defaultMetrics }: OverviewSectionProps & { metrics?: OverviewMetrics }) {
  if (!isActive) return null

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Hero KPI Bento - Main Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL EXPOSURE - Hero KPI (spans 2 cols on md+) */}
        <div className="md:col-span-2 rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border)/0.5)] bg-[hsl(var(--bd-card-bg))] p-6 flex flex-col justify-between min-h-[200px]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-text-muted))] opacity-60">Total Exposure</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl lg:text-5xl font-black tracking-tight text-[hsl(var(--bd-text))] leading-none">
                {metrics.totalExposure}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                {metrics.exposureChange}
              </span>
            </div>
          </div>
          <div className="flex gap-8 border-t border-[hsl(var(--bd-border)/0.3)] pt-4 mt-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--bd-text-muted))] opacity-50">Active Units</p>
              <p className="text-xl font-black text-[hsl(var(--bd-text))]">{metrics.activeUnits}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--bd-text-muted))] opacity-50">Risk Index</p>
              <p className="text-xl font-black text-emerald-600">{metrics.riskLevel}</p>
            </div>
          </div>
        </div>

        {/* PAST DUE */}
        <div className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border)/0.5)] bg-[hsl(var(--bd-card-bg))] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-text-muted))] opacity-60">Past Due</span>
            </div>
            <p className="text-2xl font-black text-red-600">{metrics.pastDue}</p>
            <p className="text-[10px] text-[hsl(var(--bd-text-muted))] opacity-60 mt-1">
              {metrics.pastDuePercent}% of total exposure
            </p>
          </div>
          <div className="h-1.5 w-full bg-[hsl(var(--bd-surface-muted))] rounded-full mt-4 overflow-hidden">
            <div className="h-full bg-red-500 rounded-full" style={{ width: `${metrics.pastDuePercent}%` }} />
          </div>
        </div>

        {/* COLLECTED */}
        <div className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border)/0.5)] bg-[hsl(var(--bd-card-bg))] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-text-muted))] opacity-60">Collected</span>
            </div>
            <p className="text-2xl font-black text-emerald-600">{metrics.collected}</p>
            <p className="text-[10px] text-[hsl(var(--bd-text-muted))] opacity-60 mt-1">
              {metrics.collectedPercent}% target reached
            </p>
          </div>
          <div className="h-1.5 w-full bg-[hsl(var(--bd-surface-muted))] rounded-full mt-4 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${metrics.collectedPercent}%` }} />
          </div>
        </div>
      </section>

      {/* Collection Trend + Aging Buckets & Tax Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Collection Trend Chart Area */}
        <div className="lg:col-span-8 rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border)/0.5)] bg-[hsl(var(--bd-card-bg))] p-6">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-sm font-black text-[hsl(var(--bd-text))]">Collection Trend</h4>
            <div className="flex gap-1">
              <button className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 border-b-2 border-emerald-500 text-emerald-600">30D</button>
              <button className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 text-[hsl(var(--bd-text-muted))] opacity-50">90D</button>
            </div>
          </div>
          
          {/* Simulated Bar Chart */}
          <div className="flex items-end justify-between h-32 gap-3 px-2">
            {[
              { height: 40, active: false },
              { height: 60, active: false },
              { height: 85, active: true },
              { height: 50, active: false },
              { height: 70, active: false },
              { height: 95, active: true },
              { height: 30, active: false },
            ].map((bar, idx) => (
              <div
                key={idx}
                className={`flex-1 rounded-t-sm transition-colors ${
                  bar.active 
                    ? 'bg-emerald-500' 
                    : 'bg-[hsl(var(--bd-surface-muted))] opacity-40 hover:bg-emerald-400/30'
                }`}
                style={{ height: `${bar.height}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-3 text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--bd-text-muted))] opacity-50 px-2">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>
        </div>

        {/* Aging Buckets & Tax Stack */}
        <div className="lg:col-span-4 space-y-4">
          {/* Aging Buckets */}
          <div className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border)/0.5)] bg-[hsl(var(--bd-card-bg))] p-5">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-text-muted))] opacity-60 mb-4">Aging Buckets</h4>
            <div className="space-y-4">
              {metrics.agingBuckets.map((bucket, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-[hsl(var(--bd-text))]">{bucket.label}</span>
                    <span className="text-[hsl(var(--bd-text))]">{bucket.amount}</span>
                  </div>
                  <div className="h-1 w-full bg-[hsl(var(--bd-surface-muted))] rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${agingStatusStyles[bucket.status]}`} 
                      style={{ width: `${bucket.percent}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tax Position */}
          <div className="rounded-[var(--bd-radius-xl)] bg-[hsl(var(--bd-button-primary-bg))] text-white p-5 flex flex-col justify-between min-h-[120px]">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60 block mb-2">Tax Position</span>
              <p className="text-2xl font-black">
                {metrics.taxPosition}
                <span className="text-xs font-normal opacity-60 ml-2">Estimated</span>
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-300">
              <CheckCircle size={14} className="fill-current" />
              Provisioned for Q4
            </div>
          </div>
        </div>
      </section>

      {/* High-Risk Receivables Table + Side Panels */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-6">
        {/* High-Risk Table */}
        <div className="lg:col-span-8 rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border)/0.5)] bg-[hsl(var(--bd-card-bg))] overflow-hidden">
          <div className="p-5 border-b border-[hsl(var(--bd-border)/0.3)] flex justify-between items-center">
            <h4 className="text-sm font-black text-[hsl(var(--bd-text))]">High-Risk Receivables</h4>
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-[hsl(var(--bd-text-muted))]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--bd-text-muted))] opacity-60">Filter</span>
            </div>
          </div>
          
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[hsl(var(--bd-border)/0.3)] bg-[hsl(var(--bd-surface-muted))]">
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-text-muted))] opacity-60">Client</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-text-muted))] opacity-60">Invoice ID</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-text-muted))] opacity-60">Status</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-text-muted))] opacity-60 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {metrics.highRiskReceivables.map((row, idx) => (
                <tr 
                  key={idx} 
                  className="border-b border-[hsl(var(--bd-border)/0.3)] hover:bg-[hsl(var(--bd-surface-muted))] transition-colors"
                >
                  <td className="p-4 font-bold">{row.client}</td>
                  <td className="p-4 text-[hsl(var(--bd-text-muted))] opacity-60">{row.invoiceId}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${statusStyles[row.status]}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-right">{row.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="p-4 bg-[hsl(var(--bd-surface-muted))] text-center border-t border-[hsl(var(--bd-border)/0.3)]">
            <button className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--bd-text-muted))] hover:text-[hsl(var(--bd-text))] transition-colors">
              View All Records
            </button>
          </div>
        </div>

        {/* Side Insight Panels */}
        <div className="lg:col-span-4 space-y-4">
          {/* Field Notes Panel */}
          <div className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border)/0.5)] bg-[hsl(var(--bd-card-bg))] p-5">
            <div className="flex items-center gap-2 mb-4 text-emerald-600">
              <FileText size={18} className="fill-current" />
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-text))]">Field Notes</h4>
            </div>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-[hsl(var(--bd-border)/0.5)] bg-[hsl(var(--bd-surface-muted))]">
                <p className="text-xs text-[hsl(var(--bd-text-muted))] italic mb-2">
                  "Collection rates are 4% higher this quarter due to the new automated reminder workflow."
                </p>
                <p className="text-[10px] font-bold text-[hsl(var(--bd-text))]">— System Audit, Oct 24</p>
              </div>
              <div className="p-3 rounded-lg border border-[hsl(var(--bd-border)/0.5)] bg-[hsl(var(--bd-surface-muted))]">
                <p className="text-xs text-[hsl(var(--bd-text-muted))] italic mb-2">
                  "Critical risk identified in Apex Logistics; suggest immediate manual handling."
                </p>
                <p className="text-[10px] font-bold text-[hsl(var(--bd-text))]">— O. Archer</p>
              </div>
            </div>
          </div>

          {/* Handling Tips Panel */}
          <div className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border)/0.5)] bg-[hsl(var(--bd-card-bg))] p-5">
            <div className="flex items-center gap-2 mb-4 text-[hsl(var(--bd-text-muted))]">
              <Lightbulb size={18} />
              <h4 className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-text))]">Handling</h4>
            </div>
            <ul className="space-y-3">
              <li className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-emerald-700">1</span>
                </div>
                <p className="text-xs text-[hsl(var(--bd-text-muted))]">Review tax provisions for Q4 before EOM reconciliation.</p>
              </li>
              <li className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-emerald-700">2</span>
                </div>
                <p className="text-xs text-[hsl(var(--bd-text-muted))]">Trigger manual collection for items &gt;₦2M overdue.</p>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}