import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../supabase"
import Layout from "../components/Layout"

import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Input } from "../components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table"
import { Skeleton } from "../components/ui/skeleton"
import { Avatar, AvatarFallback } from "../components/ui/avatar"

import { MoreHorizontal, Plus, Search, User } from "lucide-react"

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
    const confirmed = window.confirm("Delete this client? This cannot be undone.")
    if (!confirmed) return

    await supabase.from("clients").delete().eq("id", clientId)
    await reload()
  }

  return (
    <Layout title="Clients">
      <div className="w-full py-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-foreground">Clients</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage client profiles and quickly access their documents.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={() => navigate("/clients/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Add client
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <Card className="mb-4 rounded-xl border border-border bg-card">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 items-center gap-2">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search clients…"
                    className="pl-9"
                  />
                </div>

                {/* Category filter (simple dropdown via DropdownMenu to avoid adding Select dependency issues) */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="shrink-0">
                      {category === "All" ? "Category" : category}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {categories.map((c) => (
                      <DropdownMenuItem
                        key={c}
                        onClick={() => setCategory(c)}
                        className={c === category ? "bg-muted/50" : ""}
                      >
                        {c}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <p className="text-xs text-muted-foreground">
                  {loading ? "Loading…" : `${filtered.length} shown`}
                </p>
                <Button variant="ghost" onClick={reload}>
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {loading ? (
          <>
            {/* Desktop skeleton */}
            <Card className="hidden rounded-xl border border-border bg-card md:block">
              <CardHeader className="border-b border-border bg-muted/50 px-4 py-3 sm:px-6">
                <CardTitle className="text-sm font-medium text-foreground">
                  Clients
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[45%]">Client</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Category</TableHead>
                      <TableHead className="w-[60px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-9 w-9 rounded-lg" />
                            <div className="space-y-2">
                              <Skeleton className="h-3 w-40" />
                              <Skeleton className="h-3 w-24" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><Skeleton className="h-3 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-3 w-32" /></TableCell>
                        <TableCell className="text-right">
                          <Skeleton className="ml-auto h-5 w-24 rounded-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-8 w-8 rounded-md" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Mobile skeleton */}
            <div className="space-y-3 md:hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="rounded-xl border border-border bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-lg" />
                        <div className="space-y-2">
                          <Skeleton className="h-3 w-40" />
                          <Skeleton className="h-3 w-28" />
                        </div>
                      </div>
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                    <div className="mt-3 space-y-2">
                      <Skeleton className="h-3 w-36" />
                      <Skeleton className="h-5 w-24 rounded-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : filtered.length === 0 ? (
          <Card className="rounded-xl border border-border bg-card">
            <CardContent className="flex flex-col items-center justify-center p-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-sm font-medium text-foreground">No clients found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a different search or add your first client.
              </p>
              <div className="mt-5 flex items-center gap-2">
                <Button onClick={() => navigate("/clients/new")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add client
                </Button>
                <Button variant="outline" onClick={() => { setQuery(""); setCategory("All") }}>
                  Clear filters
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop: Table */}
            <Card className="hidden rounded-xl border border-border bg-card md:block">
              <CardHeader className="border-b border-border bg-muted/50 px-4 py-3 sm:px-6">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-sm font-medium text-foreground">
                    Clients
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Click a row to open details.
                  </p>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[45%]">Client</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Category</TableHead>
                      <TableHead className="w-[60px]" />
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filtered.map((client) => {
                      const cat = normalizeCategory(client.category)
                      return (
                        <TableRow
                          key={client.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/clients/${client.id}`)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 rounded-lg">
                                <AvatarFallback className="rounded-lg bg-muted/50 text-xs font-semibold text-foreground">
                                  {initials(client.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-foreground">
                                  {client.name}
                                </div>
                                <div className="truncate text-xs text-muted-foreground">
                                  ID: {String(client.id)}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-sm text-foreground">
                            {client.phone ?? "—"}
                          </TableCell>

                          <TableCell className="text-sm text-muted-foreground">
                            {formatLocation(client.city, client.state)}
                          </TableCell>

                          <TableCell className="text-right">
                            <Badge variant="secondary" className="font-medium">
                              {cat}
                            </Badge>
                          </TableCell>

                          <TableCell
                            onClick={(e) => e.stopPropagation()}
                            className="text-right"
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem
                                  onClick={() => navigate(`/clients/edit/${client.id}`)}
                                >
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => alert("Archive coming soon")}
                                >
                                  Archive
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => alert("Merge coming soon")}
                                >
                                  Merge
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleDelete(client.id)}
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Mobile: Cards */}
            <div className="space-y-3 md:hidden">
              {filtered.map((client) => {
                const cat = normalizeCategory(client.category)
                return (
                  <Card
                    key={client.id}
                    className="rounded-xl border border-border bg-card hover:bg-muted/50"
                    onClick={() => navigate(`/clients/${client.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 rounded-lg">
                            <AvatarFallback className="rounded-lg bg-muted/50 text-xs font-semibold text-foreground">
                              {initials(client.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-foreground">
                              {client.name}
                            </div>
                            <div className="mt-1 truncate text-xs text-muted-foreground">
                              {formatLocation(client.city, client.state)}
                            </div>
                          </div>
                        </div>

                        <div onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem
                                onClick={() => navigate(`/clients/edit/${client.id}`)}
                              >
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => alert("Archive coming soon")}>
                                Archive
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => alert("Merge coming soon")}>
                                Merge
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDelete(client.id)}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="text-sm text-foreground">{client.phone ?? "—"}</div>
                        <Badge variant="secondary" className="shrink-0 font-medium">
                          {cat}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}