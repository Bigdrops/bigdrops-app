import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Mail,
  MapPin,
  Phone,
  User,
  AlertCircle,
  FileText,
  ClipboardList,
  Wrench,
  Truck,
  FolderKanban,
  ChevronRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  ClientRecord,
  UnifiedActivityEvent,
  InvoiceRecord,
  formatCurrency,
  formatDateShort,
} from '@/domain/clientWorkspace'

interface Props {
  client: ClientRecord
  invoices: InvoiceRecord[]
  activity: UnifiedActivityEvent[]
}

const DOC_STYLES = {
  invoice: { icon: FileText, className: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100' },
  quotation: { icon: ClipboardList, className: 'bg-violet-50 text-violet-700 ring-1 ring-violet-100' },
  csr: { icon: Wrench, className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' },
  waybill: { icon: Truck, className: 'bg-orange-50 text-orange-700 ring-1 ring-orange-100' },
  project: { icon: FolderKanban, className: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200' },
}

export const ClientOverviewTab: React.FC<Props> = ({ client, invoices, activity }) => {
  const navigate = useNavigate()

  const summary = invoices.reduce(
    (acc, inv) => {
      acc.total += Number(inv.total || 0)
      acc.collected += Number(inv.cash_received || 0)
      acc.outstanding += Number(inv.balance_due || 0)
      return acc
    },
    { total: 0, collected: 0, outstanding: 0 }
  )

  const overdue = invoices.filter((inv) => inv.computed_status === 'overdue')

  const addressLine = [client.address, client.city, client.state].filter(Boolean).join(', ')

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-4">
           {client.category ? (
            <Badge className="mb-2 rounded-full bg-muted px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500 ring-1 ring-inset ring-border/30">
              {client.category}
            </Badge>
          ) : null}
          <h1 className="text-2xl font-black tracking-tighter text-zinc-950">{client.name}</h1>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">{client.contact_person || 'No contact person'}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard label="Total Invoiced" value={formatCurrency(summary.total)} />
          <MetricCard label="Collected" value={formatCurrency(summary.collected)} tone="success" />
          <MetricCard
            label="Outstanding"
            value={formatCurrency(summary.outstanding)}
            tone={summary.outstanding > 0 ? 'danger' : 'default'}
          />
          <MetricCard label="Activity Count" value={activity.length} />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          {overdue.length > 0 && (
            <section className="rounded-2xl border border-red-200 bg-red-50/50 p-4">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-red-600">
                <AlertCircle className="size-3.5" />
                Needs Attention ({overdue.length})
              </div>
              <div className="space-y-2">
                {overdue.slice(0, 3).map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm ring-1 ring-red-100">
                    <div>
                        <span className="font-mono text-xs font-bold text-red-700">{inv.invoice_number}</span>
                        <div className="text-[10px] text-red-500 font-medium">Overdue {formatCurrency(inv.balance_due)}</div>
                    </div>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-full text-[10px] font-bold uppercase text-red-600"
                        onClick={() => navigate(`/invoices/${inv.id}`)}
                    >
                        View
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-border bg-card shadow-sm ring-1 ring-ring overflow-hidden">
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
               <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Recent Streams</h3>
               <span className="text-[9px] font-bold text-muted-foreground/50">All Records</span>
            </div>
            <div className="divide-y divide-border/50 px-4 py-2">
              {activity.slice(0, 10).map((event) => {
                const cfg = DOC_STYLES[event.type]
                const Icon = cfg.icon
                const path = event.type === 'project' ? `/projects/${event.id}` : event.type === 'invoice' ? `/invoices/${event.id}` : event.type === 'quotation' ? `/quotations/${event.id}` : event.type === 'csr' ? `/csr/${event.id}` : `/waybills/${event.id}`
                return (
                  <div key={`${event.type}-${event.id}`} className="flex items-center gap-4 py-3">
                    <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${cfg.className}`}>
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                       <div className="flex items-center justify-between gap-2">
                          <div className="truncate text-sm font-semibold text-zinc-900 leading-none">
                             {event.number || event.title || event.type}
                          </div>
                          <span className="shrink-0 text-[10px] text-muted-foreground/70">{formatDateShort(event.date)}</span>
                       </div>
                       <div className="mt-1 flex items-center gap-1.5 overflow-hidden">
                          <Badge variant="ghost" className="h-4 p-0 text-[9px] font-bold uppercase text-muted-foreground/60">
                             {event.type}
                          </Badge>
                          {event.status && (
                             <>
                               <span className="text-[10px] text-muted-foreground/30">•</span>
                               <span className="text-[10px] font-medium text-muted-foreground/80 capitalize">{event.status}</span>
                             </>
                          )}
                          {event.total && (
                             <>
                               <span className="text-[10px] text-muted-foreground/30">•</span>
                               <span className="text-[10px] font-bold text-zinc-700">{formatCurrency(event.total)}</span>
                             </>
                          )}
                       </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate(path)}
                        className="rounded-full p-1 text-slate-300 transition hover:bg-slate-50 hover:text-slate-600"
                    >
                        <ChevronRight className="size-4" />
                    </button>
                  </div>
                )
              })}
              {activity.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">No recent activity</div>}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-border bg-muted/20 p-5 shadow-sm">
            <h3 className="mb-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Contact & Account</h3>
            <div className="space-y-5">
               <ContactInfo icon={User} label="Contact Person" value={client.contact_person || 'None listed'} />
               <ContactInfo icon={Phone} label="Phone" value={client.phone || 'None listed'} />
               <ContactInfo icon={Mail} label="Email" value={client.email || 'None listed'} />
               <ContactInfo icon={MapPin} label="Address" value={addressLine || 'No address listed'} />
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

function MetricCard({ label, value, tone = 'default' }: { label: string; value: string | number; tone?: 'default' | 'success' | 'danger' }) {
    const toneStyles = {
        default: 'bg-muted/50 text-foreground',
        success: 'bg-emerald-50 text-emerald-700',
        danger: 'bg-red-50 text-red-700',
    }
    const labelStyles = {
        default: 'text-muted-foreground',
        success: 'text-emerald-600/70',
        danger: 'text-red-600/70',
    }
  return (
    <div className={`rounded-xl p-4 shadow-sm ring-1 ring-inset ring-border/20 ${toneStyles[tone]}`}>
      <div className={`text-[10px] font-bold uppercase tracking-wider ${labelStyles[tone]}`}>{label}</div>
      <div className="mt-2 text-lg font-black tracking-tight">{value}</div>
    </div>
  )
}

function ContactInfo({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
    return (
        <div className="flex items-start gap-3">
            <div className="rounded-lg bg-background p-2 text-muted-foreground shadow-sm ring-1 ring-border/50">
                <Icon className="size-3.5" />
            </div>
            <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">{label}</div>
                <div className="mt-0.5 break-words text-[13px] font-bold leading-tight text-zinc-800">{value}</div>
            </div>
        </div>
    )
}
