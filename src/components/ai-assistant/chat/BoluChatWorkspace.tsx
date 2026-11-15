import { useCallback, useEffect, useRef, useState, useContext, type FormEvent, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'

import { AssistantHeader } from './assistant-chat-chrome'
import { AssistantComposer } from './assistant-chat-composer'
import { AssistantThread } from './assistant-chat-thread'
import { AssistantRail } from './assistant-chat-rail'
import { InvoicePanel } from './assistant-chat-panel'
import { ModelPill, type ActiveModelInfo, type SelectedModelTarget } from './assistant-chat-model-pill'
import { boluProviderApi, type PublicConnection } from '@/pages/settings/bolu-provider/api'
import { useBoluConversations } from '@/lib/ai-assistant/hooks/useBoluConversations'
import { useBoluThread } from '@/lib/ai-assistant/hooks/useBoluThread'
import { exportChatAsMarkdown, exportChatAsJson } from '@/lib/ai-assistant/bolu-export'
import { getBoluSuggestions } from '@/lib/ai-assistant/bolu-context'
import { EntityContext } from '@/lib/tenant/entityContext'
import { useAuthorization } from '@/lib/tenant/contexts'
import type { BoluReadAuthorization, BoluWriteAuthorization } from '@/lib/ai-assistant/bolu-data'
import type { BoluChatWorkspaceProps, ViewportId } from './types'

import './assistant-chat.css'
import './assistant-chat-clerk.css'
import './assistant-chat-premium-dark.css'

/** Detect viewport preset from window width */
function detectViewport(): ViewportId {
  if (typeof window === 'undefined') return 'desktop'
  const width = window.innerWidth
  if (width < 768) return 'fold-closed' // Mobile phone
  if (width < 1024) return 'fold-open'  // Foldable split
  if (width < 1280) return 'tablet'     // Tablet drawer
  return 'desktop'                      // Desktop 3-column
}

export function BoluChatWorkspace({
  open,
  onClose,
  tenantId,
  pageContext,
  initialViewport,
}: BoluChatWorkspaceProps) {
  const navigate = useNavigate()
  const entityCtx = useContext(EntityContext)
  const { hasAuthorization } = useAuthorization()
  const resolvedTenantId = tenantId ?? (pageContext as any)?.activeEntityId ?? entityCtx?.entity?.id ?? null

  // Live application authorization, forwarded to the Bolu read/write pipeline
  const authorizationRef = useRef(hasAuthorization)
  authorizationRef.current = hasAuthorization
  const canRead = useCallback<BoluReadAuthorization>(
    (resource, action) => authorizationRef.current(resource, action),
    [],
  )
  const canWrite = useCallback<BoluWriteAuthorization>(
    (resource, action) => authorizationRef.current(resource, action),
    [],
  )

  const [viewport, setViewport] = useState<ViewportId>(initialViewport ?? detectViewport())
  const [railCollapsed, setRailCollapsed] = useState(false)
  const [mobileRailOpen, setMobileRailOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)

  // Provider & Model state (reconciled dynamically with backend pool; settings managed exclusively in /settings)
  const [activeProvider, setActiveProvider] = useState<ActiveModelInfo | null>(null)
  const [connections, setConnections] = useState<PublicConnection[]>([])
  const [selectedModel, setSelectedModel] = useState<SelectedModelTarget | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem('bolu_active_model_target')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  // Composer input draft state
  const [inputDraft, setInputDraft] = useState('')
  const [pinned, setPinned] = useState(true)
  const [showJump, setShowJump] = useState(false)

  const logRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  // Live provider status synchronization on mount
  useEffect(() => {
    let active = true
    async function loadLivePool() {
      try {
        const status = await boluProviderApi.getStatus()
        if (!active) return

        const conns = status.connections ?? []
        setConnections(conns)

        const primaryConn =
          conns.find((c) => c.id === status.routing?.primaryConnectionId) ??
          conns.find((c) => c.isEnabled) ??
          conns[0]

        if (primaryConn) {
          setActiveProvider({
            id: primaryConn.providerId || primaryConn.id,
            label: primaryConn.name || primaryConn.providerId,
            model: primaryConn.model,
            isConfigured: true,
          })

          setSelectedModel((prev) => {
            if (prev && conns.some((c) => c.id === prev.connectionId && c.isEnabled)) {
              return prev
            }
            const fallbackTarget: SelectedModelTarget = {
              connectionId: primaryConn.id,
              connectionName: primaryConn.name || primaryConn.providerId,
              modelId: primaryConn.model,
              modelName: primaryConn.model,
            }
            try {
              localStorage.setItem('bolu_active_model_target', JSON.stringify(fallbackTarget))
            } catch {}
            return fallbackTarget
          })
        } else if (status.runtime?.provider && status.runtime.provider !== 'unconfigured') {
          setActiveProvider({
            id: status.runtime.provider,
            label: status.runtime.provider,
            model: status.runtime.model || 'Default',
            isConfigured: true,
          })
        } else {
          setActiveProvider({
            id: 'none',
            label: 'AI Not Configured',
            model: 'Setup Required',
            isConfigured: false,
          })
        }
      } catch (err) {
        if (active) {
          console.warn('[BoluChatWorkspace] Could not load live backend pool:', err)
          setActiveProvider({
            id: 'none',
            label: 'AI Not Configured',
            model: 'Setup Required',
            isConfigured: false,
          })
        }
      }
    }
    void loadLivePool()
    return () => {
      active = false
    }
  }, [])

  const handleSelectModel = (target: SelectedModelTarget) => {
    setSelectedModel(target)
    try {
      localStorage.setItem('bolu_active_model_target', JSON.stringify(target))
    } catch {}
  }

  // Window resize listener to automatically adjust viewport
  useEffect(() => {
    const onResize = () => setViewport(detectViewport())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Multi-thread conversation state via useBoluConversations
  const {
    conversations,
    activeConversationId,
    createConversation,
    selectConversation,
    deleteConversation,
  } = useBoluConversations({
    tenantId: resolvedTenantId,
    autoSelectLatest: true,
    module: pageContext?.origin?.page ?? 'dashboard',
    originRecordId: pageContext?.record?.id ?? null,
  })

  // Active chat stream state via useBoluThread with lazy auto-provisioning
  const {
    messages,
    clerkState,
    isStreaming,
    streamingContent,
    activeProposal,
    submitMessage,
    stopStreaming,
    approveGate1,
    rejectGate1,
    confirmGate2Save,
    cancelGate2Save,
  } = useBoluThread({
    conversationId: activeConversationId,
    tenantId: resolvedTenantId,
    entityId: resolvedTenantId,
    tenantClient: entityCtx?.tenantClient,
    canRead,
    canWrite,
    pageContext,
    connectionId: selectedModel?.connectionId ?? null,
    modelId: selectedModel?.modelId ?? null,
    onEnsureConversation: async () => {
      return await createConversation({
        title: 'New Conversation',
        module: pageContext?.origin?.page ?? 'dashboard',
      })
    },
  })

  // Auto-scroll when messages update and pinned to bottom
  useEffect(() => {
    const el = logRef.current
    if (el && pinned) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages, streamingContent, pinned])

  if (!open) return null

  const activeConversation = conversations.find((c) => c.id === activeConversationId)
  const conversationTitle = activeConversation?.title || 'Bolu Conversation'

  // Suggestions derived from context
  const suggestions = pageContext ? getBoluSuggestions(pageContext).map((s) => s.prompt) : []

  // Message submission handler with error-safe draft retention
  const handleSend = async (text: string) => {
    const clean = text.trim()
    if (!clean || isStreaming) return
    const success = await submitMessage(clean)
    if (success) {
      setInputDraft('')
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    void handleSend(inputDraft)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend(inputDraft)
    }
  }

  const handleInsert = (text: string) => {
    setInputDraft(text)
    inputRef.current?.focus()
  }

  const handleNavigateToSettings = () => {
    onClose?.()
    navigate('/settings')
  }

  // Shared Sub-components
  const headerNode = (
    <AssistantHeader
      modelPill={
        <ModelPill
          connections={connections}
          selectedModel={selectedModel}
          activeProvider={activeProvider}
          onSelectModel={handleSelectModel}
          onManage={handleNavigateToSettings}
        />
      }
      subtitle={`Page: ${pageContext?.origin?.page ?? 'Current Page'} · Two-Gate Verified`}
      onOpenSettings={handleNavigateToSettings}
      onOpenContext={() => setPanelOpen((v) => !v)}
      onOpenRail={() => setMobileRailOpen((v) => !v)}
      onClose={onClose}
      onExportMarkdown={() => exportChatAsMarkdown(messages, conversationTitle)}
      onExportJson={() => exportChatAsJson(messages, conversationTitle)}
      contextOpen={panelOpen}
      showContext={viewport === 'fold-closed' || viewport === 'tablet'}
      showRailToggle={viewport === 'fold-closed'}
    />
  )

  const threadNode = (
    <AssistantThread
      messages={messages}
      busy={isStreaming}
      isStreaming={isStreaming}
      clerkState={clerkState}
      tone="light"
      showJump={showJump}
      logRef={logRef}
      onScroll={() => {
        const el = logRef.current
        if (!el) return
        setShowJump(el.scrollHeight - el.scrollTop - el.clientHeight > 80)
      }}
      onJump={() => {
        const el = logRef.current
        if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
        setPinned(true)
        setShowJump(false)
      }}
      onSend={handleSend}
      onApproveGate1={(opId) => void approveGate1(opId)}
      onRejectGate1={(opId) => void rejectGate1(opId)}
      onConfirmGate2={(opId) => void confirmGate2Save(opId)}
      onCancelGate2={(opId) => void cancelGate2Save(opId)}
      suggestions={suggestions}
    />
  )

  const composerNode = (
    <AssistantComposer
      value={inputDraft}
      busy={isStreaming}
      disabled={isStreaming || clerkState !== 'idle'}
      awaiting={Boolean(activeProposal && activeProposal.status === 'pending_approval')}
      contextLabel={
        activeProposal
          ? (activeProposal.operationType === 'create-document'
              ? activeProposal.candidateNumber
              : activeProposal.targetDocumentNumber)
          : (pageContext?.record?.kind ?? 'Invoice')
      }
      inputRef={inputRef}
      onChange={setInputDraft}
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      onStop={stopStreaming}
    />
  )

  const panelNode = (
    <InvoicePanel proposal={activeProposal} />
  )

  const railNode = (
    <AssistantRail
      collapsed={railCollapsed}
      activeThreadId={activeConversationId}
      conversations={conversations}
      onToggle={() => setRailCollapsed((v) => !v)}
      onSelect={(id) => selectConversation(id)}
      onNew={() => void createConversation({ title: 'New Conversation' })}
      onDelete={(id) => void deleteConversation(id)}
    />
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4 ac-device"
      role="dialog"
      aria-modal="true"
      aria-label="Bolu Assistant Workspace"
    >
      {/* Root Modal Container */}
      <div className="ac-window relative flex flex-col w-full h-[100dvh] md:h-[96vh] max-h-[100dvh] md:max-h-[96vh] max-w-7xl rounded-none md:rounded-3xl border border-[var(--ac-line)] bg-[var(--ac-surface)] shadow-2xl overflow-hidden">
        {/* DEC-26 Responsive Viewports */}
        <div className="relative flex flex-1 min-h-0 w-full overflow-hidden">
          {/* 1. Phone Viewport ('fold-closed'): Single column + sheets */}
          {viewport === 'fold-closed' ? (
            <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden relative">
              {headerNode}
              {threadNode}
              {composerNode}

              {/* Mobile Rail Drawer */}
              {mobileRailOpen ? (
                <div className="absolute inset-0 z-50 flex bg-black/40 backdrop-blur-xs">
                  <div className="w-[280px] max-w-[85vw] h-full bg-[var(--ac-surface)] shadow-2xl flex flex-col border-r border-[var(--ac-line)]">
                    <div className="flex items-center justify-between p-3 border-b border-[var(--ac-line)]">
                      <p className="text-xs font-bold text-[var(--ac-ink)]">Conversations</p>
                      <button
                        type="button"
                        className="p-1 rounded-lg hover:bg-[var(--ac-muted-surface)]"
                        onClick={() => setMobileRailOpen(false)}
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                    <div
                      className="flex-1 overflow-hidden"
                      onClick={() => setMobileRailOpen(false)}
                    >
                      {railNode}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="flex-1 cursor-default"
                    aria-label="Close conversation drawer"
                    onClick={() => setMobileRailOpen(false)}
                  />
                </div>
              ) : null}

              {/* Document Artifact Sheet */}
              {panelOpen ? (
                <div className="absolute inset-0 z-40 flex flex-col justify-end bg-black/40">
                  <button
                    type="button"
                    className="flex-1 cursor-default"
                    aria-label="Close sheet"
                    onClick={() => setPanelOpen(false)}
                  />
                  <div className="relative h-[80%] max-h-[640px] w-full rounded-t-3xl bg-[var(--ac-surface)] border-t border-[var(--ac-line)] shadow-2xl flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between p-3 border-b border-[var(--ac-line)]">
                      <p className="text-xs font-bold text-[var(--ac-ink)]">Document Artifact</p>
                      <button
                        type="button"
                        className="p-1 rounded-lg hover:bg-[var(--ac-muted-surface)]"
                        onClick={() => setPanelOpen(false)}
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {panelNode}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* 2. Foldable Viewport ('fold-open'): Dual Pane Split */}
          {viewport === 'fold-open' ? (
            <div className="flex flex-1 h-full min-w-0 divide-x divide-[var(--ac-line)]">
              <div className="flex flex-col flex-1 h-full min-w-0">
                {headerNode}
                {threadNode}
                {composerNode}
              </div>
              <div className="hidden md:flex flex-col w-[380px] lg:w-[420px] h-full shrink-0">
                {panelNode}
              </div>
            </div>
          ) : null}

          {/* 3. Tablet Viewport ('tablet'): Rail + Chat + Slide-out Drawer */}
          {viewport === 'tablet' ? (
            <div className="flex flex-1 h-full min-w-0">
              {railNode}
              <div className="flex flex-col flex-1 h-full min-w-0 border-r border-[var(--ac-line)]">
                {headerNode}
                {threadNode}
                {composerNode}
              </div>
              {panelOpen ? (
                <aside className="w-[340px] shrink-0 h-full border-l border-[var(--ac-line)] bg-[var(--ac-surface)] flex flex-col">
                  <div className="flex items-center justify-between p-3 border-b border-[var(--ac-line)]">
                    <p className="text-xs font-bold text-[var(--ac-ink)]">Document Artifact</p>
                    <button
                      type="button"
                      className="p-1 rounded-lg hover:bg-[var(--ac-muted-surface)]"
                      onClick={() => setPanelOpen(false)}
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {panelNode}
                  </div>
                </aside>
              ) : null}
            </div>
          ) : null}

          {/* 4. Desktop Viewport ('desktop'): Full 3-Column Canvas */}
          {viewport === 'desktop' ? (
            <div className="flex flex-1 h-full min-w-0 divide-x divide-[var(--ac-line)]">
              {railNode}
              <div className="flex flex-col flex-1 h-full min-w-0">
                {headerNode}
                {threadNode}
                {composerNode}
              </div>
              <aside className="w-[340px] xl:w-[380px] h-full shrink-0 bg-[var(--ac-surface)]">
                {panelNode}
              </aside>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
