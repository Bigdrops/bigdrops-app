import { useEffect, useState } from "react"
import { canUseNativeSqlite } from "@/lib/native/capacitor"
import { useEntity } from "@/lib/tenant/contexts"
import {
  cacheInvoiceList,
  getCachedInvoiceList,
} from "@/lib/native/invoiceCache"
import { readListCache, writeListCache, isListCacheFresh } from '@/lib/cache/listCache'
import { calculateInvoiceFinancialState } from "@/domain/invoice/financialState"

export const PAGE_SIZE = 25
export const INVOICE_CACHE_KEY = "bd:list:invoices:v1:all"
const INVOICE_CACHE_TTL = 5 * 60 * 1000

function canUseInvoiceCacheFallback() {
  return (
    canUseNativeSqlite() &&
    typeof navigator !== "undefined" &&
    navigator.onLine === false
  )
}

export type InvoiceRow = {
  id: string
  invoice_number: string | null
  client_name: string | null
  issue_date: string | null
  created_at: string
  total: number | null
  status: string | null
  project_id: string | null
  custom_fields: any
  payments?: any[]
}

const getInvoiceFinancialState = (invoice: Pick<InvoiceRow, "total" | "status" | "payments">) =>
  calculateInvoiceFinancialState({
    invoiceTotal: Number(invoice.total || 0),
    status: invoice.status,
    payments: invoice.payments,
  })

const normalizeInvoiceStatusFilter = (value: string) => value.toLowerCase().trim().replace(/\s+/g, "_")

const matchesInvoiceStatusFilter = (invoice: Pick<InvoiceRow, "total" | "status" | "payments">, filterValue: string) => {
  if (filterValue === "All") return true
  return getInvoiceFinancialState(invoice).paymentState === normalizeInvoiceStatusFilter(filterValue)
}

export function useInvoiceList() {
  const { tenantClient } = useEntity()
  const [invoices, setInvoices]           = useState<InvoiceRow[]>([])
  const [search, setSearch]               = useState("")
  const [clientFilter, setClientFilter]   = useState("All")
  const [statusFilter, setStatusFilter]   = useState("All")
  const [dateFilter, setDateFilter]       = useState("All Time")
  const [sortBy, setSortBy]               = useState("Newest")
  const [clientOptions, setClientOptions] = useState<string[]>([])
  const [totalCount, setTotalCount]       = useState(0)
  const [page, setPage]                   = useState(0)
  const [hasMore, setHasMore]             = useState(false)
  const [loadingMore, setLoadingMore]     = useState(false)

  const buildInvoiceQuery = () => {
    let query = tenantClient
      .from("invoices")
      .select("id, invoice_number, client_name, issue_date, created_at, total, status, project_id, custom_fields, payments(cash_amount, wht_amount, amount, voided_at)")
      .is("archived_at", null)

    const searchTerm = search.trim()
    if (searchTerm) {
      const escapedTerm = searchTerm.replace(/,/g, " ")
      query = query.or(`invoice_number.ilike.%${escapedTerm}%,client_name.ilike.%${escapedTerm}%`)
    }

    if (clientFilter !== "All") {
      query = query.eq("client_name", clientFilter)
    }

    if (dateFilter !== "All Time") {
      const now = new Date()
      if (dateFilter === "This Month") {
        const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
        query = query.gte("issue_date", from)
      }
      if (dateFilter === "Last Month") {
        const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10)
        const to = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10)
        query = query.gte("issue_date", from).lte("issue_date", to)
      }
      if (dateFilter === "This Year") {
        const from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10)
        query = query.gte("issue_date", from)
      }
    }

    if (sortBy === "Oldest") {
      return query.order("created_at", { ascending: true })
    }
    if (sortBy === "Highest Value") {
      return query
        .order("total", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
    }
    if (sortBy === "Lowest Value") {
      return query
        .order("total", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false })
    }
    return query
      .order("created_at", { ascending: false })
  }

  const fetchInvoices = async (pageIndex = 0, replace = false) => {
    const isInitialLoad = pageIndex === 0 && replace
    const hasFilters = search.trim() !== "" || clientFilter !== "All" || statusFilter !== "All" || dateFilter !== "All Time"

    if (isInitialLoad) {
      const cached = readListCache<InvoiceRow>(INVOICE_CACHE_KEY)
      if (cached) {
        let rowsToDisplay = cached.rows
        
        if (hasFilters) {
          const searchTerm = search.trim().toLowerCase()
          rowsToDisplay = cached.rows.filter((row: any) => {
            const matchesSearch = !searchTerm || 
              String(row.invoice_number || "").toLowerCase().includes(searchTerm) || 
              String(row.client_name || "").toLowerCase().includes(searchTerm)
            const matchesClient = clientFilter === "All" || row.client_name === clientFilter
            const matchesStatus = matchesInvoiceStatusFilter(row, statusFilter)
            
            let matchesDate = true
            if (dateFilter !== "All Time" && row.issue_date) {
              const issueTime = new Date(row.issue_date).getTime()
              const now = new Date()
              if (dateFilter === "This Month") {
                matchesDate = issueTime >= new Date(now.getFullYear(), now.getMonth(), 1).getTime()
              } else if (dateFilter === "Last Month") {
                const fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime()
                const toDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime()
                matchesDate = issueTime >= fromDate && issueTime <= toDate
              } else if (dateFilter === "This Year") {
                matchesDate = issueTime >= new Date(now.getFullYear(), 0, 1).getTime()
              }
            }
            
            return matchesSearch && matchesClient && matchesStatus && matchesDate
          })

          rowsToDisplay.sort((left: any, right: any) => {
            if (sortBy === "Highest Value") return Number(right.total || 0) - Number(left.total || 0)
            if (sortBy === "Lowest Value") return Number(left.total || 0) - Number(right.total || 0)
            const leftTime = new Date(left.created_at || 0).getTime() || 0
            const rightTime = new Date(right.created_at || 0).getTime() || 0
            return sortBy === "Oldest" ? leftTime - rightTime : rightTime - leftTime
          })
        }

        setInvoices(rowsToDisplay.slice(0, PAGE_SIZE))
        setTotalCount(rowsToDisplay.length)
        setPage(0)
        setHasMore(PAGE_SIZE < rowsToDisplay.length)

        if (isListCacheFresh(cached, INVOICE_CACHE_TTL)) {
          return
        }
      }
    }

    setLoadingMore(true)
    const from = pageIndex * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    try {
      const { data, error } = await buildInvoiceQuery()
      if (error) throw error

      const allRows = ((data as any[]) || [])
      const filteredRows = allRows.filter((row: any) => matchesInvoiceStatusFilter(row, statusFilter))
      
      if (!hasFilters) {
        writeListCache(INVOICE_CACHE_KEY, allRows)
      }

      const nextRows = filteredRows.slice(from, to + 1)

      setInvoices((current) => (replace ? nextRows : [...current, ...nextRows]))
      setTotalCount(filteredRows.length)
      setPage(pageIndex)
      setHasMore(to + 1 < filteredRows.length)

      if (canUseNativeSqlite() && allRows.length > 0) {
        void cacheInvoiceList(allRows).catch((cacheError) => {
          console.warn("Invoice list cache write failed:", cacheError)
        })
      }
    } catch (error) {
      if (!canUseInvoiceCacheFallback()) {
        setInvoices((current) => (replace ? [] : current))
        setTotalCount((current) => (replace ? 0 : current))
        setHasMore(false)
        console.warn("Invoice list fetch failed:", error)
        return
      }

      try {
        const cachedRows = await getCachedInvoiceList()
        const searchTerm = search.trim().toLowerCase()

        const filteredRows = cachedRows
          .filter((row: any) => !row.archived_at)
          
          .filter((row: any) => {
            if (!searchTerm) return true
            const invoiceNumber = String(row.invoice_number || "").toLowerCase()
            const clientName = String(row.client_name || "").toLowerCase()
            return invoiceNumber.includes(searchTerm) || clientName.includes(searchTerm)
          })
          .filter((row: any) => clientFilter === "All" || row.client_name === clientFilter)
          .filter((row: any) => matchesInvoiceStatusFilter(row, statusFilter))
          .filter((row: any) => {
            if (dateFilter === "All Time") return true
            if (!row.issue_date) return false

            const issueTime = new Date(row.issue_date).getTime()
            if (Number.isNaN(issueTime)) return false

            const now = new Date()
            if (dateFilter === "This Month") {
              const fromDate = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
              return issueTime >= fromDate
            }
            if (dateFilter === "Last Month") {
              const fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime()
              const toDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime()
              return issueTime >= fromDate && issueTime <= toDate
            }
            if (dateFilter === "This Year") {
              const fromDate = new Date(now.getFullYear(), 0, 1).getTime()
              return issueTime >= fromDate
            }

            return true
          })
          .sort((left: any, right: any) => {
            if (sortBy === "Highest Value") {
              return Number(right.total || 0) - Number(left.total || 0)
            }
            if (sortBy === "Lowest Value") {
              return Number(left.total || 0) - Number(right.total || 0)
            }

            const leftTime = new Date(left.created_at || 0).getTime() || 0
            const rightTime = new Date(right.created_at || 0).getTime() || 0
            return sortBy === "Oldest" ? leftTime - rightTime : rightTime - leftTime
          })

        const nextRows = filteredRows.slice(from, to + 1)

        setInvoices((current) => (replace ? nextRows : [...current, ...nextRows]))
        setTotalCount(filteredRows.length)
        setPage(pageIndex)
        setHasMore(to + 1 < filteredRows.length)
      } catch (cacheError) {
        console.warn("Invoice list cache fallback failed:", cacheError)
        setInvoices((current) => (replace ? [] : current))
        setTotalCount((current) => (replace ? 0 : current))
        setHasMore(false)
      }
    } finally {
      setLoadingMore(false)
    }
  }

  const fetchClientOptions = async () => {
    const cached = readListCache<InvoiceRow>(INVOICE_CACHE_KEY)
    if (cached) {
      const nextOptions = Array.from(
        new Set(cached.rows.map((row) => row.client_name).filter(Boolean)),
      ).sort((a: any, b: any) => a.localeCompare(b))
      setClientOptions(nextOptions)
      if (isListCacheFresh(cached, INVOICE_CACHE_TTL)) return
    }

    try {
      const { data, error } = await tenantClient
        .from("invoices")
        .select("client_name, custom_fields")
        .is("archived_at", null)

      if (error) throw error

      const nextOptions = Array.from(
        new Set(((data as any[]) || []).map((row) => row.client_name).filter(Boolean)),
      ).sort((a: any, b: any) => a.localeCompare(b))

      setClientOptions(nextOptions)
    } catch (error) {
      if (!canUseInvoiceCacheFallback()) {
        console.warn("Invoice client options fetch failed:", error)
        setClientOptions([])
        return
      }

      try {
        const cachedRows = await getCachedInvoiceList()
        const nextOptions = Array.from(
          new Set((cachedRows || []).map((row: any) => row.client_name).filter(Boolean)),
        ).sort((a: any, b: any) => a.localeCompare(b))
        setClientOptions(nextOptions)
      } catch (cacheError) {
        console.warn("Invoice client options cache fallback failed:", cacheError)
        setClientOptions([])
      }
    }
  }

  useEffect(() => {
    if (!tenantClient.isReady) return
    fetchClientOptions()
  }, [tenantClient])

  useEffect(() => {
    if (!tenantClient.isReady) return
    setInvoices([])
    setPage(0)
    setHasMore(false)
    fetchInvoices(0, true)
  }, [clientFilter, dateFilter, search, sortBy, statusFilter, tenantClient])

  const resetFilters = () => {
    setSearch("")
    setClientFilter("All")
    setStatusFilter("All")
    setDateFilter("All Time")
    setSortBy("Newest")
  }

  return {
    invoices,
    totalCount,
    hasMore,
    loadingMore,
    page,
    clientOptions,
    search,
    setSearch,
    clientFilter,
    setClientFilter,
    statusFilter,
    setStatusFilter,
    dateFilter,
    setDateFilter,
    sortBy,
    setSortBy,
    fetchInvoices,
    fetchClientOptions,
    resetFilters,
  }
}
