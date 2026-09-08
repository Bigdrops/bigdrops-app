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
import { Button } from '@/components/ui/button'
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
  invoice: { icon: FileText, className: 'bg-[hsl(var(--bd-status-info-bg))] text-[hsl(var(--bd-status-info-text))]' },
  quotation: { icon: ClipboardList, className: 'bg-[hsl(var(--bd-button-primary-bg)/0.1)] text-[hsl(var(--bd-button-primary-bg))]' },
  csr: { icon: Wrench, className: 'bg-[hsl(var(--bd-status-success-bg))] text-[hsl(var(--bd-status-success-text))]' },
  waybill: { icon: Truck, className: 'bg-[hsl(var(--bd-status-warning-bg))] text-[hsl(var(--bd-status-warning-text))]' },
  project: { icon: FolderKanban, className: 'bg-[hsl(var(--bd-status-neutral-bg))] text-[hsl(var(--bd-status-neutral-text))]' },
}

export const ClientOverviewTab: React.FC<Props> = ({ client, invoices, activity }) => {
  const navigate = useNavigate()
  const isPastDue = React.useCallback((invoice: InvoiceRecord) => {
    const balance = Number(invoice.balance_due || 0)
    if (balance <= 0) return false
    if (String(invoice.computed_status || '').toLowerCase() === 'overdue') return true
    if (!invoice.due_date) return false
    const dueDate = new Date(invoice.due_date)
    if (Number.isNaN(dueDate.getTime())) return false
    dueDate.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return dueDate < today
  }, [])

  const summary = invoices.reduce(
    (acc, inv) => {
      acc.total += Number(inv.total || 0)
      acc.collected += Number(inv.cash_received || 0)
      acc.outstanding += Number(inv.balance_due || 0)
      return acc
    },
    { total: 0, collected: 0, outstanding: 0 }
  )

  const overdue = invoices.filter(isPastDue)

  const addressLine = [client.address, client.city, client.state].filter(Boolean).join(', ')

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-4">
           {client.category ? (
            <Badge className="mb-2 rounded-full bg-muted px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground ring-1 ring-inset ring-border/30">
              {client.category}
            </Badge>
          ) : null}
          <h1 className="text-2xl font-black tracking-tighter text-foreground">{client.name}</h1>
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
            <section className="rounded-2xl border border-[hsl(var(--bd-status-danger-border))] bg-[hsl(var(--bd-status-danger-bg))] p-4">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--bd-status-danger-text))]">
                <AlertCircle className="size-3.5" />
                Needs Attention ({overdue.length})
              </div>
              <div className="space-y-2">
                {overdue.slice(0, 3).map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between gap-2 rounded-xl border border-[hsl(var(--bd-status-danger-border))] bg-bd-surface p-3 shadow-sm">
                    <div className="min-w-0">
                        <span className="font-mono text-xs font-bold text-[hsl(var(--bd-status-danger-text))]">{inv.invoice_number}</span>
                        <div className="text-[10px] font-medium text-[hsl(var(--bd-status-danger-text))] opacity-80">Past Due {formatCurrency(inv.balance_due)}</div>
                    </div>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="min-h-[44px] shrink-0 rounded-full px-4 text-[10px] font-bold uppercase text-[hsl(var(--bd-status-danger-text))]"
                        onClick={() => navigate(`/invoices/${inv.id}`)}
                    >
                        View
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="overflow-hidden rounded-2xl border border-bd-border bg-bd-surface shadow-sm">
            <div className="flex items-center justify-between border-b border-bd-border bg-bd-surface-muted/40 px-4 py-3">
               <h3 className="text-[10px] font-bold uppercase tracking-wider text-bd-text-muted">Recent Streams</h3>
               <span className="text-[9px] font-bold text-bd-text-muted opacity-70">All Records</span>
            </div>
            <div className="divide-y divide-bd-border/50 px-4 py-2">
              {activity.slice(0, 10).map((event) => {
                const cfg = DOC_STYLES[event.type]
                const Icon = cfg.icon
                const path = event.type === 'project' ? `/projects/${event.id}` : event.type === 'invoice' ? `/invoices/${event.id}` : event.type === 'quotation' ? `/quotations/${event.id}` : event.type === 'csr' ? `/csr/${event.id}` : `/waybills/${event.id}`
                return (
                  <div key={`${event.type}-${event.id}`} className="flex items-center gap-3 py-3">
                    <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${cfg.className}`}>
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                       <div className="flex items-center justify-between gap-2">
                          <div className="truncate text-sm font-semibold leading-none text-foreground">
                             {event.number || event.title || event.type}
                          </div>
                          <span className="shrink-0 text-[10px] text-muted-foreground">{formatDateShort(event.date)}</span>
                       </div>
                       <div className="mt-1 flex items-center gap-1.5 overflow-hidden">
                          <Badge variant="ghost" className="h-4 p-0 text-[9px] font-bold uppercase text-muted-foreground">
                             {event.type}
                          </Badge>
                          {event.status && (
                             <>
                               <span className="text-[10px] text-muted-foreground/30">•</span>
                               <span className="text-[10px] font-medium capitalize text-muted-foreground">{event.status}</span>
                             </>
                          )}
                          {event.total && (
                             <>
                               <span className="text-[10px] text-muted-foreground/30">•</span>
                               <span className="text-[10px] font-bold text-foreground">{formatCurrency(event.total)}</span>
                             </>
                          )}
                       </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate(path)}
                        aria-label={`Open ${event.number || event.type}`}
                        className="grid min-h-[44px] min-w-[44px] shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                        <ChevronRight className="size-5" />
                    </button>
                  </div>
                )
              })}
              {activity.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">No recent activity</div>}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-bd-border bg-bd-surface p-5 shadow-sm">
            <h3 className="mb-4 text-[10px] font-bold uppercase tracking-wider text-bd-text-muted">Contact & Account</h3>
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
    const valueStyles = {
        default: 'text-foreground',
        success: 'text-[hsl(var(--bd-status-success-text))]',
        danger: 'text-[hsl(var(--bd-status-danger-text))]',
    }
  return (
    <div className="rounded-2xl border border-bd-border bg-bd-surface p-4 shadow-sm">
      <div className="text-[10px] font-bold uppercase tracking-wider text-bd-text-muted">{label}</div>
      <div className={`mt-2 text-lg font-black tabular-nums tracking-tight ${valueStyles[tone]}`}>{value}</div>
    </div>
  )
}

function ContactInfo({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
    return (
        <div className="flex items-start gap-3">
            <div className="rounded-lg bg-bd-surface-muted p-2 text-bd-text-muted ring-1 ring-bd-border/50">
                <Icon className="size-3.5" />
            </div>
            <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
                <div className="mt-0.5 break-words text-[13px] font-bold leading-tight text-foreground">{value}</div>
            </div>
        </div>
    )
}
