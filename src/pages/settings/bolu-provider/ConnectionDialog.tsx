import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ChevronDown, Eye, EyeOff, Loader2, RefreshCw, Search, Server, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { feedback } from '@/lib/feedback'
import {
  CUSTOM_PROVIDER_ID,
  PROVIDER_CATALOGUE,
  getCatalogueEntry,
  type ProviderAuthScheme,
  type ProviderProtocol,
} from '@/lib/ai-assistant/provider-catalog'
import { boluProviderApi, type DiscoveredModel, type ProviderDiagnostics, type PublicConnection } from './api'
import { DiagnosticsNote } from './DiagnosticsNote'
import { ProviderLogo } from './ProviderLogo'
import { ModelSelectorModal } from './ModelSelectorModal'

const CUSTOM_MODEL = '__custom__'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  connection: PublicConnection | null
  initialProviderId?: string
  schemaReady: boolean
  onSaved: (connection: PublicConnection) => void
}

export function ConnectionDialog({
  open,
  onOpenChange,
  connection,
  initialProviderId,
  schemaReady,
  onSaved,
}: Props) {
  const isEdit = connection !== null

  const [providerId, setProviderId] = useState(initialProviderId ?? 'openrouter')
  const [name, setName] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [modelChoice, setModelChoice] = useState('')
  const [customModel, setCustomModel] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [protocol, setProtocol] = useState<ProviderProtocol>('openai')
  const [authScheme, setAuthScheme] = useState<ProviderAuthScheme>('bearer')
  const [timeoutMs, setTimeoutMs] = useState(45000)
  const [priority, setPriority] = useState(100)
  const [inPool, setInPool] = useState(true)
  const [isPaidTier, setIsPaidTier] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [discovered, setDiscovered] = useState<DiscoveredModel[]>([])
  const [diagnostics, setDiagnostics] = useState<ProviderDiagnostics | null>(null)
  const [testing, setTesting] = useState(false)
  const [discovering, setDiscovering] = useState(false)
  const [modelPickerOpen, setModelPickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setDiagnostics(null)
    setShowKey(false)
    setAdvancedOpen(false)
    setTesting(false)
    setDiscovering(false)
    setSaving(false)

    if (connection) {
      setProviderId(connection.providerId)
      setName(connection.name)
      setApiKey('')
      setBaseUrl(connection.baseUrl)
      setProtocol(connection.protocol)
      setAuthScheme(connection.authScheme)
      setTimeoutMs(connection.timeoutMs)
      setPriority(connection.priority ?? 100)
      setInPool(connection.inPool ?? true)
      setIsPaidTier(connection.isPaidTier ?? false)
      setDiscovered(connection.discoveredModels ?? [])

      const known = [
        ...(getCatalogueEntry(connection.providerId)?.curatedModels ?? []),
        ...(connection.discoveredModels ?? []),
      ]
      if (known.some((m) => m.id === connection.model)) {
        setModelChoice(connection.model)
        setCustomModel('')
      } else {
        setModelChoice(CUSTOM_MODEL)
        setCustomModel(connection.model)
      }
    } else {
      const entry = getCatalogueEntry(initialProviderId ?? 'openrouter')
      const targetId = entry?.id ?? (initialProviderId === 'custom' ? CUSTOM_PROVIDER_ID : 'openrouter')
      setProviderId(targetId)
      setName('')
      setApiKey('')
      setPriority(100)
      setInPool(true)
      setIsPaidTier(false)
      setTimeoutMs(45000)
      setDiscovered([])

      if (entry) {
        setBaseUrl(entry.baseUrl)
        setProtocol(entry.protocol)
        setAuthScheme(entry.authScheme)
        setModelChoice(entry.defaultModel)
        setCustomModel('')
      } else {
        setBaseUrl('')
        setProtocol('openai')
        setAuthScheme('bearer')
        setModelChoice(CUSTOM_MODEL)
        setCustomModel('')
        setAdvancedOpen(true)
      }
    }
  }, [open, connection, initialProviderId])

  const entry = getCatalogueEntry(providerId)
  const isCustom = providerId === CUSTOM_PROVIDER_ID

  const effectiveModel = modelChoice === CUSTOM_MODEL ? customModel.trim() : modelChoice

  function applyProvider(nextId: string) {
    setProviderId(nextId)
    setDiagnostics(null)
    setDiscovered([])
    const next = getCatalogueEntry(nextId)
    if (next) {
      setBaseUrl(next.baseUrl)
      setProtocol(next.protocol)
      setAuthScheme(next.authScheme)
      setModelChoice(next.defaultModel)
      setCustomModel('')
    } else {
      setBaseUrl('')
      setProtocol('openai')
      setAuthScheme('bearer')
      setModelChoice(CUSTOM_MODEL)
      setCustomModel('')
      setAdvancedOpen(true)
    }
  }

  function inlineTarget() {
    return {
      providerId,
      apiKey: apiKey.trim(),
      baseUrl: baseUrl.trim() || undefined,
      protocol,
      authScheme,
      model: effectiveModel || undefined,
      timeoutMs,
    }
  }

  async function handleTest() {
    if (!isEdit && !apiKey.trim()) {
      feedback.error('Enter an API key before testing.')
      return
    }
    setTesting(true)
    setDiagnostics(null)
    try {
      const target =
        isEdit && !apiKey.trim()
          ? { connectionId: connection.id, model: effectiveModel || undefined }
          : inlineTarget()

      const result = await boluProviderApi.test(target)
      setDiagnostics(result.diagnostics)
      if (result.ok) {
        feedback.success(`Connection verified (${result.diagnostics.latencyMs}ms).`)
      } else {
        feedback.error(`Test failed: ${result.diagnostics.message}`)
      }
    } catch (err) {
      feedback.error(err instanceof Error ? err.message : 'Connection test failed.')
    } finally {
      setTesting(false)
    }
  }

  async function handleDiscover() {
    if (!isEdit && !apiKey.trim()) {
      feedback.error('Enter an API key before discovering models.')
      return
    }
    setDiscovering(true)
    setDiagnostics(null)
    try {
      const target =
        isEdit && !apiKey.trim()
          ? { connectionId: connection.id }
          : inlineTarget()

      const result = await boluProviderApi.discover(target)
      setDiagnostics(result.diagnostics)
      if (result.ok) {
        setDiscovered(result.models)
        feedback.success(`Discovered ${result.models.length} model${result.models.length === 1 ? '' : 's'}.`)
        if (!effectiveModel && result.models.length > 0) setModelChoice(result.models[0].id)
      } else {
        feedback.error(`Discovery failed: ${result.diagnostics.message}`)
      }
    } catch (err) {
      feedback.error(err instanceof Error ? err.message : 'Model discovery failed.')
    } finally {
      setDiscovering(false)
    }
  }

  async function handleSave() {
    if (!schemaReady) {
      feedback.info('Apply migration 20261114170000_bolu_provider_connections.sql to enable persistence.')
      return
    }
    if (!effectiveModel) {
      feedback.error('Select or enter a model identifier.')
      return
    }
    if (!isEdit && !apiKey.trim()) {
      feedback.error('An API key is required.')
      return
    }
    if (isCustom && !baseUrl.trim()) {
      feedback.error('Custom connections require a base URL.')
      return
    }

    setSaving(true)
    try {
      if (isEdit) {
        const patch: Record<string, unknown> = {}
        if (name.trim() && name.trim() !== connection.name) patch.name = name.trim()
        if (effectiveModel !== connection.model) patch.model = effectiveModel
        if (baseUrl.trim() !== connection.baseUrl) patch.baseUrl = baseUrl.trim()
        if (protocol !== connection.protocol) patch.protocol = protocol
        if (authScheme !== connection.authScheme) patch.authScheme = authScheme
        if (timeoutMs !== connection.timeoutMs) patch.timeoutMs = timeoutMs
        if (priority !== connection.priority) patch.priority = priority
        if (inPool !== connection.inPool) patch.inPool = inPool
        if (isPaidTier !== connection.isPaidTier) patch.isPaidTier = isPaidTier
        if (apiKey.trim()) patch.apiKey = apiKey.trim()

        if (Object.keys(patch).length === 0) {
          feedback.info('No changes to save.')
          return
        }
        const result = await boluProviderApi.update(connection.id, patch)
        feedback.success('Connection updated.')
        onSaved(result.connection)
      } else {
        const result = await boluProviderApi.create({
          providerId,
          name: name.trim() || undefined,
          apiKey: apiKey.trim(),
          model: effectiveModel,
          baseUrl: baseUrl.trim() || undefined,
          protocol,
          authScheme,
          timeoutMs,
          priority,
          inPool,
          isPaidTier,
        })
        feedback.success('Connection saved. The credential is encrypted at rest.')
        let saved = result.connection
        if (isCustom) {
          // Custom endpoints have no curated catalogue; cache the live list for Settings → Models.
          try {
            const d = await boluProviderApi.discover({ connectionId: result.connection.id })
            if (d.ok && d.models.length > 0) saved = { ...result.connection, discoveredModels: d.models }
          } catch {
            // Best-effort; Settings → Models can retry with Sync.
          }
        }
        onSaved(saved)
      }
      onOpenChange(false)
    } catch (err) {
      feedback.error(err instanceof Error ? err.message : 'Failed to save the connection.')
    } finally {
      setSaving(false)
    }
  }

  const discoverySupported = isCustom || (entry?.supportsDiscovery ?? false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto overflow-x-hidden overscroll-contain w-[calc(100vw-2rem)] max-w-lg min-w-0 box-border p-4 sm:p-6">
        <DialogHeader className="min-w-0 pr-8 sm:pr-10">
          <DialogTitle className="text-base sm:text-lg font-semibold text-bd-text truncate">
            {isEdit ? 'Edit connection' : 'Add provider connection'}
          </DialogTitle>
          <DialogDescription className="text-xs text-bd-text-muted leading-relaxed break-words">
            {isEdit
              ? 'Update configuration, model, or credentials. Blank key keeps the stored credential.'
              : 'Configure a provider connection for Bolu. Credentials are encrypted on the server with AES-256-GCM.'}
          </DialogDescription>
        </DialogHeader>

        {!schemaReady && (
          <div className="rounded-lg border border-bd-status-warning-border bg-bd-status-warning-bg px-3 py-2 text-[11px] leading-snug text-bd-status-warning-text min-w-0 w-full box-border break-words">
            <span className="font-semibold">Setup preview:</span> Database migration is not applied, so saving is disabled. You can still enter your key, run connection tests, and discover models live.
          </div>
        )}

        <div className="space-y-4 min-w-0 w-full box-border">
          {/* Provider Selection */}
          {!isEdit ? (
            <div className="space-y-1.5 min-w-0 w-full">
              <Label>Provider</Label>
              <Select value={providerId} onValueChange={applyProvider}>
                <SelectTrigger className="w-full min-w-0 max-w-full box-border [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate">
                  <SelectValue placeholder="Choose a provider" />
                </SelectTrigger>
                <SelectContent className="max-h-64 max-w-[calc(100vw-3rem)]">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-bd-text-soft">
                    Curated Providers
                  </div>
                  {PROVIDER_CATALOGUE.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2 truncate">
                        <ProviderLogo providerId={p.id} size={16} className="shrink-0" />
                        <span className="truncate">{p.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                  <div className="border-t border-bd-border my-1" />
                  <SelectItem value={CUSTOM_PROVIDER_ID}>
                    <span className="flex items-center gap-2 font-medium truncate min-w-0">
                      <Server size={16} className="text-bd-text-muted shrink-0" />
                      <span className="truncate">Custom endpoint (OpenAI / Anthropic compatible)</span>
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              {entry?.regionNote && (
                <p className="text-[11px] text-bd-text-muted break-words leading-tight">{entry.regionNote}</p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-bd-border bg-bd-surface-muted px-3 py-2 min-w-0 w-full box-border">
              <ProviderLogo providerId={providerId} size={18} className="shrink-0" />
              <span className="text-sm font-medium text-bd-text truncate">{entry?.name ?? 'Custom provider'}</span>
            </div>
          )}

          {/* Connection Name */}
          <div className="space-y-1.5 min-w-0 w-full">
            <Label htmlFor="bolu-conn-name">Connection name</Label>
            <Input
              id="bolu-conn-name"
              name="bolu-connection-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={entry ? `${entry.name} account` : 'Custom production connection'}
              maxLength={80}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              className="w-full min-w-0 box-border text-xs sm:text-sm"
            />
          </div>

          {/* API Key with visibility & test trigger */}
          <div className="space-y-1.5 min-w-0 w-full">
            <div className="flex items-center justify-between gap-2 min-w-0 w-full">
              <Label htmlFor="bolu-conn-key" className="min-w-0 truncate">
                {isEdit ? 'Replace API key (optional)' : 'API key'}
              </Label>
              {entry?.docsUrl && (
                <a
                  href={entry.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-bd-primary hover:underline shrink-0"
                >
                  Get API key ↗
                </a>
              )}
            </div>
            <div className="relative w-full min-w-0">
              <Input
                id="bolu-conn-key"
                name="bolu-api-key"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={isEdit ? `Stored: ${connection.maskedKey}` : entry?.keyHint ?? 'API key'}
                autoComplete="new-password"
                data-1p-ignore
                data-lpignore="true"
                className="pr-10 font-mono text-xs w-full min-w-0 box-border"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-bd-text-muted hover:text-bd-text p-1"
                aria-label={showKey ? 'Hide API key' : 'Show API key'}
              >
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="flex items-start gap-1.5 text-[11px] text-bd-text-muted min-w-0 w-full">
              <ShieldCheck size={13} className="text-emerald-500 shrink-0 mt-0.5" />
              <span className="min-w-0 break-words leading-tight">
                AES-256-GCM encrypted on the server. Never stored in the browser.
              </span>
            </p>
          </div>

          {/* Model Selection with live search & discovery */}
          <div className="space-y-1.5 min-w-0 w-full box-border">
            <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 min-w-0 w-full">
              <Label className="shrink-0 text-xs sm:text-sm font-medium">Target Model</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 gap-1 px-2 text-[11px] shrink-0"
                onClick={handleDiscover}
                disabled={discovering || !discoverySupported}
                title={discoverySupported ? 'Query provider live models endpoint' : 'Provider has no documented model list endpoint'}
              >
                {discovering ? <Loader2 size={12} className="animate-spin shrink-0" /> : <RefreshCw size={12} className="shrink-0" />}
                <span>Discover models</span>
              </Button>
            </div>

            {/* Model Selector Trigger & Modal */}
            <div className="space-y-1.5 min-w-0 w-full">
              <button
                type="button"
                onClick={() => setModelPickerOpen(true)}
                className="flex items-center justify-between gap-2 rounded-lg border border-bd-border bg-bd-surface-muted/80 px-3 py-2 text-left hover:border-bd-border-strong hover:bg-bd-surface-muted transition-all w-full min-w-0 box-border"
                title="Search and select from discovered or curated models"
              >
                <div className="min-w-0 flex-1 overflow-hidden">
                  <span className="font-mono text-xs font-semibold text-bd-text truncate block">
                    {effectiveModel || 'Select a model...'}
                  </span>
                  <span className="text-[10px] text-bd-text-muted truncate block">
                    {discovered.length > 0
                      ? `${discovered.length} discovered models`
                      : `${entry?.curatedModels.length ?? 0} curated models`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-bd-text-muted shrink-0 text-xs ml-1">
                  <span className="text-[10px] text-bd-primary font-semibold">Browse</span>
                  <Search size={13} className="shrink-0" />
                </div>
              </button>

              <ModelSelectorModal
                open={modelPickerOpen}
                onOpenChange={setModelPickerOpen}
                currentModel={effectiveModel}
                curatedModels={entry?.curatedModels ?? []}
                discoveredModels={discovered}
                providerId={providerId}
                providerName={entry?.name ?? 'Custom Provider'}
                supportsDiscovery={discoverySupported}
                onSelect={(modelId) => {
                  setModelChoice(modelId)
                  setCustomModel('')
                }}
                onRefreshDiscovery={handleDiscover}
                discovering={discovering}
              />
            </div>

            {modelChoice === CUSTOM_MODEL && (
              <Input
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="e.g. provider/model-name or deepseek-chat"
                className="font-mono text-xs mt-1.5 w-full min-w-0 box-border"
                maxLength={200}
              />
            )}
          </div>

          {/* Routing & Pool Participation Controls */}
          <div className="rounded-lg border border-bd-border bg-bd-surface-muted/60 p-3 sm:p-4 space-y-3 min-w-0 w-full box-border">
            <div className="flex items-center justify-between gap-3 min-w-0 w-full">
              <div className="min-w-0 flex-1 pr-1">
                <p className="text-xs font-semibold text-bd-text">Participate in Routing Pool</p>
                <p className="text-[11px] text-bd-text-muted leading-relaxed break-words">
                  Bolu automatically selects from the active pool based on priority and health.
                </p>
              </div>
              <Switch checked={inPool} onCheckedChange={setInPool} aria-label="Participate in routing pool" className="shrink-0" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-bd-border/50 min-w-0 w-full box-border">
              <div className="space-y-1 min-w-0 w-full">
                <Label htmlFor="bolu-conn-priority" className="text-[11px]">Priority Rank</Label>
                <Input
                  id="bolu-conn-priority"
                  type="number"
                  min={1}
                  max={1000}
                  value={priority}
                  onChange={(e) => setPriority(Math.max(1, Math.min(1000, Number(e.target.value) || 100)))}
                  className="h-8 font-mono text-xs w-full min-w-0 box-border"
                />
                <p className="text-[10px] text-bd-text-muted">1 = highest priority</p>
              </div>

              <div className="space-y-1 min-w-0 w-full">
                <Label className="text-[11px]">Paid Tier Account</Label>
                <div className="flex items-center h-8">
                  <label className="flex items-center gap-2 text-xs text-bd-text cursor-pointer min-w-0 select-none">
                    <input
                      type="checkbox"
                      checked={isPaidTier}
                      onChange={(e) => setIsPaidTier(e.target.checked)}
                      className="h-4 w-4 rounded accent-bd-primary shrink-0"
                    />
                    <span className="text-xs font-medium text-bd-text leading-tight">Metered / Paid tier</span>
                  </label>
                </div>
                <p className="text-[10px] text-bd-text-muted">Higher rate limit allowance</p>
              </div>
            </div>
          </div>

          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen} className="min-w-0 w-full box-border">
            <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-bd-text-muted hover:text-bd-text select-none">
              <ChevronDown size={14} className={cn("shrink-0 transition-transform duration-200", advancedOpen && "rotate-180")} />
              <span>Advanced endpoint settings</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-3 min-w-0 w-full box-border">
              <div className="space-y-1.5 min-w-0 w-full">
                <Label htmlFor="bolu-conn-url">Base URL</Label>
                <Input id="bolu-conn-url" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.provider.com/v1" className="font-mono text-xs w-full min-w-0 box-border" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0 w-full box-border">
                <div className="space-y-1.5 min-w-0 w-full">
                  <Label>Protocol</Label>
                  <Select value={protocol} onValueChange={(v) => setProtocol(v as ProviderProtocol)}>
                    <SelectTrigger className="w-full min-w-0 max-w-full box-border [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI-compatible</SelectItem>
                      <SelectItem value="anthropic">Anthropic messages</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 min-w-0 w-full">
                  <Label>Auth scheme</Label>
                  <Select value={authScheme} onValueChange={(v) => setAuthScheme(v as ProviderAuthScheme)}>
                    <SelectTrigger className="w-full min-w-0 max-w-full box-border [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bearer">Bearer token</SelectItem>
                      <SelectItem value="x-api-key">x-api-key header</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5 min-w-0 w-full">
                <Label htmlFor="bolu-conn-timeout">Timeout (ms)</Label>
                <Input id="bolu-conn-timeout" type="number" min={5000} max={120000} step={1000} value={timeoutMs} onChange={(e) => setTimeoutMs(Number(e.target.value) || 45000)} className="h-8 font-mono text-xs w-full min-w-0 box-border" />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {diagnostics && <DiagnosticsNote diagnostics={diagnostics} className="w-full min-w-0 box-border" />}
        </div>

        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:items-center pt-3 min-w-0 w-full box-border border-t border-bd-border/50">
          <Button type="button" variant="outline" onClick={handleTest} disabled={testing || saving} className="w-full sm:w-auto gap-1.5 justify-center shrink-0">
            {testing ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
            Test connection
          </Button>
          <div className="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving} className="w-full sm:w-auto justify-center">
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving || !schemaReady} className="w-full sm:w-auto gap-1.5 justify-center">
              {saving && <Loader2 size={13} className="animate-spin" />}
              {isEdit ? 'Save changes' : 'Save connection'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}