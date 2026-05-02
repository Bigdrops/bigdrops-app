import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download } from 'lucide-react'
import Layout from '../components/Layout'
import { supabase } from '../supabase'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'

// Shared Report Types & Utils
import {
  ReportTab,
  DatePreset,
  CollectionRow,
  BankAccountLookupRow,
} from '@/components/reports/reportTypes'
import { safeDate, getPresetRange } from '@/components/reports/reportUtils'

// Report Sections
import { ReceivablesSection } from '@/components/reports/ReceivablesSection'
import { CollectionsSection } from '@/components/reports/CollectionsSection'
import { ProjectsSection } from '@/components/reports/ProjectsSection'
import { TaxSection } from '@/components/reports/TaxSection'

export default function Reports() {
  const [tab, setTab] = useState<ReportTab>('receivables')
  const [datePreset, setDatePreset] = useState<DatePreset>('this_month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [clientFilter, setClientFilter] = useState('all')
  const [search, setSearch] = useState('')

  // Shared Data (Collections is needed by both Collections and Tax tabs)
  const [collections, setCollections] = useState<CollectionRow[]>([])
  const [collectionsLoading, setCollectionsLoading] = useState(false)
  const [collectionsLoadedRange, setCollectionsLoadedRange] = useState<string | null>(null)
  const [collectionsError, setCollectionsError] = useState('')
  
  const requestIds = useRef({ collections: 0 })

  const { start, end } = useMemo(() => getPresetRange(datePreset, customStart, customEnd), [datePreset, customStart, customEnd])
  const queryStart = useMemo(() => safeDate(start), [start])
  const queryEnd = useMemo(() => safeDate(end), [end])
  const rangeKey = `${queryStart || ''}:${queryEnd || ''}`

  const loadCollections = useCallback(async (startDate: string | null, endDate: string | null, nextRangeKey: string) => {
    const requestId = ++requestIds.current.collections

    setCollectionsLoading(true)
    setCollectionsError('')

    let paymentsQuery = supabase
      .from('payments')
      .select('*, invoices(invoice_number, client_name)')
      .is('voided_at', null)
      .order('date', { ascending: false })

    if (startDate) paymentsQuery = paymentsQuery.gte('date', startDate)
    if (endDate) paymentsQuery = paymentsQuery.lte('date', endDate)

    const paymentsResult = await paymentsQuery

    if (requestIds.current.collections !== requestId) return

    const paymentsData = (paymentsResult.data || []) as CollectionRow[]
    const bankAccountIds = Array.from(
      new Set(
        paymentsData
          .map((payment) => payment.bank_account_id)
          .filter((value): value is string => Boolean(value)),
      ),
    )

    let bankAccountsMap = new Map<string, BankAccountLookupRow>()
    let bankAccountsErrorMessage = ''

    if (!paymentsResult.error && bankAccountIds.length > 0) {
      const { data: bankAccountRows, error: bankAccountsError } = await supabase
        .from('bank_accounts')
        .select('id, bank_name, account_number')
        .in('id', bankAccountIds)

      if (requestIds.current.collections !== requestId) return

      bankAccountsErrorMessage = bankAccountsError?.message || ''
      if (!bankAccountsError) {
        bankAccountsMap = new Map(
          ((bankAccountRows || []) as BankAccountLookupRow[]).map((bankAccount) => [bankAccount.id, bankAccount]),
        )
      }
    }

    const collectionRows = paymentsData.map((payment) => {
      const joinedInvoice = Array.isArray(payment.invoices) ? payment.invoices[0] : payment.invoices
      const linkedAccount = payment.bank_account_id ? bankAccountsMap.get(payment.bank_account_id) : null
      return {
        ...payment,
        invoice_number: joinedInvoice?.invoice_number || '—',
        client_name: joinedInvoice?.client_name || '—',
        account_label: linkedAccount?.bank_name
          ? `${linkedAccount.bank_name} — ${linkedAccount.account_number || 'No account'}`
          : payment.method || '—',
      }
    })

    setCollections(collectionRows)
    setCollectionsLoading(false)
    setCollectionsError(paymentsResult.error?.message || bankAccountsErrorMessage)

    if (!paymentsResult.error && !bankAccountsErrorMessage) {
      setCollectionsLoadedRange(nextRangeKey)
    }
  }, [])

  useEffect(() => {
    const startDate = safeDate(queryStart)
    const endDate = safeDate(queryEnd)

    const needsCollections = tab === 'collections' || tab === 'tax'
    if (needsCollections && collectionsLoadedRange !== rangeKey && !collectionsLoading) {
      void loadCollections(startDate, endDate, rangeKey)
    }
  }, [tab, rangeKey, collectionsLoadedRange, collectionsLoading, queryStart, queryEnd, loadCollections])

  return (
    <Layout title="Reports" session={null} contentClassName="bg-[hsl(var(--bd-surface))]">
      <div className="w-full space-y-6">
        <div className="space-y-6">
          {/* Operational Header */}
          <div className="rounded-[var(--bd-overlay-radius)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <div className="bg-[hsl(var(--bd-status-success-text))] rounded-full h-1.5 w-1.5 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[hsl(var(--bd-status-success-text))]">Finance Intelligence</span>
              </div>
              <h1 className="text-xl font-black tracking-tight text-[hsl(var(--bd-text))]">Financial Reports</h1>
              <p className="mt-1 text-xs text-[hsl(var(--bd-text-muted))] leading-relaxed max-w-md">
                Review receivables, collections, and tax positions across all projects.
              </p>
            </div>
            <div className="flex shrink-0">
               <Button variant="outline" className="w-full md:w-auto h-10 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-sm gap-2">
                 <Download className="h-3.5 w-3.5" />
                 Export Report
               </Button>
            </div>
          </div>
          
          <Tabs value={tab} onValueChange={(value) => setTab(value as ReportTab)} className="w-full">
            <div className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] p-2 shadow-sm">
              <div className="overflow-x-auto">
                <TabsList className="inline-flex h-auto w-max gap-1 bg-[hsl(var(--bd-surface-muted))] p-1 rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border))]/50">
                  <TabsTrigger value="receivables" className="rounded-[var(--bd-radius-lg)] px-5 py-2 text-[10px] font-black uppercase tracking-widest transition-all data-[state=active]:bg-[hsl(var(--bd-overlay-bg))] data-[state=active]:text-[hsl(var(--bd-overlay-text))] data-[state=active]:shadow-sm">Receivables</TabsTrigger>
                  <TabsTrigger value="collections" className="rounded-[var(--bd-radius-lg)] px-5 py-2 text-[10px] font-black uppercase tracking-widest transition-all data-[state=active]:bg-[hsl(var(--bd-overlay-bg))] data-[state=active]:text-[hsl(var(--bd-overlay-text))] data-[state=active]:shadow-sm">Collections</TabsTrigger>
                  <TabsTrigger value="projects" className="rounded-[var(--bd-radius-lg)] px-5 py-2 text-[10px] font-black uppercase tracking-widest transition-all data-[state=active]:bg-[hsl(var(--bd-overlay-bg))] data-[state=active]:text-[hsl(var(--bd-overlay-text))] data-[state=active]:shadow-sm">Projects</TabsTrigger>
                  <TabsTrigger value="tax" className="rounded-[var(--bd-radius-lg)] px-5 py-2 text-[10px] font-black uppercase tracking-widest transition-all data-[state=active]:bg-[hsl(var(--bd-overlay-bg))] data-[state=active]:text-[hsl(var(--bd-overlay-text))] data-[state=active]:shadow-sm">Tax</TabsTrigger>
                </TabsList>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <TabsContent value="receivables" className="mt-0 space-y-4">
                <ReceivablesSection
                  isActive={tab === 'receivables'}
                  start={start}
                  end={end}
                  rangeKey={rangeKey}
                  clientFilter={clientFilter}
                  setClientFilter={setClientFilter}
                  search={search}
                  setSearch={setSearch}
                  datePreset={datePreset}
                  setDatePreset={setDatePreset}
                  customStart={customStart}
                  setCustomStart={setCustomStart}
                  customEnd={customEnd}
                  setCustomEnd={setCustomEnd}
                />
              </TabsContent>

              <TabsContent value="collections" className="mt-0 space-y-4">
                <CollectionsSection
                  isActive={tab === 'collections'}
                  start={start}
                  end={end}
                  rangeKey={rangeKey}
                  clientFilter={clientFilter}
                  setClientFilter={setClientFilter}
                  search={search}
                  setSearch={setSearch}
                  datePreset={datePreset}
                  setDatePreset={setDatePreset}
                  customStart={customStart}
                  setCustomStart={setCustomStart}
                  customEnd={customEnd}
                  setCustomEnd={setCustomEnd}
                  // Shared data pattern
                  collections={collections}
                  isLoading={collectionsLoading || collectionsLoadedRange !== rangeKey}
                  error={collectionsError}
                />
              </TabsContent>

              <TabsContent value="projects" className="mt-0 space-y-4">
                <ProjectsSection
                  isActive={tab === 'projects'}
                  rangeKey={rangeKey}
                  clientFilter={clientFilter}
                  setClientFilter={setClientFilter}
                  search={search}
                  setSearch={setSearch}
                  datePreset={datePreset}
                  setDatePreset={setDatePreset}
                  customStart={customStart}
                  setCustomStart={setCustomStart}
                  customEnd={customEnd}
                  setCustomEnd={setCustomEnd}
                />
              </TabsContent>

              <TabsContent value="tax" className="mt-0 space-y-4">
                <TaxSection
                  isActive={tab === 'tax'}
                  start={start}
                  end={end}
                  rangeKey={rangeKey}
                  clientFilter={clientFilter}
                  setClientFilter={setClientFilter}
                  search={search}
                  setSearch={setSearch}
                  datePreset={datePreset}
                  setDatePreset={setDatePreset}
                  customStart={customStart}
                  setCustomStart={setCustomStart}
                  customEnd={customEnd}
                  setCustomEnd={setCustomEnd}
                  collections={collections}
                  isCollectionsLoading={collectionsLoading || collectionsLoadedRange !== rangeKey}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </Layout>
  )
}
