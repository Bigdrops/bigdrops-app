import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../supabase"
import Layout from "../components/Layout"
import ConfirmActionDialog from "../components/ConfirmActionDialog"
import { toast } from "../hooks/use-toast"

import { Button } from "../components/ui/button"
import ListActionSheet from "../components/layout/ListActionSheet"
import MobileFab from "../components/layout/MobileFab"
import MobileListPageShell from "../components/layout/MobileListPageShell"
import EntityListCard from "../components/list/EntityListCard"

import { Archive, Eye, Pencil, Plus, Trash2, Users } from "lucide-react"

type Client = {
  id: string | number
  name: string
  phone?: string | null
  city?: string | null
  state?: string | null
  category?: string | null
}

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

export default function Clients(): JSX.Element {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [query, setQuery] = useState<string>("")
  const [category, setCategory] = useState<string>("All")
  const [showFilters, setShowFilters] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<string | number | null>(null)
  const [activeClient, setActiveClient] = useState<Client | null>(null)

  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true

    const run = async () => {
      setLoading(true)
      const { data, error } = await supabase.from("clients").select("*").order("name")

      if (!mounted) return
      if (error) console.error("Error:", error)

      setClients((data as Client[]) || [])
      setLoading(false)
    }

    run()
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

  const reload = async () => {
    setLoading(true)
    const { data, error } = await supabase.from("clients").select("*").order("name")
    if (error) console.error("Error:", error)
    setClients((data as Client[]) || [])
    setLoading(false)
  }

  const handleDelete = async (clientId: string | number): Promise<void> => {
    await supabase.from("clients").delete().eq("id", clientId)
    setClientToDelete(null)
    await reload()
  }

  return (
    <Layout title="Clients" hidePageHeader>
      <MobileListPageShell
          eyebrow="Clients"
          title="Clients"
          summary={loading ? "Loading clients..." : `${clients.length} clients total`}
          tone="violet"
          searchValue={query}
          onSearchChange={setQuery}
          searchPlaceholder="Search clients..."
          onFilterClick={() => setShowFilters((prev) => !prev)}
          filterPanel={showFilters ? (
            <div className="flex flex-wrap gap-2">
              {categories.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setCategory(option)}
                  className={option === category
                    ? "rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                    : "rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600"}
                >
                  {option}
                </button>
              ))}
              <Button variant="ghost" className="h-8 rounded-full px-3 text-xs font-semibold" onClick={reload}>
                Refresh
              </Button>
            </div>
          ) : null}
      >

        {loading ? (
          <div className="grid gap-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="rounded-[22px] border border-border bg-white p-4 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.45)]">
                <div className="h-20 animate-pulse rounded-[16px] bg-slate-100" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-border bg-white p-10 text-center shadow-[0_16px_34px_-30px_rgba(15,23,42,0.45)]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[16px] bg-muted/60">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">No clients found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Try a different search or add your first client.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((client) => {
              const cat = normalizeCategory(client.category)
              return (
                <EntityListCard
                  key={client.id}
                  leading={<div className="grid h-12 w-12 place-items-center rounded-2xl border border-violet-100 bg-violet-50 text-sm font-extrabold text-violet-700">{initials(client.name)}</div>}
                  title={client.name}
                  subtitle={formatLocation(client.city, client.state)}
                  metadata={[client.phone ?? "—"]}
                  chips={[{ label: cat, tone: cat === "Client" ? "scope" : "tag" }]}
                  onClick={() => navigate(`/clients/${client.id}`)}
                  onAction={() => setActiveClient(client)}
                />
              )
            })}
          </div>
        )}

        <MobileFab onClick={() => navigate("/clients/new")} ariaLabel="Create client">
          <Plus className="h-7 w-7" />
        </MobileFab>
      </MobileListPageShell>
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
      />
      <ListActionSheet
        open={Boolean(activeClient)}
        onOpenChange={(open) => {
          if (!open) setActiveClient(null)
        }}
        eyebrow="Client"
        title={activeClient?.name || "Unknown client"}
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
            onClick: () => toast({ title: "Coming soon", description: "Archive coming soon." }),
          },
          {
            key: "merge",
            label: "Merge",
            icon: <Users className="h-6 w-6" />,
            onClick: () => toast({ title: "Coming soon", description: "Merge coming soon." }),
          },
        ] : []}
        deleteAction={activeClient ? {
          label: "Delete Client",
          icon: <Trash2 className="h-6 w-6" />,
          onClick: () => setClientToDelete(activeClient.id),
        } : undefined}
      />
    </Layout>
  )
}
