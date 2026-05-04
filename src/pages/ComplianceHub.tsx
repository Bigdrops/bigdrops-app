import { Suspense, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Bell,
  FileSpreadsheet,
  History,
  LayoutDashboard,
  Receipt,
  Settings2,
  ShieldCheck,
  Wallet,
} from 'lucide-react'

import Layout from '../components/Layout'
import { supabase } from '../supabase'
import { Button } from '@/components/ui/button'
import PageLoader from '@/components/app/PageLoader'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

import ComplianceOverview from '@/components/compliance/ComplianceOverview'
import WhtReceiptsPanel from '@/components/compliance/WhtReceiptsPanel'
import VatInputsPanel from '@/components/compliance/VatInputsPanel'
import TaxFilingsPanel from '@/components/compliance/TaxFilingsPanel'
import TaxRemindersPanel from '@/components/compliance/TaxRemindersPanel'
import ComplianceSettingsPanel from '@/components/compliance/ComplianceSettingsPanel'

type ComplianceSection = 'today' | 'vat' | 'wht' | 'filings' | 'obligations'

const sectionMeta: Record<
  ComplianceSection,
  {
    label: string
    eyebrow: string
    description: string
    icon: typeof LayoutDashboard
  }
> = {
  today: {
    label: 'Today',
    eyebrow: 'Action queue',
    description: 'Start with the compliance tasks that need attention now, then drill into the workflow that owns them.',
    icon: LayoutDashboard,
  },
  vat: {
    label: 'VAT',
    eyebrow: 'Exposure and recovery',
    description: 'Track output exposure and manual input VAT capture from one shared VAT workspace.',
    icon: Wallet,
  },
  wht: {
    label: 'WHT Receipts',
    eyebrow: 'Evidence tracking',
    description: 'Manage missing, requested, received, and verified withholding receipts without losing payment context.',
    icon: Receipt,
  },
  filings: {
    label: 'Filings',
    eyebrow: 'Submission register',
    description: 'Maintain filing periods, status, and settlement references in one lifecycle-oriented workspace.',
    icon: History,
  },
  obligations: {
    label: 'Obligations',
    eyebrow: 'Due dates and reminders',
    description: 'Keep upcoming and overdue obligations visible so filing and payment work stays on schedule.',
    icon: Bell,
  },
}

const primaryActions: Record<
  ComplianceSection,
  {
    label: string
    hint: string
  }
> = {
  today: { label: 'Add Filing', hint: 'Open the filing workspace to register a new submission record.' },
  vat: { label: 'Add VAT Input', hint: 'Capture a recoverable or non-recoverable input VAT entry.' },
  wht: { label: 'Initialize Receipt', hint: 'Create a new WHT receipt tracking record from payment activity.' },
  filings: { label: 'New Filing', hint: 'Register a new tax filing period and status.' },
  obligations: { label: 'Add Obligation', hint: 'Create a due-date reminder for an upcoming compliance obligation.' },
}

const filterChips = [
  { label: 'Period', value: 'Current month' },
  { label: 'Tax Type', value: 'All workflows' },
  { label: 'Status', value: 'Open and due' },
  { label: 'Evidence', value: 'Any state' },
  { label: 'Client', value: 'All clients' },
] as const

export default function ComplianceHub() {
  const [section, setSection] = useState<ComplianceSection>('today')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [invoices, setInvoices] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [receipts, setReceipts] = useState<any[]>([])
  const [taxInputs, setTaxInputs] = useState<any[]>([])
  const [filings, setFilings] = useState<any[]>([])
  const [reminders, setReminders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      setLoading(true)
      setError('')

      try {
        const [invoicesResult, paymentsResult, receiptsResult, taxInputsResult, filingsResult, remindersResult] = await Promise.all([
          supabase
            .from('invoices')
            .select('id, invoice_number, client_name, issue_date, vat, wht, total, status')
            .neq('status', 'archived')
            .order('issue_date', { ascending: false }),
          supabase
            .from('payments')
            .select('*, invoices(invoice_number, client_name)')
            .is('voided_at', null)
            .order('date', { ascending: false }),
          supabase
            .from('wht_receipts')
            .select('*'),
          supabase
            .from('tax_input_entries')
            .select('*')
            .order('date', { ascending: false }),
          supabase
            .from('tax_filings')
            .select('*')
            .order('period_start', { ascending: false }),
          supabase
            .from('tax_reminders')
            .select('*')
            .order('due_date', { ascending: true }),
        ])

        if (cancelled) return

        if (invoicesResult.error) throw invoicesResult.error
        if (paymentsResult.error) throw paymentsResult.error
        if (receiptsResult.error) throw receiptsResult.error
        if (taxInputsResult.error) throw taxInputsResult.error
        if (filingsResult.error) throw filingsResult.error
        if (remindersResult.error) throw remindersResult.error

        setInvoices(invoicesResult.data || [])
        setReceipts(receiptsResult.data || [])
        setTaxInputs(taxInputsResult.data || [])
        setFilings(filingsResult.data || [])
        setReminders(remindersResult.data || [])

        const flattenedPayments = (paymentsResult.data || []).map((payment) => {
          const joinedInvoice = Array.isArray(payment.invoices) ? payment.invoices[0] : payment.invoices
          return {
            ...payment,
            invoice_number: joinedInvoice?.invoice_number || '—',
            client_name: joinedInvoice?.client_name || '—',
          }
        })

        setPayments(flattenedPayments)
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to load compliance data')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadData()

    return () => {
      cancelled = true
    }
  }, [])

  const taxMetrics = useMemo(() => {
    const vatCharged = invoices.reduce((sum, row) => sum + Number(row.vat || 0), 0)
    const whtDeducted = payments.reduce((sum, row) => sum + Number(row.wht_amount || 0), 0)
    const netPosition = vatCharged - whtDeducted

    return { vatCharged, whtDeducted, netPosition }
  }, [invoices, payments])

  const workspaceSignals = useMemo(
    () => [
      {
        label: 'Open Filings',
        value: filings.filter((filing) => filing.status === 'draft' || filing.status === 'ready').length,
      },
      {
        label: 'Due Soon',
        value: reminders.filter((reminder) => reminder.status === 'upcoming' || reminder.status === 'due').length,
      },
      {
        label: 'Overdue',
        value: reminders.filter((reminder) => reminder.status === 'overdue').length,
      },
      {
        label: 'WHT Pending',
        value: receipts.filter((receipt) => receipt.receipt_status === 'pending' || receipt.receipt_status === 'requested').length,
      },
    ],
    [filings, reminders, receipts]
  )

  const activeSection = sectionMeta[section]
  const activeAction = primaryActions[section]
  const ActiveSectionIcon = activeSection.icon

  const handlePrimaryAction = () => {
    if (section === 'today') {
      setSection('filings')
      return
    }

    setSection(section)
  }

  const renderActiveSection = () => {
    if (loading) {
      return (
        <div className="py-20">
          <PageLoader />
        </div>
      )
    }

    return (
      <Suspense fallback={<PageLoader />}>
        {section === 'today' ? (
          <ComplianceOverview
            vatCharged={taxMetrics.vatCharged}
            whtDeducted={taxMetrics.whtDeducted}
            netPosition={taxMetrics.netPosition}
            recentInvoices={invoices}
            recentPayments={payments}
            receipts={receipts}
            taxInputs={taxInputs}
            filings={filings}
            reminders={reminders}
          />
        ) : null}

        {section === 'vat' ? (
          <VatInputsPanel
            taxInputs={taxInputs}
            onInputsChanged={() => {
              supabase.from('tax_input_entries').select('*').order('date', { ascending: false })
                .then(({ data }) => { if (data) setTaxInputs(data) })
            }}
          />
        ) : null}

        {section === 'wht' ? (
          <WhtReceiptsPanel
            payments={payments}
            receipts={receipts}
            loading={loading}
            onReceiptsChanged={() => {
              supabase.from('wht_receipts').select('*')
                .then(({ data }) => { if (data) setReceipts(data) })
            }}
          />
        ) : null}

        {section === 'filings' ? (
          <TaxFilingsPanel
            filings={filings}
            onFilingsChanged={() => {
              supabase.from('tax_filings').select('*').order('period_start', { ascending: false })
                .then(({ data }) => { if (data) setFilings(data) })
            }}
          />
        ) : null}

        {section === 'obligations' ? (
          <TaxRemindersPanel
            reminders={reminders}
            filings={filings}
            onRemindersChanged={() => {
              supabase.from('tax_reminders').select('*').order('due_date', { ascending: true })
                .then(({ data }) => { if (data) setReminders(data) })
            }}
          />
        ) : null}
      </Suspense>
    )
  }

  return (
    <Layout title="Compliance Hub" session={null} contentClassName="bg-[hsl(var(--bd-surface))]">
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <div className="w-full space-y-6">
          <section className="rounded-[var(--bd-overlay-radius)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] p-5 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(var(--bd-status-info-bg))] text-[hsl(var(--bd-status-info-text))]">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[hsl(var(--bd-status-info-text))]">
                      Tax & Compliance
                    </p>
                    <h1 className="text-xl font-black tracking-tight text-[hsl(var(--bd-text))]">Compliance Hub</h1>
                  </div>
                </div>
                <p className="max-w-2xl text-sm text-[hsl(var(--bd-text-muted))]">
                  A focused operations center for VAT, WHT receipts, filings, and due-date work. Start with what needs action today,
                  then move into the workflow that owns it.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  size="lg"
                  className="h-10 rounded-[var(--bd-radius-lg)] px-4 text-[10px] font-black uppercase tracking-[0.18em]"
                  onClick={handlePrimaryAction}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  {activeAction.label}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-10 rounded-[var(--bd-radius-lg)] px-4 text-[10px] font-black uppercase tracking-[0.18em]"
                  onClick={() => setSettingsOpen(true)}
                >
                  <Settings2 className="h-4 w-4" />
                  Tax Profile
                </Button>
              </div>
            </div>
          </section>

          {error ? (
            <div className="flex items-center gap-3 rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-status-danger-border))] bg-[hsl(var(--bd-status-danger-bg))] p-4 text-sm text-[hsl(var(--bd-status-danger-text))]">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          ) : null}

          <section className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] p-3 shadow-sm">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[hsl(var(--bd-text-muted))]">Workspace filters</p>
                  <p className="text-xs text-[hsl(var(--bd-text-muted))]">Shared shell controls for period, workflow, and evidence state.</p>
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {filterChips.map((chip, index) => (
                  <button
                    key={chip.label}
                    type="button"
                    className="flex min-w-fit items-center gap-2 rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] px-3 py-2 text-left transition-colors hover:border-[hsl(var(--bd-status-info-border))] hover:bg-[hsl(var(--bd-card-bg))]"
                  >
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[hsl(var(--bd-text-muted))]">{chip.label}</span>
                    <span className="text-xs font-semibold text-[hsl(var(--bd-text))]">
                      {chip.value}
                      {chip.label === 'Client' ? '' : ''}
                    </span>
                    {index < filterChips.length - 1 ? <span className="text-[hsl(var(--bd-text-soft))]">+</span> : null}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
            <aside className="space-y-3 xl:sticky xl:top-4 xl:self-start">
              <div className="hidden xl:block">
                <div className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] p-2 shadow-sm">
                  <nav className="space-y-1" aria-label="Compliance workflows">
                    {(
                      Object.entries(sectionMeta) as Array<
                        [ComplianceSection, (typeof sectionMeta)[ComplianceSection]]
                      >
                    ).map(([key, item]) => {
                      const Icon = item.icon
                      const isActive = key === section
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSection(key)}
                          className={`flex w-full items-start gap-3 rounded-[var(--bd-radius-lg)] px-3 py-3 text-left transition-colors ${
                            isActive
                              ? 'bg-[hsl(var(--bd-overlay-bg))] text-[hsl(var(--bd-overlay-text))] shadow-sm'
                              : 'text-[hsl(var(--bd-text))] hover:bg-[hsl(var(--bd-surface-muted))]'
                          }`}
                        >
                          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            isActive
                              ? 'bg-[hsl(var(--bd-overlay-text))]/12 text-[hsl(var(--bd-overlay-text))]'
                              : 'bg-[hsl(var(--bd-surface-muted))] text-[hsl(var(--bd-text-muted))]'
                          }`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="space-y-1">
                            <div className="text-[11px] font-black uppercase tracking-[0.18em]">{item.label}</div>
                            <p className={`text-xs leading-relaxed ${isActive ? 'text-[hsl(var(--bd-overlay-text))]/75' : 'text-[hsl(var(--bd-text-muted))]'}`}>
                              {item.eyebrow}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </nav>
                </div>
              </div>

              <div className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] p-3 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[hsl(var(--bd-text-muted))]">Workspace health</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  {workspaceSignals.map((signal) => (
                    <div
                      key={signal.label}
                      className="rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] px-3 py-2"
                    >
                      <div className="text-lg font-black tracking-tight text-[hsl(var(--bd-text))]">{signal.value}</div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[hsl(var(--bd-text-muted))]">{signal.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            <div className="space-y-4">
              <div className="overflow-x-auto xl:hidden">
                <div className="flex w-max gap-2 rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] p-2 shadow-sm">
                  {(
                    Object.entries(sectionMeta) as Array<
                      [ComplianceSection, (typeof sectionMeta)[ComplianceSection]]
                    >
                  ).map(([key, item]) => {
                    const isActive = key === section
                    return (
                      <Button
                        key={key}
                        type="button"
                        variant={isActive ? 'default' : 'outline'}
                        className="h-9 rounded-[var(--bd-radius-lg)] px-4 text-[10px] font-black uppercase tracking-[0.18em]"
                        onClick={() => setSection(key)}
                      >
                        {item.label}
                      </Button>
                    )
                  })}
                </div>
              </div>

              <section className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] p-5 shadow-sm">
                <div className="flex flex-col gap-4 border-b border-[hsl(var(--bd-border))] pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--bd-surface-muted))] text-[hsl(var(--bd-text-muted))]">
                        <ActiveSectionIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[hsl(var(--bd-text-muted))]">{activeSection.eyebrow}</p>
                        <h2 className="text-lg font-black tracking-tight text-[hsl(var(--bd-text))]">{activeSection.label}</h2>
                      </div>
                    </div>
                    <p className="max-w-2xl text-sm text-[hsl(var(--bd-text-muted))]">{activeSection.description}</p>
                  </div>

                  <div className="rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-surface-muted))] px-3 py-2 text-xs text-[hsl(var(--bd-text-muted))] sm:max-w-xs">
                    <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-[hsl(var(--bd-text))]">Primary action</span>
                    {activeAction.hint}
                  </div>
                </div>

                <div className="pt-5">
                  {renderActiveSection()}
                </div>
              </section>
            </div>
          </section>
        </div>

        <SheetContent side="right" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Tax Profile</SheetTitle>
            <SheetDescription>
              Keep registration details and tax profile settings available without turning configuration into a first-class workflow tab.
            </SheetDescription>
          </SheetHeader>
          <div className="px-6 pb-6">
            <ComplianceSettingsPanel />
          </div>
        </SheetContent>
      </Sheet>
    </Layout>
  )
}
