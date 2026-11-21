import React, { useState } from 'react'
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BarChart2,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  Zap,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  MOCK_CATALOGUE_PROVIDERS,
  MOCK_CONNECTIONS,
  MOCK_MODELS,
  MOCK_ROUTING_EVENTS,
  MOCK_USAGE_STATS,
  type MockConnection,
} from './mock-data'

type SubPage = 'menu' | 'runtime' | 'connections' | 'models' | 'usage' | 'catalogue'

interface Approach3Props {
  onToast?: (message: string) => void
}

export function Approach3DrillDown({ onToast }: Approach3Props) {
  const [subPage, setSubPage] = useState<SubPage>('menu')
  const [connections, setConnections] = useState<MockConnection[]>(MOCK_CONNECTIONS)
  const [search, setSearch] = useState('')

  const notify = (msg: string) => {
    if (onToast) onToast(msg)
  }

  const primary = connections.find((c) => c.isPrimary) ?? connections[0]
  const inPoolCount = connections.filter((c) => c.inPool).length
  const healthyCount = connections.filter((c) => c.healthStatus === 'healthy').length

  const handleTogglePool = (id: string) => {
    setConnections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, inPool: !c.inPool } : c)),
    )
    notify('Pool participation updated')
  }

  const handlePriority = (id: string, delta: number) => {
    setConnections((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, priority: Math.max(1, c.priority + delta) } : c,
      ),
    )
    notify('Priority updated')
  }

  // ── SUB-PAGE 1: RUNTIME & POOL ──
  if (subPage === 'runtime') {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-4 pb-20 text-foreground">
        <button
          type="button"
          onClick={() => setSubPage('menu')}
          className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground min-h-[44px] px-2 rounded-lg"
        >
          <ArrowLeft size={16} /> Back to AI Infrastructure
        </button>

        <div className="rounded-2xl border border-bd-border bg-card p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-bd-border pb-3">
            <h2 className="text-base font-bold text-foreground">Live Runtime & Pool Status</h2>
            <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30">
              <Zap size={12} className="mr-1" /> Active Vault
            </Badge>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-bd-border bg-background p-4">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Active Primary Connection</span>
              <p className="text-lg font-bold text-foreground mt-1">{primary.name} (Priority P{primary.priority})</p>
              <p className="text-xs font-mono text-muted-foreground mt-0.5">{primary.activeModel}</p>
            </div>

            <div className="rounded-xl border border-bd-border bg-background p-4">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Pool Health Summary</span>
              <p className="text-lg font-bold text-foreground mt-1">
                {inPoolCount} of {connections.length} in Pool · <span className="text-emerald-600 dark:text-emerald-400">{healthyCount} Healthy</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-500" />
                Atomic claim with bounded failover
              </p>
            </div>

            <div className="rounded-xl border border-bd-border bg-background p-4 text-xs text-muted-foreground leading-relaxed">
              <p className="font-semibold text-foreground mb-1">How Bolu Routes</p>
              Inference requests atomically select the highest-priority enabled connection participating in the pool. If a provider outage or rate limit occurs, Bolu automatically fails over to the next eligible connection before generation begins.
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── SUB-PAGE 2: CONNECTIONS ──
  if (subPage === 'connections') {
    return (
      <div className="w-full max-w-3xl mx-auto space-y-4 pb-20 text-foreground">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSubPage('menu')}
            className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground min-h-[44px] px-2 rounded-lg"
          >
            <ArrowLeft size={16} /> Back to AI Infrastructure
          </button>
          <Button
            className="min-h-[44px] px-3.5 text-xs font-semibold"
            onClick={() => notify('Add Connection Dialog opened')}
          >
            <Plus size={15} className="mr-1.5" /> Add connection
          </Button>
        </div>

        <div className="space-y-3">
          {connections.map((c) => (
            <div key={c.id} className="rounded-2xl border border-bd-border bg-card p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-bd-border/60 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted font-bold text-sm">
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{c.name}</h3>
                    <p className="font-mono text-xs text-muted-foreground">{c.maskedKey} · {c.baseUrl}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={c.healthStatus === 'healthy' ? 'default' : 'secondary'} className="text-[10px]">
                    {c.healthStatus}
                  </Badge>
                  <span className="font-mono text-xs px-2 py-1 rounded bg-muted">P{c.priority}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Priority:</span>
                  <button
                    type="button"
                    onClick={() => handlePriority(c.id, -10)}
                    disabled={c.priority <= 1}
                    aria-label="Increase priority rank"
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-bd-border bg-background hover:bg-muted disabled:opacity-40"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePriority(c.id, 10)}
                    aria-label="Decrease priority rank"
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-bd-border bg-background hover:bg-muted"
                  >
                    <ArrowDown size={16} />
                  </button>

                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none px-2 py-1.5 rounded-lg hover:bg-muted min-h-[44px]">
                    <Switch
                      checked={c.inPool}
                      onCheckedChange={() => handleTogglePool(c.id)}
                      aria-label="Toggle pool participation"
                    />
                    <span>Pool</span>
                  </label>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    variant="outline"
                    className="min-h-[44px] px-3.5 text-xs font-semibold"
                    onClick={() => notify(`Tested ${c.name}`)}
                  >
                    <CheckCircle2 size={14} className="mr-1.5" /> Test
                  </Button>
                  <Button
                    variant="outline"
                    className="min-h-[44px] px-3.5 text-xs font-semibold"
                    onClick={() => notify(`Edit ${c.name}`)}
                  >
                    <Settings size={14} className="mr-1.5" /> Edit
                  </Button>
                  <button
                    type="button"
                    onClick={() => notify(`Deleted ${c.name}`)}
                    aria-label="Delete connection"
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-bd-border bg-background text-muted-foreground hover:text-destructive hover:bg-muted"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── SUB-PAGE 3: MODELS ──
  if (subPage === 'models') {
    return (
      <div className="w-full max-w-3xl mx-auto space-y-4 pb-20 text-foreground">
        <button
          type="button"
          onClick={() => setSubPage('menu')}
          className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground min-h-[44px] px-2 rounded-lg"
        >
          <ArrowLeft size={16} /> Back to AI Infrastructure
        </button>

        <div className="rounded-2xl border border-bd-border bg-card p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-bd-border pb-3">
            <div>
              <h2 className="text-base font-bold text-foreground">Models Visibility Manager</h2>
              <p className="text-xs text-muted-foreground">Select models visible in the client model picker</p>
            </div>
            <Badge variant="secondary" className="text-xs">24 active</Badge>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-3.5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search models..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-h-[44px] pl-10 text-xs bg-muted/50 rounded-xl"
            />
          </div>

          <div className="divide-y divide-bd-border/60 border border-bd-border rounded-xl overflow-hidden bg-background">
            {MOCK_MODELS.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3.5 hover:bg-muted/40 transition-colors min-h-[48px]">
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground truncate">{m.label}</span>
                    {m.isFree && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                        Free
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-[11px] text-muted-foreground truncate">{m.id}</p>
                </div>
                <div className="flex items-center min-h-[44px] min-w-[44px] justify-end">
                  <Switch checked={m.enabled} onCheckedChange={() => notify(`Toggled ${m.label}`)} aria-label={`Toggle ${m.label}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── SUB-PAGE 4: USAGE & LOGS ──
  if (subPage === 'usage') {
    return (
      <div className="w-full max-w-3xl mx-auto space-y-4 pb-20 text-foreground">
        <button
          type="button"
          onClick={() => setSubPage('menu')}
          className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground min-h-[44px] px-2 rounded-lg"
        >
          <ArrowLeft size={16} /> Back to AI Infrastructure
        </button>

        <div className="rounded-2xl border border-bd-border bg-card p-5 space-y-4 shadow-sm">
          <h2 className="text-base font-bold text-foreground">AI Consumption & Telemetry</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-bd-border bg-background p-3">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Requests</span>
              <p className="text-lg font-bold text-foreground mt-0.5">{MOCK_USAGE_STATS.requests}</p>
            </div>
            <div className="rounded-xl border border-bd-border bg-background p-3">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Total Tokens</span>
              <p className="text-lg font-bold font-mono text-foreground mt-0.5">{MOCK_USAGE_STATS.totalTokens}</p>
            </div>
            <div className="rounded-xl border border-bd-border bg-background p-3">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Cost (USD)</span>
              <p className="text-lg font-bold text-foreground mt-0.5">{MOCK_USAGE_STATS.costUsd}</p>
            </div>
            <div className="rounded-xl border border-bd-border bg-background p-3">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Failed</span>
              <p className="text-lg font-bold text-foreground mt-0.5">{MOCK_USAGE_STATS.failedRequests}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-bd-border bg-card p-5 space-y-3 shadow-sm">
          <h2 className="text-base font-bold text-foreground">Recent Routing Events</h2>
          <div className="divide-y divide-bd-border/60 border border-bd-border rounded-xl overflow-hidden bg-background font-mono text-xs">
            {MOCK_ROUTING_EVENTS.map((evt) => (
              <div key={evt.id} className="p-3.5 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="font-bold text-foreground">{evt.eventType}</span>
                  <span>{evt.timestamp}</span>
                </div>
                <p className="text-xs text-foreground font-semibold">{evt.provider} · {evt.model}</p>
                <p className="text-[11px] text-muted-foreground">{evt.reason}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── SUB-PAGE 5: CATALOGUE ──
  if (subPage === 'catalogue') {
    return (
      <div className="w-full max-w-3xl mx-auto space-y-4 pb-20 text-foreground">
        <button
          type="button"
          onClick={() => setSubPage('menu')}
          className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground min-h-[44px] px-2 rounded-lg"
        >
          <ArrowLeft size={16} /> Back to AI Infrastructure
        </button>

        <div className="rounded-2xl border border-bd-border bg-card p-5 space-y-4 shadow-sm">
          <h2 className="text-base font-bold text-foreground">Curated Provider Catalogue</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {MOCK_CATALOGUE_PROVIDERS.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-bd-border bg-background p-3.5">
                <div>
                  <p className="text-sm font-bold text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.protocol}</p>
                </div>
                <Button
                  variant="outline"
                  className="min-h-[44px] px-3.5 text-xs font-semibold"
                  onClick={() => notify(`Connect ${p.name} clicked`)}
                >
                  Connect
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── MAIN MENU VIEW ──
  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 pb-20 text-foreground">
      <div className="border-b border-bd-border/70 pb-3">
        <h1 className="text-lg font-bold tracking-tight text-foreground">
          Bolu AI Infrastructure
        </h1>
        <p className="text-xs text-muted-foreground">
          Enterprise inference provider, models, and priority routing
        </p>
      </div>

      <div className="divide-y divide-bd-border/60 border border-bd-border rounded-2xl overflow-hidden bg-card shadow-sm">
        {/* Row 1: Runtime & Pool */}
        <button
          type="button"
          onClick={() => setSubPage('runtime')}
          className="flex w-full items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left min-h-[56px]"
        >
          <div className="flex items-center gap-3 min-w-0 pr-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-bd-border bg-muted">
              <Cpu size={18} className="text-foreground" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-foreground truncate">Runtime and Pool</h2>
              <p className="text-xs text-muted-foreground truncate">
                Active: {primary.name} (P1) · {inPoolCount} in pool ({healthyCount} healthy)
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-muted-foreground shrink-0" />
        </button>

        {/* Row 2: Connections */}
        <button
          type="button"
          onClick={() => setSubPage('connections')}
          className="flex w-full items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left min-h-[56px]"
        >
          <div className="flex items-center gap-3 min-w-0 pr-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-bd-border bg-muted">
              <Server size={18} className="text-foreground" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-foreground truncate">Saved Connections ({connections.length})</h2>
              <p className="text-xs text-muted-foreground truncate">
                Manage API credentials, failover ranking, and test endpoints
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-muted-foreground shrink-0" />
        </button>

        {/* Row 3: Models */}
        <button
          type="button"
          onClick={() => setSubPage('models')}
          className="flex w-full items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left min-h-[56px]"
        >
          <div className="flex items-center gap-3 min-w-0 pr-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-bd-border bg-muted">
              <Layers size={18} className="text-foreground" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-foreground truncate">Models Visibility Manager</h2>
              <p className="text-xs text-muted-foreground truncate">
                24 active models accessible in Bolu chat selector
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-muted-foreground shrink-0" />
        </button>

        {/* Row 4: Usage & Logs */}
        <button
          type="button"
          onClick={() => setSubPage('usage')}
          className="flex w-full items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left min-h-[56px]"
        >
          <div className="flex items-center gap-3 min-w-0 pr-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-bd-border bg-muted">
              <BarChart2 size={18} className="text-foreground" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-foreground truncate">Usage and Logs</h2>
              <p className="text-xs text-muted-foreground truncate">
                {MOCK_USAGE_STATS.requests} requests · {MOCK_USAGE_STATS.totalTokens} tokens · routing events
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-muted-foreground shrink-0" />
        </button>

        {/* Row 5: Provider Catalogue */}
        <button
          type="button"
          onClick={() => setSubPage('catalogue')}
          className="flex w-full items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left min-h-[56px]"
        >
          <div className="flex items-center gap-3 min-w-0 pr-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-bd-border bg-muted">
              <Plus size={18} className="text-foreground" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-foreground truncate">Curated Provider Catalogue</h2>
              <p className="text-xs text-muted-foreground truncate">
                Discover and connect upstream AI providers
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-muted-foreground shrink-0" />
        </button>
      </div>
    </div>
  )
}
