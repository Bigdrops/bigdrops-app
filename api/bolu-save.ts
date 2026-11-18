/**
 * Bolu Gate 2 Document Persistence Route (server-only).
 *
 * Executes the authoritative Gate 2 save of approved document proposals
 * (quotations and invoices) directly to Supabase with strict atomic transaction
 * handling, proper promise awaiting, canonical tenant schema resolution,
 * and authenticated user-scoped transaction authorization.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getRequestHeader } from '../src/lib/ai-assistant/bolu-auth.js'
import { createTenantClient } from '../src/lib/tenantClient.js'
import {
  persistInvoiceCreation,
  persistInvoiceModification,
  persistQuotationModification,
  type BoluOperationExecutionResult,
} from '../src/lib/ai-assistant/bolu-document-service.js'
import type { BoluProposal } from '../src/lib/ai-assistant/bolu-operations.js'

const TENANT_SCHEMA_PATTERN = /^entity_[a-z0-9-]+_[a-z0-9-]+$/i

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

interface ResolvedAuth {
  user: any
  token: string
}

async function resolveUser(request: Request): Promise<ResolvedAuth | null> {
  const authorization = getRequestHeader(request, 'authorization')
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!token || !url || !anonKey) return null
  try {
    const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data, error } = await client.auth.getUser(token)
    if (error || !data.user) return null
    return { user: data.user, token }
  } catch (err) {
    console.error('[bolu-save] resolveUser failed:', err)
    return null
  }
}

function getUserClient(token: string): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey || !token) return null
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  })
}

function getAdminClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function POST(request: Request): Promise<Response> {
  try {
    const authResult = await resolveUser(request)
    if (!authResult || !authResult.user || !authResult.token) {
      return jsonResponse({ error: 'Unauthorized. Sign in to save documents.', code: 'unauthorized' }, 401)
    }
    const { user, token } = authResult

    const adminClient = getAdminClient()
    if (!adminClient) {
      return jsonResponse(
        { error: 'Server configuration error: missing Supabase admin client.', code: 'server_config_missing' },
        500,
      )
    }

    const userClient = getUserClient(token)
    if (!userClient) {
      return jsonResponse(
        { error: 'Server configuration error: missing Supabase user client.', code: 'server_config_missing' },
        500,
      )
    }

    let body: any
    try {
      body = await request.json()
    } catch {
      return jsonResponse({ error: 'Invalid JSON request body.', code: 'bad_request' }, 400)
    }

    const { proposal, tenantId, entityId, conversationId, proposalMessageId } = body || {}

    if (!proposal || !proposal.opId) {
      return jsonResponse({ error: 'A valid proposal object is required.', code: 'missing_proposal' }, 400)
    }

    if (proposal.status !== 'approved_pending_save' && proposal.status !== 'saving') {
      return jsonResponse(
        {
          error: 'Proposal is not approved for Gate 2 save. Current status: ' + proposal.status,
          code: 'gate_not_approved',
        },
        400,
      )
    }

    const targetEntityId = entityId || tenantId
    if (!targetEntityId) {
      return jsonResponse({ error: 'Tenant or entity ID is required.', code: 'missing_tenant' }, 400)
    }

    // Resolve tenant schema name via canonical public._prov_get_schema_name RPC
    let schemaName: string | null = null
    try {
      const { data: resolvedSchema, error: schemaErr } = await adminClient.rpc('_prov_get_schema_name', {
        p_entity_id: targetEntityId,
      })

      if (schemaErr) {
        console.warn('[bolu-save] Error resolving schema via _prov_get_schema_name:', schemaErr.message)
      } else if (typeof resolvedSchema === 'string') {
        const trimmed = resolvedSchema.trim()
        if (trimmed && trimmed.toLowerCase() !== 'public' && TENANT_SCHEMA_PATTERN.test(trimmed)) {
          schemaName = trimmed
        } else {
          console.warn('[bolu-save] Schema resolved to invalid or disallowed value:', resolvedSchema)
        }
      }
    } catch (err) {
      console.warn('[bolu-save] Exception resolving tenant schema:', err)
    }

    if (!schemaName) {
      return jsonResponse(
        {
          error: 'Tenant schema could not be resolved for entity.',
          code: 'tenant_schema_unresolved',
        },
        422,
      )
    }

    // Pre-flight authorization check: verify user permission for target entity
    const resource = proposal.documentFamily === 'quotation' ? 'quotation' : 'invoice'
    const action = proposal.operationType === 'modify-document' ? 'edit' : 'create'

    try {
      const { data: hasPermission, error: permErr } = await adminClient.rpc('has_entity_permission', {
        p_entity_id: targetEntityId,
        p_user_id: user.id,
        p_resource: resource,
        p_action: action,
      })

      if (permErr) {
        console.warn('[bolu-save] Pre-flight permission check query error:', permErr.message)
      } else if (hasPermission === false) {
        return jsonResponse(
          {
            error: `Forbidden. You do not have permission to ${action} ${resource}s for this entity.`,
            code: 'forbidden',
          },
          403,
        )
      }
    } catch (permException) {
      console.warn('[bolu-save] Pre-flight permission check exception:', permException)
    }

    // Use userClient for tenant transactions so auth.uid() is populated in database RPCs
    const tenantClient = createTenantClient(userClient, schemaName)

    const canWrite = () => true
    const canRead = () => true

    // The authenticated user is the responsible actor for the audit trail. The
    // user id comes from the verified token, never from the request body.
    const auditActor = { id: user.id, label: user.email ?? 'user' }

    let result: BoluOperationExecutionResult
    try {
      if (proposal.operationType === 'create-document') {
        result = await persistInvoiceCreation(
          tenantClient, proposal, canWrite, canRead, targetEntityId, auditActor,
        )
      } else if (proposal.operationType === 'modify-document' && proposal.documentFamily === 'quotation') {
        result = await persistQuotationModification(
          tenantClient, proposal, canWrite, canRead, targetEntityId, auditActor,
        )
      } else if (proposal.operationType === 'modify-document') {
        result = await persistInvoiceModification(
          tenantClient, proposal, canWrite, canRead, targetEntityId, auditActor,
        )
      } else {
        return jsonResponse(
          { error: `Unsupported operation type: ${proposal.operationType}`, code: 'unsupported_operation' },
          400,
        )
      }
    } catch (dbErr: any) {
      console.error('[bolu-save] Database persistence exception:', dbErr)
      const isForbidden =
        dbErr?.code === '42501' ||
        dbErr?.message?.toLowerCase().includes('insufficient_privilege') ||
        dbErr?.message?.toLowerCase().includes('insufficient permissions')
      return jsonResponse(
        {
          error: dbErr instanceof Error ? dbErr.message : 'Database transaction failed during save.',
          code: isForbidden ? 'forbidden' : dbErr?.code || 'database_error',
        },
        isForbidden ? 403 : 500,
      )
    }

    if (!result.success) {
      const isForbidden =
        result.error?.toLowerCase().includes('insufficient_privilege') ||
        result.error?.toLowerCase().includes('insufficient permissions') ||
        result.error?.toLowerCase().includes('permission')
      return jsonResponse(
        {
          error: result.error || 'Failed to persist document to database.',
          code: isForbidden ? 'forbidden' : 'persistence_failed',
        },
        isForbidden ? 403 : 400,
      )
    }

    // Update proposal message status to persisted. The update is scoped to the
    // resolved tenant so a supplied message id can never touch another tenant.
    // The confirmation message itself is written by the client thread once, so
    // the server must not insert a second copy.
    const persistedProposal: BoluProposal = {
      ...proposal,
      status: 'persisted',
      persistedId: result.documentNumber || result.documentId,
    }

    if (proposalMessageId) {
      try {
        await adminClient
          .from('bolu_messages')
          .update({
            proposal_payload: persistedProposal,
            updated_at: new Date().toISOString(),
          })
          .eq('id', proposalMessageId)
          .eq('tenant_id', targetEntityId)
      } catch (updateErr) {
        console.warn('[bolu-save] Failed to update bolu_messages proposal status:', updateErr)
      }
    }

    return jsonResponse(
      {
        success: true,
        documentId: result.documentId,
        documentNumber: result.documentNumber,
        persistedProposal,
      },
      200,
    )
  } catch (unexpectedErr: any) {
    console.error('[bolu-save] Unexpected handler exception:', unexpectedErr)
    return jsonResponse(
      {
        error: unexpectedErr instanceof Error ? unexpectedErr.message : 'Internal Server Error',
        code: 'internal_error',
      },
      500,
    )
  }
}
