import { Suspense, useEffect, useState } from 'react'
import {
  AlertCircle,
  Bell,
  History,
  LayoutDashboard,
  Receipt,
  Settings2,
  Wallet,
} from 'lucide-react'

import Layout from '../components/Layout'
import { supabase } from '../supabase'
import { useEntity } from '@/lib/tenant/contexts'
import { fetchWhtReceipts, fetchTaxInputEntries, fetchTaxFilings, fetchTaxReminders } from '@/modules/compliance/services/complianceService'
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
    icon: typeof LayoutDashboard
  }
> = {
  today: {
    label: 'Today',
    icon: LayoutDashboard,
  },
  vat: {
    label: 'VAT',
    icon: Wallet,
  },
  wht: {
    label: 'WHT Receipts',
    icon: Receipt,
  },
  filings: {
    label: 'Filings',
    icon: History,
  },
  obligations: {
    label: 'Obligations',
    icon: Bell,
  },
}

export default function ComplianceHub() {
  const { tenantClient } = useEntity()
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
        // Phase 3: invoices/payments are part of the invoice aggregate → tenant.
        // Tax tables (tax_input_entries, tax_filings, tax_reminders) remain public.
        const [invoicesResult, paymentsResult] = await Promise.all([
          tenantClient
            .from('invoices')
            .select('id, invoice_number, client_name, issue_date, vat, wht, total, status')
            .neq('status', 'archived')
            .order('issue_date', { ascending: false }),
          tenantClient
            .from('payments')
            .select('*, invoices(invoice_number, client_name)')
            .is('voided_at', null)
            .order('date', { ascending: false }),
        ])
        const [receiptsData, taxInputsData, filingsData, remindersData] = await Promise.all([
          fetchWhtReceipts(tenantClient),
          fetchTaxInputEntries(),
          fetchTaxFilings(),
          fetchTaxReminders(),
        ])

        if (cancelled) return

        if (invoicesResult.error) throw invoicesResult.error
        if (paymentsResult.error) throw paymentsResult.error

        setInvoices(invoicesResult.data || [])
        setReceipts(receiptsData)
        setTaxInputs(taxInputsData)
        setFilings(filingsData)
        setReminders(remindersData)

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
  }, [tenantClient])

  const activeSection = sectionMeta[section]
  const ActiveSectionIcon = activeSection.icon

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
            invoices={invoices}
            payments={payments}
            receipts={receipts}
            taxInputs={taxInputs}
            filings={filings}
            reminders={reminders}
            onNavigateSection={setSection}
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
              tenantClient.from('wht_receipts').select('*')
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
    <Layout
      title="Compliance Hub"
      session={null}
      hidePageHeader
      contentClassName="bg-bd-surface"
    >
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <div className="w-full min-w-0 space-y-4 overflow-x-hidden px-4 pt-4 md:px-0 md:pt-0">
          <section className="rounded-[var(--bd-radius-xl)] border border-bd-border bg-bd-card-bg px-4 py-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <h1 className="text-xl font-black tracking-tight text-bd-text">Compliance Hub</h1>
                <p className="text-sm text-bd-text-muted">Tax actions, filings, and evidence tracking.</p>
              </div>

              <Button
                type="button"
                variant="outline"
                className="h-9 shrink-0 rounded-[var(--bd-radius-lg)] px-4 text-[10px] font-black uppercase tracking-[0.18em]"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings2 className="h-4 w-4" />
                Tax Profile
              </Button>
            </div>
          </section>

          {error ? (
            <div className="flex items-center gap-3 rounded-[var(--bd-radius-xl)] border border-bd-status-danger-border bg-bd-status-danger-bg p-4 text-sm text-bd-status-danger-text">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          ) : null}

          <section className="grid min-w-0 gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
            <aside className="min-w-0 xl:sticky xl:top-4 xl:self-start">
              <div className="hidden xl:block">
                <div className="rounded-[var(--bd-radius-xl)] border border-bd-border bg-bd-card-bg p-2 shadow-sm">
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
                              ? 'bg-bd-overlay-bg text-bd-overlay-text shadow-sm'
                              : 'text-bd-text hover:bg-bd-surface-muted'
                          }`}
                        >
                          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            isActive
                              ? 'bg-bd-overlay-text/12 text-bd-overlay-text'
                              : 'bg-bd-surface-muted text-bd-text-muted'
                          }`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-black uppercase tracking-[0.18em]">{item.label}</div>
                          </div>
                        </button>
                      )
                    })}
                  </nav>
                </div>
              </div>
            </aside>

            <div className="min-w-0 space-y-3">
              <div className="max-w-full overflow-x-auto xl:hidden">
                <div className="flex w-max min-w-full gap-2 rounded-[var(--bd-radius-xl)] border border-bd-border bg-bd-card-bg p-2 shadow-sm">
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
                        className="h-9 shrink-0 rounded-[var(--bd-radius-lg)] px-4 text-[10px] font-black uppercase tracking-[0.18em]"
                        onClick={() => setSection(key)}
                      >
                        {item.label}
                      </Button>
                    )
                  })}
                </div>
              </div>

              <section className="min-w-0">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bd-surface-muted text-bd-text-muted">
                    <ActiveSectionIcon className="h-4 w-4" />
                  </div>
                  <h2 className="text-base font-black tracking-tight text-bd-text">{activeSection.label}</h2>
                </div>

                <div className="min-w-0">
                  {renderActiveSection()}
                </div>
              </section>
            </div>
          </section>
        </div>

        <SheetContent
          side="right"
          className="flex h-full w-full max-w-full flex-col overflow-hidden bg-bd-card-bg p-0 sm:max-w-xl"
        >
          <SheetHeader>
            <SheetTitle>Tax Profile</SheetTitle>
            <SheetDescription>
              Tax identity, VAT registration, and profile-level metadata.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1">
            <ComplianceSettingsPanel />
          </div>
        </SheetContent>
      </Sheet>
    </Layout>
  )
}
