import { useCallback, useEffect, useRef, useState, useContext, type FormEvent, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'

import { AssistantHeader } from './assistant-chat-chrome'
import { AssistantComposer } from './assistant-chat-composer'
import { AssistantThread } from './assistant-chat-thread'
import { AssistantRail } from './assistant-chat-rail'
import { InvoicePanel } from './assistant-chat-panel'
import { ModelPill, type ActiveModelInfo, type SelectedModelTarget } from './assistant-chat-model-pill'
import { ModelNegotiationPrompt } from './assistant-model-negotiation'
import type { CandidateAlternative } from '@/lib/ai-assistant/routing/bolu-alternative-discovery'
import { boluProviderApi, type PublicConnection } from '@/pages/settings/bolu-provider/api'
import { useBoluConversations } from '@/lib/ai-assistant/hooks/useBoluConversations'
import { useBoluThread } from '@/lib/ai-assistant/hooks/useBoluThread'
import { useBoluNarration } from '@/lib/ai-assistant/hooks/useBoluNarration'
import { useBoluInteractionPreferences } from '@/hooks/useBoluInteractionPreferences'
import { useBoluChatInteractions } from '@/hooks/useBoluChatInteractions'
import { useBoluResponseHaptics } from '@/hooks/useBoluResponseHaptics'
import { exportChatAsMarkdown, exportChatAsJson } from '@/lib/ai-assistant/bolu-export'
import { getBoluSuggestions } from '@/lib/ai-assistant/bolu-context'
import { feedback } from '@/lib/feedback'
import { EntityContext } from '@/lib/tenant/entityContext'
import { useAuthorization } from '@/lib/tenant/contexts'
import { supabase } from '@/supabase'
import { deriveConversationTitle } from '@/lib/ai-assistant/bolu-titles'
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

  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setCurrentUser(data.user)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user ?? null)
    })
    return () => {
      subscription.unsubscribe()
    }
  }, [])

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

  // Live provider connection & model selection state (Default is Auto mode: null or connectionId === 'auto')
  const [activeProvider, setActiveProvider] = useState<ActiveModelInfo | null>(null)
  const [activeResolvedModel, setActiveResolvedModel] = useState<string | null>(null)
  const [connections, setConnections] = useState<PublicConnection[]>([])
  const [selectedModel, setSelectedModel] = useState<SelectedModelTarget | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem('bolu_active_model_target')
      if (!raw) return null
      const parsed = JSON.parse(raw)
      if (!parsed || parsed.connectionId === 'auto') return null
      return parsed
    } catch {
      return null
    }
  })

  // Manual fallback negotiation state
  const [negotiation, setNegotiation] = useState<{
    failedModelName: string
    alternatives: CandidateAlternative[]
    secondsRemaining: number
    isDismissed: boolean
  } | null>(null)

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

          // Maintain Auto selection as default; only fall back to Auto if an explicitly pinned model was deleted
          setSelectedModel((prev) => {
            if (!prev || prev.connectionId === 'auto') return null
            if (conns.some((c) => c.id === prev.connectionId && c.isEnabled)) {
              return prev
            }
            try {
              localStorage.removeItem('bolu_active_model_target')
            } catch {}
            return null
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

  const handleSelectModel = useCallback((target: SelectedModelTarget) => {
    if (target.connectionId === 'auto') {
      setSelectedModel(null)
      try {
        localStorage.removeItem('bolu_active_model_target')
      } catch {}
    } else {
      setSelectedModel(target)
      try {
        localStorage.setItem('bolu_active_model_target', JSON.stringify(target))
      } catch {}
    }
  }, [])

  const handleModelUnavailable = useCallback(
    (alternatives: CandidateAlternative[], failedConnId?: string, failedMdlId?: string) => {
      if (!alternatives || alternatives.length === 0) {
        feedback.error('The selected model is unavailable, and no alternatives were found in the active pool.')
        return
      }
      const failedConn = connections.find((c) => c.id === failedConnId)
      const failedName = failedConn?.name || selectedModel?.modelName || 'Selected Model'
      setNegotiation({
        failedModelName: failedName,
        alternatives,
        secondsRemaining: 10,
        isDismissed: false,
      })
    },
    [connections, selectedModel],
  )

  const handleResolvedModel = useCallback(
    (info: { connectionId: string | null; model: string | null; isFallback: boolean }) => {
      if (info.model) {
        setActiveResolvedModel(info.model)
        if (info.isFallback) {
          feedback.info(`Bolu automatically routed to ${info.model}`)
        }
      }
    },
    [],
  )

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
    resubmitPendingTurn,
    editUserMessage,
    regenerateResponse,
    stopStreaming,
    approveGate1,
    rejectGate1,
    confirmGate2Save,
    cancelGate2Save,
    returnGate1ToReview,
    searchProposalClients,
    selectProposalClient,
    createProposalClient,
    answerBoluClarification,
    error,
    clearError,
  } = useBoluThread({
    conversationId: activeConversationId,
    tenantId: resolvedTenantId,
    entityId: resolvedTenantId,
    tenantClient: entityCtx?.tenantClient,
    canRead,
    canWrite,
    pageContext,
    connectionId: selectedModel?.connectionId === 'auto' ? null : (selectedModel?.connectionId ?? null),
    modelId: selectedModel?.modelId === 'auto' ? null : (selectedModel?.modelId ?? null),
    onModelUnavailable: handleModelUnavailable,
    onResolvedModel: handleResolvedModel,
    onEnsureConversation: async () => {
      const initialTitle = inputDraft.trim() ? deriveConversationTitle(inputDraft.trim()) : 'New Conversation'
      return await createConversation({
        title: initialTitle,
        module: pageContext?.origin?.page ?? 'dashboard',
      })
    },
  })

  // 10-second Manual fallback countdown timer
  useEffect(() => {
    if (!negotiation) return

    if (negotiation.secondsRemaining <= 0) {
      // Countdown expired: automatically select strongest alternative (first in list)
      const strongest = negotiation.alternatives[0]
      if (strongest) {
        const newTarget: SelectedModelTarget = {
          connectionId: strongest.connectionId,
          connectionName: strongest.connectionName,
          modelId: strongest.modelId,
          modelName: strongest.modelName,
        }
        handleSelectModel(newTarget)
        feedback.info(`Switched to ${strongest.modelName} (Manual fallback)`)
        void resubmitPendingTurn(strongest.connectionId, strongest.modelId)
      }
      setNegotiation(null)
      return
    }

    const timer = setTimeout(() => {
      setNegotiation((prev) => (prev ? { ...prev, secondsRemaining: prev.secondsRemaining - 1 } : null))
    }, 1000)

    return () => clearTimeout(timer)
  }, [negotiation, handleSelectModel, resubmitPendingTurn])

  // Clear negotiation prompt if conversation changes
  useEffect(() => {
    setNegotiation(null)
  }, [activeConversationId])

  const handleSelectAlternative = useCallback(
    (alt: CandidateAlternative) => {
      const newTarget: SelectedModelTarget = {
        connectionId: alt.connectionId,
        connectionName: alt.connectionName,
        modelId: alt.modelId,
        modelName: alt.modelName,
      }
      handleSelectModel(newTarget)
      setNegotiation(null)
      feedback.info(`Switched to ${alt.modelName}`)
      void resubmitPendingTurn(alt.connectionId, alt.modelId)
    },
    [handleSelectModel, resubmitPendingTurn],
  )

  const handleDismissNegotiation = useCallback(() => {
    setNegotiation((prev) => (prev ? { ...prev, isDismissed: true } : null))
  }, [])

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

  // Open the side panel when a proposal arrives on a viewport where the panel
  // sits beside the conversation. On a phone the panel is a bottom sheet that
  // would cover the composer, so the in-thread proposal card is the preview and
  // the sheet stays an explicit choice. A pending proposal never locks chat.
  useEffect(() => {
    const actionable =
      activeProposal &&
      (activeProposal.status === 'pending_approval' || activeProposal.status === 'approved_pending_save')
    if (actionable && viewport !== 'fold-closed') setPanelOpen(true)
  }, [activeProposal, viewport])

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

  const handleSend = async (text: string) => {
    const clean = text.trim()
    if (!clean || isStreaming) return
    clearError()
    if (editingMessageId) {
      const ok = await handleSaveEdit(editingMessageId, clean)
      if (!ok && error) {
        feedback.error('Message update failed', { description: error })
      }
      return
    }
    const success = await submitMessage(clean, {
      onAccepted: () => setInputDraft(''),
    })
    if (!success && error) {
      feedback.error('Message send failed', { description: error })
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    void handleSend(inputDraft)
  }

  /**
   * Enter inserts a newline. It never sends.
   *
   * On Android the soft keyboard's Enter key is the primary newline key, so
   * treating it as submit made multiline composition impossible. Sending is
   * the explicit send button only, which also keeps IME composition and paste
   * behaviour untouched.
   */
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape' && editingMessageId) {
      e.preventDefault()
      handleCancelEdit()
    }
  }

  const handleNavigateToSettings = () => {
    handleClose()
    navigate('/settings?section=bolu-provider')
  }

  const handleClose = () => {
    setInputDraft('')
    setEditingMessageId(null)
    clearError()
    stopNarration()
    selectConversation(null)
    setMobileRailOpen(false)
    onClose?.()
  }

  const handleNewConversation = () => {
    selectConversation(null)
    setInputDraft('')
    setEditingMessageId(null)
    clearError()
    stopNarration()
    setMobileRailOpen(false)
    inputRef.current?.focus()
  }

  const handleSelectThread = (id: string) => {
    setEditingMessageId(null)
    setInputDraft('')
    clearError()
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
      activeResolvedModel={activeResolvedModel}
      onSelectModel={handleSelectModel}
      onManage={handleNavigateToSettings}
      direction="down"
    />
  )

  // Manual fallback negotiation prompt (visible above composer during active countdown)
  const negotiationNode = negotiation && !negotiation.isDismissed ? (
    <ModelNegotiationPrompt
      failedModelName={negotiation.failedModelName}
      alternatives={negotiation.alternatives}
      secondsRemaining={negotiation.secondsRemaining}
      onSelectAlternative={handleSelectAlternative}
      onDismiss={handleDismissNegotiation}
    />
  ) : null

  // Header Component (Bolu identity on left, Model Picker & actions on right in ONE shared row)
  const headerNode = (
    <AssistantHeader
      modelPill={modelPillNode}
      subtitle={`Page: ${pageContext?.origin?.page ?? 'Current Page'}`}
      onOpenSettings={handleNavigateToSettings}
      onOpenContext={() => setPanelOpen((v) => !v)}
      onOpenRail={() => setMobileRailOpen((v) => !v)}
      onClose={handleClose}
      onExportMarkdown={() => {
        void exportChatAsMarkdown(messages, conversationTitle)
          .then(() => feedback.success('Markdown transcript saved'))
          .catch(() => feedback.error('Could not export the Markdown transcript'))
      }}
      onExportJson={() => {
        void exportChatAsJson(messages, conversationTitle)
          .then(() => feedback.success('JSON transcript saved'))
          .catch(() => feedback.error('Could not export the JSON transcript'))
      }}
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
      onReturnToReview={(opId) => void returnGate1ToReview(opId)}
      onSearchClients={(_opId, term) => searchProposalClients(term)}
      onSelectClient={(opId, client) => selectProposalClient(client, opId)}
      onCreateClient={(opId, input) => createProposalClient(input, opId)}
      onAnswerClarification={(opId, questionId, answer) =>
        answerBoluClarification(opId, questionId, answer)
      }
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
      disabled={isStreaming || (clerkState !== 'idle' && !editingMessageId)}
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
      onApproveGate1={approveGate1}
      onRejectGate1={rejectGate1}
      onConfirmGate2={confirmGate2Save}
      onCancelGate2={cancelGate2Save}
      onReturnToReview={returnGate1ToReview}
      onSearchClients={(_opId, term) => searchProposalClients(term)}
      onSelectClient={(opId, client) => selectProposalClient(client, opId)}
      onCreateClient={(opId, input) => createProposalClient(input, opId)}
      onAnswerClarification={(opId, questionId, answer) =>
        answerBoluClarification(opId, questionId, answer)
      }
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
      onCloseDrawer={() => setMobileRailOpen(false)}
      user={currentUser}
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
              {negotiationNode}
              {composerNode}

              {/* Mobile Rail Drawer */}
              {mobileRailOpen ? (
                <div className="absolute inset-0 z-50 flex bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
                  <div className="w-[280px] sm:w-[320px] max-w-[85vw] h-full bg-[var(--ac-muted-surface)] shadow-2xl flex flex-col border-r border-[var(--ac-line)] overflow-hidden">
                    {railNode(true)}
                  </div>
                  <button
                    type="button"
                    className="flex-1 cursor-default bg-transparent"
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
                  <div className="relative max-h-[85dvh] w-full rounded-t-3xl bg-[var(--ac-surface)] border-t border-[var(--ac-line)] shadow-2xl flex flex-col overflow-hidden">
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
                {negotiationNode}
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
                <div className="absolute inset-0 z-50 flex bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
                  <div className="w-[300px] max-w-[85vw] h-full bg-[var(--ac-muted-surface)] shadow-2xl flex flex-col border-r border-[var(--ac-line)] overflow-hidden">
                    {railNode(true)}
                  </div>
                  <button
                    type="button"
                    className="flex-1 cursor-default bg-transparent"
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
                {negotiationNode}
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
                {negotiationNode}
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
