import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../supabase"
import Layout from "../components/Layout"
import ConfirmActionDialog from "../components/ConfirmActionDialog"
import { feedback } from "../lib/feedback"
import { getUserFacingMutationMessage } from "@/lib/userFacingMutationErrors"
import { isListCacheFresh, readListCache, writeListCache } from "@/lib/cache/listCache"

import MobileFab from "../components/layout/MobileFab"
import ModuleShell from "@/components/layout/ModuleShell"
import ModuleRowCard from "@/components/layout/ModuleRowCard"
import { SkeletonRow } from "@/components/loading/AppLoadingStates"
import InvoiceListActionSheet from "@/components/invoice/InvoiceListActionSheet"

import { Archive, Eye, Pencil, Trash2, Users } from "lucide-react"

type Client = {
  id: string | number
  name: string
  phone?: string | null
  city?: string | null
  state?: string | null
  category?: string | null
}

const CLIENTS_LIST_CACHE_KEY = "bd:list:clients:v1:all"
const CLIENTS_LIST_CACHE_TTL_MS = 10 * 60 * 1000

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatLocation(city?: string | null, state?: string | null) {
  const v = [city, state].filter(Boolean).join(", ")
  return v.length ? v : "—"
}

function normalizeCategory(cat?: string | null) {
  const c = (cat ?? "").trim()
  return c.length ? c : "Uncategorized"
}

function getClientCategoryLabel(cat?: string | null) {
  const normalized = normalizeCategory(cat)
  if (normalized === "Uncategorized") return "Client"
  return `${normalized} client`
}

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [query, setQuery] = useState<string>("")
  const [category, setCategory] = useState<string>("All")
  const [clientToDelete, setClientToDelete] = useState<string | number | null>(null)
  const [activeClient, setActiveClient] = useState<Client | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true

    const fetchClients = async (options?: { background?: boolean }) => {
      if (!options?.background) {
        setLoading(true)
      }

      const { data, error } = await supabase.from("clients").select("*").order("name")

      if (!mounted) return
      if (error) {
        console.error("Error:", error)
        setLoading(false)
        return
      }

      const nextRows = (data as Client[]) || []
      setClients(nextRows)
      writeListCache(CLIENTS_LIST_CACHE_KEY, nextRows)
      setLoading(false)
    }

    const cachedEntry = readListCache<Client>(CLIENTS_LIST_CACHE_KEY)

    if (cachedEntry) {
      setClients(cachedEntry.rows)
      setLoading(false)

      if (!isListCacheFresh(cachedEntry, CLIENTS_LIST_CACHE_TTL_MS)) {
        void fetchClients({ background: true })
      }
    } else {
      void fetchClients()
    }

    return () => {
      mounted = false
    }
  }, [])

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const c of clients) set.add(normalizeCategory(c.category))
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))]
  }, [clients])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return clients.filter((c) => {
      const matchesQuery =
        !q ||
        (c.name ?? "").toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q) ||
        (c.city ?? "").toLowerCase().includes(q) ||
        (c.state ?? "").toLowerCase().includes(q)

      const matchesCategory =
        category === "All" ? true : normalizeCategory(c.category) === category

      return matchesQuery && matchesCategory
    })
  }, [clients, query, category])

  const handleDelete = async (clientId: string | number): Promise<void> => {
    try {
      setIsDeleting(true)
      const { error } = await supabase.from("clients").delete().eq("id", clientId)
      if (error) throw error
      const nextClients = clients.filter((client) => client.id !== clientId)
      setClients(nextClients)
      writeListCache(CLIENTS_LIST_CACHE_KEY, nextClients)
      setActiveClient((current) => (current?.id === clientId ? null : current))
      feedback.success('Client deleted')
      setClientToDelete(null)
    } catch (err: any) {
      feedback.error(getUserFacingMutationMessage(err, { action: 'save' }))
    } finally {
      setIsDeleting(false)
    }
  }

  const filterOptions = [
    {
      label: "Category",
      value: category,
      options: categories,
      onChange: (v: string) => setCategory(v),
    },
  ]

  return (
    <Layout title="Clients" session={null} hidePageHeader>
      <ModuleShell
        eyebrow="Directory"
        title="Clients"
        summary={loading ? "Loading clients..." : `${filtered.length} clients total`}
        tone="violet"
        onPrimaryAction={() => navigate("/clients/new")}
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search by name, city, or phone..."
        filters={filterOptions}
        hasActiveFilters={category !== "All"}
        onResetFilters={() => setCategory("All")}
        records={loading ? [] : filtered}
        renderRow={(client) => (
          <ModuleRowCard
            key={client.id}
            title={client.name}
            subtitle={client.phone || "No phone number"}
            tertiary={formatLocation(client.city, client.state)}
            statusLabel={getClientCategoryLabel(client.category)}
            statusClassName="bg-violet-100 text-violet-700"
            onClick={() => navigate(`/clients/${client.id}`)}
            onActionClick={() => setActiveClient(client)}
          />
        )}
        emptyState={
          <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--bd-overlay-radius)] border border-dashed border-border bg-card/50 py-16 text-center shadow-inner">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-[var(--bd-radius-lg)] bg-muted text-muted-foreground">
              <Users className="h-7 w-7" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">No clients found</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {query ? "Try a different search term" : "Add your first client to get started"}
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

      <MobileFab onClick={() => navigate("/clients/new")} ariaLabel="Create client" />

      <ConfirmActionDialog
        open={clientToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setClientToDelete(null)
        }}
        title="Delete this client?"
        description="This cannot be undone."
        confirmLabel="Delete Client"
        onConfirm={() => {
          if (clientToDelete !== null) void handleDelete(clientToDelete)
        }}
        loading={isDeleting}
      />
      <InvoiceListActionSheet
        open={Boolean(activeClient)}
        onOpenChange={(open) => {
          if (!open) setActiveClient(null)
        }}
        eyebrow="Client"
        title={activeClient?.name || "Unknown client"}
        subtitle={
          activeClient
            ? `${formatLocation(activeClient.city, activeClient.state)}${activeClient.phone ? ` · ${activeClient.phone}` : ''}`
            : undefined
        }
        actions={activeClient ? [
          {
            key: "view",
            label: "View",
            icon: <Eye className="h-6 w-6" />,
            onClick: () => navigate(`/clients/${activeClient.id}`),
          },
          {
            key: "edit",
            label: "Edit",
            icon: <Pencil className="h-6 w-6" />,
            onClick: () => navigate(`/clients/edit/${activeClient.id}`),
          },
          {
            key: "archive",
            label: "Archive",
            icon: <Archive className="h-6 w-6" />,
            onClick: () => feedback.info("Archiving is not available in this version."),
          },
          {
            key: "merge",
            label: "Merge",
            icon: <Users className="h-6 w-6" />,
            onClick: () => feedback.info("Merging clients is not available in this version."),
          },
        ] : []}
        deleteAction={activeClient ? {
          key: "delete",
          label: "Delete Client",
          icon: <Trash2 className="h-6 w-6" />,
          onClick: () => setClientToDelete(activeClient.id),
        } : undefined}
      />
    </Layout>
  )
}
