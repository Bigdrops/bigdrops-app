import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Layout from '../components/Layout'
import { useEntity } from '@/lib/tenant/contexts'
import {
  loadEnrichedCollections,
  loadProjects,
  loadReceivables,
  loadTaxInvoices,
} from '@/modules/reports/services/reportProjectionService'

// Shared Report Types & Utils
import {
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

  // Shared Data (collections shared by overview, collections, and tax tabs)
  const [collections, setCollections] = useState<CollectionRow[]>([])
  const [collectionsLoading, setCollectionsLoading] = useState(false)
  const [collectionsLoadedRange, setCollectionsLoadedRange] = useState<string | null>(null)
  const [collectionsError, setCollectionsError] = useState('')

  const [receivables, setReceivables] = useState<InvoiceFinancialRow[]>([])
  const [receivablesLoading, setReceivablesLoading] = useState(false)
  const [receivablesLoadedRange, setReceivablesLoadedRange] = useState<string | null>(null)
  const [receivablesError, setReceivablesError] = useState('')

  const [projects, setProjects] = useState<ProjectFinancialRow[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [projectsLoaded, setProjectsLoaded] = useState(false)
  const [projectsError, setProjectsError] = useState('')

  const [taxInvoices, setTaxInvoices] = useState<TaxInvoiceRow[]>([])
  const [taxLoading, setTaxLoading] = useState(false)
  const [taxLoadedRange, setTaxLoadedRange] = useState<string | null>(null)
  const [taxError, setTaxError] = useState('')
  
  const requestIds = useRef({ collections: 0, receivables: 0, projects: 0, tax: 0 })
  const { tenantClient } = useEntity()

  const { start, end } = useMemo(() => getPresetRange(datePreset, customStart, customEnd), [datePreset, customStart, customEnd])
  const queryStart = useMemo(() => safeDate(start), [start])
  const queryEnd = useMemo(() => safeDate(end), [end])
  const rangeKey = `${queryStart || ''}:${queryEnd || ''}`

  const loadCollections = useCallback(async (startDate: string | null, endDate: string | null, nextRangeKey: string) => {
    const requestId = ++requestIds.current.collections
    setCollectionsLoading(true)
    setCollectionsError('')

    try {
      const rows = await loadEnrichedCollections(tenantClient, startDate, endDate)
      if (requestIds.current.collections !== requestId) return
      setCollections(rows)
      setCollectionsLoading(false)
      setCollectionsLoadedRange(nextRangeKey)
    } catch (err) {
      if (requestIds.current.collections !== requestId) return
      setCollections([])
      setCollectionsLoading(false)
      setCollectionsError(err instanceof Error ? err.message : 'Failed to load collections')
    }
  }, [tenantClient])

  const loadReceivablesData = useCallback(async (startDate: string | null, endDate: string | null, nextRangeKey: string) => {
    const requestId = ++requestIds.current.receivables
    setReceivablesLoading(true)
    setReceivablesError('')

    try {
      const rows = await loadReceivables(tenantClient, startDate, endDate)
      if (requestIds.current.receivables !== requestId) return
      setReceivables(rows)
      setReceivablesLoading(false)
      setReceivablesLoadedRange(nextRangeKey)
    } catch (err) {
      if (requestIds.current.receivables !== requestId) return
      setReceivables([])
      setReceivablesLoading(false)
      setReceivablesError(err instanceof Error ? err.message : 'Failed to load receivables')
    }
  }, [tenantClient])

  const loadProjectsData = useCallback(async () => {
    const requestId = ++requestIds.current.projects
    setProjectsLoading(true)
    setProjectsError('')

    try {
      const rows = await loadProjects()
      if (requestIds.current.projects !== requestId) return
      setProjects(rows)
      setProjectsLoading(false)
      setProjectsLoaded(true)
    } catch (err) {
      if (requestIds.current.projects !== requestId) return
      setProjects([])
      setProjectsLoading(false)
      setProjectsError(err instanceof Error ? err.message : 'Failed to load projects')
    }
  }, [])

  const loadTaxData = useCallback(async (startDate: string | null, endDate: string | null, nextRangeKey: string) => {
    const requestId = ++requestIds.current.tax
    setTaxLoading(true)
    setTaxError('')

    try {
      const rows = await loadTaxInvoices(tenantClient, startDate, endDate)
      if (requestIds.current.tax !== requestId) return
      setTaxInvoices(rows)
      setTaxLoading(false)
      setTaxLoadedRange(nextRangeKey)
    } catch (err) {
      if (requestIds.current.tax !== requestId) return
      setTaxInvoices([])
      setTaxLoading(false)
      setTaxError(err instanceof Error ? err.message : 'Failed to load tax invoices')
    }
  }, [tenantClient])

  useEffect(() => {
    const startDate = safeDate(queryStart)
    const endDate = safeDate(queryEnd)

    const needsCollections = tab === 'overview' || tab === 'collections' || tab === 'tax'
    if (needsCollections && collectionsLoadedRange !== rangeKey && !collectionsLoading) {
      void loadCollections(startDate, endDate, rangeKey)
    }
  }, [tab, rangeKey, collectionsLoadedRange, collectionsLoading, queryStart, queryEnd, loadCollections, tenantClient])

  useEffect(() => {
    const startDate = safeDate(queryStart)
    const endDate = safeDate(queryEnd)

    if (receivablesLoadedRange !== rangeKey && !receivablesLoading) {
      void loadReceivablesData(startDate, endDate, rangeKey)
    }
    if (!projectsLoaded && !projectsLoading) {
      void loadProjectsData()
    }
    if (taxLoadedRange !== rangeKey && !taxLoading) {
      void loadTaxData(startDate, endDate, rangeKey)
    }
  }, [
    rangeKey,
    queryStart,
    queryEnd,
    receivablesLoadedRange,
    receivablesLoading,
    projectsLoaded,
    projectsLoading,
    taxLoadedRange,
    taxLoading,
    loadProjectsData,
    loadReceivablesData,
    loadTaxData,
  ])

  const overviewClientOptions = useMemo(() => {
    const clients = new Set<string>()

    for (const row of receivables) {
      if (row.client_name) clients.add(row.client_name)
    }
    for (const row of collections) {
      if (row.client_name) clients.add(row.client_name)
    }
    for (const row of projects) {
      if (row.client_name) clients.add(row.client_name)
    }
    for (const row of taxInvoices) {
      if (row.client_name) clients.add(row.client_name)
    }

    return Array.from(clients).sort((left, right) => left.localeCompare(right))
  }, [receivables, collections, projects, taxInvoices])

  const overviewSummary = useMemo<ReportsOverviewSummary>(() => {
    const searchTerm = search.trim().toLowerCase()
    const matchesSearch = (...values: Array<string | null | undefined>) =>
      !searchTerm || values.some((value) => String(value || '').toLowerCase().includes(searchTerm))

    const filteredReceivables = receivables
      .filter((row) => (clientFilter === 'all' ? true : row.client_name === clientFilter))
      .filter((row) => matchesSearch(row.invoice_number, row.client_name))

    const filteredCollections = collections
      .filter((row) => (clientFilter === 'all' ? true : row.client_name === clientFilter))
      .filter((row) => matchesSearch(row.invoice_number, row.client_name))

    const filteredProjects = projects
      .filter((row) => (clientFilter === 'all' ? true : row.client_name === clientFilter))
      .filter((row) => matchesSearch(row.project_name, row.name, row.client_name))

    const filteredTaxInvoices = taxInvoices
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
      receivablesError ? `Receivables overview: ${receivablesError}` : '',
      collectionsError ? `Collections overview: ${collectionsError}` : '',
      projectsError ? `Projects overview: ${projectsError}` : '',
      taxError ? `Tax overview: ${taxError}` : '',
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
        tax: Boolean(taxError) && filteredTaxInvoices.length === 0,
      },
    }
  }, [
    search,
    clientFilter,
    receivables,
    collections,
    projects,
    taxInvoices,
    receivablesError,
    collectionsError,
    projectsError,
    taxError,
  ])

  const overviewLoading =
    (tab === 'overview' && receivablesLoadedRange !== rangeKey) ||
    (tab === 'overview' && collectionsLoadedRange !== rangeKey) ||
    (tab === 'overview' && taxLoadedRange !== rangeKey) ||
    (tab === 'overview' && !projectsLoaded) ||
    receivablesLoading ||
    collectionsLoading ||
    taxLoading ||
    projectsLoading

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
            data={receivables}
            isLoading={receivablesLoading || receivablesLoadedRange !== rangeKey}
            error={receivablesError}
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
            data={projects}
            isLoading={projectsLoading || !projectsLoaded}
            error={projectsError}
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
            data={taxInvoices}
            collections={collections}
            isLoading={(taxLoading || taxLoadedRange !== rangeKey) || (collectionsLoading || collectionsLoadedRange !== rangeKey)}
            error={taxError || collectionsError}
          />
        ) : null}
      </ReportsShell>
    </Layout>
  )
}
