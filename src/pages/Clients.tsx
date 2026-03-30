import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../supabase"
import Layout from "../components/Layout"
import ConfirmActionDialog from "../components/ConfirmActionDialog"
import { toast } from "../hooks/use-toast"

import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Card, CardContent } from "../components/ui/card"
import { Input } from "../components/ui/input"
import PageIntro from "../components/layout/PageIntro"
import ListActionSheet from "../components/layout/ListActionSheet"
import { PageShell } from "../components/layout/PageShell"

import { Archive, Eye, MoreHorizontal, Pencil, Plus, Search, Trash2, Users, SlidersHorizontal } from "lucide-react"

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
      <PageShell width="wide" className="pb-32">
        <PageIntro
          eyebrow="Clients"
          title="Clients"
          meta={loading ? "Loading clients..." : `${clients.length} clients total`}
          tone="violet"
          actions={
            <Button onClick={() => navigate("/clients/new")} className="h-11 rounded-[14px] bg-slate-950 px-4 text-sm font-semibold">
              <Plus className="mr-2 h-4 w-4" />
              New
            </Button>
          }
          toolbar={
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search clients..."
                    className="h-11 rounded-[14px] border-zinc-200 bg-white pl-9"
                  />
                </div>
                <Button variant="outline" size="icon-lg" className="rounded-[14px] bg-white" onClick={() => setShowFilters((prev) => !prev)}>
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </div>

              {showFilters ? (
                <div className="flex flex-wrap gap-2 rounded-[18px] border border-zinc-200 bg-white p-3">
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
            </div>
          }
        />

        {loading ? (
          <div className="mt-4 grid gap-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Card key={index} className="rounded-[22px] border border-border bg-white shadow-[0_16px_34px_-30px_rgba(15,23,42,0.45)]">
                <CardContent className="p-4">
                  <div className="h-20 animate-pulse rounded-[16px] bg-slate-100" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="mt-4 rounded-[22px] border border-dashed border-border bg-white shadow-[0_16px_34px_-30px_rgba(15,23,42,0.45)]">
            <CardContent className="flex flex-col items-center justify-center p-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-muted/60">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">No clients found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a different search or add your first client.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-4 grid gap-3">
            {filtered.map((client) => {
              const cat = normalizeCategory(client.category)
              return (
                <Card
                  key={client.id}
                  className="cursor-pointer rounded-[22px] border border-border bg-white shadow-[0_16px_34px_-30px_rgba(15,23,42,0.45)] transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_40px_-32px_rgba(15,23,42,0.42)]"
                  onClick={() => navigate(`/clients/${client.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-[16px] border border-violet-100 bg-violet-50 text-sm font-extrabold text-violet-700">
                        {initials(client.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[17px] font-bold tracking-[-0.02em] text-foreground">
                          {client.name}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {formatLocation(client.city, client.state)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveClient(client)
                        }}
                        className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-border bg-white text-muted-foreground shadow-sm"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{client.phone ?? "—"}</span>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-zinc-200 pt-3">
                      <Badge variant="secondary" className="font-medium">
                        {cat}
                      </Badge>
                      <div className="text-xs font-medium text-muted-foreground">Open client</div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        <Button
          onClick={() => navigate("/clients/new")}
          className="fixed bottom-28 right-5 z-50 h-16 w-16 rounded-[20px] border border-white/20 bg-slate-950 p-0 text-white shadow-[0_22px_40px_-18px_rgba(15,23,42,0.65)] transition-transform hover:scale-105 md:hidden"
          aria-label="Add client"
        >
          <Plus className="h-7 w-7" />
        </Button>
      </PageShell>
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
