import { useMemo, useState } from 'react'
import {
  Check,
  ChevronDown,
  ClipboardPaste,
  Eye,
  EyeOff,
  ExternalLink,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react'

import {
  EMPTY_CUSTOM_PROVIDER,
  validateCustomProvider,
  type CustomProvider,
  type CustomProviderDraft,
} from '@/lib/ai-assistant/providerRegistry'
import { maskedKey, providerStatus, type ProviderEntry, type TestResult } from './assistant-chat-providers'

/**
 * Provider and model settings. One card per provider: a masked key field, a
 * test, and a default model. A custom endpoint is a first-class provider, so an
 * unlisted OpenAI compatible API needs no code change.
 *
 * Keys are written to component state only. No storage call exists here.
 */
export function ProviderSettings({
  entries,
  activeId,
  focusId,
  variant,
  onClose,
  onKeyChange,
  onModelChange,
  onActivate,
  onTest,
  onFetchModels,
  onAddCustom,
  onRemoveCustom,
}: {
  entries: ProviderEntry[]
  activeId: string
  focusId?: string
  variant: 'sheet' | 'panel'
  onClose: () => void
  onKeyChange: (id: string, key: string) => void
  onModelChange: (id: string, model: string) => void
  onActivate: (id: string) => void
  onTest: (entry: ProviderEntry) => void
  onFetchModels: (entry: ProviderEntry) => void
  onAddCustom: (provider: CustomProvider, key: string) => void
  onRemoveCustom: (id: string) => void
}) {
  const [expanded, setExpanded] = useState<string | null>(focusId ?? activeId)
  const [reveal, setReveal] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [customOpen, setCustomOpen] = useState(false)
  const [advanced, setAdvanced] = useState(false)
  const [draft, setDraft] = useState<CustomProviderDraft>(EMPTY_CUSTOM_PROVIDER)
  const [errors, setErrors] = useState<Partial<Record<keyof CustomProviderDraft, string>>>({})

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return entries
    return entries.filter(
      (entry) =>
        entry.label.toLowerCase().includes(term) ||
        entry.model.toLowerCase().includes(term) ||
        entry.baseUrl.toLowerCase().includes(term),
    )
  }, [entries, query])

  const ready = entries.filter((entry) => entry.key).length

  function updateDraft(patch: Partial<CustomProviderDraft>) {
    setDraft((current) => ({ ...current, ...patch }))
    setErrors((current) => {
      const next = { ...current }
      Object.keys(patch).forEach((key) => delete next[key as keyof CustomProviderDraft])
      return next
    })
  }

  function saveCustom() {
    const result = validateCustomProvider(draft)
    setErrors(result.errors)
    if (!result.provider) return
    onAddCustom(result.provider, draft.key.trim())
    setDraft(EMPTY_CUSTOM_PROVIDER)
    setAdvanced(false)
    setCustomOpen(false)
  }

  async function pasteInto(id: string) {
    try {
      const text = await navigator.clipboard.readText()
      if (text.trim()) onKeyChange(id, text.trim())
    } catch {
      document.getElementById(`ac-key-${id}`)?.focus()
    }
  }

  return (
    <section className="ac-settings" data-variant={variant} aria-label="Providers and models">
      <div className="ac-set-head">
        <div>
          <p className="ac-set-title">Providers &amp; models</p>
          <p className="ac-set-sub">
            {ready} ready · keys stay in memory for this session
          </p>
          <span className="ac-simulation-badge">Preview simulation · no provider calls</span>
        </div>
        <button type="button" className="ac-icon-btn" onClick={onClose} aria-label="Close settings">
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="ac-set-body">
        <input
          className="ac-search"
          type="search"
          value={query}
          placeholder="Search providers or models"
          aria-label="Search providers"
          onChange={(event) => setQuery(event.target.value)}
        />

        <div className="ac-set-list">
          {visible.map((entry) => {
            const status = providerStatus(entry, activeId)
            const open = expanded === entry.id
            return (
              <article key={entry.id} className="ac-prov" data-open={open}>
                <button
                  type="button"
                  className="ac-prov-head"
                  aria-expanded={open}
                  onClick={() => setExpanded(open ? null : entry.id)}
                >
                  <span className="ac-prov-mark" aria-hidden="true">
                    {entry.short}
                  </span>
                  <span className="ac-prov-id">
                    <span className="ac-prov-name">
                      {entry.label}
                      {entry.custom ? <span className="ac-prov-custom">Custom</span> : null}
                    </span>
                    <span className="ac-prov-url">{entry.baseUrl.replace(/^https:\/\//, '')}</span>
                  </span>
                  <span className="ac-badge" data-status={status}>
                    {status === 'active' ? 'Active' : status === 'configured' ? 'Configured' : 'Needs key'}
                  </span>
                  <ChevronDown className="size-3.5 ac-prov-caret" aria-hidden="true" />
                </button>

                {open ? (
                  <div className="ac-prov-body">
                    <p className="ac-prov-note">{entry.note}</p>

                    <label className="ac-field">
                      <span className="ac-field-label">
                        <KeyRound className="size-3" aria-hidden="true" /> API key
                      </span>
                      <span className="ac-key-row">
                        <input
                          id={`ac-key-${entry.id}`}
                          className="ac-set-input ac-key-input"
                          type={reveal === entry.id ? 'text' : 'password'}
                          value={entry.key}
                          placeholder={entry.keyHint}
                          autoComplete="new-password"
                          data-1p-ignore
                          data-lpignore="true"
                          spellCheck={false}
                          onChange={(event) => onKeyChange(entry.id, event.target.value)}
                        />
                        <button
                          type="button"
                          className="ac-icon-btn ac-key-btn"
                          aria-label={reveal === entry.id ? 'Hide key' : 'Show key'}
                          onClick={() => setReveal(reveal === entry.id ? null : entry.id)}
                        >
                          {reveal === entry.id ? (
                            <EyeOff className="size-3.5" aria-hidden="true" />
                          ) : (
                            <Eye className="size-3.5" aria-hidden="true" />
                          )}
                        </button>
                        <button
                          type="button"
                          className="ac-icon-btn ac-key-btn"
                          aria-label="Paste key from the clipboard"
                          onClick={() => void pasteInto(entry.id)}
                        >
                          <ClipboardPaste className="size-3.5" aria-hidden="true" />
                        </button>
                      </span>
                      <span className="ac-field-hint">
                        {entry.key ? `Saved ${maskedKey(entry.key)}` : entry.keyHint}
                      </span>
                    </label>

                    <div className="ac-field">
                      <span className="ac-field-label">Default model</span>
                      <span className="ac-model-row">
                        <span className="ac-select-wrap">
                          <select
                            className="ac-select"
                            value={entry.model}
                            aria-label={`Default model for ${entry.label}`}
                            onChange={(event) => onModelChange(entry.id, event.target.value)}
                          >
                            {entry.models.map((model) => (
                              <option key={model.id} value={model.id}>
                                {model.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="size-3.5" aria-hidden="true" />
                        </span>
                        <button
                          type="button"
                          className="ac-mini-btn"
                          disabled={entry.discovering}
                          onClick={() => onFetchModels(entry)}
                        >
                          {entry.discovering ? (
                            <Loader2 className="size-3.5 ac-spin" aria-hidden="true" />
                          ) : (
                            <RefreshCw className="size-3.5" aria-hidden="true" />
                          )}
                          Simulate model list
                        </button>
                      </span>
                    </div>

                    <TestLine result={entry.tested} />

                    <div className="ac-prov-actions">
                      {entry.signupUrl ? (
                        <a
                          className="ac-text-link"
                          href={entry.signupUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          Get a key <ExternalLink className="size-3" aria-hidden="true" />
                        </a>
                      ) : (
                        <span className="ac-text-link ac-text-link--muted">
                          {entry.extraHeaders && Object.keys(entry.extraHeaders).length > 0
                            ? `${Object.keys(entry.extraHeaders).length} extra header(s)`
                            : 'Declared endpoint'}
                        </span>
                      )}

                      <span className="ac-prov-actions-end">
                        {entry.custom ? (
                          <button
                            type="button"
                            className="ac-mini-btn"
                            onClick={() => onRemoveCustom(entry.id)}
                          >
                            <Trash2 className="size-3.5" aria-hidden="true" /> Remove
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="ac-mini-btn"
                          disabled={!entry.key || entry.tested.status === 'testing'}
                          onClick={() => onTest(entry)}
                        >
                          {entry.tested.status === 'testing' ? (
                            <Loader2 className="size-3.5 ac-spin" aria-hidden="true" />
                          ) : (
                            <Check className="size-3.5" aria-hidden="true" />
                          )}
                          Simulate test
                        </button>
                        <button
                          type="button"
                          className="ac-mini-btn ac-mini-btn--solid"
                          disabled={!entry.key || status === 'active'}
                          onClick={() => onActivate(entry.id)}
                        >
                          {status === 'active' ? 'In use' : 'Use'}
                        </button>
                      </span>
                    </div>
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>

        <div className="ac-custom">
          {customOpen ? (
            <div className="ac-custom-form">
              <div className="ac-custom-head">
                <p>Add custom provider</p>
                <button
                  type="button"
                  className="ac-icon-btn"
                  onClick={() => setCustomOpen(false)}
                  aria-label="Cancel custom provider"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </div>
              <p className="ac-custom-sub">
                Any OpenAI compatible endpoint. The key is used in memory and is never saved.
              </p>

              <label className="ac-field">
                <span className="ac-field-label">Display name</span>
                <input
                  className="ac-set-input"
                  value={draft.name}
                  placeholder="e.g. Nous Portal"
                  onChange={(event) => updateDraft({ name: event.target.value })}
                />
                {errors.name ? <span className="ac-error">{errors.name}</span> : null}
              </label>

              <label className="ac-field">
                <span className="ac-field-label">Base URL</span>
                <input
                  className="ac-set-input"
                  value={draft.baseUrl}
                  placeholder="https://api.example.com/v1"
                  spellCheck={false}
                  onChange={(event) => updateDraft({ baseUrl: event.target.value })}
                />
                {errors.baseUrl ? <span className="ac-error">{errors.baseUrl}</span> : null}
              </label>

              <label className="ac-field">
                <span className="ac-field-label">
                  <KeyRound className="size-3" aria-hidden="true" /> API key
                </span>
                <input
                  className="ac-set-input"
                  type="password"
                  value={draft.key}
                  autoComplete="new-password"
                  data-1p-ignore
                  data-lpignore="true"
                  placeholder="Paste the endpoint key"
                  onChange={(event) => updateDraft({ key: event.target.value })}
                />
                {errors.key ? <span className="ac-error">{errors.key}</span> : null}
              </label>

              <label className="ac-field">
                <span className="ac-field-label">Model IDs</span>
                <textarea
                  className="ac-set-input ac-textarea"
                  rows={2}
                  value={draft.modelIds}
                  placeholder="model-id-one, model-id-two"
                  spellCheck={false}
                  onChange={(event) => updateDraft({ modelIds: event.target.value })}
                />
                <span className="ac-field-hint">Comma or new line. The first id becomes the default.</span>
                {errors.modelIds ? <span className="ac-error">{errors.modelIds}</span> : null}
              </label>

              <button
                type="button"
                className="ac-advanced-toggle"
                aria-expanded={advanced}
                onClick={() => setAdvanced((value) => !value)}
              >
                <ChevronDown className="size-3.5" aria-hidden="true" />
                Headers and context window
              </button>

              {advanced ? (
                <>
                  <label className="ac-field">
                    <span className="ac-field-label">Extra headers (JSON)</span>
                    <textarea
                      className="ac-set-input ac-textarea"
                      rows={3}
                      value={draft.extraHeaders}
                      placeholder={'{"HTTP-Referer": "https://bourxe.app"}'}
                      spellCheck={false}
                      onChange={(event) => updateDraft({ extraHeaders: event.target.value })}
                    />
                    {errors.extraHeaders ? <span className="ac-error">{errors.extraHeaders}</span> : null}
                  </label>
                  <label className="ac-field">
                    <span className="ac-field-label">Context window (tokens)</span>
                    <input
                      className="ac-set-input"
                      inputMode="numeric"
                      value={draft.contextWindow}
                      placeholder="128000"
                      onChange={(event) => updateDraft({ contextWindow: event.target.value })}
                    />
                    {errors.contextWindow ? <span className="ac-error">{errors.contextWindow}</span> : null}
                  </label>
                </>
              ) : null}

              <div className="ac-custom-actions">
                <button type="button" className="ac-mini-btn" onClick={() => setCustomOpen(false)}>
                  Cancel
                </button>
                <button type="button" className="ac-mini-btn ac-mini-btn--solid" onClick={saveCustom}>
                  <Plus className="size-3.5" aria-hidden="true" /> Add provider
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="ac-custom-trigger" onClick={() => setCustomOpen(true)}>
              <Plus className="size-4" aria-hidden="true" />
              <span>
                <span>Add custom provider / unlisted model</span>
                <span className="ac-custom-hint">Any OpenAI compatible base URL</span>
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

function TestLine({ result }: { result: TestResult }) {
  if (result.status === 'idle') return null
  return (
    <p className="ac-test" data-status={result.status}>
      {result.status === 'testing' ? <Loader2 className="size-3 ac-spin" aria-hidden="true" /> : null}
      {result.status === 'ok' ? <Check className="size-3" aria-hidden="true" /> : null}
      <span>Simulation · {result.message}</span>
    </p>
  )
}
