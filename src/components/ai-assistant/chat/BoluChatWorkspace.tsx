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
import { useBoluNarration } from '@/lib/ai-assistant/hooks/useBoluNarration'
import { useBoluInteractionPreferences } from '@/hooks/useBoluInteractionPreferences'
import { useBoluChatInteractions } from '@/hooks/useBoluChatInteractions'
import { useBoluResponseHaptics } from '@/hooks/useBoluResponseHaptics'
import { triggerBoluHaptic } from '@/lib/ai-assistant/bolu-haptics'
import { exportChatAsMarkdown, exportChatAsJson } from '@/lib/ai-assistant/bolu-export'
import { getBoluSuggestions } from '@/lib/ai-assistant/bolu-context'
import { EntityContext } from '@/lib/tenant/entityContext'
import { useAuthorization } from '@/lib/tenant/contexts'
import type { BoluReadAuthorization, BoluWriteAuthorization } from '@/lib/ai-assistant/bolu-data'
import type { BoluChatWorkspaceProps, ProductionBoluMessage, ViewportId } from './types'

import './assistant-chat.css'
import './assistant-chat-clerk.css'
import './assistant-chat-premium-dark.css'

/**
 * Detect viewport preset matching project Design Lab device standards:
 * - fold-closed: < 768px (Phone / folded device)
 * - fold-open: 768px - 1023px (Unfolded foldable / wide phone)
 * - tablet: 1024px - 1279px (Tablet shell)
 * - desktop: >= 1280px (Desktop full-canvas workspace)
 */
function detectViewport(): ViewportId {
  if (typeof window === 'undefined') return 'desktop'
  const width = window.innerWidth
  if (width < 768) return 'fold-closed'
  if (width < 1024) return 'fold-open'
  if (width < 1280) return 'tablet'
  return 'desktop'
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

  // Live provider connection & model selection state
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

  // Composer draft & auto-scroll state
  const [inputDraft, setInputDraft] = useState('')
  const [pinned, setPinned] = useState(true)
  const [showJump, setShowJump] = useState(false)
  // Id of the user message currently being edited in the composer.
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)

  const logRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  // Live provider status sync
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

  // Window resize listener
  useEffect(() => {
    const onResize = () => setViewport(detectViewport())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Multi-thread conversation state via useBoluConversations
  // autoSelectLatest is false: opening Bolu always initializes a fresh empty session
  const {
    conversations,
    activeConversations,
    expiringConversations,
    activeConversationId,
    createConversation,
    selectConversation,
    restoreConversation,
    deleteConversation,
  } = useBoluConversations({
    tenantId: resolvedTenantId,
    autoSelectLatest: false,
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
    editUserMessage,
    regenerateResponse,
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

  const { preferences } = useBoluInteractionPreferences()
  const narration = useBoluNarration({ rate: preferences.narrationRate })
  const stopNarration = narration.stop

  useBoluResponseHaptics({ messages, isStreaming, preferences })

  const { handleBeginEdit, handleCancelEdit, handleRegenerate, handleSpeakResponse, handleSaveEdit, narrationControls } =
    useBoluChatInteractions({ isStreaming, preferences, narration, editUserMessage, regenerateResponse, setEditingMessageId, setInputDraft, inputRef, stopNarration })

  // Leaving the conversation, closing the workspace or unmounting stops speech.
  useEffect(() => {
    stopNarration()
  }, [activeConversationId, stopNarration])

  useEffect(() => {
    if (!open) stopNarration()
  }, [open, stopNarration])

  // Automatically open contextual panel when an actionable document proposal arrives
  useEffect(() => {
    if (activeProposal && (activeProposal.status === 'pending_approval' || activeProposal.status === 'approved_pending_save')) {
      setPanelOpen(true)
    }
  }, [activeProposal])

  // Auto-scroll when messages update and pinned to bottom
  useEffect(() => {
    const el = logRef.current
    if (el && pinned) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages, streamingContent, pinned])

  if (!open) return null

  const activeConversation = conversations.find((c) => c.id === activeConversationId)
  const conversationTitle = activeConversation?.title || 'New Conversation'

  // Suggestions derived from context
  const suggestions = pageContext ? getBoluSuggestions(pageContext).map((s) => s.prompt) : []

  // Message submission handler with error-safe draft retention.
  // While editing, the same composer saves the edited request instead of
  // appending a new user message.
  const handleSend = async (text: string) => {
    const clean = text.trim()
    if (!clean || isStreaming) return

    if (editingMessageId) {
      await handleSaveEdit(editingMessageId, clean)
      return
    }

    const success = await submitMessage(clean)
    if (success) {
      setInputDraft('')
      triggerBoluHaptic('impact-light', preferences)
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    void handleSend(inputDraft)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape' && editingMessageId) {
      e.preventDefault()
      handleCancelEdit()
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend(inputDraft)
    }
  }

  const handleNavigateToSettings = () => {
    handleClose()
    navigate('/settings?section=bolu-provider')
  }

  const handleClose = () => {
    setInputDraft('')
    setEditingMessageId(null)
    stopNarration()
    selectConversation(null)
    setMobileRailOpen(false)
    onClose?.()
  }

  const handleNewConversation = () => {
    selectConversation(null)
    setInputDraft('')
    setEditingMessageId(null)
    stopNarration()
    setMobileRailOpen(false)
    inputRef.current?.focus()
  }

  const handleSelectThread = (id: string) => {
    setEditingMessageId(null)
    setInputDraft('')
    stopNarration()
    selectConversation(id)
    setMobileRailOpen(false)
  }

  // Active Model Pill (merged into the single compact header row)
  const modelPillNode = (
    <ModelPill
      connections={connections}
      selectedModel={selectedModel}
      activeProvider={activeProvider}
      onSelectModel={handleSelectModel}
      onManage={handleNavigateToSettings}
      direction="down"
    />
  )

  // Header Component (Bolu identity on left, Model Picker & actions on right in ONE shared row)
  const headerNode = (
    <AssistantHeader
      modelPill={modelPillNode}
      subtitle={`Page: ${pageContext?.origin?.page ?? 'Current Page'}`}
      onOpenSettings={handleNavigateToSettings}
      onOpenContext={() => setPanelOpen((v) => !v)}
      onOpenRail={() => setMobileRailOpen((v) => !v)}
      onClose={handleClose}
      onExportMarkdown={() => exportChatAsMarkdown(messages, conversationTitle)}
      onExportJson={() => exportChatAsJson(messages, conversationTitle)}
      contextOpen={panelOpen}
      showContext={true}
      showRailToggle={viewport === 'fold-closed' || viewport === 'fold-open'}
      isMobile={viewport === 'fold-closed'}
    />
  )

  // Message Thread Component
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
      onEditMessage={handleBeginEdit}
      onRegenerateMessage={handleRegenerate}
      narration={narrationControls}
      suggestions={suggestions}
    />
  )

  // Composer Component at Bottom
  const composerNode = (
    <AssistantComposer
      value={inputDraft}
      busy={isStreaming}
      disabled={isStreaming || clerkState !== 'idle'}
      awaiting={Boolean(
        activeProposal &&
          (activeProposal.status === 'pending_approval' || activeProposal.status === 'approved_pending_save'),
      )}
      editing={Boolean(editingMessageId)}
      onCancelEdit={handleCancelEdit}
      inputRef={inputRef}
      onChange={setInputDraft}
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      onStop={stopStreaming}
    />
  )

  // Document Panel Component
  const panelNode = (
    <InvoicePanel
      proposal={activeProposal}
      onClose={() => setPanelOpen(false)}
    />
  )

  // History Rail Component
  const railNode = (isMobileDrawerMode: boolean = false) => (
    <AssistantRail
      collapsed={railCollapsed}
      activeThreadId={activeConversationId}
      conversations={activeConversations}
      expiringConversations={expiringConversations}
      onToggle={() => setRailCollapsed((v) => !v)}
      onSelect={handleSelectThread}
      onNew={handleNewConversation}
      onRestore={(id) => void restoreConversation(id)}
      onDelete={(id) => void deleteConversation(id)}
      isMobileDrawer={isMobileDrawerMode}
    />
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-0 lg:p-2 xl:p-3 ac-device"
      role="dialog"
      aria-modal="true"
      aria-label="Bolu Assistant Workspace"
    >
      {/* Root Full-Height Enterprise Workspace Container */}
      <div className="ac-window relative flex flex-col w-full h-[100dvh] md:h-[96vh] max-h-[100dvh] md:max-h-[96vh] max-w-[1600px] rounded-none lg:rounded-2xl border border-[var(--ac-line)] bg-[var(--ac-surface)] shadow-2xl overflow-hidden">
        <div className="relative flex flex-1 min-h-0 w-full overflow-hidden">
          {/* 1. Mobile Phone Viewport ('fold-closed'): Single column + slide-out drawer + bottom sheet */}
          {viewport === 'fold-closed' ? (
            <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden relative">
              {headerNode}
              {threadNode}
              {composerNode}

              {/* Mobile Rail Drawer */}
              {mobileRailOpen ? (
                <div className="absolute inset-0 z-50 flex bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
                  <div className="w-[280px] max-w-[85vw] h-full bg-[var(--ac-surface)] shadow-2xl flex flex-col border-r border-[var(--ac-line)]">
                    <div className="flex items-center justify-between p-3 border-b border-[var(--ac-line)]">
                      <p className="text-xs font-bold text-[var(--ac-ink)]">Conversations</p>
                      <button
                        type="button"
                        className="p-1 rounded-lg hover:bg-[var(--ac-muted-surface)] text-[var(--ac-muted)]"
                        onClick={() => setMobileRailOpen(false)}
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      {railNode(true)}
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

              {/* Document Artifact Bottom Sheet */}
              {panelOpen ? (
                <div className="absolute inset-0 z-40 flex flex-col justify-end bg-black/40 animate-in fade-in duration-150">
                  <button
                    type="button"
                    className="flex-1 cursor-default"
                    aria-label="Close sheet"
                    onClick={() => setPanelOpen(false)}
                  />
                  <div className="relative h-[85%] max-h-[640px] w-full rounded-t-3xl bg-[var(--ac-surface)] border-t border-[var(--ac-line)] shadow-2xl flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto">
                      {panelNode}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* 2. Foldable Viewport ('fold-open'): Wide dual-pane split with history access */}
          {viewport === 'fold-open' ? (
            <div className="flex flex-1 h-full min-w-0 divide-x divide-[var(--ac-line)] relative">
              <div className="flex flex-col flex-1 h-full min-w-0">
                {headerNode}
                {threadNode}
                {composerNode}
              </div>

              {/* Collapsible Document Panel */}
              {panelOpen ? (
                <div className="flex flex-col w-[360px] lg:w-[400px] h-full shrink-0">
                  {panelNode}
                </div>
              ) : null}

              {/* Foldable History Rail Drawer */}
              {mobileRailOpen ? (
                <div className="absolute inset-0 z-50 flex bg-black/40 backdrop-blur-xs">
                  <div className="w-[300px] h-full bg-[var(--ac-surface)] shadow-2xl flex flex-col border-r border-[var(--ac-line)]">
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
                    <div className="flex-1 overflow-hidden">
                      {railNode(true)}
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
            </div>
          ) : null}

          {/* 3. Tablet Viewport ('tablet'): Collapsible Rail + Central Chat + Slide-out Panel */}
          {viewport === 'tablet' ? (
            <div className="flex flex-1 h-full min-w-0">
              {railNode(false)}
              <div className="flex flex-col flex-1 h-full min-w-0 border-r border-[var(--ac-line)]">
                {headerNode}
                {threadNode}
                {composerNode}
              </div>
              {panelOpen ? (
                <aside className="w-[340px] shrink-0 h-full border-l border-[var(--ac-line)] bg-[var(--ac-surface)] flex flex-col">
                  {panelNode}
                </aside>
              ) : null}
            </div>
          ) : null}

          {/* 4. Desktop Viewport ('desktop'): Full 3-Column Enterprise Workspace */}
          {viewport === 'desktop' ? (
            <div className="flex flex-1 h-full min-w-0 divide-x divide-[var(--ac-line)]">
              {railNode(false)}
              <div className="flex flex-col flex-1 h-full min-w-0">
                {headerNode}
                {threadNode}
                {composerNode}
              </div>
              {panelOpen ? (
                <aside className="w-[340px] xl:w-[380px] h-full shrink-0 bg-[var(--ac-surface)]">
                  {panelNode}
                </aside>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
