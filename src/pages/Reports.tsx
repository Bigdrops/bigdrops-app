import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../supabase'

// Shared Report Types & Utils
import {
  BankAccountLookupRow,
  CollectionRow,
  DatePreset,
  InvoiceFinancialRow,
  OverviewSummary,
  ProjectFinancialRow,
  ReportTab,
  TaxInvoiceRow,
} from '@/components/reports/reportTypes'
import {
  formatDate,
  formatMoney,
  computeReportTaxMetrics,
  getAgingBucket,
  getPresetRange,
  getReceivableStatusLabel,
  isPastDue,
  safeDate,
} from '@/components/reports/reportUtils'

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

type ReportsOverviewSummary = OverviewSummary & {
  expectedWhtExposure: string
  actualWhtDeducted: string
  vatLessActualWht: string
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

  const [overviewReceivables, setOverviewReceivables] = useState<InvoiceFinancialRow[]>([])
  const [overviewReceivablesLoading, setOverviewReceivablesLoading] = useState(false)
  const [overviewReceivablesLoadedRange, setOverviewReceivablesLoadedRange] = useState<string | null>(null)
  const [overviewReceivablesError, setOverviewReceivablesError] = useState('')

  const [overviewProjects, setOverviewProjects] = useState<ProjectFinancialRow[]>([])
  const [overviewProjectsLoading, setOverviewProjectsLoading] = useState(false)
  const [overviewProjectsLoaded, setOverviewProjectsLoaded] = useState(false)
  const [overviewProjectsError, setOverviewProjectsError] = useState('')

  const [overviewTaxInvoices, setOverviewTaxInvoices] = useState<TaxInvoiceRow[]>([])
  const [overviewTaxLoading, setOverviewTaxLoading] = useState(false)
  const [overviewTaxLoadedRange, setOverviewTaxLoadedRange] = useState<string | null>(null)
  const [overviewTaxError, setOverviewTaxError] = useState('')
  
  const requestIds = useRef({ collections: 0, receivables: 0, projects: 0, tax: 0 })

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

  const loadOverviewReceivables = useCallback(async (startDate: string | null, endDate: string | null, nextRangeKey: string) => {
    const requestId = ++requestIds.current.receivables

    setOverviewReceivablesLoading(true)
    setOverviewReceivablesError('')

    let query = supabase.from('invoice_financials_v').select('*').order('issue_date', { ascending: false })

    if (startDate) query = query.gte('issue_date', startDate)
    if (endDate) query = query.lte('issue_date', endDate)

    const result = await query

    if (requestIds.current.receivables !== requestId) return

    setOverviewReceivables((result.data || []) as InvoiceFinancialRow[])
    setOverviewReceivablesLoading(false)
    setOverviewReceivablesError(result.error?.message || '')

    if (!result.error) {
      setOverviewReceivablesLoadedRange(nextRangeKey)
    }
  }, [])

  const loadOverviewProjects = useCallback(async () => {
    const requestId = ++requestIds.current.projects

    setOverviewProjectsLoading(true)
    setOverviewProjectsError('')

    const result = await supabase.from('project_financials_v').select('*').order('outstanding', { ascending: false })

    if (requestIds.current.projects !== requestId) return

    setOverviewProjects((result.data || []) as ProjectFinancialRow[])
    setOverviewProjectsLoading(false)
    setOverviewProjectsError(result.error?.message || '')

    if (!result.error) {
      setOverviewProjectsLoaded(true)
    }
  }, [])

  const loadOverviewTaxInvoices = useCallback(async (startDate: string | null, endDate: string | null, nextRangeKey: string) => {
    const requestId = ++requestIds.current.tax

    setOverviewTaxLoading(true)
    setOverviewTaxError('')

    let query = supabase
      .from('invoices')
      .select('id, invoice_number, client_name, issue_date, vat, wht, total, status')
      .not('status', 'eq', 'archived')
      .is('archived_at', null)
      .order('issue_date', { ascending: false })

    if (startDate) query = query.gte('issue_date', startDate)
    if (endDate) query = query.lte('issue_date', endDate)

    const result = await query

    if (requestIds.current.tax !== requestId) return

    setOverviewTaxInvoices((result.data || []) as TaxInvoiceRow[])
    setOverviewTaxLoading(false)
    setOverviewTaxError(result.error?.message || '')

    if (!result.error) {
      setOverviewTaxLoadedRange(nextRangeKey)
    }
  }, [])

  useEffect(() => {
    const startDate = safeDate(queryStart)
    const endDate = safeDate(queryEnd)

    const needsCollections = tab === 'overview' || tab === 'collections' || tab === 'tax'
    if (needsCollections && collectionsLoadedRange !== rangeKey && !collectionsLoading) {
      void loadCollections(startDate, endDate, rangeKey)
    }
  }, [tab, rangeKey, collectionsLoadedRange, collectionsLoading, queryStart, queryEnd, loadCollections])

  useEffect(() => {
    if (tab !== 'overview') return
    const startDate = safeDate(queryStart)
    const endDate = safeDate(queryEnd)

    if (overviewReceivablesLoadedRange !== rangeKey && !overviewReceivablesLoading) {
      void loadOverviewReceivables(startDate, endDate, rangeKey)
    }
    if (!overviewProjectsLoaded && !overviewProjectsLoading) {
      void loadOverviewProjects()
    }
    if (overviewTaxLoadedRange !== rangeKey && !overviewTaxLoading) {
      void loadOverviewTaxInvoices(startDate, endDate, rangeKey)
    }
  }, [
    tab,
    rangeKey,
    queryStart,
    queryEnd,
    overviewReceivablesLoadedRange,
    overviewReceivablesLoading,
    overviewProjectsLoaded,
    overviewProjectsLoading,
    overviewTaxLoadedRange,
    overviewTaxLoading,
    loadOverviewProjects,
    loadOverviewReceivables,
    loadOverviewTaxInvoices,
  ])

  const overviewClientOptions = useMemo(() => {
    const clients = new Set<string>()

    for (const row of overviewReceivables) {
      if (row.client_name) clients.add(row.client_name)
    }
    for (const row of collections) {
      if (row.client_name) clients.add(row.client_name)
    }
    for (const row of overviewProjects) {
      if (row.client_name) clients.add(row.client_name)
    }
    for (const row of overviewTaxInvoices) {
      if (row.client_name) clients.add(row.client_name)
    }

    return Array.from(clients).sort((left, right) => left.localeCompare(right))
  }, [overviewReceivables, collections, overviewProjects, overviewTaxInvoices])

  const overviewSummary = useMemo<ReportsOverviewSummary>(() => {
    const searchTerm = search.trim().toLowerCase()
    const matchesSearch = (...values: Array<string | null | undefined>) =>
      !searchTerm || values.some((value) => String(value || '').toLowerCase().includes(searchTerm))

    const filteredReceivables = overviewReceivables
      .filter((row) => (clientFilter === 'all' ? true : row.client_name === clientFilter))
      .filter((row) => matchesSearch(row.invoice_number, row.client_name))

    const filteredCollections = collections
      .filter((row) => (clientFilter === 'all' ? true : row.client_name === clientFilter))
      .filter((row) => matchesSearch(row.invoice_number, row.client_name))

    const filteredProjects = overviewProjects
      .filter((row) => (clientFilter === 'all' ? true : row.client_name === clientFilter))
      .filter((row) => matchesSearch(row.project_name, row.name, row.client_name))

    const filteredTaxInvoices = overviewTaxInvoices
      .filter((row) => (clientFilter === 'all' ? true : row.client_name === clientFilter))
      .filter((row) => matchesSearch(row.invoice_number, row.client_name))

    const outstandingReceivables = filteredReceivables.filter((row) => Number(row.balance_due || 0) > 0)
    const totalExposureValue = outstandingReceivables.reduce((sum, row) => sum + Number(row.balance_due || 0), 0)
    const pastDueRows = outstandingReceivables.filter((row) => isPastDue(row.due_date, row.balance_due))
    const pastDueValue = pastDueRows.reduce((sum, row) => sum + Number(row.balance_due || 0), 0)
    const collectedValue = filteredCollections.reduce((sum, row) => sum + Number(row.cash_amount || 0), 0)
    const {
      vatChargedValue,
      expectedWhtExposureValue,
      actualWhtDeductedValue,
      vatLessActualWhtValue,
    } = computeReportTaxMetrics(filteredTaxInvoices, filteredCollections)

    const bucketLabels: Array<{ key: 'current' | '1_30' | '31_60' | '61_plus'; label: string; source: string; tone: 'info' | 'warning' | 'danger' }> = [
      { key: 'current', label: 'Current', source: 'Current', tone: 'info' },
      { key: '1_30', label: '1-30 Days', source: '1–30', tone: 'warning' },
      { key: '31_60', label: '31-60 Days', source: '31–60', tone: 'warning' },
      { key: '61_plus', label: '61+ Days', source: '61+', tone: 'danger' },
    ]

    const agingBuckets = bucketLabels.map((bucket) => {
      const rows = outstandingReceivables.filter((row) => getAgingBucket(row.due_date) === bucket.source)
      const amountValue = rows.reduce((sum, row) => sum + Number(row.balance_due || 0), 0)
      const percent = totalExposureValue > 0 ? Math.round((amountValue / totalExposureValue) * 100) : 0

      return {
        key: bucket.key,
        label: bucket.label,
        amount: formatMoney(amountValue),
        percent,
        tone: bucket.tone,
        invoiceCount: rows.length,
      }
    })

    const highRiskReceivables = outstandingReceivables
      .map((row) => {
        const dueDateValue = row.due_date ? new Date(row.due_date) : null
        const normalizedDueDate = dueDateValue && !Number.isNaN(dueDateValue.getTime()) ? dueDateValue : null
        const now = new Date()
        now.setHours(0, 0, 0, 0)
        const daysPastDue = normalizedDueDate
          ? Math.floor((now.getTime() - new Date(normalizedDueDate.getFullYear(), normalizedDueDate.getMonth(), normalizedDueDate.getDate()).getTime()) / 86400000)
          : Number.NEGATIVE_INFINITY
        const agingLabel = getAgingBucket(row.due_date)
        const tone =
          daysPastDue > 60 ? ('danger' as const) :
          daysPastDue > 0 ? ('warning' as const) :
          ('info' as const)

        return {
          id: row.id,
          client: row.client_name || '—',
          invoiceNumber: row.invoice_number || '—',
          amountValue: Number(row.balance_due || 0),
          amount: formatMoney(row.balance_due),
          dueDate: formatDate(row.due_date),
          statusLabel: getReceivableStatusLabel(row),
          agingLabel,
          tone,
          sortWeight: Math.max(daysPastDue, 0),
        }
      })
      .sort((left, right) => {
        if (right.sortWeight !== left.sortWeight) return right.sortWeight - left.sortWeight
        return right.amountValue - left.amountValue
      })
      .slice(0, 6)
      .map(({ amountValue: _amountValue, sortWeight: _sortWeight, ...row }) => row)

    const errors = [
      overviewReceivablesError ? `Receivables overview: ${overviewReceivablesError}` : '',
      collectionsError ? `Collections overview: ${collectionsError}` : '',
      overviewProjectsError ? `Projects overview: ${overviewProjectsError}` : '',
      overviewTaxError ? `Tax overview: ${overviewTaxError}` : '',
    ].filter(Boolean)

    return {
      totalExposure: formatMoney(totalExposureValue),
      outstandingInvoices: outstandingReceivables.length,
      pastDueAmount: formatMoney(pastDueValue),
      pastDueCount: pastDueRows.length,
      pastDuePercent: totalExposureValue > 0 ? Math.round((pastDueValue / totalExposureValue) * 100) : 0,
      collectedAmount: formatMoney(collectedValue),
      collectionCount: filteredCollections.length,
      taxPosition: formatMoney(vatLessActualWhtValue),
      vatCharged: formatMoney(vatChargedValue),
      whtReceived: formatMoney(actualWhtDeductedValue),
      expectedWhtExposure: formatMoney(expectedWhtExposureValue),
      actualWhtDeducted: formatMoney(actualWhtDeductedValue),
      vatLessActualWht: formatMoney(vatLessActualWhtValue),
      projectsWithOutstanding: filteredProjects.filter((row) => Number(row.outstanding || 0) > 0).length,
      agingBuckets,
      highRiskReceivables,
      errors,
      unsupported: {
        tax: Boolean(overviewTaxError) && filteredTaxInvoices.length === 0,
      },
    }
  }, [
    search,
    clientFilter,
    overviewReceivables,
    collections,
    overviewProjects,
    overviewTaxInvoices,
    overviewReceivablesError,
    collectionsError,
    overviewProjectsError,
    overviewTaxError,
  ])

  const overviewLoading =
    (tab === 'overview' && overviewReceivablesLoadedRange !== rangeKey) ||
    (tab === 'overview' && collectionsLoadedRange !== rangeKey) ||
    (tab === 'overview' && overviewTaxLoadedRange !== rangeKey) ||
    (tab === 'overview' && !overviewProjectsLoaded) ||
    overviewReceivablesLoading ||
    collectionsLoading ||
    overviewTaxLoading ||
    overviewProjectsLoading

  const activeMetadata = TAB_METADATA[tab]

  return (
    <Layout title="Reports" session={null} contentClassName="bg-bd-surface" hidePageHeader>
      <ReportsShell
        header={
          <ReportsHeader 
            title={activeMetadata.title}
            description={activeMetadata.description}
            onExport={() => {}}
          />
        }
        navigation={
          <ReportsNav activeTab={tab} onTabChange={setTab} />
        }
        filterBar={tab === 'overview' ? (
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
            clients={overviewClientOptions}
          />
        ) : undefined}
      >
        {tab === 'overview' ? (
          <OverviewSection isActive summary={overviewSummary} isLoading={overviewLoading} />
        ) : null}

        {tab === 'receivables' ? (
          <ReceivablesSection
            isActive
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
        ) : null}

        {tab === 'collections' ? (
          <CollectionsSection
            isActive
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
        ) : null}

        {tab === 'projects' ? (
          <ProjectsSection
            isActive
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
        ) : null}

        {tab === 'tax' ? (
          <TaxSection
            isActive
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
        ) : null}
      </ReportsShell>
    </Layout>
  )
}
