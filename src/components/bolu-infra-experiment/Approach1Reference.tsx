import React, { useState } from 'react'
import {
  ArrowLeft,
  BarChart2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Cpu,
  FileText,
  Layers,
  MessageSquare,
  MessageSquareText,
  Mic,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Trophy,
  Users,
  Briefcase,
  TrendingUp,
  Home,
  Info,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { SpeakingSpeedSegmentedControl } from './SpeakingSpeedSegmentedControl'
import {
  MOCK_CATALOGUE_PROVIDERS,
  MOCK_CONNECTIONS,
  MOCK_MODELS,
  MOCK_USAGE_STATS,
} from './mock-data'

interface Approach1Props {
  onBack?: () => void
  onToast?: (message: string) => void
}

export function Approach1Reference({ onBack, onToast }: Approach1Props) {
  const [search, setSearch] = useState('')
  const [haptics, setHaptics] = useState(true)
  const [completionPulse, setCompletionPulse] = useState(true)
  const [readAloud, setReadAloud] = useState(true)
  const [speakingSpeed, setSpeakingSpeed] = useState(1.0)
  const [modelsExpanded, setModelsExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<'more'>('more')

  const notify = (msg: string) => {
    if (onToast) onToast(msg)
  }

  const primaryConn = MOCK_CONNECTIONS[0]

  return (
    <div className="w-full max-w-md mx-auto space-y-4 pb-24 text-foreground">
      {/* Top App Bar */}
      <div className="flex items-center justify-between px-1 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-bd-border bg-background shadow-xs hover:bg-muted"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="text-center min-w-0 flex-1 px-3">
          <h1 className="text-base font-bold tracking-tight text-foreground truncate">
            AI Infrastructure
          </h1>
          <p className="text-[11px] text-muted-foreground truncate">
            Configure and manage Bolu's AI capabilities
          </p>
        </div>
        <button
          type="button"
          onClick={() => notify('Mock status refreshed')}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-bd-border bg-background shadow-xs hover:bg-muted"
          aria-label="Refresh"
        >
          <RefreshCw size={17} />
        </button>
      </div>

      {/* Hero Banner Card */}
      <div className="relative overflow-hidden rounded-2xl border border-bd-border bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/70 p-4 shadow-md text-white">
        <div className="flex items-center gap-3">
          {/* Glowing Golden Chip */}
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-amber-500/50 bg-amber-950/40 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
            <span className="font-mono text-sm font-black tracking-wider text-amber-400">
              BX
            </span>
            <div className="absolute -top-1 left-3 h-1 w-2 bg-amber-400/80 rounded-t-sm" />
            <div className="absolute -top-1 right-3 h-1 w-2 bg-amber-400/80 rounded-t-sm" />
            <div className="absolute -bottom-1 left-3 h-1 w-2 bg-amber-400/80 rounded-b-sm" />
            <div className="absolute -bottom-1 right-3 h-1 w-2 bg-amber-400/80 rounded-b-sm" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white truncate">
                Bolu AI Infrastructure
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-950/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-300 leading-tight">
              Multi-provider • Intelligent routing • Seamless fallback
            </p>
          </div>

          <ChevronRight size={18} className="text-slate-400 shrink-0" />
        </div>
      </div>

      {/* Quick Action Tiles */}
      <div className="grid grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => notify('Usage stats opened')}
          className="flex flex-col items-center justify-center rounded-xl border border-bd-border bg-card p-3 shadow-2xs hover:bg-muted transition-colors"
        >
          <BarChart2 size={18} className="text-foreground mb-1.5" />
          <span className="text-[11px] font-semibold text-foreground">Usage</span>
        </button>
        <button
          type="button"
          onClick={() => notify('Leaderboard opened')}
          className="flex flex-col items-center justify-center rounded-xl border border-bd-border bg-card p-3 shadow-2xs hover:bg-muted transition-colors"
        >
          <Trophy size={18} className="text-foreground mb-1.5" />
          <span className="text-[11px] font-semibold text-foreground">Leaderboard</span>
        </button>
        <button
          type="button"
          onClick={() => notify('Logs opened')}
          className="flex flex-col items-center justify-center rounded-xl border border-bd-border bg-card p-3 shadow-2xs hover:bg-muted transition-colors"
        >
          <FileText size={18} className="text-foreground mb-1.5" />
          <span className="text-[11px] font-semibold text-foreground">Logs</span>
        </button>
        <button
          type="button"
          onClick={() => notify('Advanced settings opened')}
          className="flex flex-col items-center justify-center rounded-xl border border-bd-border bg-card p-3 shadow-2xs hover:bg-muted transition-colors"
        >
          <Settings size={18} className="text-foreground mb-1.5" />
          <span className="text-[11px] font-semibold text-foreground">Advanced</span>
        </button>
      </div>

      {/* Models Card */}
      <div className="rounded-2xl border border-bd-border bg-card p-4 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-bd-border bg-muted">
              <Layers size={17} className="text-foreground" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">Models</h3>
              <p className="text-[11px] text-muted-foreground">
                Choose which models appear in model picker
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
              24 active
            </span>
            <ChevronRight size={16} className="text-muted-foreground" />
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 text-xs bg-muted/50 rounded-lg"
          />
        </div>

        {/* Selected Provider Item */}
        <div className="flex items-center justify-between rounded-xl border border-bd-border bg-background p-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-amber-400 font-bold font-mono text-xs">
              BX
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate">{primaryConn.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {primaryConn.activeModelCount} active • Auto-enabled
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setModelsExpanded(!modelsExpanded)}
            className="inline-flex items-center gap-1 rounded-full border border-bd-border bg-background px-3 py-1 text-[11px] font-semibold text-foreground hover:bg-muted"
          >
            <Settings size={12} />
            <span>Manage</span>
            <ChevronRight size={12} />
          </button>
        </div>

        {/* Expanded Models List */}
        {modelsExpanded && (
          <div className="divide-y divide-bd-border/50 rounded-lg border border-bd-border bg-background p-2 space-y-1.5 max-h-48 overflow-y-auto">
            {MOCK_MODELS.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-1.5 text-xs">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="truncate font-medium">{m.label}</p>
                  <p className="truncate text-[10px] font-mono text-muted-foreground">{m.id}</p>
                </div>
                <Switch size="sm" checked={m.enabled} onCheckedChange={() => notify(`Toggled ${m.label}`)} />
              </div>
            ))}
          </div>
        )}

        {/* Footer Toggle */}
        <button
          type="button"
          onClick={() => setModelsExpanded(!modelsExpanded)}
          className="flex w-full items-center justify-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline pt-1"
        >
          <span>{modelsExpanded ? 'Collapse models' : 'View all models (24)'}</span>
          <ChevronDown size={14} className={cn(modelsExpanded && 'rotate-180')} />
        </button>
      </div>

      {/* AI Features (Chat Interaction) */}
      <div className="rounded-2xl border border-bd-border bg-card p-4 shadow-sm space-y-3.5">
        <div className="flex items-center gap-2">
          <Sparkles size={17} className="text-amber-500" />
          <div>
            <h3 className="text-xs font-bold text-foreground">AI Features</h3>
            <p className="text-[11px] text-muted-foreground">Customize how Bolu responds</p>
          </div>
        </div>

        <div className="space-y-3 divide-y divide-bd-border/60">
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-start gap-2.5 min-w-0 pr-2">
              <MessageSquare size={16} className="mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs font-semibold text-foreground">Haptic feedback</p>
                <p className="text-[11px] text-muted-foreground">Feel when Bolu starts typing.</p>
              </div>
            </div>
            <Switch checked={haptics} onCheckedChange={setHaptics} aria-label="Toggle haptic feedback" />
          </div>

          <div className="flex items-center justify-between pt-3">
            <div className="flex items-start gap-2.5 min-w-0 pr-2">
              <CheckCircle2 size={16} className="mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs font-semibold text-foreground">Completion pulse</p>
                <p className="text-[11px] text-muted-foreground">
                  A brief double tap when response finishes.
                </p>
              </div>
            </div>
            <Switch
              checked={completionPulse}
              disabled={!haptics}
              onCheckedChange={setCompletionPulse}
              aria-label="Toggle completion pulse"
            />
          </div>

          <div className="flex items-center justify-between pt-3">
            <div className="flex items-start gap-2.5 min-w-0 pr-2">
              <MessageSquareText size={16} className="mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs font-semibold text-foreground">Read responses aloud</p>
                <p className="text-[11px] text-muted-foreground">Have Bolu read completed responses.</p>
              </div>
            </div>
            <Switch checked={readAloud} onCheckedChange={setReadAloud} aria-label="Toggle read responses aloud" />
          </div>

          {/* Speaking Speed Segmented Control */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <Mic size={16} className="mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs font-semibold text-foreground">Speaking speed</p>
                <p className="text-[11px] text-muted-foreground">Adjust the device voice speed.</p>
              </div>
            </div>
            <SpeakingSpeedSegmentedControl
              value={speakingSpeed}
              onChange={setSpeakingSpeed}
              disabled={!readAloud}
            />
          </div>
        </div>
      </div>

      {/* AI Usage & Leaderboard Row */}
      <button
        type="button"
        onClick={() => notify('AI Usage & Leaderboard clicked')}
        className="flex w-full items-center justify-between rounded-2xl border border-bd-border bg-card p-4 shadow-sm hover:bg-muted/60 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-bd-border bg-muted">
            <BarChart2 size={16} className="text-foreground" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground">AI Usage & Leaderboard</h3>
            <p className="text-[11px] text-muted-foreground">View usage stats and rankings</p>
          </div>
        </div>
        <ChevronRight size={17} className="text-muted-foreground" />
      </button>

      {/* Curated Provider Catalogue */}
      <div className="rounded-2xl border border-bd-border bg-card p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Layers size={17} className="text-foreground" />
          <div>
            <h3 className="text-xs font-bold text-foreground">Curated Provider Catalogue</h3>
            <p className="text-[11px] text-muted-foreground">Premium models from trusted providers</p>
          </div>
        </div>

        {/* Carousel */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
          {MOCK_CATALOGUE_PROVIDERS.slice(0, 4).map((p) => (
            <div
              key={p.id}
              className="flex w-36 shrink-0 flex-col items-center justify-between rounded-xl border border-bd-border bg-background p-3 text-center shadow-xs"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-bold text-xs text-foreground mb-1.5">
                {p.name.slice(0, 2).toUpperCase()}
              </div>
              <p className="text-xs font-bold text-foreground truncate w-full">{p.name}</p>
              <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {p.connected ? 'Connected' : 'Available'}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2.5 h-7 w-full text-[10px] font-semibold"
                onClick={() => notify(`Clicked Connect on ${p.name}`)}
              >
                Connect
              </Button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => notify('Next providers in catalogue')}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-bd-border bg-background shadow-xs hover:bg-muted"
            aria-label="More providers"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Info callout */}
        <div className="flex items-center gap-2 rounded-xl border border-bd-status-info-border bg-bd-status-info-bg/40 p-2.5 text-[11px] text-bd-status-info-text">
          <Info size={14} className="shrink-0" />
          <p>Multi-provider support ensures reliability and better performance.</p>
        </div>
      </div>

      {/* Mock Bottom Navigation Preview */}
      <div className="sticky bottom-0 left-0 right-0 z-10 flex items-center justify-around border-t border-bd-border bg-background/95 backdrop-blur-md px-2 py-1.5 shadow-lg rounded-t-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('more')}
          className="flex flex-col items-center py-1 text-[10px] text-muted-foreground hover:text-foreground"
        >
          <Home size={18} />
          <span>HOME</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('more')}
          className="flex flex-col items-center py-1 text-[10px] text-muted-foreground hover:text-foreground"
        >
          <Briefcase size={18} />
          <span>PROJECTS</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('more')}
          className="flex flex-col items-center py-1 text-[10px] text-muted-foreground hover:text-foreground"
        >
          <TrendingUp size={18} />
          <span>SALES</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('more')}
          className="flex flex-col items-center py-1 text-[10px] text-muted-foreground hover:text-foreground"
        >
          <Users size={18} />
          <span>CLIENTS</span>
        </button>
        <button
          type="button"
          className="flex flex-col items-center rounded-xl bg-amber-700 text-white px-3 py-1 text-[10px] font-bold"
        >
          <MoreHorizontal size={18} />
          <span>MORE</span>
        </button>
      </div>
    </div>
  )
}
