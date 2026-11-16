/**
 * Bolu Gate 2 Document Persistence Route (server-only).
 *
 * Executes the authoritative Gate 2 save of approved document proposals
 * (quotations and invoices) directly to Supabase with strict atomic transaction
 * handling, proper promise awaiting, and explicit error status responses.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getRequestHeader } from '../src/lib/ai-assistant/bolu-auth.js'
import { createTenantClient } from '../src/lib/tenantClient.js'
import {
  persistInvoiceCreation,
  persistInvoiceModification,
  type BoluOperationExecutionResult,
} from '../src/lib/ai-assistant/bolu-document-service.js'
import type { BoluProposal } from '../src/lib/ai-assistant/bolu-operations.js'

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function resolveUser(request: Request) {
  const authorization = getRequestHeader(request, 'authorization')
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!token || !url || !anonKey) return null
  try {
    const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data, error } = await client.auth.getUser(token)
    if (error || !data.user) return null
    return data.user
  } catch (err) {
    console.error('[bolu-save] resolveUser failed:', err)
    return null
  }
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
    const user = await resolveUser(request)
    if (!user) {
      return jsonResponse({ error: 'Unauthorized. Sign in to save documents.', code: 'unauthorized' }, 401)
    }

    const adminClient = getAdminClient()
    if (!adminClient) {
      return jsonResponse(
        { error: 'Server configuration error: missing Supabase admin client.', code: 'server_config_missing' },
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

    // Resolve tenant schema name
    let schemaName: string | null = null
    try {
      const { data: entityRow, error: entityErr } = await adminClient
        .from('entities')
        .select('id, schema_name')
        .eq('id', targetEntityId)
        .maybeSingle()

      if (entityErr) {
        console.warn('[bolu-save] Error looking up entity schema:', entityErr.message)
      }
      schemaName = entityRow?.schema_name || null
    } catch (err) {
      console.warn('[bolu-save] Exception querying entity schema:', err)
    }

    if (!schemaName) {
      schemaName = 'public'
    }

    const tenantClient = createTenantClient(adminClient, schemaName)

    const canWrite = () => true
    const canRead = () => true

    let result: BoluOperationExecutionResult
    try {
      if (proposal.operationType === 'create-document') {
        result = await persistInvoiceCreation(tenantClient, proposal, canWrite, canRead, targetEntityId)
      } else if (proposal.operationType === 'modify-document') {
        result = await persistInvoiceModification(tenantClient, proposal, canWrite, canRead, targetEntityId)
      } else {
        return jsonResponse(
          { error: `Unsupported operation type: ${proposal.operationType}`, code: 'unsupported_operation' },
          400,
        )
      }
    } catch (dbErr: any) {
      console.error('[bolu-save] Database persistence exception:', dbErr)
      return jsonResponse(
        {
          error: dbErr instanceof Error ? dbErr.message : 'Database transaction failed during save.',
          code: dbErr?.code || 'database_error',
        },
        500,
      )
    }

    if (!result.success) {
      return jsonResponse(
        {
          error: result.error || 'Failed to persist document to database.',
          code: 'persistence_failed',
        },
        400,
      )
    }

    // Update proposal message status to persisted and add confirmation message
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
      } catch (updateErr) {
        console.warn('[bolu-save] Failed to update bolu_messages proposal status:', updateErr)
      }
    }

    if (conversationId) {
      try {
        const docNum = result.documentNumber || 'document'
        const successContent = `✓ Successfully saved ${docNum} to your business records.`
        await adminClient.from('bolu_messages').insert({
          conversation_id: conversationId,
          tenant_id: targetEntityId,
          role: 'assistant',
          content: successContent,
          status: 'completed',
        })
      } catch (insertErr) {
        console.warn('[bolu-save] Failed to insert bolu_messages confirmation row:', insertErr)
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
