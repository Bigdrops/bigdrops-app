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
import {
  buildDocumentCreateProposal, buildInvoiceModifyProposal, isProposalStale,
  parseStructuredOperationEnvelope, validateInvoiceCreateInput, validateInvoiceModifyInput,
  type BoluProposal,
} from '../bolu-operations'
import { persistInvoiceCreation, persistInvoiceModification, type BoluOperationExecutionResult } from '../bolu-document-service'
import { sendBoluProviderRequest } from '../bolu-transport'
import { buildProviderMessages, factsAsPrompt } from '../bolu-formatting'
import { extractBoluSearchTerm, matchesBoluSaveIntent, matchBoluIntent } from '../bolu-capabilities'
import {
  readBoluContextFacts, readBoluInvoice, validateBoluClient,
  type BoluFactResult, type BoluReadAuthorization, type BoluWriteAuthorization,
} from '../bolu-data'
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

      const rows = ((data as RawMessageRow[]) ?? []).map(mapRowToMessage)
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

      let verifiedFacts: BoluFactResult | null = null
      if (resolvedTenantClient) {
        try {
          const capability = matchBoluIntent(clean, defaultPageContext)
          if (capability) {
            const factsContext: BoluPageContext = {
              ...defaultPageContext,
              filters: { ...defaultPageContext.filters, query: extractBoluSearchTerm(clean) },
            }
            verifiedFacts = await readBoluContextFacts(resolvedTenantClient, capability, factsContext, canRead)
          }
        } catch (err) {
          console.warn('[useBoluThread] Intent lookup failed:', err)
          verifiedFacts = {
            kind: 'message',
            text: '[SYSTEM ERROR: The database lookup failed. Inform the user you encountered a technical issue querying their records.]',
          }
        }
      }

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

      const tempAssistantId = `temp-assistant-${Date.now()}`
      const tempMsg: ProductionBoluMessage = {
        id: tempAssistantId,
        conversationId: targetConversationId,
        tenantId: resolvedTenantId,
        role: 'assistant',
        content: '',
        status: 'streaming',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, tempMsg])
      setIsStreaming(true)
      streamingBufferRef.current = ''
      setStreamingContent('')

      const priorMessages = buildProviderMessages(
        messages
          .filter((m): m is ProductionBoluMessage & { role: 'user' | 'assistant' } => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({ id: m.id, role: m.role, content: m.content })),
      )
      priorMessages.push({ role: 'user', content: clean })

      const factsPrompt = verifiedFacts ? factsAsPrompt(verifiedFacts) : ''
      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        const response = await sendBoluProviderRequest({
          messages: priorMessages,
          contextFacts: factsPrompt,
          connectionId: options.connectionId,
          modelId: options.modelId,
          tenantId: resolvedTenantId,
          conversationId: targetConversationId,
          signal: controller.signal,
          onDelta: (delta: string) => {
            setClerkState('responding')
            const cleanDelta = delta.replace(/—/g, ' - ').replace(/–/g, '-')
            streamingBufferRef.current += cleanDelta

            if (!flushTimerRef.current) {
              flushTimerRef.current = setTimeout(() => {
                flushTimerRef.current = null
                const current = streamingBufferRef.current
                setStreamingContent(current)
                setMessages((prev) =>
                  prev.map((m) => (m.id === tempAssistantId ? { ...m, content: current } : m)),
                )
              }, 35)
            }
          },
        })

        if (flushTimerRef.current) {
          clearTimeout(flushTimerRef.current)
          flushTimerRef.current = null
        }

        let finalText = response.text.replace(/—/g, ' - ').replace(/–/g, '-')
        setStreamingContent('')
        setIsStreaming(false)

        let parsedProposal: BoluProposal | null = null
        const envelope = parseStructuredOperationEnvelope(finalText)

        if (envelope.hasOperation && envelope.rawOperation) {
          const rawOp = envelope.rawOperation as Record<string, unknown>
          const documentFamily: 'invoice' | 'quotation' | null =
            rawOp.documentFamily === 'invoice' || rawOp.documentFamily === 'quotation'
              ? rawOp.documentFamily
              : null
          if (documentFamily) {
            if (rawOp.operationType === 'create-document') {
              const validation = validateInvoiceCreateInput(rawOp.payload)
              if (validation.valid && validation.data) {
                if (resolvedTenantClient) {
                  const clientValidation = await validateBoluClient(resolvedTenantClient, validation.data.client_name)
                  if (clientValidation.status === 'exact_match') {
                    parsedProposal = buildDocumentCreateProposal(documentFamily, {
                      ...validation.data,
                      client_id: clientValidation.client.id,
                      client_name: clientValidation.client.name,
                    })
                  } else if (clientValidation.status === 'ambiguous') {
                    const matchesList = clientValidation.matches.map((m) => `• ${m.name}`).join('\n')
                    finalText = `${finalText}\n\nI found multiple clients matching "${validation.data.client_name}":\n${matchesList}\n\nPlease clarify which client you would like to create this invoice for.`
                  } else {
                    finalText = `${finalText}\n\nI couldn't find an existing client named "${validation.data.client_name}" in your business records. Please verify the client name or register them under Clients first.`
                  }
                } else {
                  parsedProposal = buildDocumentCreateProposal(documentFamily, validation.data)
                }
              }
            } else if (rawOp.operationType === 'modify-document' && documentFamily === 'invoice') {
              const validation = validateInvoiceModifyInput(rawOp.payload)
              if (validation.valid && validation.data) {
                let targetNum = 'INV-TARGET'
                if (resolvedTenantClient) {
                  try {
                    const doc = await readBoluInvoice(resolvedTenantClient, validation.data.documentId, canRead)
                    if (doc) targetNum = doc.number
                  } catch {
                    // Fallback to placeholder if lookup fails
                  }
                }
                parsedProposal = buildInvoiceModifyProposal({
                  targetDocumentId: validation.data.documentId,
                  targetDocumentNumber: targetNum,
                  field: validation.data.field,
                  oldValue: validation.data.oldValue,
                  newValue: validation.data.newValue,
                  itemsChange: validation.data.items && validation.data.oldItems
                    ? { oldItems: validation.data.oldItems, newItems: validation.data.items }
                    : undefined,
                })
              }
            }
          }
        }

        const { data: savedRow, error: saveError } = await (supabase.from('bolu_messages') as any)
          .insert({
            conversation_id: targetConversationId, tenant_id: resolvedTenantId,
            role: 'assistant', content: finalText, status: 'completed',
            proposal_payload: parsedProposal, records_payload: verifiedFacts,
          })
          .select(MESSAGE_COLUMNS).single()

        if (saveError) throw new Error(saveError.message)

        // Update conversation last_message_at
        void (supabase.from('bolu_conversations') as any)
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', targetConversationId)

        const finalMsg = mapRowToMessage(savedRow as RawMessageRow)
        setMessages((prev) => prev.map((m) => (m.id === tempAssistantId ? finalMsg : m)))

        if (parsedProposal) {
          setActiveProposal(parsedProposal)
          setActiveProposalMessageId(finalMsg.id)
          setClerkState('listening')
        } else {
          setClerkState('idle')
        }
        return true
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempAssistantId ? { ...m, content: streamingBufferRef.current, status: 'stopped' } : m)),
          )
          setClerkState('idle')
          return false
        }

        const errorMsg = err instanceof Error ? err.message : 'Inference request failed.'
        setError(errorMsg)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempAssistantId
              ? { ...m, content: `Bolu could not complete this request: ${errorMsg}`, status: 'failed' }
              : m,
          ),
        )
        setClerkState('idle')
        return false
      } finally {
        setIsStreaming(false)
        abortControllerRef.current = null
      }
    },
    [conversationId, resolvedTenantId, resolvedTenantClient, defaultPageContext, canRead, isStreaming, messages, activeProposal, options.onEnsureConversation, options.connectionId, options.modelId],
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

      let effectiveTenantClient = resolvedTenantClient
      if ((!effectiveTenantClient || !effectiveTenantClient.isReady) && entityCtx?.schemaName) {
        effectiveTenantClient = createTenantClient(supabase, entityCtx.schemaName)
      }
      if (!effectiveTenantClient || !effectiveTenantClient.isReady) {
        return { success: false, error: 'Tenant client is not ready.' }
      }

      const savingProposal: BoluProposal = { ...activeProposal, status: 'saving' }
      setActiveProposal(savingProposal)
      setMessages((prev) =>
        prev.map((m) => (m.id === activeProposalMessageId ? { ...m, proposal: savingProposal } : m)),
      )
      setClerkState('thinking')

      let result: BoluOperationExecutionResult
      try {
        result = activeProposal.operationType === 'create-document'
          ? await persistInvoiceCreation(effectiveTenantClient, savingProposal as any, canWrite, canRead, resolvedEntityId)
          : await persistInvoiceModification(effectiveTenantClient, savingProposal as any, canWrite, canRead, resolvedEntityId)
      } catch (err) {
        result = { success: false, error: err instanceof Error ? err.message : 'Database write failed.' }
      }

      if (result.success) {
        const persistedProposal: BoluProposal = {
          ...activeProposal,
          status: 'persisted',
          persistedId: result.documentNumber || result.documentId,
        }

        if (activeProposalMessageId) {
          await (supabase.from('bolu_messages') as any)
            .update({ proposal_payload: persistedProposal, updated_at: new Date().toISOString() })
            .eq('id', activeProposalMessageId)
        }

        const docNum = result.documentNumber || 'invoice'
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
    stopStreaming,
    approveGate1,
    rejectGate1,
    confirmGate2Save,
    cancelGate2Save,
    clearError,
    refreshThread: fetchMessages,
  }
}
