import { useEffect, useState } from 'react'
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Layers,
  Loader2,
  Lock,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react'
import { supabase } from '@/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { feedback } from '@/lib/feedback'
import { safeParseApiResponse } from '@/lib/ai-assistant/bolu-secret-vault'

type ProviderStatusResponse = {
  inApp: {
    configured: boolean
    provider?: string
    model?: string
    baseUrl?: string
    timeoutMs?: number
    maskedKey?: string
    status?: string
    updatedAt?: string
  }
  activeSource: 'database' | 'environment' | 'unconfigured'
  envFallback: {
    configured: boolean
    provider?: string
    model?: string
    maskedKey?: string | null
  }
}

const AMD_PRESET = {
  provider: 'amd',
  baseUrl: 'https://developer.amd.com.cn/radeon/api/v1',
  model: 'DeepSeek-V4-Flash',
}

const OPENROUTER_PRESET = {
  provider: 'openrouter',
  baseUrl: 'https://openrouter.ai/api/v1',
  model: 'deepseek/deepseek-chat',
}

type ModelCard = {
  id: string
  name: string
  pill: string
  badgeClass: string
  context: string
  description: string
  providerMatch?: 'amd' | 'openrouter'
}

const CURATED_MODELS: ModelCard[] = [
  {
    id: 'DeepSeek-V4-Flash',
    name: 'DeepSeek-V4-Flash',
    pill: 'Recommended · Low Latency',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    context: '1M Tokens Context Window',
    description: 'High-throughput architecture optimized for invoice extraction, real-time drafting, and low-latency response times.',
    providerMatch: 'amd',
  },
  {
    id: 'DeepSeek-R1-Distill-Llama-70B',
    name: 'DeepSeek-R1-Distill-70B',
    pill: 'High Reasoning',
    badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    context: '128K Tokens Context',
    description: 'Deep chain-of-thought distillation for multi-line invoice verification and complex document operations.',
    providerMatch: 'amd',
  },
  {
    id: 'Qwen2.5-72B-Instruct',
    name: 'Qwen2.5-72B-Instruct',
    pill: 'Structured Output',
    badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    context: '128K Tokens Context',
    description: 'Multilingual and structured JSON extraction precision with strict schema adherence.',
  },
]

export function BoluProviderSettingsSection() {
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showReplaceInput, setShowReplaceInput] = useState(false)

  const [statusData, setStatusData] = useState<ProviderStatusResponse | null>(null)
  const [provider, setProvider] = useState(AMD_PRESET.provider)
  const [baseUrl, setBaseUrl] = useState(AMD_PRESET.baseUrl)
  const [selectedModel, setSelectedModel] = useState('DeepSeek-V4-Flash')
  const [customModel, setCustomModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [timeoutMs, setTimeoutMs] = useState(45000)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; timestamp?: string } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const isCustomModel = selectedModel === 'custom'
  const activeModel = isCustomModel ? customModel.trim() : selectedModel

  async function getAuthToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  }

  async function fetchStatus() {
    setLoading(true)
    setTestResult(null)
    try {
      const token = await getAuthToken()
      if (!token) {
        feedback.error('Please sign in to view provider configuration.')
        setLoading(false)
        return
      }

      const res = await fetch('/api/bolu-provider-config', {
        headers: { Authorization: `Bearer ${token}` },
      })

      const parsed = await safeParseApiResponse<ProviderStatusResponse>(res, 'Status check')
      if (!parsed.ok || !parsed.data) {
        throw new Error(parsed.errorMessage || 'Failed to load provider status')
      }

      const data = parsed.data
      setStatusData(data)

      if (data.inApp.configured) {
        if (data.inApp.provider) setProvider(data.inApp.provider)
        if (data.inApp.baseUrl) setBaseUrl(data.inApp.baseUrl)
        if (data.inApp.timeoutMs) setTimeoutMs(data.inApp.timeoutMs)
        if (data.inApp.model) {
          const match = CURATED_MODELS.find((m) => m.id === data.inApp.model)
          if (match) {
            setSelectedModel(match.id)
          } else {
            setSelectedModel('custom')
            setCustomModel(data.inApp.model)
          }
        }
        setShowReplaceInput(false)
      } else {
        setShowReplaceInput(true)
      }
    } catch (err) {
      console.error('[BoluProviderSettings] Error fetching status:', err)
      feedback.error(err instanceof Error ? err.message : 'Failed to load provider status')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchStatus()
  }, [])

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const token = await getAuthToken()
      if (!token) throw new Error('Authentication required.')

      const payload: Record<string, unknown> = {
        action: 'test',
        provider,
        baseUrl,
        model: activeModel,
        timeoutMs,
      }
      if (apiKey.trim()) {
        payload.apiKey = apiKey.trim()
      }

      const res = await fetch('/api/bolu-provider-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const parsed = await safeParseApiResponse<{ ok?: boolean; message?: string; error?: string }>(res, 'Connection test')
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

      if (parsed.ok && parsed.data?.ok) {
        setTestResult({
          ok: true,
          message: parsed.data.message || 'Connection verified successfully. Inference endpoint responded.',
          timestamp: nowStr,
        })
        feedback.success('Provider connection test passed.')
      } else {
        const failureMsg = parsed.errorMessage || parsed.data?.message || parsed.data?.error || 'Connection test failed. Check endpoint parameters.'
        setTestResult({
          ok: false,
          message: failureMsg,
          timestamp: nowStr,
        })
        feedback.error(failureMsg)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection test failed.'
      setTestResult({ ok: false, message: msg, timestamp: new Date().toLocaleTimeString() })
      feedback.error(msg)
    } finally {
      setTesting(false)
    }
  }

  async function handleSave() {
    if (!apiKey.trim()) {
      feedback.error('Please enter an API key to encrypt and save.')
      return
    }

    setSaving(true)
    setTestResult(null)
    try {
      const token = await getAuthToken()
      if (!token) throw new Error('Authentication required.')

      const res = await fetch('/api/bolu-provider-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'save',
          provider,
          baseUrl,
          model: activeModel,
          apiKey: apiKey.trim(),
          timeoutMs,
        }),
      })

      const parsed = await safeParseApiResponse<{ ok?: boolean; message?: string; error?: string }>(res, 'Save & encrypt')
      if (!parsed.ok) {
        throw new Error(parsed.errorMessage || 'Failed to save credential.')
      }

      feedback.success('Bolu AI provider credential encrypted and saved.')
      setApiKey('')

      // Subsequent status refresh failure should not cause save error notification
      try {
        await fetchStatus()
      } catch (refreshErr) {
        console.warn('[BoluProviderSettings] Post-save status refresh delayed:', refreshErr)
      }
    } catch (err) {
      feedback.error(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    setRemoving(true)
    setTestResult(null)
    try {
      const token = await getAuthToken()
      if (!token) throw new Error('Authentication required.')

      const res = await fetch('/api/bolu-provider-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'remove' }),
      })

      const parsed = await safeParseApiResponse<{ ok?: boolean; message?: string; error?: string }>(res, 'Remove credential')
      if (!parsed.ok) {
        throw new Error(parsed.errorMessage || 'Failed to remove credential.')
      }

      feedback.success('In-app provider credential removed.')
      setShowDeleteConfirm(false)

      try {
        await fetchStatus()
      } catch (refreshErr) {
        console.warn('[BoluProviderSettings] Post-remove status refresh delayed:', refreshErr)
      }
    } catch (err) {
      feedback.error(err instanceof Error ? err.message : 'Remove failed.')
    } finally {
      setRemoving(false)
    }
  }

  const isConfiguredInApp = Boolean(statusData?.inApp.configured)
  const isUsingEnv = statusData?.activeSource === 'environment'
  const canTest = Boolean(apiKey.trim() || isConfiguredInApp || isUsingEnv)

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Operational Overview & Control Header */}
      <div className="rounded-xl border border-[hsl(var(--bd-border)/0.7)] bg-bd-card-bg shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-[hsl(var(--bd-border)/0.5)] bg-[hsl(var(--bd-surface-muted)/0.25)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Cpu className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-bd-text tracking-tight">Bolu AI Infrastructure</h2>
                  <p className="text-xs text-bd-text-muted">
                    Shared enterprise inference configuration for conversational business operations.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              {loading ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[hsl(var(--bd-surface-muted)/0.8)] text-bd-text-muted">
                  <Loader2 className="h-3 w-3 animate-spin" /> Checking telemetry...
                </div>
              ) : isConfiguredInApp ? (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Enterprise Key
                </div>
              ) : isUsingEnv ? (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Server Env Fallback
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-zinc-500/10 px-3 py-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                  Standby / Mock Mode
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => void fetchStatus()}
                disabled={loading}
                className="h-8 gap-1.5 text-xs text-bd-text-muted hover:text-bd-text border-[hsl(var(--bd-border)/0.6)]"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>
        </div>

        {/* 4 Cohesive Operational Telemetry Tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[hsl(var(--bd-border)/0.4)] bg-bd-card-bg">
          <div className="p-4 sm:p-5 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-bd-text-muted">
              <Activity className="h-3.5 w-3.5 text-primary" />
              Runtime Source
            </div>
            <div className="text-xs font-semibold text-bd-text truncate">
              {loading
                ? 'Loading...'
                : isConfiguredInApp
                ? 'Database Vault'
                : isUsingEnv
                ? 'Environment Variable'
                : 'Deterministic Mock'}
            </div>
            <p className="text-[10px] text-bd-text-muted truncate">
              {isConfiguredInApp ? 'AES-256-GCM Envelope' : 'Platform managed'}
            </p>
          </div>

          <div className="p-4 sm:p-5 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-bd-text-muted">
              <Server className="h-3.5 w-3.5 text-primary" />
              Active Provider
            </div>
            <div className="text-xs font-semibold text-bd-text truncate">
              {loading
                ? 'Loading...'
                : (statusData?.inApp.provider || statusData?.envFallback.provider || provider).toUpperCase()}
            </div>
            <p className="text-[10px] text-bd-text-muted truncate">
              {provider === 'amd' ? 'AMD Token Factory' : 'OpenAI-Compatible'}
            </p>
          </div>

          <div className="p-4 sm:p-5 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-bd-text-muted">
              <Layers className="h-3.5 w-3.5 text-primary" />
              Inference Model
            </div>
            <div className="text-xs font-semibold text-bd-text truncate font-mono">
              {loading
                ? 'Loading...'
                : statusData?.inApp.model || statusData?.envFallback.model || activeModel}
            </div>
            <p className="text-[10px] text-bd-text-muted truncate">
              {activeModel === 'DeepSeek-V4-Flash' ? '1M Context · Low Latency' : 'Custom Profile'}
            </p>
          </div>

          <div className="p-4 sm:p-5 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-bd-text-muted">
              <Lock className="h-3.5 w-3.5 text-primary" />
              Security Boundary
            </div>
            <div className="text-xs font-semibold text-bd-text truncate">
              PostgREST Denied
            </div>
            <p className="text-[10px] text-bd-text-muted truncate">
              Client reads blocked via RLS
            </p>
          </div>
        </div>
      </div>

      {/* 2. Provider Selection (Visual Segmented Cards) */}
      <div className="rounded-xl border border-[hsl(var(--bd-border)/0.7)] bg-bd-card-bg shadow-sm p-5 sm:p-6 space-y-4">
        <div>
          <h3 className="text-xs font-bold text-bd-text uppercase tracking-wider">Step 1 · Inference Provider</h3>
          <p className="text-xs text-bd-text-muted mt-0.5">
            Select the enterprise AI infrastructure that handles Bolu conversational proposals.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Option A: AMD Token Factory */}
          <button
            type="button"
            onClick={() => {
              setProvider('amd')
              setBaseUrl(AMD_PRESET.baseUrl)
              setSelectedModel('DeepSeek-V4-Flash')
            }}
            className={`flex flex-col justify-between rounded-xl border p-4 text-left transition-all ${
              provider === 'amd'
                ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm'
                : 'border-[hsl(var(--bd-border)/0.6)] hover:border-[hsl(var(--bd-border))] hover:bg-[hsl(var(--bd-surface-muted)/0.2)]'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Zap className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-bd-text">AMD Token Factory</span>
                </div>
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Recommended
                </span>
              </div>
              <p className="text-xs text-bd-text-muted leading-relaxed">
                Direct enterprise inference powered by AMD Instinct™ ROCm accelerators. Accepts official <code className="font-mono text-primary font-semibold">rc-</code> keys.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[hsl(var(--bd-border)/0.3)] flex items-center justify-between text-[11px] text-bd-text-muted">
              <span>Model: <b className="font-mono text-bd-text">DeepSeek-V4-Flash</b></span>
              <span className="font-mono text-[10px]">1M Context</span>
            </div>
          </button>

          {/* Option B: OpenRouter / OpenAI Compatible */}
          <button
            type="button"
            onClick={() => {
              setProvider('openrouter')
              setBaseUrl(OPENROUTER_PRESET.baseUrl)
              setSelectedModel('custom')
              setCustomModel('deepseek/deepseek-chat')
            }}
            className={`flex flex-col justify-between rounded-xl border p-4 text-left transition-all ${
              provider === 'openrouter'
                ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm'
                : 'border-[hsl(var(--bd-border)/0.6)] hover:border-[hsl(var(--bd-border))] hover:bg-[hsl(var(--bd-surface-muted)/0.2)]'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Globe className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-bd-text">Universal Gateway</span>
                </div>
                <span className="inline-flex items-center rounded-full bg-zinc-500/10 px-2 py-0.5 text-[10px] font-medium text-bd-text-muted border border-zinc-500/20">
                  OpenAI Compatible
                </span>
              </div>
              <p className="text-xs text-bd-text-muted leading-relaxed">
                Connect via OpenRouter, Cloudflare AI Gateway, or custom OpenAI-compatible enterprise endpoints.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-[hsl(var(--bd-border)/0.3)] flex items-center justify-between text-[11px] text-bd-text-muted">
              <span>Protocol: <b className="font-mono text-bd-text">HTTP POST SSE</b></span>
              <span className="font-mono text-[10px]">Custom Router</span>
            </div>
          </button>
        </div>
      </div>

      {/* 3. Credential & Key Custody Management */}
      <div className="rounded-xl border border-[hsl(var(--bd-border)/0.7)] bg-bd-card-bg shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-bd-text uppercase tracking-wider">Step 2 · Authentication & Key Custody</h3>
            <p className="text-xs text-bd-text-muted mt-0.5">
              Shared platform API credential. Encrypted with AES-256-GCM before database write.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <Lock className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Server Envelope Encrypted</span>
          </div>
        </div>

        {/* Existing Stored Key Banner (if configured) */}
        {isConfiguredInApp && !showReplaceInput && (
          <div className="rounded-xl border border-[hsl(var(--bd-border)/0.6)] bg-[hsl(var(--bd-surface-muted)/0.3)] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <KeyRound className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-bd-text">{statusData?.inApp.maskedKey}</span>
                  <span className="inline-flex items-center rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Active in Vault
                  </span>
                </div>
                <p className="text-[11px] text-bd-text-muted">
                  Updated: {new Date(statusData?.inApp.updatedAt || '').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} · Never exposed in browser code.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReplaceInput(true)}
                className="h-8 text-xs text-bd-text"
              >
                Replace Key
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Key Input Section */}
        {(showReplaceInput || !isConfiguredInApp) && (
          <div className="space-y-3 pt-1">
            {isConfiguredInApp && (
              <div className="flex items-center justify-between text-xs text-bd-text-muted">
                <span>Enter new key to replace existing credential:</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowReplaceInput(false)
                    setApiKey('')
                  }}
                  className="text-primary hover:underline"
                >
                  Cancel replacement
                </button>
              </div>
            )}
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={provider === 'amd' ? 'rc-enterprise-token-...' : 'sk-or-v1-... or Bearer token'}
                className="h-10 pr-10 font-mono text-xs bg-background"
                autoComplete="off"
                spellCheck="false"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                aria-label={showKey ? 'Hide secret key' : 'Show secret key'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-bd-text-muted hover:text-bd-text"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[11px] text-bd-text-muted flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
              {provider === 'amd'
                ? 'AMD Token Factory API keys begin with "rc-". Credentials remain exclusively on the server.'
                : 'Keys are encrypted on the server before storage. Plaintext is never returned to the client.'}
            </p>
          </div>
        )}

        {/* Delete Confirmation Alert */}
        {showDeleteConfirm && (
          <div className="rounded-xl border border-rose-300 bg-rose-50/60 p-4 dark:border-rose-900/50 dark:bg-rose-950/30">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-xs text-rose-800 dark:text-rose-200">
                <p className="font-bold">Remove in-app provider credential?</p>
                <p className="mt-0.5 text-rose-700 dark:text-rose-300">
                  Bolu will fall back to server environment variables (if configured) or deterministic mock mode.
                </p>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={removing}
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => void handleRemove()}
                  disabled={removing}
                  className="h-8 text-xs gap-1.5"
                >
                  {removing && <Loader2 className="h-3 w-3 animate-spin" />}
                  Confirm Remove
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Model Selection (Vercel-inspired Card Grid) */}
      <div className="rounded-xl border border-[hsl(var(--bd-border)/0.7)] bg-bd-card-bg shadow-sm p-5 sm:p-6 space-y-4">
        <div>
          <h3 className="text-xs font-bold text-bd-text uppercase tracking-wider">Step 3 · Model & Workload Profile</h3>
          <p className="text-xs text-bd-text-muted mt-0.5">
            Select the inference model profile calibrated for business document operations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {CURATED_MODELS.map((model) => {
            const isSelected = selectedModel === model.id
            return (
              <button
                key={model.id}
                type="button"
                onClick={() => setSelectedModel(model.id)}
                className={`flex flex-col justify-between rounded-xl border p-4 text-left transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm'
                    : 'border-[hsl(var(--bd-border)/0.6)] hover:border-[hsl(var(--bd-border))] hover:bg-[hsl(var(--bd-surface-muted)/0.2)]'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-bd-text truncate">{model.name}</span>
                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold border ${model.badgeClass}`}>
                      {model.pill}
                    </span>
                  </div>
                  <p className="text-[11px] text-bd-text-muted leading-relaxed line-clamp-3">
                    {model.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[hsl(var(--bd-border)/0.3)] text-[10px] font-mono text-bd-text-muted">
                  {model.context}
                </div>
              </button>
            )
          })}
        </div>

        {/* Custom Model Toggle */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setSelectedModel(isCustomModel ? 'DeepSeek-V4-Flash' : 'custom')}
            className="text-xs font-medium text-primary hover:underline flex items-center gap-1.5"
          >
            <Sparkles className="h-3 w-3" />
            {isCustomModel ? 'Switch to curated enterprise models' : 'Specify a custom model identifier...'}
          </button>

          {isCustomModel && (
            <div className="mt-3 space-y-1.5">
              <label className="text-[11px] font-semibold text-bd-text">Exact Model Identifier</label>
              <Input
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="e.g. deepseek/deepseek-chat or custom-tenant-engine"
                className="h-9 font-mono text-xs bg-background"
              />
              <p className="text-[10px] text-bd-text-muted">
                Must match the model ID accepted by the provider's /chat/completions endpoint.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 5. Advanced Connection Parameters (Collapsible) */}
      <div className="rounded-xl border border-[hsl(var(--bd-border)/0.7)] bg-bd-card-bg shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between p-4 sm:p-5 text-left text-xs font-bold text-bd-text hover:bg-[hsl(var(--bd-surface-muted)/0.2)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Server className="h-3.5 w-3.5 text-primary" />
            <span>Advanced Network & Endpoint Parameters</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-bd-text-muted font-normal">
            <span>{showAdvanced ? 'Hide' : 'Configure'}</span>
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>

        {showAdvanced && (
          <div className="p-5 pt-0 border-t border-[hsl(var(--bd-border)/0.4)] space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-bd-text">Base URL</label>
                <Input
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://developer.amd.com.cn/radeon/api/v1"
                  className="h-9 font-mono text-xs bg-background"
                />
                <p className="text-[10px] text-bd-text-muted">
                  Endpoint path <code className="font-mono">/chat/completions</code> will be appended automatically if omitted.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-bd-text">Timeout (ms)</label>
                <Input
                  type="number"
                  min={5000}
                  max={120000}
                  step={1000}
                  value={timeoutMs}
                  onChange={(e) => setTimeoutMs(Number(e.target.value) || 45000)}
                  className="h-9 font-mono text-xs bg-background"
                />
                <p className="text-[10px] text-bd-text-muted">Bounded between 5s and 120s.</p>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (provider === 'amd') {
                    setBaseUrl(AMD_PRESET.baseUrl)
                    setSelectedModel('DeepSeek-V4-Flash')
                  } else {
                    setBaseUrl(OPENROUTER_PRESET.baseUrl)
                  }
                  setTimeoutMs(45000)
                }}
                className="h-7 text-[11px] text-bd-text-muted hover:text-bd-text"
              >
                Reset to provider presets
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 6. Test Result Diagnostic Alert */}
      {testResult && (
        <div
          className={`rounded-xl border p-4 text-xs shadow-sm transition-all ${
            testResult.ok
              ? 'border-emerald-300 bg-emerald-50/70 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-200'
              : 'border-rose-300 bg-rose-50/70 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center justify-between font-semibold">
            <div className="flex items-center gap-2">
              {testResult.ok ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              )}
              <span>{testResult.ok ? 'Connection Verified' : 'Connection Check Failed'}</span>
            </div>
            {testResult.timestamp && (
              <span className="font-mono text-[10px] opacity-75">Checked at {testResult.timestamp}</span>
            )}
          </div>
          <p className="mt-1 leading-relaxed pl-6">{testResult.message}</p>
        </div>
      )}

      {/* 7. Action Console Bar */}
      <div className="rounded-xl border border-[hsl(var(--bd-border)/0.7)] bg-bd-card-bg shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="text-xs text-bd-text-muted">
          {apiKey.trim() ? (
            <span className="text-bd-text font-medium">New key entered. Ready to test or save.</span>
          ) : isConfiguredInApp ? (
            <span>Testing uses the encrypted key stored in the vault.</span>
          ) : isUsingEnv ? (
            <span>Testing uses the server environment fallback key.</span>
          ) : (
            <span>Enter an API key to enable live connection verification.</span>
          )}
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleTest()}
            disabled={testing || !canTest}
            className="h-9 px-4 text-xs gap-2 font-medium"
          >
            {testing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5 text-amber-500" />
            )}
            {apiKey.trim() ? 'Test New Key' : 'Test Active Connection'}
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => void handleSave()}
            disabled={saving || !apiKey.trim()}
            className="h-9 px-4 text-xs gap-2 font-semibold shadow-sm"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <KeyRound className="h-3.5 w-3.5" />
            )}
            Save & Deploy Credential
          </Button>
        </div>
      </div>

      {/* 8. Enterprise Governance & Security Guarantees */}
      <div className="rounded-xl border border-[hsl(var(--bd-border)/0.6)] bg-[hsl(var(--bd-surface-muted)/0.25)] p-4 sm:p-5 text-xs text-bd-text-muted space-y-2">
        <div className="flex items-center gap-2 font-semibold text-bd-text">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>Enterprise Guardrails & Authority Invariants</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-[11px] leading-relaxed">
          <div>
            <b className="text-bd-text block">Shared Credential Model</b>
            Shared enterprise configuration managed strictly by platform administrators. No individual employee BYOK.
          </div>
          <div>
            <b className="text-bd-text block">Zero-Client Exposure</b>
            Database RLS denies all browser PostgREST queries. Plaintext keys are never sent to client bundles or logs.
          </div>
          <div>
            <b className="text-bd-text block">Locked Calculations</b>
            Bolu proposes operational updates only. Authoritative math, numbering, and persistence are strictly application-owned.
          </div>
        </div>
      </div>
    </div>
  )
}
