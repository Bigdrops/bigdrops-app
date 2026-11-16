/**
 * useBoluConversations.ts — Conversation Management Hook for Bolu 2.0
 *
 * Manages conversation thread listings, global user retention, active/expiring
 * thread queries, thread creation, restoration, and deletion against
 * the Supabase `public.bolu_conversations` table.
 *
 * Architecture:
 * - Application State Tier for Bolu multi-thread navigation.
 * - Global conversation scope across authorized application routes.
 * - Enforces strict tenant scoping (tenant_id = entity.id).
 * - Enforces global 10-conversation limit and 48-hour grace period via backend triggers/RPC.
 * - Subscribes to Supabase Realtime channel for cross-tab sync.
 */

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/supabase'
import { EntityContext } from '@/lib/tenant/entityContext'

export interface BoluConversationSummary {
  id: string
  tenantId: string
  userId: string
  title: string
  module: string
  originRecordId: string | null
  status: 'active' | 'archived' | 'deleted'
  lastMessageAt: string
  scheduledDeletionAt: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface CreateConversationParams {
  title?: string
  module?: string
  originRecordId?: string | null
  metadata?: Record<string, unknown>
}

export interface UseBoluConversationsOptions {
  tenantId?: string | null
  module?: string
  originRecordId?: string | null
  autoSelectLatest?: boolean
}

export interface UseBoluConversationsReturn {
  conversations: BoluConversationSummary[]
  activeConversations: BoluConversationSummary[]
  expiringConversations: BoluConversationSummary[]
  activeConversationId: string | null
  activeConversation: BoluConversationSummary | null
  isLoading: boolean
  error: string | null
  createConversation: (params?: CreateConversationParams) => Promise<string | null>
  selectConversation: (id: string | null) => void
  archiveConversation: (id: string) => Promise<boolean>
  restoreConversation: (id: string) => Promise<boolean>
  deleteConversation: (id: string) => Promise<boolean>
  renameConversation: (id: string, newTitle: string) => Promise<boolean>
  refreshConversations: () => Promise<void>
}

interface RawConversationRow {
  id: string
  tenant_id: string
  user_id: string
  title: string
  module: string
  origin_record_id: string | null
  status: 'active' | 'archived' | 'deleted'
  last_message_at: string
  scheduled_deletion_at: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

function mapRowToSummary(row: RawConversationRow): BoluConversationSummary {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    title: row.title,
    module: row.module,
    originRecordId: row.origin_record_id,
    status: row.status,
    lastMessageAt: row.last_message_at,
    scheduledDeletionAt: row.scheduled_deletion_at ?? null,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const CONVERSATION_COLUMNS =
  'id, tenant_id, user_id, title, module, origin_record_id, status, last_message_at, scheduled_deletion_at, metadata, created_at, updated_at'

export function useBoluConversations(options: UseBoluConversationsOptions = {}): UseBoluConversationsReturn {
  const entityCtx = useContext(EntityContext)
  const resolvedTenantId = options.tenantId ?? entityCtx?.entity?.id ?? null

  const [conversations, setConversations] = useState<BoluConversationSummary[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Split into active threads and grace-period expiring threads
  const activeConversations = useMemo(
    () => conversations.filter((c) => c.status === 'active'),
    [conversations],
  )

  const expiringConversations = useMemo(
    () => conversations.filter((c) => c.status === 'archived' && c.scheduledDeletionAt),
    [conversations],
  )

  const activeConversation = useMemo(() => {
    if (!activeConversationId) return null
    return conversations.find((c) => c.id === activeConversationId) ?? null
  }, [conversations, activeConversationId])

  // Bolu 2.0: default is FALSE so opening Bolu always initializes a fresh empty session
  const autoSelectLatest = options.autoSelectLatest ?? false
  const optionsRef = useRef(options)
  optionsRef.current = options

  const fetchConversations = useCallback(async () => {
    if (!resolvedTenantId) {
      setConversations([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Query both active and grace-period archived conversations for this tenant.
      // Global route access: Do NOT filter by page module so conversations are accessible everywhere.
      const query = (supabase.from('bolu_conversations') as any)
        .select(CONVERSATION_COLUMNS)
        .eq('tenant_id', resolvedTenantId)
        .in('status', ['active', 'archived'])
        .order('last_message_at', { ascending: false })
        .limit(50)

      const { data, error: queryError } = await query

      if (queryError) {
        throw new Error(queryError.message)
      }

      const mapped = ((data as RawConversationRow[]) ?? []).map(mapRowToSummary)
      setConversations(mapped)

      setActiveConversationId((prev) => {
        if (prev && mapped.some((c) => c.id === prev)) {
          return prev
        }
        if (autoSelectLatest && mapped.length > 0) {
          const firstActive = mapped.find((c) => c.status === 'active')
          return firstActive ? firstActive.id : mapped[0].id
        }
        return null
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch conversations.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [resolvedTenantId, autoSelectLatest])

  useEffect(() => {
    void fetchConversations()
  }, [fetchConversations])

  useEffect(() => {
    if (!resolvedTenantId) return

    const channel = supabase
      .channel(`bolu_conversations_${resolvedTenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bolu_conversations',
          filter: `tenant_id=eq.${resolvedTenantId}`,
        },
        () => {
          void fetchConversations()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [resolvedTenantId, fetchConversations])

  const createConversation = useCallback(
    async (params: CreateConversationParams = {}): Promise<string | null> => {
      if (!resolvedTenantId) {
        setError('Cannot create conversation: no active business entity.')
        return null
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setError('Sign in to create a conversation.')
        return null
      }

      const title = params.title?.trim() || 'New Conversation'
      const conversationModule = params.module || optionsRef.current.module || 'dashboard'
      const originRecordId = params.originRecordId ?? optionsRef.current.originRecordId ?? null
      const metadata = params.metadata ?? {}

      try {
        const { data, error: insertError } = await (supabase.from('bolu_conversations') as any)
          .insert({
            tenant_id: resolvedTenantId,
            user_id: user.id,
            title,
            module: conversationModule,
            origin_record_id: originRecordId,
            status: 'active',
            metadata,
          })
          .select(CONVERSATION_COLUMNS)
          .single()

        if (insertError) {
          throw new Error(insertError.message)
        }

        const created = mapRowToSummary(data as RawConversationRow)
        // Refresh conversations to reflect trigger evictions if active count exceeded 10
        await fetchConversations()
        setActiveConversationId(created.id)
        return created.id
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create conversation.'
        setError(message)
        return null
      }
    },
    [resolvedTenantId, fetchConversations],
  )

  const selectConversation = useCallback((id: string | null) => {
    setActiveConversationId(id)
  }, [])

  const archiveConversation = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { error: updateError } = await (supabase.from('bolu_conversations') as any)
          .update({
            status: 'archived',
            scheduled_deletion_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)

        if (updateError) {
          throw new Error(updateError.message)
        }

        await fetchConversations()
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to archive conversation.'
        setError(message)
        return false
      }
    },
    [fetchConversations],
  )

  const restoreConversation = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { error: rpcError } = await (supabase.rpc('restore_bolu_conversation', {
          p_conversation_id: id,
        }) as any)

        if (rpcError) {
          throw new Error(rpcError.message)
        }

        await fetchConversations()
        setActiveConversationId(id)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to restore conversation.'
        setError(message)
        return false
      }
    },
    [fetchConversations],
  )

  const deleteConversation = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { error: deleteError } = await (supabase.from('bolu_conversations') as any)
          .delete()
          .eq('id', id)

        if (deleteError) {
          throw new Error(deleteError.message)
        }

        setConversations((prev) => prev.filter((c) => c.id !== id))
        setActiveConversationId((prev) => (prev === id ? null : prev))
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete conversation.'
        setError(message)
        return false
      }
    },
    [],
  )

  const renameConversation = useCallback(
    async (id: string, newTitle: string): Promise<boolean> => {
      const cleanTitle = newTitle.trim()
      if (!cleanTitle) return false

      try {
        const { error: updateError } = await (supabase.from('bolu_conversations') as any)
          .update({ title: cleanTitle, updated_at: new Date().toISOString() })
          .eq('id', id)

        if (updateError) {
          throw new Error(updateError.message)
        }

        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, title: cleanTitle, updatedAt: new Date().toISOString() } : c)),
        )
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to rename conversation.'
        setError(message)
        return false
      }
    },
    [],
  )

  return {
    conversations,
    activeConversations,
    expiringConversations,
    activeConversationId,
    activeConversation,
    isLoading,
    error,
    createConversation,
    selectConversation,
    archiveConversation,
    restoreConversation,
    deleteConversation,
    renameConversation,
    refreshConversations: fetchConversations,
  }
}
