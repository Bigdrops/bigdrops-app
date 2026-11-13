import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, ArrowUp, KeyRound, Loader2, ShieldAlert } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { AIAssistantError, sendAssistantChat } from '@/lib/ai-assistant/chat'
import {
  hasAnyProviderKey,
  isPersistentKeyStoreAvailable,
  setProviderKey,
} from '@/lib/ai-assistant/keys'
import { AI_PROVIDER_ROWS, getAIProviderRow } from '@/lib/ai-assistant/providerCatalog'
import { maskKey, type ChatMessage } from '@/lib/ai-assistant/protocol'

type AssistantSheetProps = {
  open: boolean
  onOpenChange: (nextOpen: boolean) => void
}

export function AssistantSheet({ open, onOpenChange }: AssistantSheetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [providerId, setProviderId] = useState(AI_PROVIDER_ROWS[0]?.id ?? 'nvidia')
  const [keyDraft, setKeyDraft] = useState('')
  const [savedMask, setSavedMask] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const listEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void hasAnyProviderKey().then((value) => {
      if (!cancelled) setConfigured(value)
    })
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, sending])

  const handleSaveKey = useCallback(async () => {
    const key = keyDraft.trim()
    if (!key) return
    setSaveError(null)
    try {
      await setProviderKey(providerId, key)
      setSavedMask(maskKey(key))
      setKeyDraft('')
      setConfigured(true)
    } catch {
      setSaveError('The key could not be saved on this device.')
    }
  }, [keyDraft, providerId])

  const handleSend = useCallback(async () => {
    const text = draft.trim()
    if (!text || sending) return

    const conversation: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages([...conversation, { role: 'assistant', content: '' }])
    setDraft('')
    setError(null)
    setSending(true)

    try {
      await sendAssistantChat({
        messages: conversation,
        onDelta: (delta) => {
          setMessages((current) => {
            const next = [...current]
            const last = next[next.length - 1]
            if (last && last.role === 'assistant') {
              next[next.length - 1] = { ...last, content: last.content + delta }
            }
            return next
          })
        },
      })
    } catch (caught) {
      const message =
        caught instanceof AIAssistantError
          ? caught.message
          : 'The assistant could not answer. Try again.'
      setError(message)
      setMessages((current) => {
        const next = [...current]
        const last = next[next.length - 1]
        if (last && last.role === 'assistant' && !last.content) next.pop()
        return next
      })
    } finally {
      setSending(false)
    }
  }, [draft, messages, sending])

  const selectedProvider = getAIProviderRow(providerId)
  const persistent = isPersistentKeyStoreAvailable()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="flex h-[86vh] flex-col gap-0 p-0">
        <SheetHeader className="border-b border-bd-border px-4 pb-3 pt-4">
          <SheetTitle className="text-base">AI assistant</SheetTitle>
          <SheetDescription className="text-[11px] text-bd-text-muted">
            Answers use a free provider tier. Your text leaves this device.
          </SheetDescription>
        </SheetHeader>

        {configured === false ? (
          <div className="flex-1 overflow-y-auto px-4 py-5">
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-bd-border bg-bd-surface-muted px-3 py-2.5">
              <KeyRound className="mt-0.5 size-4 shrink-0 text-bd-text-muted" />
              <p className="text-[11px] leading-relaxed text-bd-text-muted">
                The assistant needs one provider key. Create a free key, then paste it here. The key
                is stored on this device only.
              </p>
            </div>

            <label className="mb-1 block text-[11px] font-semibold text-bd-text-muted" htmlFor="ai-provider">
              Provider
            </label>
            <select
              id="ai-provider"
              value={providerId}
              onChange={(event) => setProviderId(event.target.value)}
              className="mb-3 h-10 w-full rounded-xl border border-bd-border bg-bd-card-bg px-3 text-sm text-bd-text"
            >
              {AI_PROVIDER_ROWS.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.label}
                </option>
              ))}
            </select>

            {selectedProvider ? (
              <p className="mb-3 text-[10.5px] leading-relaxed text-bd-text-muted">
                {selectedProvider.note} Get a key at{' '}
                <a
                  href={selectedProvider.signupUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[hsl(var(--primary))] underline"
                >
                  {selectedProvider.label}
                </a>
                . {selectedProvider.keyHint}.
              </p>
            ) : null}

            <label className="mb-1 block text-[11px] font-semibold text-bd-text-muted" htmlFor="ai-key">
              API key
            </label>
            <Input
              id="ai-key"
              type="password"
              value={keyDraft}
              onChange={(event) => setKeyDraft(event.target.value)}
              placeholder="Paste the provider key"
              autoComplete="off"
              spellCheck={false}
              className="mb-2"
            />
            <Button
              type="button"
              onClick={() => void handleSaveKey()}
              disabled={!keyDraft.trim()}
              className="w-full"
            >
              Save key
            </Button>
            {saveError ? (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-bd-status-danger-text">
                <AlertCircle className="size-3.5" /> {saveError}
              </p>
            ) : null}
            {!persistent ? (
              <p className="mt-3 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-bd-text-muted">
                <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
                This build has no private app storage, so the key is kept for this session only and
                is never written to browser storage.
              </p>
            ) : null}
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {messages.length === 0 ? (
                <div className="mt-6 text-center">
                  <p className="text-sm font-semibold text-bd-text">Ask anything</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-bd-text-muted">
                    This build answers questions only. It cannot read your documents or totals yet,
                    and it cannot create or change anything.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {messages.map((message, index) => (
                    <li
                      key={`${message.role}-${index}`}
                      className={
                        message.role === 'user'
                          ? 'ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-[hsl(var(--primary))] px-3 py-2 text-[13px] leading-relaxed text-white'
                          : 'mr-auto max-w-[90%] whitespace-pre-wrap text-[13px] leading-relaxed text-bd-text'
                      }
                    >
                      {message.content || (sending ? '…' : '')}
                    </li>
                  ))}
                </ul>
              )}
              {error ? (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-bd-status-danger-border bg-bd-status-danger-bg px-3 py-2">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-bd-status-danger-text" />
                  <p className="text-[11px] leading-relaxed text-bd-status-danger-text">{error}</p>
                </div>
              ) : null}
              <div ref={listEndRef} />
            </div>

            <div className="border-t border-bd-border px-3 py-3">
              <div className="flex items-end gap-2">
                <Input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      void handleSend()
                    }
                  }}
                  placeholder="Type a message"
                  aria-label="Message the assistant"
                  className="flex-1"
                />
                <Button
                  type="button"
                  size="icon-lg"
                  className="shrink-0"
                  onClick={() => void handleSend()}
                  disabled={!draft.trim() || sending}
                  aria-label="Send message"
                >
                  {sending ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
                </Button>
              </div>
              {savedMask ? (
                <p className="mt-2 text-[10px] text-bd-text-muted">Key saved: {savedMask}</p>
              ) : null}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
