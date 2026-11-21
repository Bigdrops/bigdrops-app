import React, { useState } from 'react'
import {
  Activity,
  ArrowDown,
  ArrowUp,
  BarChart2,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Layers,
  MessageSquare,
  MessageSquareText,
  Mic,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { SpeakingSpeedSegmentedControl } from './SpeakingSpeedSegmentedControl'
import {
  MOCK_CATALOGUE_PROVIDERS,
  MOCK_CONNECTIONS,
  MOCK_MODELS,
  MOCK_ROUTING_EVENTS,
  MOCK_USAGE_STATS,
  type MockConnection,
} from './mock-data'

interface Approach2Props {
  onToast?: (message: string) => void
}

export function Approach2TabHub({ onToast }: Approach2Props) {
  const [connections, setConnections] = useState<MockConnection[]>(MOCK_CONNECTIONS)
  const [activeTab, setActiveTab] = useState<'overview' | 'connections' | 'models' | 'activity'>('overview')
  const [search, setSearch] = useState('')
  const [haptics, setHaptics] = useState(true)
  const [completionPulse, setCompletionPulse] = useState(true)
  const [readAloud, setReadAloud] = useState(true)
  const [speakingSpeed, setSpeakingSpeed] = useState(1.0)

  const notify = (msg: string) => {
    if (onToast) onToast(msg)
  }

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

  const primary = connections.find((c) => c.isPrimary) ?? connections[0]
  const inPoolCount = connections.filter((c) => c.inPool).length
  const healthyCount = connections.filter((c) => c.healthStatus === 'healthy').length

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 pb-20 text-foreground">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-bd-border/70 pb-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            Bolu AI Infrastructure
          </h1>
          <p className="text-xs text-muted-foreground">
            Multi-account priority routing · Encrypted server-side credentials
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="min-h-[44px] px-3.5 text-xs font-semibold"
            onClick={() => notify('Mock status refreshed')}
          >
            <RefreshCw size={14} className="mr-1.5" />
            Refresh
          </Button>
          <Button
            className="min-h-[44px] px-4 text-xs font-semibold"
            onClick={() => notify('Add Connection Dialog opened')}
          >
            <Plus size={15} className="mr-1.5" />
            Add connection
          </Button>
        </div>
      </div>

      {/* Tabs Bar with Min 44px Touch Target */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-12 p-1 bg-muted/80 rounded-xl">
          <TabsTrigger value="overview" className="min-h-[40px] text-xs font-semibold rounded-lg">
            Overview
          </TabsTrigger>
          <TabsTrigger value="connections" className="min-h-[40px] text-xs font-semibold rounded-lg">
            Connections ({connections.length})
          </TabsTrigger>
          <TabsTrigger value="models" className="min-h-[40px] text-xs font-semibold rounded-lg">
            Models (24)
          </TabsTrigger>
          <TabsTrigger value="activity" className="min-h-[40px] text-xs font-semibold rounded-lg">
            Activity & Logs
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: OVERVIEW ── */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Runtime Status Card (Max 1 card level) */}
          <div className="rounded-2xl border border-bd-border bg-card p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-bd-border/70 pb-3">
              <div className="flex items-center gap-2">
                <Cpu size={18} className="text-foreground" />
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">
                  Live Runtime & Pool
                </h2>
              </div>
              <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                <Zap size={12} className="mr-1" />
                Active Vault
              </Badge>
            </div>

            {/* Flat metrics list (No nested cards) */}
            <div className="grid gap-3 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-bd-border/60">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Active Primary Provider
                </span>
                <p className="text-base font-bold text-foreground flex items-center gap-2">
                  <span>{primary.name}</span>
                  <span className="rounded bg-bd-primary/10 text-bd-primary px-1.5 py-0.5 font-mono text-[11px]">
                    Priority P{primary.priority}
                  </span>
                </p>
                <p className="text-xs font-mono text-muted-foreground">{primary.activeModel}</p>
              </div>

              <div className="space-y-1 sm:pl-4 pt-2 sm:pt-0">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Routing Pool Health
                </span>
                <p className="text-base font-bold text-foreground">
                  {inPoolCount} of {connections.length} in pool ·{' '}
                  <span className="text-emerald-600 dark:text-emerald-400">{healthyCount} healthy</span>
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  Atomic claim with bounded failover
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed pt-2 border-t border-bd-border/60">
              <span className="font-semibold text-foreground">Failover Guarantee:</span> Inference requests atomically select the highest-priority enabled connection participating in the pool. If a provider rate limit occurs, Bolu automatically fails over to the next eligible connection.
            </p>
          </div>

          {/* AI Features & Interaction (Flat rows, max 1 card level) */}
          <div className="rounded-2xl border border-bd-border bg-card p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-bd-border/70 pb-3">
              <Sparkles size={18} className="text-amber-500" />
              <div>
                <h2 className="text-sm font-bold text-foreground">Device Interaction & Feedback</h2>
                <p className="text-xs text-muted-foreground">Applies to this device only (client haptics and voice speed)</p>
              </div>
            </div>

            <div className="space-y-3 divide-y divide-bd-border/60">
              <div className="flex items-center justify-between pt-1 min-h-[44px]">
                <div className="min-w-0 pr-3">
                  <p className="text-xs font-semibold text-foreground">Haptic feedback</p>
                  <p className="text-[11px] text-muted-foreground">Vibrate when Bolu starts generating responses.</p>
                </div>
                <Switch checked={haptics} onCheckedChange={setHaptics} aria-label="Toggle haptic feedback" />
              </div>

              <div className="flex items-center justify-between pt-3 min-h-[44px]">
                <div className="min-w-0 pr-3">
                  <p className="text-xs font-semibold text-foreground">Completion pulse</p>
                  <p className="text-[11px] text-muted-foreground">Double pulse when stream completes.</p>
                </div>
                <Switch checked={completionPulse} disabled={!haptics} onCheckedChange={setCompletionPulse} aria-label="Toggle completion pulse" />
              </div>

              <div className="flex items-center justify-between pt-3 min-h-[44px]">
                <div className="min-w-0 pr-3">
                  <p className="text-xs font-semibold text-foreground">Read responses aloud</p>
                  <p className="text-[11px] text-muted-foreground">Enable speech synthesis for completed answers.</p>
                </div>
                <Switch checked={readAloud} onCheckedChange={setReadAloud} aria-label="Toggle read responses aloud" />
              </div>

              {/* Speaking speed with 44px min touch target */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 min-h-[44px]">
                <div>
                  <p className="text-xs font-semibold text-foreground">Speaking speed</p>
                  <p className="text-[11px] text-muted-foreground">Adjust device voice playback speed.</p>
                </div>
                <SpeakingSpeedSegmentedControl
                  value={speakingSpeed}
                  onChange={setSpeakingSpeed}
                  disabled={!readAloud}
                  touchTargetMin44={true}
                />
              </div>
            </div>
          </div>

          {/* Quick Catalogue Grid */}
          <div className="rounded-2xl border border-bd-border bg-card p-4 sm:p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-foreground">Curated Provider Directory</h2>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {MOCK_CATALOGUE_PROVIDERS.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-bd-border bg-background p-3">
                  <div>
                    <p className="text-xs font-bold text-foreground">{p.name}</p>
                    <span className="text-[10px] text-muted-foreground">{p.protocol}</span>
                  </div>
                  <Button
                    variant="outline"
                    className="min-h-[44px] px-3 text-xs font-semibold"
                    onClick={() => notify(`Connect ${p.name} clicked`)}
                  >
                    Connect
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 2: CONNECTIONS ── */}
        <TabsContent value="connections" className="space-y-3 mt-4">
          <div className="space-y-3">
            {connections.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border border-bd-border bg-card p-4 sm:p-5 shadow-xs space-y-3"
              >
                {/* Header (No nested card, flat header row) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-bd-border/60 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted font-bold text-sm">
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-foreground">{c.name}</h3>
                        {c.isPrimary && (
                          <Badge className="text-[10px] bg-bd-primary/20 text-bd-primary border-bd-primary/30">
                            Primary
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">· {c.protocol}</span>
                      </div>
                      <p className="font-mono text-xs text-muted-foreground">{c.maskedKey} · {c.baseUrl}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono px-2 py-1 rounded bg-muted">
                      Priority: P{c.priority}
                    </span>
                    <Badge variant={c.healthStatus === 'healthy' ? 'default' : 'secondary'} className="text-[10px]">
                      {c.healthStatus}
                    </Badge>
                  </div>
                </div>

                {/* Flat Action & Stepper Row with 44px min touch targets */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    {/* Priority rank 44px steppers */}
                    <span className="text-xs text-muted-foreground mr-1">Rank:</span>
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

                    {/* Pool Participation Switch with 44px tap container */}
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none px-2 py-1.5 rounded-lg hover:bg-muted min-h-[44px]">
                      <Switch
                        checked={c.inPool}
                        onCheckedChange={() => handleTogglePool(c.id)}
                        aria-label="Toggle pool participation"
                      />
                      <span>In Pool</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    <Button
                      variant="outline"
                      className="min-h-[44px] px-3.5 text-xs font-semibold"
                      onClick={() => notify(`Tested ${c.name}`)}
                    >
                      <CheckCircle2 size={14} className="mr-1.5" />
                      Test
                    </Button>
                    <Button
                      variant="outline"
                      className="min-h-[44px] px-3.5 text-xs font-semibold"
                      onClick={() => notify(`Edit ${c.name}`)}
                    >
                      <Settings size={14} className="mr-1.5" />
                      Edit
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
        </TabsContent>

        {/* ── TAB 3: MODELS ── */}
        <TabsContent value="models" className="space-y-4 mt-4">
          <div className="rounded-2xl border border-bd-border bg-card p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-bd-border/70 pb-3">
              <div>
                <h2 className="text-sm font-bold text-foreground">Model Picker Visibility</h2>
                <p className="text-xs text-muted-foreground">Select models accessible in user chat interfaces</p>
              </div>
              <Badge variant="secondary" className="self-start sm:self-auto text-xs">
                24 active in picker
              </Badge>
            </div>

            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-3.5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search models across all providers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-h-[44px] pl-10 text-xs bg-muted/50 rounded-xl"
              />
            </div>

            {/* Flat Model Rows with 44px min touch target */}
            <div className="divide-y divide-bd-border/60 border border-bd-border/70 rounded-xl overflow-hidden bg-background">
              {MOCK_MODELS.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3.5 hover:bg-muted/40 transition-colors min-h-[48px]"
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground truncate">{m.label}</span>
                      {m.isFree && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                          Free
                        </span>
                      )}
                      {m.isDefault && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-bd-primary/10 text-bd-primary font-semibold border border-bd-primary/20">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-[11px] text-muted-foreground truncate">{m.id}</p>
                  </div>

                  <div className="flex items-center min-h-[44px] min-w-[44px] justify-end">
                    <Switch
                      checked={m.enabled}
                      onCheckedChange={() => notify(`Toggled ${m.label}`)}
                      aria-label={`Toggle model ${m.label}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 4: ACTIVITY & LOGS ── */}
        <TabsContent value="activity" className="space-y-4 mt-4">
          {/* Usage Totals */}
          <div className="rounded-2xl border border-bd-border bg-card p-4 sm:p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-foreground">AI Consumption (Last 30 Days)</h2>
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
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Estimated Cost</span>
                <p className="text-lg font-bold text-foreground mt-0.5">{MOCK_USAGE_STATS.costUsd}</p>
              </div>
              <div className="rounded-xl border border-bd-border bg-background p-3">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Failed Requests</span>
                <p className="text-lg font-bold text-foreground mt-0.5">{MOCK_USAGE_STATS.failedRequests}</p>
              </div>
            </div>
          </div>

          {/* Routing Logs */}
          <div className="rounded-2xl border border-bd-border bg-card p-4 sm:p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-foreground">Recent Routing Events</h2>
            <div className="divide-y divide-bd-border/60 border border-bd-border/70 rounded-xl overflow-hidden bg-background font-mono text-xs">
              {MOCK_ROUTING_EVENTS.map((evt) => (
                <div key={evt.id} className="p-3 space-y-1">
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
