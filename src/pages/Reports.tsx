import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../supabase'

// Shared Report Types & Utils
import {
  ReportTab,
  DatePreset,
  CollectionRow,
  BankAccountLookupRow,
} from '@/components/reports/reportTypes'
import { safeDate, getPresetRange } from '@/components/reports/reportUtils'

// Shell Components
import { ReportsShell } from '@/components/reports/ReportsShell'
import { ReportsNav } from '@/components/reports/ReportsNav'
import { ReportsHeader } from '@/components/reports/ReportsHeader'
import { ReportsFilterBar } from '@/components/reports/ReportsFilterBar'

// Report Sections
import { OverviewSection } from '@/components/reports/OverviewSection'
import { ReceivablesSection } from '@/components/reports/ReceivablesSection'
import { CollectionsSection } from '@/components/reports/CollectionsSection'
import { ProjectsSection } from '@/components/reports/ProjectsSection'
import { TaxSection } from '@/components/reports/TaxSection'

const TAB_METADATA: Record<ReportTab, { title: string; description: string }> = {
  overview: {
    title: 'Financial Overview',
    description: 'High-level perspective of your receivables, collections, and tax liability.'
  },
  receivables: {
    title: 'Account Receivables',
    description: 'Detailed analysis of outstanding invoices, client debt, and aging buckets.'
  },
  collections: {
    title: 'Collections Registry',
    description: 'Comprehensive log of all payments received across all projects.'
  },
  projects: {
    title: 'Project Performance',
    description: 'Profitability analysis and financial health tracking per project.'
  },
  tax: {
    title: 'Tax Positions',
    description: 'Calculated VAT and Withholding Tax positions for compliance tracking.'
  }
}

export default function Reports() {
  const [tab, setTab] = useState<ReportTab>('overview')
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

  const activeMetadata = TAB_METADATA[tab]

  return (
    <Layout title="Reports" session={null} contentClassName="bg-[hsl(var(--bd-surface))]" hidePageHeader>
      <ReportsShell
        header={
          <ReportsHeader 
            title={activeMetadata.title}
            description={activeMetadata.description}
            onExport={() => console.log('Exporting data for', tab)}
          />
        }
        navigation={
          <ReportsNav activeTab={tab} onTabChange={setTab} />
        }
        filterBar={
          <ReportsFilterBar 
            datePreset={datePreset}
            setDatePreset={setDatePreset}
            customStart={customStart}
            setCustomStart={setCustomStart}
            customEnd={customEnd}
            setCustomEnd={setCustomEnd}
            clientFilter={clientFilter}
            setClientFilter={setClientFilter}
            search={search}
            setSearch={setSearch}
          />
        }
      >
        <OverviewSection isActive={tab === 'overview'} />

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
          collections={collections}
          isLoading={collectionsLoading || collectionsLoadedRange !== rangeKey}
          error={collectionsError}
        />

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
      </ReportsShell>
    </Layout>
  )
}
