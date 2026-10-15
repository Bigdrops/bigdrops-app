import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEntity } from '../lib/tenant/contexts'
import Layout from '../components/Layout'
import ConfirmActionDialog from '../components/ConfirmActionDialog'
import { feedback } from '../lib/feedback'
import { getUserFacingMutationMessage } from '@/lib/userFacingMutationErrors'
import {
  invalidateListCache,
  isListCacheFresh,
  readListCache,
  supplierListCacheKey,
  writeListCache,
} from '@/lib/cache/listCache'

import MobileFab from '../components/layout/MobileFab'
import ModuleShell from '@/components/layout/ModuleShell'
import ModuleRowCard from '@/components/layout/ModuleRowCard'
import { SkeletonRow } from '@/components/loading/AppLoadingStates'
import InvoiceListActionSheet from '@/components/invoice/InvoiceListActionSheet'

import { Archive, Eye, Factory, Pencil, RotateCcw } from 'lucide-react'
import {
  archiveSupplier,
  listSuppliers,
  restoreSupplier,
} from '@/modules/supplier/supplierService'
import {
  formatSupplierLocation,
  isArchivedSupplier,
  matchesSupplierQuery,
  type SupplierRecord,
} from '@/domain/supplier/types'

const SUPPLIERS_LIST_CACHE_TTL_MS = 10 * 60 * 1000

type StatusFilter = 'Active' | 'Archived' | 'All'

function getSupplierStatusLabel(supplier: SupplierRecord): string {
  return isArchivedSupplier(supplier) ? 'Archived supplier' : 'Active supplier'
}

export default function Suppliers() {
  const { tenantClient } = useEntity()
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [query, setQuery] = useState<string>('')
  const [status, setStatus] = useState<StatusFilter>('Active')
  // Default lists exclude the inactive status. Live status, not the fetch
  // filter, decides what each row shows.
  const [statusError, setStatusError] = useState<string | null>(null)
  const [supplierToArchive, setSupplierToArchive] = useState<SupplierRecord | null>(null)
  const [supplierToRestore, setSupplierToRestore] = useState<SupplierRecord | null>(null)
  const [activeSupplier, setActiveSupplier] = useState<SupplierRecord | null>(null)
  const [isMutating, setIsMutating] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true

    const schemaName = tenantClient.schemaName
    if (!schemaName) return

    const cacheKey = supplierListCacheKey(schemaName)

    const fetchSuppliers = async (options?: { background?: boolean }) => {
      if (!options?.background) {
        setLoading(true)
      }

      const { data, error } = await listSuppliers(tenantClient, { includeArchived: true })

      if (!mounted) return
      if (error) {
        setStatusError(error)
        setLoading(false)
        return
      }

      const nextRows = data ?? []
      setStatusError(null)
      setSuppliers(nextRows)
      if (nextRows.length > 0) {
        writeListCache(cacheKey, nextRows)
      }
      setLoading(false)
    }

    const cachedEntry = readListCache<SupplierRecord>(cacheKey)

    if (cachedEntry) {
      setSuppliers(cachedEntry.rows)
      setLoading(false)

      if (tenantClient.isReady && (!isListCacheFresh(cachedEntry, SUPPLIERS_LIST_CACHE_TTL_MS) || cachedEntry.rows.length === 0)) {
        void fetchSuppliers({ background: true })
      }
    } else if (tenantClient.isReady) {
      void fetchSuppliers()
    }

    return () => {
      mounted = false
    }
  }, [tenantClient.isReady, tenantClient.schemaName])

  const filtered = useMemo(() => {
    return suppliers.filter((supplier) => {
      const archived = isArchivedSupplier(supplier)
      const matchesStatus =
        status === 'All' ? true : status === 'Archived' ? archived : !archived
      return matchesStatus && matchesSupplierQuery(supplier, query)
    })
  }, [suppliers, query, status])

  const refreshCache = useCallback(
    (rows: SupplierRecord[]) => {
      setSuppliers(rows)
      if (tenantClient.schemaName) {
        writeListCache(supplierListCacheKey(tenantClient.schemaName), rows)
      }
    },
    [tenantClient.schemaName],
  )

  const handleArchive = async (supplier: SupplierRecord): Promise<void> => {
    try {
      setIsMutating(true)
      const { data, error } = await archiveSupplier(tenantClient, supplier.id)
      if (error || !data) throw new Error(error || 'Archive failed')
      refreshCache(suppliers.map((row) => (row.id === data.id ? data : row)))
      feedback.success('Supplier archived')
      setSupplierToArchive(null)
      setActiveSupplier(null)
    } catch (err) {
      feedback.error(getUserFacingMutationMessage(err, { action: 'save' }))
    } finally {
      setIsMutating(false)
    }
  }

  const handleRestore = async (supplier: SupplierRecord): Promise<void> => {
    try {
      setIsMutating(true)
      const { data, error } = await restoreSupplier(tenantClient, supplier.id)
      if (error || !data) throw new Error(error || 'Restore failed')
      refreshCache(suppliers.map((row) => (row.id === data.id ? data : row)))
      feedback.success('Supplier restored')
      setSupplierToRestore(null)
      setActiveSupplier(null)
    } catch (err) {
      feedback.error(getUserFacingMutationMessage(err, { action: 'save' }))
    } finally {
      setIsMutating(false)
    }
  }

  const statusOptions: StatusFilter[] = ['Active', 'Archived', 'All']

  const filterOptions = [
    {
      label: 'Status',
      value: status,
      options: statusOptions,
      onChange: (value: string) => setStatus(value as StatusFilter),
    },
  ]

  const activeCount = suppliers.filter((supplier) => !isArchivedSupplier(supplier)).length

  return (
    <Layout title="Suppliers" session={null} hidePageHeader>
      <ModuleShell
        eyebrow="Directory"
        title="Suppliers"
        summary={loading ? 'Loading suppliers...' : `${filtered.length} shown · ${activeCount} active`}
        tone="cyan"
        onPrimaryAction={() => navigate('/suppliers/new')}
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search by name, contact, city, or phone..."
        filters={filterOptions}
        hasActiveFilters={status !== 'Active'}
        onResetFilters={() => setStatus('Active')}
        records={loading ? [] : filtered}
        renderRow={(supplier) => (
          <ModuleRowCard
            key={supplier.id}
            title={supplier.name}
            subtitle={supplier.contact_person || supplier.phone || 'No contact person'}
            tertiary={formatSupplierLocation(supplier)}
            statusLabel={getSupplierStatusLabel(supplier)}
            statusClassName={
              isArchivedSupplier(supplier)
                ? 'bg-slate-100 text-slate-600'
                : 'bg-cyan-100 text-cyan-700'
            }
            onClick={() => navigate(`/suppliers/${supplier.id}`)}
            onActionClick={() => setActiveSupplier(supplier)}
          />
        )}
        emptyState={
          <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--bd-overlay-radius)] border border-dashed border-border bg-card/50 py-16 text-center shadow-inner">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-[var(--bd-radius-lg)] bg-muted text-muted-foreground">
              <Factory className="h-7 w-7" aria-hidden="true" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">
                {statusError ? 'Suppliers could not load' : 'No suppliers found'}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {statusError
                  ? statusError
                  : query
                    ? 'Try a different search term'
                    : status === 'Archived'
                      ? 'No suppliers are archived'
                      : 'Add your first supplier to get started'}
              </div>
            </div>
          </div>
        }
      >
        {loading && (
          <div className="grid gap-3">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        )}
      </ModuleShell>

      <MobileFab onClick={() => navigate('/suppliers/new')} ariaLabel="Create supplier" />

      <ConfirmActionDialog
        open={supplierToArchive !== null}
        onOpenChange={(open) => {
          if (!open) setSupplierToArchive(null)
        }}
        title="Archive this supplier?"
        description="The supplier is hidden from active pickers and default lists. Existing documents and any client link are kept. You can restore it later."
        confirmLabel="Archive Supplier"
        onConfirm={() => {
          if (supplierToArchive) void handleArchive(supplierToArchive)
        }}
        loading={isMutating}
      />

      <ConfirmActionDialog
        open={supplierToRestore !== null}
        onOpenChange={(open) => {
          if (!open) setSupplierToRestore(null)
        }}
        title="Restore this supplier?"
        description="The supplier returns to active pickers and default lists."
        confirmLabel="Restore Supplier"
        onConfirm={() => {
          if (supplierToRestore) void handleRestore(supplierToRestore)
        }}
        loading={isMutating}
      />

      <InvoiceListActionSheet
        open={Boolean(activeSupplier)}
        onOpenChange={(open) => {
          if (!open) setActiveSupplier(null)
        }}
        eyebrow="Supplier"
        title={activeSupplier?.name || 'Unknown supplier'}
        subtitle={
          activeSupplier
            ? `${formatSupplierLocation(activeSupplier)}${activeSupplier.phone ? ` · ${activeSupplier.phone}` : ''}`
            : undefined
        }
        actions={activeSupplier ? [
          {
            key: 'view',
            label: 'View',
            icon: <Eye className="h-6 w-6" />,
            onClick: () => navigate(`/suppliers/${activeSupplier.id}`),
          },
          {
            key: 'edit',
            label: 'Edit',
            icon: <Pencil className="h-6 w-6" />,
            onClick: () => navigate(`/suppliers/edit/${activeSupplier.id}`),
          },
          isArchivedSupplier(activeSupplier)
            ? {
                key: 'restore',
                label: 'Restore',
                icon: <RotateCcw className="h-6 w-6" />,
                onClick: () => setSupplierToRestore(activeSupplier),
              }
            : {
                key: 'archive',
                label: 'Archive',
                icon: <Archive className="h-6 w-6" />,
                onClick: () => setSupplierToArchive(activeSupplier),
              },
        ] : []}
      />
    </Layout>
  )
}
