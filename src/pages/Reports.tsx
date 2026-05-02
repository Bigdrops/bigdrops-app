import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../supabase'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Shared Report Types & Utils
import {
  ReportTab,
  DatePreset,
  CollectionRow,
  BankAccountLookupRow,
} from '@/components/reports/reportTypes'
import { safeDate, getPresetRange } from '@/components/reports/reportUtils'

// Report Sections
import { SectionHeader } from '@/components/reports/ReportShared'
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
    <Layout title="Reports" session={null} hidePageHeader contentClassName="w-full max-w-none bg-[hsl(var(--bd-surface))] p-0 pb-24 md:px-4 md:pb-10">
      <div className="w-full py-4">
        <div className="space-y-4">
          <SectionHeader 
            title="Reports" 
            subtitle="Live receivables, collections, project finance snapshots, and a tax placeholder for the next phase." 
          />
          
          <Tabs value={tab} onValueChange={(value) => setTab(value as ReportTab)} className="w-full">
            <div className="rounded-[var(--bd-radius-xl)] border border-[hsl(var(--bd-border))] bg-[hsl(var(--bd-card-bg))] p-2 shadow-sm">
              <div className="overflow-x-auto">
                <TabsList className="inline-flex h-auto w-max gap-2 bg-transparent p-0">
                  <TabsTrigger value="receivables" className="rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-status-danger-border))] bg-[hsl(var(--bd-status-danger-bg))] px-4 py-2 text-xs font-bold text-[hsl(var(--bd-status-danger-text))] data-[state=active]:border-transparent data-[state=active]:bg-[hsl(var(--bd-status-danger-text))] data-[state=active]:text-white">Receivables</TabsTrigger>
                  <TabsTrigger value="collections" className="rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-status-success-border))] bg-[hsl(var(--bd-status-success-bg))] px-4 py-2 text-xs font-bold text-[hsl(var(--bd-status-success-text))] data-[state=active]:border-transparent data-[state=active]:bg-[hsl(var(--bd-status-success-text))] data-[state=active]:text-white">Collections</TabsTrigger>
                  <TabsTrigger value="projects" className="rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-status-info-border))] bg-[hsl(var(--bd-status-info-bg))] px-4 py-2 text-xs font-bold text-[hsl(var(--bd-status-info-text))] data-[state=active]:border-transparent data-[state=active]:bg-[hsl(var(--bd-status-info-text))] data-[state=active]:text-white">Projects</TabsTrigger>
                  <TabsTrigger value="tax" className="rounded-[var(--bd-radius-lg)] border border-[hsl(var(--bd-status-warning-border))] bg-[hsl(var(--bd-status-warning-bg))] px-4 py-2 text-xs font-bold text-[hsl(var(--bd-status-warning-text))] data-[state=active]:border-transparent data-[state=active]:bg-[hsl(var(--bd-status-warning-text))] data-[state=active]:text-white">Tax</TabsTrigger>
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
