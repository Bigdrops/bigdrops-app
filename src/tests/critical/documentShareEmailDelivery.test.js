import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  handleSendDocumentEmail,
  sanitizeReplyTo,
  MAX_ATTACHMENT_BYTES,
} from '../../../supabase/functions/send-document-email/index.ts'
import {
  buildDocumentEmailHtml,
  renderDocumentEmailHtml,
  escapeHtml,
} from '../../domain/documentShare/documentEmailHtml.ts'
import { DocumentEmailTemplate } from '../../components/email/DocumentEmailTemplate.tsx'

const VALID_TOKEN = 'token_test_1234567890_abcdef1234'
const VALID_OP_ID = 'op_test_operation_1234567890_xyz'

function createMockPdfBlob(size = 100, isPdf = true) {
  const bytes = new Uint8Array(size)
  if (isPdf && size >= 5) {
    bytes[0] = 0x25 // %
    bytes[1] = 0x50 // P
    bytes[2] = 0x44 // D
    bytes[3] = 0x46 // F
    bytes[4] = 0x2d // -
  }
  return new Blob([bytes], { type: 'application/pdf' })
}

function createMockAdminClient(overrides = {}) {
  const defaultShare = {
    id: 'share_1',
    token: VALID_TOKEN,
    document_type: 'Invoice',
    document_id: 'inv_1',
    document_number: 'INV-2026-001',
    document_title: 'Commercial Invoice INV-2026-001',
    pdf_path: `${VALID_TOKEN}.pdf`,
    tenant_id: 'tenant_123',
    created_by: 'user_alice',
    is_revoked: false,
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    metadata: {
      issuerName: 'Acme Nigeria Ltd',
      issuerEmail: 'billing@acme.ng',
      recipientName: 'Globex Ltd',
      totalFormatted: 'NGN 1,500,000.00',
      fileName: 'INV-2026-001.pdf',
    },
  }

  const shareRecord = overrides.share !== undefined ? overrides.share : defaultShare
  const callerUser = overrides.callerUser !== undefined ? overrides.callerUser : { id: 'user_alice' }
  const isMember = overrides.isMember !== undefined ? overrides.isMember : true
  const storageBlob = overrides.storageBlob !== undefined ? overrides.storageBlob : createMockPdfBlob()

  return {
    auth: {
      getUser: async (token) => {
        if (token === 'valid_jwt') {
          return { data: { user: callerUser }, error: null }
        }
        return { data: { user: null }, error: new Error('Invalid token') }
      },
    },
    from: (tableName) => {
      if (tableName === 'document_shares') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: shareRecord,
                error: overrides.shareError || null,
              }),
            }),
          }),
        }
      }
      if (tableName === 'entities') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: overrides.entityData !== undefined ? overrides.entityData : { workspace_id: 'ws_123' },
                error: null,
              }),
            }),
          }),
        }
      }
      if (tableName === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { email: 'creator@acme.ng' },
                error: null,
              }),
            }),
          }),
        }
      }
      throw new Error(`Unexpected table: ${tableName}`)
    },
    rpc: async (funcName, args) => {
      if (funcName === 'is_workspace_member') {
        if (typeof overrides.rpcMemberFn === 'function') {
          return overrides.rpcMemberFn(args)
        }
        return { data: isMember, error: overrides.rpcError || null }
      }
      return { data: false, error: new Error('Unknown RPC') }
    },
    storage: {
      from: (bucketName) => {
        assert.equal(bucketName, 'document-shares')
        return {
          download: async (path) => {
            if (overrides.downloadError) {
              return { data: null, error: overrides.downloadError }
            }
            return { data: storageBlob, error: null }
          },
        }
      },
    },
  }
}

// ====================================================================
// 1. AUTHENTICATION BEHAVIORAL TESTS
// ====================================================================

test('BEHAVIORAL: handleSendDocumentEmail rejects missing Authorization header with 401', async () => {
  const req = new Request('http://localhost/functions/v1/send-document-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: VALID_TOKEN, operationId: VALID_OP_ID }),
  })

  const res = await handleSendDocumentEmail(req, { adminClient: createMockAdminClient() })
  assert.equal(res.status, 401)
  const body = await res.json()
  assert.match(body.error, /Missing or invalid authorization header/i)
})

test('BEHAVIORAL: handleSendDocumentEmail rejects invalid or expired JWT with 401', async () => {
  const req = new Request('http://localhost/functions/v1/send-document-email', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer expired_or_tampered_jwt',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token: VALID_TOKEN, operationId: VALID_OP_ID }),
  })

  const res = await handleSendDocumentEmail(req, { adminClient: createMockAdminClient() })
  assert.equal(res.status, 401)
  const body = await res.json()
  assert.match(body.error, /Unauthorized/i)
})

// ====================================================================
// 2. AUTHORIZATION & TENANT BOUNDARY TESTS (FIND-04)
// ====================================================================

test('BEHAVIORAL (FIND-04): Creator who is NO LONGER a workspace member is rejected with 403', async () => {
  // Alice created the share originally, but has been removed from the tenant workspace
  const mockClient = createMockAdminClient({
    callerUser: { id: 'user_alice' },
    share: {
      id: 'share_1',
      token: VALID_TOKEN,
      created_by: 'user_alice', // Alice was the creator
      tenant_id: 'tenant_123',
      pdf_path: `${VALID_TOKEN}.pdf`,
      is_revoked: false,
    },
    isMember: false, // is_workspace_member returns false (membership revoked)
  })

  const req = new Request('http://localhost/functions/v1/send-document-email', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer valid_jwt',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token: VALID_TOKEN,
      operationId: VALID_OP_ID,
      recipientEmail: 'client@example.com',
      subject: 'Invoice Attached',
    }),
  })

  const res = await handleSendDocumentEmail(req, { adminClient: mockClient })
  assert.equal(res.status, 403)
  const body = await res.json()
  assert.match(body.error, /not an active member of this document's workspace/i)
})

test('BEHAVIORAL: Unauthorized non-member user is rejected with 403', async () => {
  const mockClient = createMockAdminClient({
    callerUser: { id: 'user_charlie' },
    isMember: false,
  })

  const req = new Request('http://localhost/functions/v1/send-document-email', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer valid_jwt',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token: VALID_TOKEN,
      operationId: VALID_OP_ID,
      recipientEmail: 'client@example.com',
      subject: 'Invoice Attached',
    }),
  })

  const res = await handleSendDocumentEmail(req, { adminClient: mockClient })
  assert.equal(res.status, 403)
})

test('BEHAVIORAL: Active workspace member successfully passes authorization', async () => {
  let resendCallCount = 0
  const mockResend = {
    emails: {
      send: async () => {
        resendCallCount++
        return { data: { id: 'msg_active_member_ok' }, error: null }
      },
    },
  }

  const req = new Request('http://localhost/functions/v1/send-document-email', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer valid_jwt',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token: VALID_TOKEN,
      operationId: VALID_OP_ID,
      recipientEmail: 'client@example.com',
      subject: 'Invoice Attached',
    }),
  })

  const res = await handleSendDocumentEmail(req, {
    adminClient: createMockAdminClient({ isMember: true }),
    resendClient: mockResend,
  })

  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.success, true)
  assert.equal(body.messageId, 'msg_active_member_ok')
  assert.equal(resendCallCount, 1)
})

// ====================================================================
// 3. SHARE LIFECYCLE TESTS
// ====================================================================

test('BEHAVIORAL: Revoked share is rejected with 410 Gone', async () => {
  const mockClient = createMockAdminClient({
    share: {
      id: 'share_1',
      token: VALID_TOKEN,
      tenant_id: 'tenant_123',
      pdf_path: `${VALID_TOKEN}.pdf`,
      is_revoked: true, // Revoked!
    },
  })

  const req = new Request('http://localhost/functions/v1/send-document-email', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer valid_jwt',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token: VALID_TOKEN,
      operationId: VALID_OP_ID,
      recipientEmail: 'client@example.com',
      subject: 'Invoice Attached',
    }),
  })

  const res = await handleSendDocumentEmail(req, { adminClient: mockClient })
  assert.equal(res.status, 410)
  const body = await res.json()
  assert.match(body.error, /revoked/i)
})

test('BEHAVIORAL: Expired share is rejected with 410 Gone', async () => {
  const mockClient = createMockAdminClient({
    share: {
      id: 'share_1',
      token: VALID_TOKEN,
      tenant_id: 'tenant_123',
      pdf_path: `${VALID_TOKEN}.pdf`,
      is_revoked: false,
      expires_at: new Date(Date.now() - 3600000).toISOString(), // Expired 1 hour ago
    },
  })

  const req = new Request('http://localhost/functions/v1/send-document-email', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer valid_jwt',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token: VALID_TOKEN,
      operationId: VALID_OP_ID,
      recipientEmail: 'client@example.com',
      subject: 'Invoice Attached',
    }),
  })

  const res = await handleSendDocumentEmail(req, { adminClient: mockClient })
  assert.equal(res.status, 410)
  const body = await res.json()
  assert.match(body.error, /expired/i)
})

// ====================================================================
// 4. STORAGE & PDF INTEGRITY TESTS
// ====================================================================

test('BEHAVIORAL: Mismatched or traversal storage path is rejected with 422', async () => {
  const mockClient = createMockAdminClient({
    share: {
      id: 'share_1',
      token: VALID_TOKEN,
      tenant_id: 'tenant_123',
      pdf_path: '../other_token.pdf', // Path traversal attempt!
      is_revoked: false,
    },
  })

  const req = new Request('http://localhost/functions/v1/send-document-email', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer valid_jwt',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token: VALID_TOKEN,
      operationId: VALID_OP_ID,
      recipientEmail: 'client@example.com',
      subject: 'Invoice Attached',
    }),
  })

  const res = await handleSendDocumentEmail(req, { adminClient: mockClient })
  assert.equal(res.status, 422)
  const body = await res.json()
  assert.match(body.error, /corrupted or untrusted/i)
})

test('BEHAVIORAL: Non-PDF binary failing %PDF- magic signature is rejected with 422', async () => {
  const mockClient = createMockAdminClient({
    storageBlob: new Blob(['NOT_A_PDF_FILE_CONTENT'], { type: 'text/plain' }),
  })

  const req = new Request('http://localhost/functions/v1/send-document-email', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer valid_jwt',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token: VALID_TOKEN,
      operationId: VALID_OP_ID,
      recipientEmail: 'client@example.com',
      subject: 'Invoice Attached',
    }),
  })

  const res = await handleSendDocumentEmail(req, { adminClient: mockClient })
  assert.equal(res.status, 422)
  const body = await res.json()
  assert.match(body.error, /valid PDF document/i)
})

test('BEHAVIORAL (FIND-06): Attachment exceeding 10MB limit is rejected with 413', async () => {
  // Create an oversized 11MB file with valid magic bytes
  const mockClient = createMockAdminClient({
    storageBlob: createMockPdfBlob(11 * 1024 * 1024, true),
  })

  const req = new Request('http://localhost/functions/v1/send-document-email', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer valid_jwt',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token: VALID_TOKEN,
      operationId: VALID_OP_ID,
      recipientEmail: 'client@example.com',
      subject: 'Invoice Attached',
    }),
  })

  const res = await handleSendDocumentEmail(req, { adminClient: mockClient })
  assert.equal(res.status, 413)
  const body = await res.json()
  assert.match(body.error, /exceeds maximum email attachment limit/i)
})

// ====================================================================
// 5. RESEND DISPATCH & IDEMPOTENCY TESTS (FIND-01 & FIND-02)
// ====================================================================

test('BEHAVIORAL (FIND-01 & FIND-02): Dispatches via Resend SDK passing Idempotency-Key and NO dual-send fallback', async () => {
  let capturedPayload = null
  let capturedOptions = null
  let callCount = 0

  const mockResend = {
    emails: {
      send: async (payload, options) => {
        callCount++
        capturedPayload = payload
        capturedOptions = options
        return { data: { id: 'msg_idempotent_123' }, error: null }
      },
    },
  }

  const req = new Request('http://localhost/functions/v1/send-document-email', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer valid_jwt',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token: VALID_TOKEN,
      operationId: VALID_OP_ID,
      recipientEmail: 'client@example.com',
      subject: 'Invoice INV-2026-001',
      message: 'Please review and confirm.',
    }),
  })

  const res = await handleSendDocumentEmail(req, {
    adminClient: createMockAdminClient(),
    resendClient: mockResend,
  })

  assert.equal(res.status, 200)
  assert.equal(callCount, 1, 'Must call Resend SDK exactly once')
  assert.equal(capturedOptions?.idempotencyKey, VALID_OP_ID, 'Must pass operationId as idempotencyKey')
  assert.equal(capturedPayload?.to[0], 'client@example.com')
  assert.equal(capturedPayload?.attachments?.length, 1)
  assert.equal(capturedPayload?.attachments[0]?.filename, 'INV-2026-001.pdf')
})

test('BEHAVIORAL (FIND-01): Network timeout during Resend dispatch returns 504 ambiguous and NEVER triggers second send', async () => {
  let sendCallCount = 0
  const mockResend = {
    emails: {
      send: async () => {
        sendCallCount++
        throw new Error('Socket timeout while reading response')
      },
    },
  }

  const req = new Request('http://localhost/functions/v1/send-document-email', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer valid_jwt',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token: VALID_TOKEN,
      operationId: VALID_OP_ID,
      recipientEmail: 'client@example.com',
      subject: 'Invoice INV-2026-001',
    }),
  })

  const res = await handleSendDocumentEmail(req, {
    adminClient: createMockAdminClient(),
    resendClient: mockResend,
  })

  assert.equal(res.status, 504, 'Must return 504 Gateway Timeout on ambiguous network exception')
  const body = await res.json()
  assert.equal(body.ambiguous, true, 'Must flag outcome as ambiguous')
  assert.equal(body.operationId, VALID_OP_ID, 'Must preserve operationId for reconciliation')
  assert.equal(sendCallCount, 1, 'Must NOT execute a second send attempt via REST fallback')
})

test('BEHAVIORAL: Provider confirmed rejection returns 422 with ambiguous=false', async () => {
  const mockResend = {
    emails: {
      send: async () => {
        return {
          data: null,
          error: { message: 'Domain not verified. Unable to send from notifications@bourxe.com' },
        }
      },
    },
  }

  const req = new Request('http://localhost/functions/v1/send-document-email', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer valid_jwt',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token: VALID_TOKEN,
      operationId: VALID_OP_ID,
      recipientEmail: 'client@example.com',
      subject: 'Invoice INV-2026-001',
    }),
  })

  const res = await handleSendDocumentEmail(req, {
    adminClient: createMockAdminClient(),
    resendClient: mockResend,
  })

  assert.equal(res.status, 422)
  const body = await res.json()
  assert.equal(body.ambiguous, false)
  assert.match(body.error, /Domain not verified/i)
})

// ====================================================================
// 6. BUSINESS REPLY-TO BEHAVIORAL TESTS (FIND-05)
// ====================================================================

test('BEHAVIORAL (FIND-05): Configures valid replyTo and invites replies in email footer when business email exists', async () => {
  let capturedReplyTo = null
  let capturedHtml = ''

  const mockResend = {
    emails: {
      send: async (payload) => {
        capturedReplyTo = payload.replyTo
        capturedHtml = payload.html
        return { data: { id: 'msg_reply_ok' }, error: null }
      },
    },
  }

  const req = new Request('http://localhost/functions/v1/send-document-email', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer valid_jwt',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token: VALID_TOKEN,
      operationId: VALID_OP_ID,
      recipientEmail: 'client@example.com',
      subject: 'Invoice INV-2026-001',
    }),
  })

  const res = await handleSendDocumentEmail(req, {
    adminClient: createMockAdminClient({
      share: {
        id: 'share_1',
        token: VALID_TOKEN,
        document_number: 'INV-2026-001',
        tenant_id: 'tenant_123',
        pdf_path: `${VALID_TOKEN}.pdf`,
        is_revoked: false,
        metadata: {
          issuerName: 'Acme Nigeria Ltd',
          issuerEmail: 'billing@acme.ng', // Valid trusted business email
        },
      },
    }),
    resendClient: mockResend,
  })

  assert.equal(res.status, 200)
  assert.deepEqual(capturedReplyTo, ['billing@acme.ng'], 'Must set replyTo array')
  assert.match(capturedHtml, /reply directly to this email or contact Acme Nigeria Ltd/, 'Must invite direct reply')
})

test('BEHAVIORAL (FIND-05): Omits replyTo and avoids false promise in footer when business email is absent', async () => {
  let capturedReplyTo = null
  let capturedHtml = ''

  const mockResend = {
    emails: {
      send: async (payload) => {
        capturedReplyTo = payload.replyTo
        capturedHtml = payload.html
        return { data: { id: 'msg_no_reply_ok' }, error: null }
      },
    },
  }

  const req = new Request('http://localhost/functions/v1/send-document-email', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer valid_jwt',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token: VALID_TOKEN,
      operationId: VALID_OP_ID,
      recipientEmail: 'client@example.com',
      subject: 'Invoice INV-2026-001',
    }),
  })

  const baseClient = createMockAdminClient({
    share: {
      id: 'share_1',
      token: VALID_TOKEN,
      tenant_id: 'tenant_123',
      pdf_path: `${VALID_TOKEN}.pdf`,
      is_revoked: false,
      metadata: {
        issuerName: 'Acme Nigeria Ltd',
        // No issuerEmail provided
      },
    },
  })

  const mockClient = {
    ...baseClient,
    from: (table) => {
      if (table === 'profiles') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
        }
      }
      return baseClient.from(table)
    },
  }

  const res = await handleSendDocumentEmail(req, {
    adminClient: mockClient,
    resendClient: mockResend,
  })

  assert.equal(res.status, 200)
  assert.equal(capturedReplyTo, undefined, 'Must omit replyTo when no trusted business email exists')
  assert.match(
    capturedHtml,
    /contact Acme Nigeria Ltd through your standard business contact channels/,
    'Must not falsely promise direct replies',
  )
})

// ====================================================================
// 7. SINGLE AUTHORITATIVE TEMPLATE TESTS (FIND-03)
// ====================================================================

test('BEHAVIORAL (FIND-03): buildDocumentEmailHtml correctly escapes user-provided content and matches preview', () => {
  const maliciousInput = {
    documentType: 'Invoice',
    documentNumber: 'INV<script>alert(1)</script>',
    documentTitle: 'Title & "Quotes"',
    issuerName: 'Acme <Corp>',
    recipientName: 'O\'Connor & Co',
    shareUrl: 'https://bouxre.com/shared/token?param="test"',
    message: 'Hello <script>steal()</script> & goodbye!',
  }

  const html = buildDocumentEmailHtml(maliciousInput)

  assert.equal(html.includes('<script>'), false, 'Must never contain unescaped script tags')
  assert.match(html, /INV&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
  assert.match(html, /Acme &lt;Corp&gt;/)
  assert.match(html, /O&#039;Connor &amp; Co/)
  assert.match(html, /Hello &lt;script&gt;steal\(\)&lt;\/script&gt; &amp; goodbye!/)
})

test('BEHAVIORAL (FIND-03): DocumentEmailTemplate preview component renders exact output from buildDocumentEmailHtml', async () => {
  const props = {
    documentType: 'Invoice',
    documentNumber: 'INV-2026-999',
    shareUrl: 'https://bouxre.com/shared/test',
    issuerName: 'BOURXE Verified',
    totalFormatted: 'NGN 250,000.00',
  }

  const generatedHtml = buildDocumentEmailHtml(props)
  const renderedFromComponentHelper = await renderDocumentEmailHtml(props)

  assert.equal(generatedHtml, renderedFromComponentHelper, 'Preview and delivery must use identical HTML string output')
})
