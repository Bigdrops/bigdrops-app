/**
 * useBoluThread.ts — Active Chat Stream & Two-Gate Approval Hook for Bolu
 *
 * Manages active conversation message streams, live SSE delta accumulation with
 * render-throttled batching, ClerkState transitions, and Two-Gate proposal
 * lifecycle tracking against the Supabase `public.bolu_messages` table.
 */

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/supabase'
import { feedback } from '@/lib/feedback'
import { EntityContext } from '@/lib/tenant/entityContext'
import { createTenantClient, type TenantClient } from '@/lib/tenantClient'
import { isGenericTitle, deriveConversationTitle } from '../bolu-titles'
import {
  isProposalStale,
  withClarificationAnswer,
  withClientResolution,
  withProposalClient,
  type BoluDocumentCreateProposal,
  type BoluProposal,
} from '../bolu-operations'
import { persistInvoiceCreation, persistInvoiceModification, persistQuotationModification, persistAdvanceInvoiceConfig, type BoluOperationExecutionResult } from '../bolu-document-service'
import { gateTwoExecutionMessage } from '../bolu-gate2-result'
import { markBoluTurnsSuperseded, resolveBoluFacts, runBoluGeneration } from '../bolu-generation'
import { editBoluUserMessage, regenerateBoluResponse, type BoluThreadActionContext } from '../bolu-thread-actions'
import {
  createBoluClient,
  readBoluClient,
  searchBoluClients,
  type BoluClientCreateInput,
  type BoluClientMatch,
  type BoluClientSearchResult,
  type BoluFactResult,
  type BoluReadAuthorization,
  type BoluWriteAuthorization,
} from '../bolu-data'
import { buildBoluPageContext, type BoluPageContext } from '../bolu-context'
import {
  mapRowToMessage, MESSAGE_COLUMNS, type BoluClarificationAnswer, type BoluClientCreationResult,
  type ClerkState, type ProductionBoluMessage, type RawMessageRow, type UseBoluThreadOptions,
  type UseBoluThreadReturn,
} from './types'

export type { ClerkState, ProductionBoluMessage, UseBoluThreadOptions, UseBoluThreadReturn }

export function useBoluThread(options: UseBoluThreadOptions): UseBoluThreadReturn {
  const entityCtx = useContext(EntityContext)
  const resolvedTenantId = options.tenantId ?? entityCtx?.entity?.id ?? null
  const resolvedEntityId = options.entityId ?? entityCtx?.entity?.id ?? null
  const resolvedTenantClient = options.tenantClient ?? (entityCtx?.tenantClient as TenantClient | undefined)

  const [messages, setMessages] = useState<ProductionBoluMessage[]>([])
  const [clerkState, setClerkState] = useState<ClerkState>('idle')
  const [isStreaming, setIsStreaming] = useState<boolean>(false)
  const [streamingContent, setStreamingContent] = useState<string>('')
  const [activeProposal, setActiveProposal] = useState<BoluProposal | null>(null)
  const [activeProposalMessageId, setActiveProposalMessageId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const streamingBufferRef = useRef<string>('')
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const defaultPageContext = useMemo(
    () => options.pageContext ?? buildBoluPageContext(window.location.pathname, 'contextual'),
    [options.pageContext],
  )
  const canRead: BoluReadAuthorization = useMemo(() => options.canRead ?? (() => true), [options.canRead])
  const canWrite: BoluWriteAuthorization = useMemo(() => options.canWrite ?? (() => true), [options.canWrite])
  const conversationId = options.conversationId

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([])
      setActiveProposal(null)
      setActiveProposalMessageId(null)
      setClerkState('idle')
      return
    }

    try {
      const { data, error: queryError } = await (supabase.from('bolu_messages') as any)
        .select(MESSAGE_COLUMNS)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(100)

      if (queryError) throw new Error(queryError.message)

      // Superseded turns stay in the table for history but leave the active branch.
      const rows = ((data as RawMessageRow[]) ?? [])
        .map(mapRowToMessage)
        .filter((message) => message.metadata?.superseded !== true)
      setMessages(rows)

      const lastProposalMsg = [...rows].reverse().find((m) => m.proposal)
      if (lastProposalMsg?.proposal) {
        const prop = lastProposalMsg.proposal
        if (prop.status === 'pending_approval' || prop.status === 'approved_pending_save') {
          setActiveProposal(prop)
          setActiveProposalMessageId(lastProposalMsg.id)
          // Restoring a thread with a pending proposal must not lock the
          // composer; the card is the review surface, not a lock.
          setClerkState('idle')
          return
        }
      }
      setActiveProposal(null)
      setActiveProposalMessageId(null)
      setClerkState('idle')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation messages.')
    }
  }, [conversationId])

  useEffect(() => {
    void fetchMessages()
  }, [fetchMessages])

  // Realtime subscription on bolu_messages for the active conversation
  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel(`bolu_messages_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bolu_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          if (!isStreaming) {
            void fetchMessages()
          }
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [conversationId, isStreaming, fetchMessages])

  const clearError = useCallback(() => setError(null), [])

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current)
      flushTimerRef.current = null
    }
    setIsStreaming(false)
    setClerkState('idle')
  }, [])

  /** Facts lookup shared by new turns, edited turns and regenerated turns. */
  const resolveFacts = useCallback(
    (text: string) =>
      resolveBoluFacts({
        text,
        tenantClient: resolvedTenantClient,
        pageContext: defaultPageContext,
        canRead,
      }),
    [resolvedTenantClient, defaultPageContext, canRead],
  )

  /**
   * Invalidates the turns that depended on an edited request or a regenerated
   * response. Superseded rows stay in `bolu_messages` for audit.
   */
  const supersedeDownstreamMessages = useCallback(
    (downstream: ProductionBoluMessage[]) => markBoluTurnsSuperseded(downstream),
    [],
  )

  /**
   * Runs one provider turn and persists it. `replaceAssistantId` regenerates an
   * existing assistant row in place; otherwise the turn appends a new response.
   */
  const runGeneration = useCallback(
    (params: {
      targetConversationId: string
      tenantId: string
      history: { id: string; role: 'user' | 'assistant'; content: string }[]
      userText: string
      facts: BoluFactResult | null
      replaceAssistantId?: string
    }) =>
      runBoluGeneration({
        ...params,
        connectionId: options.connectionId,
        modelId: options.modelId,
        tenantClient: resolvedTenantClient,
        // A correction to the open draft updates that operation instead of
        // opening a second one.
        previousProposal: activeProposal,
        previousProposalMessageId: activeProposalMessageId,
        canRead,
        state: {
          setMessages,
          setStreamingContent,
          setClerkState,
          setActiveProposal,
          setActiveProposalMessageId,
          setError,
          setIsStreaming,
        },
        refs: {
          streamingBuffer: streamingBufferRef,
          flushTimer: flushTimerRef,
          abortController: abortControllerRef,
        },
      }),
    [options.connectionId, options.modelId, resolvedTenantClient, canRead, activeProposal, activeProposalMessageId],
  )

  const submitMessage = useCallback(
    async (text: string): Promise<boolean> => {
      const clean = text.trim()
      if (!clean || isStreaming) return false

      // No message submission may authorize a write. A typed "yes", "confirm"
      // or "save" is ordinary conversation; Gate 2 is the explicit button only.

      let targetConversationId = conversationId

      if (!targetConversationId) {
        if (options.onEnsureConversation) {
          try {
            targetConversationId = await options.onEnsureConversation()
          } catch (err) {
            console.warn('[useBoluThread] onEnsureConversation failed:', err)
          }
        }

        if (!targetConversationId && resolvedTenantId) {
          try {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
              const { data: createdRow, error: createError } = await (supabase.from('bolu_conversations') as any)
                .insert({
                  tenant_id: resolvedTenantId, user_id: user.id,
                  title: deriveConversationTitle(clean) || 'New Conversation',
                  module: defaultPageContext.origin.page || 'dashboard',
                  status: 'active', metadata: {},
                })
                .select('id').single()
              if (!createError && createdRow?.id) targetConversationId = createdRow.id
            }
          } catch (err) {
            console.warn('[useBoluThread] Auto-provision conversation failed:', err)
          }
        }
      }

      if (!targetConversationId) {
        setError('Please select or create a conversation to chat.')
        return false
      }

      if (!resolvedTenantId) {
        setError('No active business entity selected.')
        return false
      }

      setError(null)
      setClerkState('thinking')

      const { data: { user } } = await supabase.auth.getUser()

      const verifiedFacts = await resolveFacts(clean)

      try {
        const { data: userRow, error: userError } = await (supabase.from('bolu_messages') as any)
          .insert({
            conversation_id: targetConversationId,
            tenant_id: resolvedTenantId,
            sender_id: user?.id ?? null,
            role: 'user',
            content: clean,
            status: 'completed',
          })
          .select(MESSAGE_COLUMNS)
          .single()

        if (userError) throw new Error(userError.message)
        const userMsg = mapRowToMessage(userRow as RawMessageRow)
        setMessages((prev) => [...prev, userMsg])

        // First message in thread: update title if currently generic
        if (messages.length === 0) {
          const derived = deriveConversationTitle(clean)
          if (!isGenericTitle(derived)) {
            void (async () => {
              try {
                const { data: conv } = await (supabase.from('bolu_conversations') as any)
                  .select('title')
                  .eq('id', targetConversationId)
                  .single()
                if (conv && isGenericTitle(conv.title)) {
                  await (supabase.from('bolu_conversations') as any)
                    .update({ title: derived, updated_at: new Date().toISOString() })
                    .eq('id', targetConversationId)
                }
              } catch (tErr) {
                console.warn('[useBoluThread] Conversation title update skipped:', tErr)
              }
            })()
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save message.')
        setClerkState('idle')
        return false
      }

      const history = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ id: m.id, role: m.role as 'user' | 'assistant', content: m.content }))

      return runGeneration({
        targetConversationId,
        tenantId: resolvedTenantId,
        history,
        userText: clean,
        facts: verifiedFacts,
      })
    },
    [conversationId, resolvedTenantId, isStreaming, messages, activeProposal, options.onEnsureConversation, defaultPageContext, resolveFacts, runGeneration],
  )

  const actionContext = useMemo<BoluThreadActionContext>(
    () => ({
      messages,
      conversationId,
      tenantId: resolvedTenantId,
      isStreaming,
      activeProposalMessageId,
      setMessages,
      setError,
      setClerkState,
      setActiveProposal,
      setActiveProposalMessageId,
      resolveFacts,
      runGeneration,
    }),
    [
      messages,
      conversationId,
      resolvedTenantId,
      isStreaming,
      activeProposalMessageId,
      resolveFacts,
      runGeneration,
    ],
  )

  /** Edits one user message in place and regenerates the answer. */
  const editUserMessage = useCallback(
    (messageId: string, text: string) => editBoluUserMessage(actionContext, messageId, text),
    [actionContext],
  )

  /** Regenerates one assistant response in its existing row. */
  const regenerateResponse = useCallback(
    (assistantMessageId: string) => regenerateBoluResponse(actionContext, assistantMessageId),
    [actionContext],
  )

  const approveGate1 = useCallback(
    async (opId?: string): Promise<boolean> => {
      // Resolve proposal from activeProposal or find target message in current thread
      const targetMsg = messages.find((m) => m.proposal && (!opId || m.proposal.opId === opId))
      const effectiveProposal = targetMsg?.proposal ?? activeProposal
      const effectiveMsgId = targetMsg?.id ?? activeProposalMessageId

      if (!effectiveProposal) {
        const msg = 'Could not locate the selected proposal. Please refresh the chat.'
        setError(msg)
        feedback.error('Proposal not found', { description: msg })
        return false
      }

      if (isProposalStale(effectiveProposal)) {
        const msg = 'This proposal has expired. Please create a new proposal.'
        setError(msg)
        feedback.warning('Proposal expired', { description: msg })
        return false
      }

      const updatedProposal: BoluProposal = { ...effectiveProposal, status: 'approved_pending_save' }

      try {
        if (effectiveMsgId) {
          // Await the mutation so errors trigger the catch block
          const { error: updateErr } = await (supabase.from('bolu_messages') as any)
            .update({ proposal_payload: updatedProposal, updated_at: new Date().toISOString() })
            .eq('id', effectiveMsgId)

          if (updateErr) {
            console.error('[useBoluThread] approveGate1 update error:', updateErr)
            throw new Error(updateErr.message)
          }
        }

        setActiveProposal(updatedProposal)
        if (effectiveMsgId) setActiveProposalMessageId(effectiveMsgId)

        // Robustly update the message list using either ID or opId
        setMessages((prev) =>
          prev.map((m) =>
            (effectiveMsgId ? m.id === effectiveMsgId : m.proposal?.opId === effectiveProposal.opId)
              ? { ...m, proposal: updatedProposal }
              : m,
          ),
        )
        // Gate 2 still needs the composer. `listening` is a transient clerk
        // state, not a lock, and using it here disabled chat during review.
        setClerkState('idle')
        feedback.success('Changes approved (Gate 1)', {
          description: 'Confirm Gate 2 to persist the document to business records.',
        })
        return true
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to approve proposal.'
        setError(msg)
        feedback.error('Approval failed', { description: msg })
        return false
      }
    },
    [activeProposal, activeProposalMessageId, messages],
  )

  const rejectGate1 = useCallback(
    async (opId?: string): Promise<boolean> => {
      const targetMsg = messages.find((m) => m.proposal && (!opId || m.proposal.opId === opId))
      const effectiveProposal = targetMsg?.proposal ?? activeProposal
      const effectiveMsgId = targetMsg?.id ?? activeProposalMessageId

      if (!effectiveProposal) {
        feedback.error('Proposal not found')
        return false
      }

      const updatedProposal: BoluProposal = { ...effectiveProposal, status: 'rejected' }
      try {
        if (effectiveMsgId) {
          const { error: updateErr } = await (supabase.from('bolu_messages') as any)
            .update({ proposal_payload: updatedProposal, updated_at: new Date().toISOString() })
            .eq('id', effectiveMsgId)

          if (updateErr) {
            console.error('[useBoluThread] rejectGate1 update error:', updateErr)
            throw new Error(updateErr.message)
          }
        }
        setActiveProposal(null)
        setActiveProposalMessageId(null)
        setMessages((prev) =>
          prev.map((m) =>
            (effectiveMsgId ? m.id === effectiveMsgId : m.proposal?.opId === effectiveProposal.opId)
              ? { ...m, proposal: updatedProposal }
              : m,
          ),
        )
        setClerkState('idle')
        feedback.info('Changes rejected', { description: 'The proposal has been declined.' })
        return true
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to reject proposal.'
        setError(msg)
        feedback.error('Rejection failed', { description: msg })
        return false
      }
    },
    [activeProposal, activeProposalMessageId, messages],
  )

  const confirmGate2Save = useCallback(
    async (opId?: string): Promise<BoluOperationExecutionResult> => {
      const targetMsg = messages.find((m) => m.proposal && (!opId || m.proposal.opId === opId))
      const effectiveProposal = targetMsg?.proposal ?? activeProposal
      const effectiveMsgId = targetMsg?.id ?? activeProposalMessageId

      if (!effectiveProposal || effectiveProposal.status !== 'approved_pending_save') {
        return { success: false, error: 'No approved proposal awaiting save.' }
      }
      if (opId && effectiveProposal.opId !== opId) {
        return { success: false, error: 'Operation ID mismatch.' }
      }

      const savingProposal: BoluProposal = { ...effectiveProposal, status: 'saving' }
      setActiveProposal(savingProposal)
      setMessages((prev) =>
        prev.map((m) =>
          (effectiveMsgId ? m.id === effectiveMsgId : m.proposal?.opId === effectiveProposal.opId)
            ? { ...m, proposal: savingProposal }
            : m,
        ),
      )
      setClerkState('thinking')

      let result: BoluOperationExecutionResult | null = null

      // The authenticated user is the audit actor for either persistence path.
      const { data: sessionData } = await supabase.auth.getSession()
      const auditActor = sessionData?.session?.user
        ? {
            id: sessionData.session.user.id,
            label: sessionData.session.user.email ?? 'user',
          }
        : null

      const advanceProposal =
        effectiveProposal.operationType === 'advance-invoice-config' ? effectiveProposal : null
      const advanceInvoice = advanceProposal ? { intent: advanceProposal.intent } : null

      /** Persists the assistant execution message carrying verbatim warnings, when any exist. */
      const persistExecutionMessage = async (execResult: BoluOperationExecutionResult) => {
        const executionMsg = gateTwoExecutionMessage({ result: execResult, advanceInvoice })
        const { data: row, error: insertErr } = await (supabase.from('bolu_messages') as any)
          .insert({
            conversation_id: conversationId, tenant_id: resolvedTenantId,
            role: 'assistant', content: executionMsg.content, status: executionMsg.status,
            ...(executionMsg.warnings.length > 0
              ? { metadata: { warnings: executionMsg.warnings } }
              : {}),
          })
          .select(MESSAGE_COLUMNS).single()
        if (insertErr) {
          console.warn('[useBoluThread] Could not persist execution message:', insertErr)
          return null
        }
        return row ? mapRowToMessage(row as RawMessageRow) : null
      }

      // Attempt server-side Gate 2 save endpoint when VITE_API_URL is configured.
      // Advance Invoice configuration is not implemented by the server endpoint in
      // this stage; it persists through the authenticated tenant executor below.
      const apiUrl = import.meta.env.VITE_API_URL
      if (apiUrl && !advanceProposal) {
        try {
          const token = sessionData?.session?.access_token
          if (token) {
            const resp = await fetch(`${apiUrl}/api/bolu-save`, {
              method: 'POST',
              credentials: 'include',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                proposal: savingProposal,
                tenantId: resolvedTenantId,
                entityId: resolvedEntityId,
                conversationId,
                proposalMessageId: effectiveMsgId,
              }),
            })
            if (resp.ok) {
              const data = await resp.json()
              result = {
                success: true,
                documentId: data.documentId,
                documentNumber: data.documentNumber,
              }
            } else if (resp.status === 404) {
              // Server endpoint unmounted: primary operation unequivocally did not run.
              // Local persistence fallback is safe.
              result = null
            } else {
              const errData = await resp.json().catch(() => null)
              if (errData?.code === 'server_config_missing') {
                // Server configuration aborted before opening database transaction.
                // Local authenticated tenant persistence fallback is safe.
                console.warn('[useBoluThread] Server configuration missing; falling back to authenticated client persistence.')
                result = null
              } else {
                // Transaction rejected, failed, or uncertain. Never issue a duplicate write.
                result = {
                  success: false,
                  error: errData?.error || `Server save failed with HTTP ${resp.status}`,
                }
              }
            }
          }
        } catch (fetchErr) {
          console.warn('[useBoluThread] Backend /api/bolu-save request interrupted:', fetchErr)
          // Uncertain commit status: do not issue an unverified second write that could create duplicates.
          result = {
            success: false,
            error: 'Connection interrupted while saving. Please refresh your document list to check status before retrying.',
          }
        }
      }

      // Local persistence fallback (direct Supabase client)
      if (!result) {
        let effectiveTenantClient = resolvedTenantClient
        if ((!effectiveTenantClient || !effectiveTenantClient.isReady) && entityCtx?.schemaName) {
          effectiveTenantClient = createTenantClient(supabase, entityCtx.schemaName)
        }
        if (!effectiveTenantClient || !effectiveTenantClient.isReady) {
          result = { success: false, error: 'Tenant client is not ready.' }
        } else {
          try {
            if (advanceProposal) {
              const saving = savingProposal as typeof advanceProposal
              result = await persistAdvanceInvoiceConfig(effectiveTenantClient, saving, canWrite, canRead, auditActor)
            } else if (effectiveProposal.operationType === 'create-document') {
              result = await persistInvoiceCreation(effectiveTenantClient, savingProposal as any, canWrite, canRead, resolvedEntityId, auditActor)
            } else if (effectiveProposal.documentFamily === 'quotation') {
              result = await persistQuotationModification(effectiveTenantClient, savingProposal as any, canWrite, canRead, resolvedEntityId, auditActor)
            } else {
              result = await persistInvoiceModification(effectiveTenantClient, savingProposal as any, canWrite, canRead, resolvedEntityId, auditActor)
            }
          } catch (err) {
            result = { success: false, error: err instanceof Error ? err.message : 'Database write failed.' }
          }
        }
      }

      if (result.success) {
        const persistedProposal: BoluProposal = {
          ...effectiveProposal,
          status: 'persisted',
          persistedId: result.documentNumber || result.documentId,
        }

        try {
          if (effectiveMsgId) {
            await (supabase.from('bolu_messages') as any)
              .update({ proposal_payload: persistedProposal, updated_at: new Date().toISOString() })
              .eq('id', effectiveMsgId)
          }

          const confirmMsg = await persistExecutionMessage(result)

          if (confirmMsg) {
            setMessages((prev) => [
              ...prev.map((m) =>
                (effectiveMsgId ? m.id === effectiveMsgId : m.proposal?.opId === effectiveProposal.opId)
                  ? { ...m, proposal: persistedProposal }
                  : m,
              ),
              confirmMsg,
            ])
          } else {
            setMessages((prev) =>
              prev.map((m) =>
                (effectiveMsgId ? m.id === effectiveMsgId : m.proposal?.opId === effectiveProposal.opId)
                  ? { ...m, proposal: persistedProposal }
                  : m,
              ),
            )
          }
        } catch (msgErr) {
          console.warn('[useBoluThread] Could not update bolu_messages after successful persistence:', msgErr)
        }

        setActiveProposal(null)
        setActiveProposalMessageId(null)
        setClerkState('success')
        setTimeout(() => setClerkState('idle'), 2500)
        if (advanceInvoice) {
          feedback.success('Advance Invoice', {
            description: `Advance Invoice configuration saved for ${result.documentNumber ?? 'the invoice'}.`,
          })
        } else {
          feedback.success('Document saved', {
            description: result.documentNumber ? `Saved as record ${result.documentNumber}` : 'Document successfully saved to business records.',
          })
        }
        return result
      }

      const revertedProposal: BoluProposal = { ...effectiveProposal, status: 'approved_pending_save' }
      setActiveProposal(revertedProposal)
      setMessages((prev) =>
        prev.map((m) =>
          (effectiveMsgId ? m.id === effectiveMsgId : m.proposal?.opId === effectiveProposal.opId)
            ? { ...m, proposal: revertedProposal }
            : m,
        ),
      )
      // A failed save restores an editable proposal and a usable composer.
      setClerkState('idle')
      setError(result.error || 'Failed to save document.')
      // Persist any warnings the failed save produced on an execution message,
      // so the assistant reports them verbatim instead of dropping them.
      if (result.warnings && result.warnings.length > 0) {
        const failedMsg = await persistExecutionMessage(result)
        if (failedMsg) setMessages((prev) => [...prev, failedMsg])
      }
      feedback.error('Save failed', { description: result.error || 'Failed to save document.' })
      return result
    },
    [activeProposal, activeProposalMessageId, messages, resolvedTenantClient, entityCtx?.schemaName, resolvedEntityId, resolvedTenantId, conversationId, canWrite, canRead],
  )

  const cancelGate2Save = useCallback(
    async (opId?: string) => {
      const targetMsg = messages.find((m) => m.proposal && (!opId || m.proposal.opId === opId))
      const effectiveProposal = targetMsg?.proposal ?? activeProposal
      const effectiveMsgId = targetMsg?.id ?? activeProposalMessageId

      if (!effectiveProposal) return
      const cancelledProposal: BoluProposal = { ...effectiveProposal, status: 'cancelled' }
      try {
        if (effectiveMsgId) {
          await (supabase.from('bolu_messages') as any)
            .update({ proposal_payload: cancelledProposal, updated_at: new Date().toISOString() })
            .eq('id', effectiveMsgId)
        }
        setActiveProposal(null)
        setActiveProposalMessageId(null)
        setMessages((prev) =>
          prev.map((m) =>
            (effectiveMsgId ? m.id === effectiveMsgId : m.proposal?.opId === effectiveProposal.opId)
              ? { ...m, proposal: cancelledProposal }
              : m,
          ),
        )
        setClerkState('idle')
        feedback.info('Save cancelled', { description: 'The document was not persisted.' })
      } catch (err) {
        console.error('[useBoluThread] cancelGate2Save error:', err)
        feedback.error('Cancel failed', { description: err instanceof Error ? err.message : 'Unknown error' })
      }
    },
    [activeProposal, activeProposalMessageId, messages],
  )

  /**
   * Returns an approved proposal to Gate 1 review.
   *
   * Gate 2 confirms an already-reviewed operation, so the only way to change it
   * is to reopen review. Reopening clears the previous approval: the user must
   * approve the edited proposal again before Gate 2 is available.
   */
  const returnGate1ToReview = useCallback(
    async (opId?: string): Promise<boolean> => {
      const targetMsg = messages.find((m) => m.proposal && (!opId || m.proposal.opId === opId))
      const effectiveProposal = targetMsg?.proposal ?? activeProposal
      const effectiveMsgId = targetMsg?.id ?? activeProposalMessageId

      if (!effectiveProposal || effectiveProposal.status !== 'approved_pending_save') return false

      const reopened: BoluProposal = { ...effectiveProposal, status: 'pending_approval' }
      try {
        if (effectiveMsgId) {
          const { error: updateErr } = await (supabase.from('bolu_messages') as any)
            .update({ proposal_payload: reopened, updated_at: new Date().toISOString() })
            .eq('id', effectiveMsgId)
          if (updateErr) throw new Error(updateErr.message)
        }
        setActiveProposal(reopened)
        if (effectiveMsgId) setActiveProposalMessageId(effectiveMsgId)
        setMessages((prev) =>
          prev.map((m) =>
            (effectiveMsgId ? m.id === effectiveMsgId : m.proposal?.opId === effectiveProposal.opId)
              ? { ...m, proposal: reopened }
              : m,
          ),
        )
        setClerkState('idle')
        feedback.info('Back to review', {
          description: 'The earlier approval was cleared. Approve the updated proposal again before saving.',
        })
        return true
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not reopen the proposal.'
        setError(msg)
        feedback.error('Reopen failed', { description: msg })
        return false
      }
    },
    [activeProposal, activeProposalMessageId, messages],
  )

  /** The pending document proposal and the message row it belongs to. */
  const findPendingProposal = useCallback(
    (opId?: string): { proposal: BoluDocumentCreateProposal | null; messageId: string | null } => {
      const targetMsg = messages.find(
        (m) =>
          m.proposal &&
          m.proposal.operationType === 'create-document' &&
          (!opId || m.proposal.opId === opId),
      )
      const fallback = activeProposal?.operationType === 'create-document' ? activeProposal : null
      return {
        proposal: (targetMsg?.proposal as BoluDocumentCreateProposal | undefined) ?? fallback,
        messageId: targetMsg?.id ?? activeProposalMessageId,
      }
    },
    [messages, activeProposal, activeProposalMessageId],
  )

  /**
   * Applies one draft-only update to the pending proposal and persists it to the
   * message row. It never changes the gate status, so it cannot authorize a write.
   */
  const updatePendingProposal = useCallback(
    async (
      opId: string | undefined,
      update: (proposal: BoluDocumentCreateProposal) => BoluDocumentCreateProposal,
    ): Promise<BoluDocumentCreateProposal | null> => {
      const { proposal, messageId } = findPendingProposal(opId)
      if (!proposal) {
        feedback.warning('No pending document', {
          description: 'The draft was replaced or cancelled. Ask Bolu again.',
        })
        return null
      }
      if (proposal.status !== 'pending_approval') {
        // A late answer must never change an approved, saved or cancelled operation.
        feedback.warning('This draft is no longer open for review', {
          description: 'Ask Bolu to prepare it again before changing it.',
        })
        return null
      }
      const next = update(proposal)
      try {
        if (messageId) {
          const { error: updateErr } = await (supabase.from('bolu_messages') as any)
            .update({ proposal_payload: next, updated_at: new Date().toISOString() })
            .eq('id', messageId)
          if (updateErr) throw new Error(updateErr.message)
        }
        setActiveProposal(next)
        if (messageId) setActiveProposalMessageId(messageId)
        setMessages((prev) =>
          prev.map((m) =>
            (messageId ? m.id === messageId : m.proposal?.opId === next.opId)
              ? { ...m, proposal: next }
              : m,
          ),
        )
        return next
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not update the draft.'
        setError(msg)
        feedback.error('Draft update failed', { description: msg })
        return null
      }
    },
    [findPendingProposal],
  )

  /** Read-only client search for the pending document. Errors are reported, never hidden. */
  const searchProposalClients = useCallback(
    async (term: string): Promise<BoluClientSearchResult> => {
      const clean = term.trim()
      if (!clean) return { status: 'not_found', query: '' }
      if (!resolvedTenantClient?.isReady) {
        return { status: 'search_error', query: clean, error: 'Business records are not available yet.' }
      }
      return searchBoluClients(resolvedTenantClient, clean)
    },
    [resolvedTenantClient],
  )

  /**
   * Attaches a client to the pending document after verifying the record still
   * exists in this tenant. Preserves every collected document field.
   */
  const selectProposalClient = useCallback(
    async (client: BoluClientMatch, opId?: string): Promise<BoluClientMatch | null> => {
      if (!resolvedTenantClient?.isReady) {
        feedback.error('Client selection failed', { description: 'Business records are not available yet.' })
        return null
      }
      let verified: BoluClientMatch | null = null
      try {
        verified = await readBoluClient(resolvedTenantClient, client.id)
      } catch {
        feedback.error('Client selection failed', {
          description: 'The client record could not be verified. Nothing was changed.',
        })
        return null
      }
      if (!verified) {
        feedback.warning('Client record not found', {
          description: 'That client is no longer available in this business. Search again.',
        })
        return null
      }
      const updated = await updatePendingProposal(opId, (proposal) => withProposalClient(proposal, verified))
      if (!updated) return null
      feedback.info('Client selected', {
        description: `${verified.name} is attached to this draft. Nothing has been saved.`,
      })
      return verified
    },
    [resolvedTenantClient, updatePendingProposal],
  )

  /** Resolves a typed client name and updates the draft or its open questions. */
  const resolveProposalClientTerm = useCallback(
    async (term: string, opId?: string): Promise<BoluClientSearchResult> => {
      const result = await searchProposalClients(term)
      if (result.status === 'exact_match' || result.status === 'single_match') {
        await selectProposalClient(result.client, opId)
        return result
      }
      if (result.status === 'ambiguous') {
        await updatePendingProposal(opId, (proposal) =>
          withClientResolution(proposal, {
            status: 'ambiguous',
            query: result.query,
            matches: result.matches,
          }),
        )
      } else if (result.status === 'not_found') {
        await updatePendingProposal(opId, (proposal) =>
          withClientResolution(proposal, { status: 'not_found', query: result.query }),
        )
      } else {
        await updatePendingProposal(opId, (proposal) =>
          withClientResolution(proposal, {
            status: 'search_error',
            query: result.query,
            error: result.error,
          }),
        )
        setError('Client search failed. The draft is kept. Try again in a moment.')
      }
      return result
    },
    [searchProposalClients, selectProposalClient, updatePendingProposal],
  )

  /**
   * Creates a client only after an explicit approval in the preview card.
   * Duplicate names reuse the existing record instead of creating a second one.
   */
  const createProposalClient = useCallback(
    async (input: BoluClientCreateInput, opId?: string): Promise<BoluClientCreationResult> => {
      const failure = (error: string): BoluClientCreationResult => ({
        ok: false,
        client: null,
        reused: false,
        error,
      })

      if (!resolvedTenantClient?.isReady) {
        return failure('Business records are not available yet.')
      }
      const name = input.name?.trim() ?? ''
      if (name.length < 2) {
        return failure('Enter the client name (at least 2 characters).')
      }

      const existing = await searchBoluClients(resolvedTenantClient, name)
      if (existing.status === 'search_error') {
        return failure('The client directory could not be checked. Nothing was created.')
      }
      if (existing.status === 'exact_match' || existing.status === 'single_match') {
        const applied = await selectProposalClient(existing.client, opId)
        return applied
          ? { ok: true, client: applied, reused: true, error: null }
          : failure('The existing client could not be attached to the draft.')
      }
      if (existing.status === 'ambiguous') {
        return failure(
          `Several clients already match "${name}". Choose one of them instead of creating a duplicate.`,
        )
      }

      const created = await createBoluClient(resolvedTenantClient, { ...input, name })
      if (!created.ok || !created.client) {
        return failure(`The client could not be created: ${created.error ?? 'unknown error'}`)
      }
      const applied = await selectProposalClient(created.client, opId)
      if (!applied) {
        return failure(
          `The client was created, but it could not be attached to the draft. Search for "${name}" to attach it.`,
        )
      }
      return { ok: true, client: applied, reused: false, error: null }
    },
    [resolvedTenantClient, selectProposalClient],
  )

  /**
   * Answers one clarification question. Answers update the pending draft only.
   * Stale answers for a replaced, approved or cancelled operation are rejected.
   */
  const answerBoluClarification = useCallback(
    async (
      opId: string | undefined,
      questionId: string,
      answer: BoluClarificationAnswer,
    ): Promise<boolean> => {
      const { proposal } = findPendingProposal(opId)
      const question = proposal?.clarification?.questions.find((item) => item.id === questionId)
      if (!proposal || proposal.status !== 'pending_approval' || !question) {
        feedback.warning('This question is no longer active', {
          description: 'The draft it belonged to was changed or cancelled. Nothing was applied.',
        })
        return false
      }

      const option = answer.optionId
        ? question.options.find((item) => item.id === answer.optionId)
        : undefined
      const text = answer.text?.trim() ?? ''
      const label = option?.label ?? text
      if (!label) return false

      if (questionId === 'client') {
        if (option?.id.startsWith('client:')) {
          const verifiedId = option.id.slice('client:'.length)
          const applied = await selectProposalClient({ id: verifiedId, name: option.label }, opId)
          return applied !== null
        }
        const result = await resolveProposalClientTerm(label, opId)
        return result.status === 'exact_match' || result.status === 'single_match'
      }

      const updated = await updatePendingProposal(opId, (current) =>
        withClarificationAnswer(current, questionId, label),
      )
      return updated !== null
    },
    [findPendingProposal, selectProposalClient, resolveProposalClientTerm, updatePendingProposal],
  )

  const activeClarification = useMemo(
    () =>
      activeProposal?.operationType === 'create-document'
      && activeProposal.status === 'pending_approval'
        ? (activeProposal.clarification ?? null)
        : null,
    [activeProposal],
  )

  return {
    messages,
    clerkState,
    isStreaming,
    streamingContent,
    activeProposal,
    activeProposalMessageId,
    error,
    submitMessage,
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
    resolveProposalClientTerm,
    createProposalClient,
    answerBoluClarification,
    activeClarification,
    clearError,
    refreshThread: fetchMessages,
  }
}
