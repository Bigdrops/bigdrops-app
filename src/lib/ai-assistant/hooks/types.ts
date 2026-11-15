/**
 * types.ts — Shared Types for Bolu Assistant Hooks
 */

import type { BoluProposal } from '../bolu-operations'
import type { BoluFactResult, BoluReadAuthorization, BoluWriteAuthorization } from '../bolu-data'
import type { BoluPageContext } from '../bolu-context'
import type { TenantClient } from '@/lib/tenantClient'
import type { BoluOperationExecutionResult } from '../bolu-document-service'

export type ClerkState = 'idle' | 'listening' | 'thinking' | 'responding' | 'success'

export interface ProductionBoluMessage {
  id: string
  conversationId: string
  tenantId: string
  senderId?: string | null
  role: 'user' | 'assistant' | 'system'
  content: string
  status: 'streaming' | 'completed' | 'failed' | 'stopped'
  proposal?: BoluProposal | null
  records?: BoluFactResult | null
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface UseBoluThreadOptions {
  conversationId: string | null
  tenantId?: string | null
  tenantClient?: TenantClient
  entityId?: string | null
  canRead?: BoluReadAuthorization
  canWrite?: BoluWriteAuthorization
  pageContext?: BoluPageContext
  connectionId?: string | null
  modelId?: string | null
  onEnsureConversation?: () => Promise<string | null>
}

export interface UseBoluThreadReturn {
  messages: ProductionBoluMessage[]
  clerkState: ClerkState
  isStreaming: boolean
  streamingContent: string
  activeProposal: BoluProposal | null
  activeProposalMessageId: string | null
  error: string | null
  submitMessage: (text: string) => Promise<boolean>
  stopStreaming: () => void
  approveGate1: (opId?: string) => Promise<boolean>
  rejectGate1: (opId?: string) => Promise<boolean>
  confirmGate2Save: (opId?: string) => Promise<BoluOperationExecutionResult>
  cancelGate2Save: (opId?: string) => void
  clearError: () => void
  refreshThread: () => Promise<void>
}

export const MESSAGE_COLUMNS =
  'id, conversation_id, tenant_id, sender_id, role, content, status, proposal_payload, records_payload, metadata, created_at, updated_at'

export interface RawMessageRow {
  id: string
  conversation_id: string
  tenant_id: string
  sender_id: string | null
  role: 'user' | 'assistant' | 'system'
  content: string
  status: 'streaming' | 'completed' | 'failed' | 'stopped'
  proposal_payload: BoluProposal | null
  records_payload: BoluFactResult | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export function mapRowToMessage(row: RawMessageRow): ProductionBoluMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    tenantId: row.tenant_id,
    senderId: row.sender_id,
    role: row.role,
    content: row.content,
    status: row.status,
    proposal: row.proposal_payload,
    records: row.records_payload,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
