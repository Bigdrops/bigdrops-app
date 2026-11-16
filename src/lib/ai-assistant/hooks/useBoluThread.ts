/**
 * useBoluThread.ts — Active Chat Stream & Two-Gate Approval Hook for Bolu
 *
 * Manages active conversation message streams, live SSE delta accumulation with
 * render-throttled batching, ClerkState transitions, and Two-Gate proposal
 * lifecycle tracking against the Supabase `public.bolu_messages` table.
 */

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/supabase'
import { EntityContext } from '@/lib/tenant/entityContext'
import { createTenantClient, type TenantClient } from '@/lib/tenantClient'
import { isProposalStale, type BoluProposal } from '../bolu-operations'
import { persistInvoiceCreation, persistInvoiceModification, type BoluOperationExecutionResult } from '../bolu-document-service'
import { markBoluTurnsSuperseded, resolveBoluFacts, runBoluGeneration } from '../bolu-generation'
import { editBoluUserMessage, regenerateBoluResponse, type BoluThreadActionContext } from '../bolu-thread-actions'
import { matchesBoluSaveIntent } from '../bolu-capabilities'
import type { BoluFactResult, BoluReadAuthorization, BoluWriteAuthorization } from '../bolu-data'
import { buildBoluPageContext, type BoluPageContext } from '../bolu-context'
import {
  mapRowToMessage, MESSAGE_COLUMNS, type ClerkState, type ProductionBoluMessage,
  type RawMessageRow, type UseBoluThreadOptions, type UseBoluThreadReturn,
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
  const gate2SaveRef = useRef<((opId?: string) => Promise<BoluOperationExecutionResult>) | null>(null)

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
          setClerkState('listening')
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
    [options.connectionId, options.modelId, resolvedTenantClient, canRead],
  )

  const submitMessage = useCallback(
    async (text: string): Promise<boolean> => {
      const clean = text.trim()
      if (!clean || isStreaming) return false

      // Gate 2 interception: once a proposal is approved, a natural-language save
      // command persists it directly instead of re-entering the LLM loop.
      if (activeProposal?.status === 'approved_pending_save' && matchesBoluSaveIntent(clean)) {
        const saveApprovedProposal = gate2SaveRef.current
        if (saveApprovedProposal) {
          await saveApprovedProposal()
          return true
        }
      }

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
                  title: clean.slice(0, 48) || 'New Conversation',
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
      if (!activeProposal || (opId && activeProposal.opId !== opId)) return false
      if (isProposalStale(activeProposal)) {
        setError('This proposal has expired. Please create a new proposal.')
        return false
      }
      const updatedProposal: BoluProposal = { ...activeProposal, status: 'approved_pending_save' }
      try {
        if (activeProposalMessageId) {
          void (supabase.from('bolu_messages') as any)
            .update({ proposal_payload: updatedProposal, updated_at: new Date().toISOString() })
            .eq('id', activeProposalMessageId)
        }
        setActiveProposal(updatedProposal)
        setMessages((prev) => prev.map((m) => (m.id === activeProposalMessageId ? { ...m, proposal: updatedProposal } : m)))
        setClerkState('listening')
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to approve proposal.')
        return false
      }
    },
    [activeProposal, activeProposalMessageId],
  )

  const rejectGate1 = useCallback(
    async (opId?: string): Promise<boolean> => {
      if (!activeProposal || (opId && activeProposal.opId !== opId)) return false
      const updatedProposal: BoluProposal = { ...activeProposal, status: 'rejected' }
      try {
        if (activeProposalMessageId) {
          void (supabase.from('bolu_messages') as any)
            .update({ proposal_payload: updatedProposal, updated_at: new Date().toISOString() })
            .eq('id', activeProposalMessageId)
        }
        setActiveProposal(null)
        setActiveProposalMessageId(null)
        setMessages((prev) => prev.map((m) => (m.id === activeProposalMessageId ? { ...m, proposal: updatedProposal } : m)))
        setClerkState('idle')
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to reject proposal.')
        return false
      }
    },
    [activeProposal, activeProposalMessageId],
  )

  const confirmGate2Save = useCallback(
    async (opId?: string): Promise<BoluOperationExecutionResult> => {
      if (!activeProposal || activeProposal.status !== 'approved_pending_save') {
        return { success: false, error: 'No approved proposal awaiting save.' }
      }
      if (opId && activeProposal.opId !== opId) {
        return { success: false, error: 'Operation ID mismatch.' }
      }

      const savingProposal: BoluProposal = { ...activeProposal, status: 'saving' }
      setActiveProposal(savingProposal)
      setMessages((prev) =>
        prev.map((m) => (m.id === activeProposalMessageId ? { ...m, proposal: savingProposal } : m)),
      )
      setClerkState('thinking')

      let result: BoluOperationExecutionResult | null = null

      // Attempt server-side Gate 2 save endpoint when VITE_API_URL is configured
      const apiUrl = import.meta.env.VITE_API_URL
      if (apiUrl) {
        try {
          const { data: sessionData } = await supabase.auth.getSession()
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
                proposalMessageId: activeProposalMessageId,
              }),
            })
            if (resp.ok) {
              const data = await resp.json()
              result = {
                success: true,
                documentId: data.documentId,
                documentNumber: data.documentNumber,
              }
            } else if (resp.status !== 404) {
              const errData = await resp.json().catch(() => null)
              result = {
                success: false,
                error: errData?.error || `Server save failed with HTTP ${resp.status}`,
              }
            }
          }
        } catch (fetchErr) {
          console.warn('[useBoluThread] Backend /api/bolu-save call failed; trying local persistence:', fetchErr)
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
            result = activeProposal.operationType === 'create-document'
              ? await persistInvoiceCreation(effectiveTenantClient, savingProposal as any, canWrite, canRead, resolvedEntityId)
              : await persistInvoiceModification(effectiveTenantClient, savingProposal as any, canWrite, canRead, resolvedEntityId)
          } catch (err) {
            result = { success: false, error: err instanceof Error ? err.message : 'Database write failed.' }
          }
        }
      }

      if (result.success) {
        const persistedProposal: BoluProposal = {
          ...activeProposal,
          status: 'persisted',
          persistedId: result.documentNumber || result.documentId,
        }

        try {
          if (activeProposalMessageId) {
            await (supabase.from('bolu_messages') as any)
              .update({ proposal_payload: persistedProposal, updated_at: new Date().toISOString() })
              .eq('id', activeProposalMessageId)
          }

          const docNum = result.documentNumber || 'document'
          const successContent = `✓ Successfully saved ${docNum} to your business records.`

          const { data: confirmRow } = await (supabase.from('bolu_messages') as any)
            .insert({
              conversation_id: conversationId, tenant_id: resolvedTenantId,
              role: 'assistant', content: successContent, status: 'completed',
            })
            .select(MESSAGE_COLUMNS).single()

          if (confirmRow) {
            const confirmMsg = mapRowToMessage(confirmRow as RawMessageRow)
            setMessages((prev) => [
              ...prev.map((m) => (m.id === activeProposalMessageId ? { ...m, proposal: persistedProposal } : m)),
              confirmMsg,
            ])
          } else {
            setMessages((prev) =>
              prev.map((m) => (m.id === activeProposalMessageId ? { ...m, proposal: persistedProposal } : m)),
            )
          }
        } catch (msgErr) {
          console.warn('[useBoluThread] Could not update bolu_messages after successful persistence:', msgErr)
        }

        setActiveProposal(null)
        setActiveProposalMessageId(null)
        setClerkState('success')
        setTimeout(() => setClerkState('idle'), 2500)
        return result
      }

      const revertedProposal: BoluProposal = { ...activeProposal, status: 'approved_pending_save' }
      setActiveProposal(revertedProposal)
      setMessages((prev) =>
        prev.map((m) => (m.id === activeProposalMessageId ? { ...m, proposal: revertedProposal } : m)),
      )
      setClerkState('listening')
      setError(result.error || 'Failed to save document.')
      return result
    },
    [activeProposal, activeProposalMessageId, resolvedTenantClient, entityCtx?.schemaName, resolvedEntityId, resolvedTenantId, conversationId, canWrite, canRead],
  )

  gate2SaveRef.current = confirmGate2Save

  const cancelGate2Save = useCallback(
    async (opId?: string) => {
      if (!activeProposal || (opId && activeProposal.opId !== opId)) return
      const cancelledProposal: BoluProposal = { ...activeProposal, status: 'cancelled' }
      try {
        if (activeProposalMessageId) {
          await (supabase.from('bolu_messages') as any)
            .update({ proposal_payload: cancelledProposal, updated_at: new Date().toISOString() })
            .eq('id', activeProposalMessageId)
        }
        setActiveProposal(null)
        setActiveProposalMessageId(null)
        setMessages((prev) =>
          prev.map((m) => (m.id === activeProposalMessageId ? { ...m, proposal: cancelledProposal } : m)),
        )
        setClerkState('idle')
      } catch (err) {
        console.error('[useBoluThread] cancelGate2Save error:', err)
      }
    },
    [activeProposal, activeProposalMessageId],
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
    clearError,
    refreshThread: fetchMessages,
  }
}
