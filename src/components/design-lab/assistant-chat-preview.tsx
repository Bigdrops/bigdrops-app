import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw } from 'lucide-react'

import {
  INITIAL_INVOICE,
  applyCard,
  buildTurn,
  routeText,
  type InvoiceState,
  type TurnId,
} from './assistant-chat-script'
import { FamilyPicker, Segmented } from './assistant-chat-parts'
import { AssistantThread, type AssistantMessage, type Block, type ChatMessage } from './assistant-chat-thread'
import { AssistantComposer } from './assistant-chat-composer'
import { ModelPill } from './assistant-chat-model-pill'
import { InvoicePanel, type PendingCard } from './assistant-chat-panel'
import { ProviderSettings } from './assistant-chat-settings'
import { AssistantWorkspace, VIEWPORTS, type ViewportId } from './assistant-chat-layouts'
import {
  IDLE_TEST,
  pickActiveProvider,
  seedProviderEntries,
  simulateConnection,
  simulateModelDiscovery,
  upsertCustomProvider,
  type ProviderEntry,
} from './assistant-chat-providers'
import { useExperimentThemeStyle } from './design-lab-theme'
import {
  type PhotoHeroAppearance,
  type PhotoHeroFamilyId,
} from '@/components/onboarding/photo-hero-v2-theme'
import type { CustomProvider } from '@/lib/ai-assistant/providerRegistry'

import './assistant-chat-preview.css'
import './assistant-chat-workspace.css'

const INTER = "'Inter Variable', Inter, ui-sans-serif, system-ui, sans-serif"

/**
 * Alias layer lives in the stylesheet (`.ac-device`). The experiment root
 * carries bare HSL triplets from the theme registry, so base tokens are
 * wrapped in `hsl()` there; no colour is hardcoded.
 */

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export default function AssistantChatPreview() {
  const navigate = useNavigate()
  const [family, setFamily] = useState<PhotoHeroFamilyId>('slate-navy')
  const [appearance, setAppearance] = useState<PhotoHeroAppearance>('light')
  const [viewport, setViewport] = useState<ViewportId>('fold-closed')

  const { rootStyle } = useExperimentThemeStyle(family, appearance)

  const [invoice, setInvoice] = useState<InvoiceState>(INITIAL_INVOICE)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [awaiting, setAwaiting] = useState(false)
  const [pinned, setPinned] = useState(true)
  const [showJump, setShowJump] = useState(false)

  const [providers, setProviders] = useState<ProviderEntry[]>(seedProviderEntries)
  const [activeId, setActiveId] = useState('openrouter')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsFocus, setSettingsFocus] = useState<string | undefined>(undefined)
  const [panelOpen, setPanelOpen] = useState(false)
  const [railCollapsed, setRailCollapsed] = useState(false)
  const [activeThread, setActiveThread] = useState('t-131')

  const invoiceRef = useRef(invoice)
  const messagesRef = useRef(messages)
  const busyRef = useRef(false)
  const runRef = useRef(0)
  const seqRef = useRef(0)
  const resolvers = useRef(new Map<string, (accepted: boolean) => void>())
  const logRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    invoiceRef.current = invoice
  }, [invoice])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    const el = logRef.current
    if (el && pinned) el.scrollTop = el.scrollHeight
  }, [messages, pinned])

  useEffect(() => {
    if (!settingsOpen && !panelOpen) return
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (settingsOpen) closeSettings()
      else setPanelOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [settingsOpen, panelOpen])

  const activeProvider = providers.find((entry) => entry.id === activeId)
  const pending: PendingCard[] = []
  messages.forEach((message) => {
    if (message.role !== 'assistant') return
    message.blocks.forEach((block) => {
      if (block.kind !== 'cards') return
      block.cards.forEach((card) => {
        if (card.status === 'pending') pending.push({ messageId: message.id, card })
      })
    })
  })

  function patchAssistant(id: string, patch: (message: AssistantMessage) => AssistantMessage) {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === id && message.role === 'assistant' ? patch(message) : message,
      ),
    )
  }

  function appendBlock(messageId: string, block: Block) {
    patchAssistant(messageId, (message) => ({ ...message, blocks: [...message.blocks, block] }))
  }

  function patchText(messageId: string, blockId: string, text: string) {
    patchAssistant(messageId, (message) => ({
      ...message,
      blocks: message.blocks.map((block) =>
        block.id === blockId && block.kind === 'text' ? { ...block, text } : block,
      ),
    }))
  }

  function finishStatus(messageId: string, blockId: string) {
    patchAssistant(messageId, (message) => ({
      ...message,
      blocks: message.blocks.map((block) =>
        block.id === blockId && block.kind === 'status' ? { ...block, done: true } : block,
      ),
    }))
  }

  function streamText(messageId: string, blockId: string, text: string, run: number) {
    const words = text.split(/(\s+)/)
    let written = ''
    return (async () => {
      for (const word of words) {
        if (run !== runRef.current) return
        written += word
        patchText(messageId, blockId, written)
        await sleep(14 + Math.min(word.trim().length, 8) * 6)
      }
    })()
  }

  async function play(turn: TurnId) {
    const run = runRef.current
    const messageId = `a${seqRef.current++}`
    const plan = buildTurn(turn, invoiceRef.current, messageId)
    const cardIds: string[] = []

    busyRef.current = true
    setBusy(true)
    setMessages((prev) => [
      ...prev,
      { id: messageId, role: 'assistant', blocks: [], replies: [], thinking: true },
    ])

    for (const planned of plan.blocks) {
      if (run !== runRef.current) return

      if (planned.kind === 'status') {
        const blockId = `${messageId}-s${seqRef.current++}`
        appendBlock(messageId, { id: blockId, kind: 'status', label: planned.label, done: false })
        await sleep(planned.ms)
        if (run !== runRef.current) return
        finishStatus(messageId, blockId)
        await sleep(120)
        continue
      }

      if (planned.kind === 'text') {
        const blockId = `${messageId}-t${seqRef.current++}`
        appendBlock(messageId, { id: blockId, kind: 'text', text: '' })
        await streamText(messageId, blockId, planned.text, run)
        if (run !== runRef.current) return
        await sleep(140)
        continue
      }

      appendBlock(messageId, {
        id: `${messageId}-c${seqRef.current++}`,
        kind: 'cards',
        cards: planned.cards,
      })
      planned.cards.forEach((card) => cardIds.push(card.id))
      await sleep(180)
    }

    if (run !== runRef.current) return

    patchAssistant(messageId, (message) => ({ ...message, thinking: false, replies: plan.replies }))

    if (plan.followUp) {
      const fileCardId = cardIds[0]
      setAwaiting(true)
      const decision = fileCardId
        ? await new Promise<boolean>((resolve) => resolvers.current.set(fileCardId, resolve))
        : true
      setAwaiting(false)
      if (run !== runRef.current) return
      await play(decision ? plan.followUp.accepted : plan.followUp.rejected)
      return
    }

    busyRef.current = false
    setBusy(false)
  }

  function send(raw: string, turn?: TurnId) {
    const text = raw.trim()
    if (!text || busyRef.current) return

    setMessages((prev) => [
      ...prev.map((message) =>
        message.role === 'assistant' ? { ...message, replies: [] } : message,
      ),
      { id: `u${seqRef.current++}`, role: 'user', text },
    ])
    setInput('')
    setPinned(true)
    setShowJump(false)
    void play(turn ?? routeText(text, invoiceRef.current))
  }

  function decide(messageId: string, cardId: string, accepted: boolean) {
    const holder = messagesRef.current.find(
      (message) =>
        message.role === 'assistant' &&
        message.blocks.some(
          (block) => block.kind === 'cards' && block.cards.some((card) => card.id === cardId),
        ),
    )
    if (!holder || holder.role !== 'assistant') return

    const card = holder.blocks
      .flatMap((block) => (block.kind === 'cards' ? block.cards : []))
      .find((entry) => entry.id === cardId)
    if (!card || card.status !== 'pending') return

    patchAssistant(messageId, (message) => ({
      ...message,
      blocks: message.blocks.map((block) =>
        block.kind === 'cards'
          ? {
              ...block,
              cards: block.cards.map((entry) =>
                entry.id === cardId
                  ? { ...entry, status: accepted ? 'accepted' : 'rejected' }
                  : entry,
              ),
            }
          : block,
      ),
    }))

    if (accepted) {
      const next = applyCard(invoiceRef.current, card)
      invoiceRef.current = next
      setInvoice(next)
    }

    const resolve = resolvers.current.get(cardId)
    if (resolve) {
      resolvers.current.delete(cardId)
      resolve(accepted)
    }
  }

  function stop() {
    runRef.current += 1
    busyRef.current = false
    setBusy(false)
    setAwaiting(false)
    setMessages((prev) => {
      const last = prev[prev.length - 1]
      if (!last || last.role !== 'assistant') return prev
      return prev.map((message) => {
        if (message.id !== last.id || message.role !== 'assistant') return message
        return {
          ...message,
          thinking: false,
          blocks: message.blocks.map((block) =>
            block.kind === 'status' ? { ...block, done: true } : block,
          ),
        }
      })
    })
  }

  function reset() {
    runRef.current += 1
    resolvers.current.clear()
    busyRef.current = false
    setBusy(false)
    setAwaiting(false)
    setMessages([])
    setInvoice(INITIAL_INVOICE)
    invoiceRef.current = INITIAL_INVOICE
    setInput('')
    setPinned(true)
    setShowJump(false)
    setPanelOpen(false)
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    send(input)
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey) return
    if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return
    event.preventDefault()
    send(input)
  }

  function onLogScroll() {
    const el = logRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    setShowJump(distance > 150)
    setPinned(distance < 48)
  }

  function openSettings(providerId?: string) {
    setSettingsFocus(providerId)
    setSettingsOpen(true)
  }

  function closeSettings() {
    setSettingsOpen(false)
    setSettingsFocus(undefined)
  }

  function patchProvider(id: string, patch: Partial<ProviderEntry>) {
    setProviders((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)))
  }

  function changeKey(id: string, key: string) {
    const firstKey = !providers.some((entry) => entry.key)
    patchProvider(id, { key, tested: IDLE_TEST })
    if (key.trim() && firstKey) setActiveId(id)
  }

  function changeModel(id: string, model: string) {
    patchProvider(id, { model })
  }

  function activate(id: string) {
    setActiveId(id)
    closeSettings()
  }

  async function testProvider(entry: ProviderEntry) {
    patchProvider(entry.id, { tested: { status: 'testing', message: `Dialling ${entry.label}…` } })
    const result = await simulateConnection(entry, entry.key)
    patchProvider(entry.id, { tested: result })
  }

  async function fetchModels(entry: ProviderEntry) {
    patchProvider(entry.id, { discovering: true })
    const models = await simulateModelDiscovery(entry)
    patchProvider(entry.id, {
      models,
      discovering: false,
      tested: { status: 'ok', message: `${models.length} models loaded from /v1/models.` },
    })
  }

  function addCustom(provider: CustomProvider, key: string) {
    setProviders((prev) => upsertCustomProvider(prev, provider, key))
    setActiveId(provider.id)
    closeSettings()
  }

  function removeCustom(id: string) {
    const next = providers.filter((entry) => entry.id !== id)
    setProviders(next)
    if (activeId === id) setActiveId(pickActiveProvider(next, ''))
  }

  function pickModel(providerId: string, model: string) {
    patchProvider(providerId, { model })
    setActiveId(providerId)
  }

  const settingsNode = (
    <ProviderSettings
      entries={providers}
      activeId={activeId}
      focusId={settingsFocus}
      variant={viewport === 'fold-closed' ? 'sheet' : 'panel'}
      onClose={closeSettings}
      onKeyChange={changeKey}
      onModelChange={changeModel}
      onActivate={activate}
      onTest={(entry) => void testProvider(entry)}
      onFetchModels={(entry) => void fetchModels(entry)}
      onAddCustom={addCustom}
      onRemoveCustom={removeCustom}
    />
  )

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: INTER }}>
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/design-lab')}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" /> Design Lab
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold tracking-tight">Assistant Chat</h1>
            <p className="text-xs text-muted-foreground">
              Scripted invoice conversation · four viewports · provider and model settings
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              reset()
              setSettingsOpen(false)
              setProviders(seedProviderEntries())
              setActiveId('openrouter')
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <RefreshCw className="size-3.5" aria-hidden="true" /> Reset all
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-4 px-4 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented<ViewportId>
            label="Viewport"
            value={viewport}
            onChange={(next) => {
              setViewport(next)
              setSettingsOpen(false)
              setPanelOpen(false)
            }}
            options={VIEWPORTS.map((item) => ({
              value: item.id,
              label: item.label,
              icon: item.icon,
            }))}
          />
          <Segmented<PhotoHeroAppearance>
            label="Appearance"
            value={appearance}
            onChange={setAppearance}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
          <FamilyPicker family={family} onChange={setFamily} />
        </div>

        <div className="ac-device" data-tone={appearance} style={rootStyle}>
          <AssistantWorkspace
            viewport={viewport}
            modelPill={
              <ModelPill
                entries={providers}
                activeId={activeId}
                onPick={pickModel}
                onManage={(providerId) => openSettings(providerId)}
              />
            }
            thread={
              <AssistantThread
                messages={messages}
                busy={busy}
                showJump={showJump}
                logRef={logRef}
                onScroll={onLogScroll}
                onJump={() => {
                  const el = logRef.current
                  if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
                  setPinned(true)
                  setShowJump(false)
                }}
                onDecide={decide}
                onSend={send}
                onReset={reset}
              />
            }
            composer={
              <AssistantComposer
                value={input}
                busy={busy}
                awaiting={awaiting}
                invoiceNumber={invoice.number}
                inputRef={inputRef}
                onChange={setInput}
                onSubmit={onSubmit}
                onKeyDown={onKeyDown}
                onStop={stop}
                onInsert={(text) => {
                  setInput(text)
                  inputRef.current?.focus()
                }}
              />
            }
            panel={
              <InvoicePanel
                invoice={invoice}
                pending={pending}
                provider={activeProvider}
                onDecide={decide}
                onManageProviders={() => openSettings()}
              />
            }
            settings={settingsNode}
            panelOpen={panelOpen}
            settingsOpen={settingsOpen}
            onOpenPanel={() => {
              setPanelOpen(true)
              setSettingsOpen(false)
            }}
            onClosePanel={() => setPanelOpen(false)}
            onOpenSettings={() => openSettings()}
            onCloseSettings={closeSettings}
            railCollapsed={railCollapsed}
            onToggleRail={() => setRailCollapsed((value) => !value)}
            activeThread={activeThread}
            onSelectThread={setActiveThread}
            onNewThread={() => {
              reset()
              setActiveThread('t-131')
            }}
          />
        </div>

        <div className="mx-auto grid max-w-3xl gap-2 text-center text-xs leading-5 text-muted-foreground sm:grid-cols-3">
          <p>
            <strong className="text-foreground">Money stays app-owned.</strong> Every card carries
            inputs; totals recompute from the invoice state.
          </p>
          <p>
            <strong className="text-foreground">One paste per provider.</strong> A key fills a
            preconfigured catalog; an unlisted endpoint is a custom provider.
          </p>
          <p>
            <strong className="text-foreground">Four layouts, one model.</strong> Sheets, split,
            drawer, and rail appear only when the width needs them.
          </p>
        </div>
      </div>
    </div>
  )
}
