import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Eye, EyeOff, Loader2, RefreshCw, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

const CUSTOM_MODEL = '__custom__'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  connection: PublicConnection | null
  initialProviderId?: string
  onSaved: (connection: PublicConnection) => void
}

export function ConnectionDialog({ open, onOpenChange, connection, initialProviderId, onSaved }: Props) {
  const isEdit = connection !== null

  const [providerId, setProviderId] = useState(initialProviderId ?? 'amd')
  const [name, setName] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [modelChoice, setModelChoice] = useState('')
  const [customModel, setCustomModel] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [protocol, setProtocol] = useState<ProviderProtocol>('openai')
  const [authScheme, setAuthScheme] = useState<ProviderAuthScheme>('bearer')
  const [timeoutMs, setTimeoutMs] = useState(45000)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [discovered, setDiscovered] = useState<DiscoveredModel[]>([])
  const [diagnostics, setDiagnostics] = useState<ProviderDiagnostics | null>(null)
  const [testing, setTesting] = useState(false)
  const [discovering, setDiscovering] = useState(false)
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
      setDiscovered(connection.discoveredModels ?? [])
      const known = [...(getCatalogueEntry(connection.providerId)?.curatedModels ?? []), ...(connection.discoveredModels ?? [])]
      if (known.some((m) => m.id === connection.model)) {
        setModelChoice(connection.model)
        setCustomModel('')
      } else {
        setModelChoice(CUSTOM_MODEL)
        setCustomModel(connection.model)
      }
    } else {
      const entry = getCatalogueEntry(initialProviderId ?? 'amd')
      setProviderId(entry?.id ?? CUSTOM_PROVIDER_ID)
      setName('')
      setApiKey('')
      setBaseUrl(entry?.baseUrl ?? '')
      setProtocol(entry?.protocol ?? 'openai')
      setAuthScheme(entry?.authScheme ?? 'bearer')
      setTimeoutMs(45000)
      setDiscovered([])
      setModelChoice(entry?.defaultModel ?? CUSTOM_MODEL)
      setCustomModel('')
    }
  }, [open, connection, initialProviderId])

  const entry = getCatalogueEntry(providerId)
  const isCustom = providerId === CUSTOM_PROVIDER_ID

  const modelOptions = useMemo(() => {
    const seen = new Set<string>()
    const options: { id: string; label: string; source: 'curated' | 'discovered' | 'current' }[] = []
    const push = (id: string, label: string, source: 'curated' | 'discovered' | 'current') => {
      if (!id || seen.has(id)) return
      seen.add(id)
      options.push({ id, label, source })
    }
    if (connection) push(connection.model, connection.model, 'current')
    for (const m of entry?.curatedModels ?? []) push(m.id, m.label, 'curated')
    for (const m of discovered) push(m.id, m.label, 'discovered')
    return options
  }, [entry, discovered, connection])

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
    setTesting(true)
    setDiagnostics(null)
    try {
      const target = isEdit && !apiKey.trim()
        ? { connectionId: connection.id, model: effectiveModel || undefined }
        : inlineTarget()
      if (!isEdit && !apiKey.trim()) {
        feedback.error('Enter an API key before testing.')
        return
      }
      const result = await boluProviderApi.test(target)
      setDiagnostics(result.diagnostics)
    } catch (err) {
      feedback.error(err instanceof Error ? err.message : 'Connection test failed.')
    } finally {
      setTesting(false)
    }
  }

  async function handleDiscover() {
    setDiscovering(true)
    setDiagnostics(null)
    try {
      const target = isEdit && !apiKey.trim()
        ? { connectionId: connection.id }
        : inlineTarget()
      if (!isEdit && !apiKey.trim()) {
        feedback.error('Enter an API key before discovering models.')
        return
      }
      const result = await boluProviderApi.discover(target)
      setDiagnostics(result.diagnostics)
      if (result.ok) {
        setDiscovered(result.models)
        feedback.success(`Discovered ${result.models.length} model${result.models.length === 1 ? '' : 's'}.`)
        if (!effectiveModel && result.models.length > 0) setModelChoice(result.models[0].id)
      }
    } catch (err) {
      feedback.error(err instanceof Error ? err.message : 'Model discovery failed.')
    } finally {
      setDiscovering(false)
    }
  }

  async function handleSave() {
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
        })
        feedback.success('Connection saved. The credential is encrypted at rest.')
        onSaved(result.connection)
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit connection' : 'Add provider connection'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the model, endpoint or credential. Leaving the key blank keeps the stored credential.'
              : 'Choose a provider, enter its API key, and select a model. Credentials are encrypted on the server.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isEdit && (
            <div className="space-y-1.5">
              <Label>Provider</Label>
              <Select value={providerId} onValueChange={applyProvider}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a provider" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_CATALOGUE.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <ProviderLogo providerId={p.id} size={16} />
                        {p.name}
                      </span>
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_PROVIDER_ID}>
                    <span className="flex items-center gap-2">
                      <ProviderLogo providerId={CUSTOM_PROVIDER_ID} size={16} />
                      Custom OpenAI-compatible / Anthropic endpoint
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              {entry?.regionNote && (
                <p className="text-xs text-bd-text-muted">{entry.regionNote}</p>
              )}
            </div>
          )}

          {isEdit && (
            <div className="flex items-center gap-2 rounded-lg border border-bd-border bg-bd-surface-muted px-3 py-2">
              <ProviderLogo providerId={providerId} size={18} />
              <span className="text-sm font-medium text-bd-text">{entry?.name ?? 'Custom provider'}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="bolu-conn-name">Connection name</Label>
            <Input
              id="bolu-conn-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={entry ? `${entry.name} connection` : 'Production connection'}
              maxLength={80}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bolu-conn-key">
              {isEdit ? 'Replace API key (optional)' : 'API key'}
            </Label>
            <div className="relative">
              <Input
                id="bolu-conn-key"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={isEdit ? `Stored: ${connection.maskedKey}` : entry?.keyHint ?? 'API key'}
                autoComplete="off"
                className="pr-10 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-bd-text-muted hover:text-bd-text"
                aria-label={showKey ? 'Hide API key' : 'Show API key'}
              >
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="flex items-center gap-1 text-[11px] text-bd-text-muted">
              <ShieldCheck size={12} />
              Encrypted with AES-256-GCM on the server. Never stored in the browser.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Model</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 gap-1 px-2 text-[11px]"
                onClick={handleDiscover}
                disabled={discovering || !discoverySupported}
                title={discoverySupported ? 'Query the provider model list' : 'This provider has no documented model-listing endpoint'}
              >
                {discovering ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                Discover models
              </Button>
            </div>
            <Select value={modelChoice} onValueChange={setModelChoice}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {modelOptions.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-xs">{m.label}</span>
                      <span className="text-[10px] uppercase tracking-wide text-bd-text-soft">
                        {m.source === 'discovered' ? 'live' : m.source === 'current' ? 'current' : 'curated'}
                      </span>
                    </span>
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM_MODEL}>Custom identifier…</SelectItem>
              </SelectContent>
            </Select>
            {modelChoice === CUSTOM_MODEL && (
              <Input
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="e.g. provider/model-name"
                className="font-mono text-xs"
                maxLength={200}
              />
            )}
            {!discoverySupported && (
              <p className="text-[11px] text-bd-text-muted">
                No documented model-listing endpoint for this provider. Enter a model identifier from its documentation.
              </p>
            )}
          </div>

          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-bd-text-muted hover:text-bd-text">
              <ChevronDown size={14} className={advancedOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
              Advanced endpoint settings
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="bolu-conn-url">Base URL</Label>
                <Input
                  id="bolu-conn-url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.provider.com/v1"
                  className="font-mono text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Protocol</Label>
                  <Select value={protocol} onValueChange={(v) => setProtocol(v as ProviderProtocol)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI-compatible</SelectItem>
                      <SelectItem value="anthropic">Anthropic messages</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Auth scheme</Label>
                  <Select value={authScheme} onValueChange={(v) => setAuthScheme(v as ProviderAuthScheme)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bearer">Bearer token</SelectItem>
                      <SelectItem value="x-api-key">x-api-key header</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bolu-conn-timeout">Timeout (ms)</Label>
                <Input
                  id="bolu-conn-timeout"
                  type="number"
                  min={5000}
                  max={120000}
                  step={1000}
                  value={timeoutMs}
                  onChange={(e) => setTimeoutMs(Number(e.target.value) || 45000)}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {diagnostics && <DiagnosticsNote diagnostics={diagnostics} />}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" onClick={handleTest} disabled={testing || saving}>
            {testing && <Loader2 size={14} className="animate-spin" />}
            Test connection
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} loading={saving}>
              {isEdit ? 'Save changes' : 'Save connection'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}