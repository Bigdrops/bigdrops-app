import { Suspense, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Bell,
  Ellipsis,
  History,
  LayoutDashboard,
  Receipt,
  Settings2,
  Wallet,
} from 'lucide-react'

import Layout from '../components/Layout'
import { useEntity } from '@/lib/tenant/contexts'
import { useLayoutMode } from '@/hooks/useLayoutMode'
import { fetchWhtReceipts, fetchTaxInputEntries, fetchTaxFilings, fetchTaxReminders } from '@/modules/compliance/services/complianceService'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import RecordCaptureSheet from '@/components/compliance/RecordCaptureSheet'

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
  const { isMobile } = useLayoutMode()
  const [section, setSection] = useState<ComplianceSection>('today')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [recordSheetOpen, setRecordSheetOpen] = useState(false)
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
          fetchTaxInputEntries(tenantClient),
          fetchTaxFilings(tenantClient),
          fetchTaxReminders(tenantClient),
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

  // v2: single adaptive switcher shows attention counts per section.
  const sectionCounts = useMemo(() => {
    const trackedPaymentIds = new Set(receipts.map((receipt: any) => receipt.payment_id))
    const untrackedWht = payments.filter(
      (payment: any) => Number(payment.wht_amount || 0) > 0 && !trackedPaymentIds.has(payment.id),
    ).length
    const unverifiedWht = receipts.filter((receipt: any) => receipt.receipt_status !== 'verified').length
    const wht = untrackedWht + unverifiedWht
    const filingsAttention = filings.filter((filing: any) =>
      ['draft', 'ready', 'overdue'].includes(filing.status),
    ).length
    const obligations = reminders.filter((reminder: any) =>
      reminder.status === 'overdue' || reminder.status === 'due',
    ).length
    return {
      today: wht + filingsAttention + obligations,
      vat: taxInputs.length,
      wht,
      filings: filingsAttention,
      obligations,
    }
  }, [payments, receipts, taxInputs, filings, reminders])

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
              tenantClient.from('tax_input_entries').select('*').order('date', { ascending: false })
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
              tenantClient.from('tax_filings').select('*').order('period_start', { ascending: false })
                .then(({ data }) => { if (data) setFilings(data) })
            }}
          />
        ) : null}

        {section === 'obligations' ? (
          <TaxRemindersPanel
            reminders={reminders}
            filings={filings}
            onRemindersChanged={() => {
              tenantClient.from('tax_reminders').select('*').order('due_date', { ascending: true })
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
        <a
          href="#compliance-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-bd-overlay-bg focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-bd-overlay-text"
        >
          Skip to compliance content
        </a>
        <div className="w-full min-w-0 space-y-4 overflow-x-hidden px-4 pt-4 md:px-0 md:pt-0">
          <section className="rounded-[var(--bd-radius-xl)] border border-bd-border bg-bd-card-bg px-4 py-4 shadow-sm">
            <div className="flex flex-row items-center justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <h1 className="text-xl font-black tracking-tight text-bd-text">Compliance Hub</h1>
                <p className="text-sm text-bd-text-muted">Tax actions, filings, and evidence tracking.</p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  className="h-11 rounded-[var(--bd-radius-lg)] px-4 text-[10px] font-black uppercase tracking-[0.18em]"
                  onClick={() => setRecordSheetOpen(true)}
                >
                  <Receipt className="h-4 w-4" />
                  Record Expense
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      aria-label="More compliance actions"
                      className="h-11 w-11 rounded-[var(--bd-radius-lg)] px-0"
                    >
                      <Ellipsis className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem
                      className="min-h-[44px] cursor-pointer"
                      onSelect={() => setSettingsOpen(true)}
                    >
                      <Settings2 className="h-4 w-4" />
                      Tax Profile
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
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
              <nav
                aria-label="Compliance workflows"
                className="flex min-w-0 gap-2 overflow-x-auto rounded-[var(--bd-radius-xl)] border border-bd-border bg-bd-card-bg p-2 shadow-sm xl:flex-col xl:overflow-visible"
              >
                {(
                  Object.entries(sectionMeta) as Array<
                    [ComplianceSection, (typeof sectionMeta)[ComplianceSection]]
                  >
                ).map(([key, item]) => {
                  const Icon = item.icon
                  const isActive = key === section
                  const count = sectionCounts[key]
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSection(key)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`flex min-h-[44px] shrink-0 items-center gap-3 rounded-[var(--bd-radius-lg)] px-3 py-2 text-left transition-colors xl:w-full ${
                        isActive
                          ? 'bg-bd-overlay-bg text-bd-overlay-text shadow-sm'
                          : 'text-bd-text hover:bg-bd-surface-muted'
                      }`}
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        isActive
                          ? 'bg-bd-overlay-text/12 text-bd-overlay-text'
                          : 'bg-bd-surface-muted text-bd-text-muted'
                      }`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-black uppercase tracking-[0.18em]">{item.label}</div>
                      </div>
                      <span
                        aria-label={`${count} items in ${item.label}`}
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black tabular-nums ${
                          isActive
                            ? 'bg-bd-overlay-text/12 text-bd-overlay-text'
                            : 'bg-bd-surface-muted text-bd-text-muted'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  )
                })}
              </nav>
            </aside>

            <div className="min-w-0 space-y-3">
              <section id="compliance-content" aria-label={activeSection.label} className="min-w-0 scroll-mt-20">
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
          side={isMobile ? 'bottom' : 'right'}
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

      <RecordCaptureSheet
        open={recordSheetOpen}
        onOpenChange={setRecordSheetOpen}
        onSaved={() => {
          fetchTaxInputEntries(tenantClient).then(setTaxInputs)
        }}
      />
    </Layout>
  )
}
