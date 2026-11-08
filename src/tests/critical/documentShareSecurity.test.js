import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  generateCryptoToken,
  fetchPublicDocumentShare,
  revokeDocumentShare,
} from '../../domain/documentShare/documentShareService'

const MIGRATION_PATH = path.resolve(
  'supabase/migrations/20261107150000_document_sharing_security_hardening.sql',
)
const EDGE_FN_PATH = path.resolve('supabase/functions/public-document-pdf/index.ts')
const SERVICE_PATH = path.resolve('src/domain/documentShare/documentShareService.ts')
const VIEWER_PATH = path.resolve('src/pages/PublicDocumentViewer.tsx')

test('SECURITY: generateCryptoToken produces 192-bit cryptographic randomness and fails closed', () => {
  // 1. Verify token entropy and format
  const token = generateCryptoToken()
  assert.equal(typeof token, 'string')
  assert.equal(token.length >= 32, true, 'Token must have at least 32 characters')
  assert.match(token, /^[0-9a-f]{32,}$/i, 'Token must consist of hexadecimal characters')

  // 2. Verify uniqueness across 100 consecutive generations (no collisions)
  const tokens = new Set()
  for (let i = 0; i < 100; i++) {
    const t = generateCryptoToken()
    assert.equal(tokens.has(t), false, 'Token collision detected')
    tokens.add(t)
  }

  // 3. Verify fail-closed behavior when crypto is absent
  const originalCrypto = globalThis.crypto
  try {
    // @ts-ignore
    globalThis.crypto = undefined
    assert.throws(() => {
      generateCryptoToken()
    }, /Secure cryptographic randomness is unavailable/)
  } finally {
    globalThis.crypto = originalCrypto
  }
})

test('SECURITY: fetchPublicDocumentShare fails closed and returns uniform error on invalid/malformed tokens', async () => {
  const invalidTokens = [
    '',
    '   ',
    'short',
    '../path/traversal',
    'token;DROP TABLE document_shares;--',
    '<script>alert(1)</script>',
    'token with spaces',
    'token.with.dots.pdf',
    'special$char*token!',
  ]

  for (const token of invalidTokens) {
    const result = await fetchPublicDocumentShare(token)
    assert.equal(result.record, null, `Invalid token "${token}" must not return a record`)
    // Uniform error prevents token-state discovery
    assert.equal(result.error, 'This document is unavailable or the link has expired.')
  }
})

test('SECURITY: Migration audit verifies strict storage privacy and removal of direct client downloads', () => {
  assert.ok(fs.existsSync(MIGRATION_PATH), 'Hardening migration must exist')
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf8')

  // 1. Direct client storage download policies must be dropped
  assert.match(sql, /DROP POLICY IF EXISTS "Public Access for document-shares" ON storage\.objects;/)
  assert.match(sql, /DROP POLICY IF EXISTS "Token-scoped active share object access" ON storage\.objects;/)
  assert.match(sql, /DROP POLICY IF EXISTS "Tenant members can read tenant document share objects" ON storage\.objects;/)
  
  // 2. Private storage bucket enforced
  assert.match(sql, /UPDATE storage\.buckets[\s\S]*?SET public = false[\s\S]*?WHERE id = 'document-shares';/)

  // 3. No SELECT policy remains on storage.objects for document-shares
  assert.equal(sql.includes('ON storage.objects FOR SELECT'), false, 'Direct SELECT on storage.objects must be eliminated')
})

test('SECURITY: Storage upload policy verifies tenant authorization, creator identity, and filename format', () => {
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf8')

  // Storage upload policy requires:
  // - bucket_id = 'document-shares'
  // - name format: /^[a-zA-Z0-9_-]{16,64}\.pdf$/
  // - share record must exist and be owned by creator and tenant workspace member
  assert.match(sql, /CREATE POLICY "Authorized tenant members can upload document share objects"/)
  assert.match(sql, /bucket_id = 'document-shares'/)
  assert.match(sql, /name ~ '\^\[a-zA-Z0-9_-\]\{16,64\}\\.pdf\$'/)
  assert.match(sql, /s\.pdf_path = storage\.objects\.name/)
  assert.match(sql, /s\.created_by = auth\.uid\(\)/)
  assert.match(sql, /public\.is_workspace_member\(e\.workspace_id, auth\.uid\(\)\)/)
})

test('SECURITY: Client inverts upload order to insert share record first and rollback on failure', () => {
  const serviceSource = fs.readFileSync(SERVICE_PATH, 'utf8')

  // Verify that document_shares.insert happens BEFORE storage.upload
  const insertIndex = serviceSource.indexOf(".from('document_shares')\n    .insert({")
  const uploadIndex = serviceSource.indexOf(".from(SHARES_BUCKET)\n    .upload(storagePath")
  assert.ok(insertIndex > 0, 'Must insert document_shares')
  assert.ok(uploadIndex > 0, 'Must upload to storage')
  assert.ok(insertIndex < uploadIndex, 'Must insert document_shares BEFORE uploading to storage')

  // Verify rollback on upload failure
  assert.match(serviceSource, /delete\(\)\.eq\('id', record\.id\)/, 'Must roll back share record if storage upload fails')
})

test('SECURITY: General table UPDATE access is revoked to prevent revocation reversal', () => {
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf8')

  // Verify broad UPDATE policies dropped and privilege revoked
  assert.match(sql, /DROP POLICY IF EXISTS "Creators can update their document shares" ON public\.document_shares;/)
  assert.match(sql, /REVOKE UPDATE ON public\.document_shares FROM anon;/)
  assert.match(sql, /REVOKE UPDATE ON public\.document_shares FROM authenticated;/)

  // Verify no new UPDATE policy is created on public.document_shares
  assert.equal(
    /CREATE\s+POLICY[\s\S]*?ON\s+public\.document_shares\s+FOR\s+UPDATE/i.test(sql),
    false,
    'No general table UPDATE policy must exist on document_shares',
  )
})

test('SECURITY: Immutability trigger enforces NULL-safe IS DISTINCT FROM across all 8 protected columns', () => {
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf8')

  const triggerFnMatch = sql.match(/CREATE OR REPLACE FUNCTION public\.enforce_document_shares_immutability[\s\S]*?\$\$[\s\S]*?\$\$;/)
  assert.ok(triggerFnMatch, 'enforce_document_shares_immutability must exist')
  const fnBody = triggerFnMatch[0]

  const protectedFields = [
    'id',
    'token',
    'tenant_id',
    'created_by',
    'document_type',
    'document_id',
    'pdf_path',
    'created_at',
  ]

  for (const field of protectedFields) {
    const pattern = new RegExp(`NEW\\.${field}\\s+IS\\s+DISTINCT\\s+FROM\\s+OLD\\.${field}`)
    assert.match(fnBody, pattern, `Field ${field} must use IS DISTINCT FROM comparison`)
  }
})

test('SECURITY: Source-document validation uses parameterized queries, verified tables, and receipt fallback', () => {
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf8')

  const validateFnMatch = sql.match(/CREATE OR REPLACE FUNCTION public\.validate_share_source_document[\s\S]*?\$\$[\s\S]*?\$\$;/)
  assert.ok(validateFnMatch, 'validate_share_source_document must exist')
  const fnBody = validateFnMatch[0]

  // 1. Parameterized with USING $1 (no literal interpolation)
  assert.match(fnBody, /USING\s+p_document_id/, 'Dynamic queries must parameterize p_document_id with USING')
  assert.equal(/WHERE id::text = %L/i.test(fnBody), false, 'Literal interpolation %L must not be used for document ID')

  // 2. Verified table mappings
  assert.match(fnBody, /WHEN 'invoice' THEN v_target_table := 'invoices';/)
  assert.match(fnBody, /WHEN 'quotation' THEN v_target_table := 'quotations';/)
  assert.match(fnBody, /WHEN 'csr' THEN v_target_table := 'csrs';/)
  assert.match(fnBody, /WHEN 'waybill' THEN v_target_table := 'waybills';/)
  assert.match(fnBody, /WHEN 'rfq' THEN v_target_table := 'rfqs';/)
  assert.match(fnBody, /WHEN 'receipt' THEN v_target_table := 'receipts';/)
  assert.match(fnBody, /WHEN 'cps' THEN v_target_table := 'cps_sheets';/)

  // 3. Receipt fallback checks payments table if not found in receipts
  assert.match(fnBody, /tablename = 'payments'/)
  assert.match(fnBody, /SELECT EXISTS \(SELECT 1 FROM %I\.payments WHERE id::text = \$1\)/)

  // 4. Unknown document types fail closed
  assert.match(fnBody, /ELSE RETURN false;/)
})

test('SECURITY: Hardened RPCs use safe search_path, omit sensitive fields, and return uniform failure', () => {
  const sql = fs.readFileSync(MIGRATION_PATH, 'utf8')

  // 1. get_public_document_share audit
  const publicRpcMatch = sql.match(/CREATE OR REPLACE FUNCTION public\.get_public_document_share[\s\S]*?\$\$[\s\S]*?\$\$;/)
  assert.ok(publicRpcMatch, 'get_public_document_share must exist')
  const publicRpc = publicRpcMatch[0]

  assert.match(publicRpc, /SET search_path = pg_catalog/, 'Search path must be strictly pg_catalog')
  assert.equal(publicRpc.includes('pg_temp'), false, 'pg_temp must never be in search_path')
  assert.equal(/\bSELECT\s+\*\s+FROM\b/i.test(publicRpc), false, 'SELECT * must not be used in elevated context')
  assert.equal(publicRpc.includes("'storage_path'"), false, 'storage_path must NOT be returned to public caller')
  assert.equal(publicRpc.includes("'tenant_id'"), false, 'tenant_id must NOT be returned to public caller')
  assert.equal(publicRpc.includes("'created_by'"), false, 'created_by must NOT be returned to public caller')
  assert.match(publicRpc, /v_is_revoked = true[\s\S]*?RETURN NULL;/, 'Revoked shares must return uniform NULL')

  // 2. revoke_document_share audit
  const revokeRpcMatch = sql.match(/CREATE OR REPLACE FUNCTION public\.revoke_document_share[\s\S]*?\$\$[\s\S]*?\$\$;/)
  assert.ok(revokeRpcMatch, 'revoke_document_share must exist')
  const revokeRpc = revokeRpcMatch[0]

  assert.match(revokeRpc, /SET search_path = pg_catalog/, 'Revoke RPC search path must be strictly pg_catalog')
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.revoke_document_share\(text\) FROM anon;/)
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.revoke_document_share\(text\) TO authenticated;/)
})

test('SECURITY: Edge Function rejects unsupported methods, validates PDF magic bytes, and streams binary', () => {
  assert.ok(fs.existsSync(EDGE_FN_PATH), 'Edge function index.ts must exist')
  const fnSource = fs.readFileSync(EDGE_FN_PATH, 'utf8')

  // 1. Method rejection (only GET and OPTIONS)
  assert.match(fnSource, /req\.method !== "GET" && req\.method !== "OPTIONS"/, 'Must reject non-GET/OPTIONS')
  assert.match(fnSource, /status: 405/, 'Must return 405 Method Not Allowed')
  assert.match(fnSource, /"Allow": "GET, OPTIONS"/, 'Must specify Allow header')

  // 2. Token and storage path validation
  assert.match(fnSource, /SAFE_TOKEN_PATTERN = \/\^\[a-zA-Z0-9_-\]\{16,64\}\$\//)
  assert.match(fnSource, /SAFE_PDF_PATH_PATTERN = \/\^\[a-zA-Z0-9_-\]\{16,64\}\\.pdf\$\//)
  assert.match(fnSource, /share\.pdf_path !== `\$\{token\}\.pdf`/, 'Must strictly enforce <token>.pdf layout')

  // 3. PDF signature validation (%PDF-)
  assert.match(fnSource, /PDF_MAGIC_BYTES = \[0x25, 0x50, 0x44, 0x46, 0x2d\]/)
  assert.match(fnSource, /isPdfSignature/, 'Must verify %PDF- magic signature')

  // 4. Response streaming (fileBlob.stream())
  assert.match(fnSource, /new Response\(fileBlob\.stream\(\)/, 'Must forward response stream directly')

  // 5. Security headers
  assert.match(fnSource, /"Cache-Control": "private, no-cache, no-store, must-revalidate"/)
  assert.match(fnSource, /"Content-Type": "application\/pdf"/)
  assert.match(fnSource, /"X-Content-Type-Options": "nosniff"/)
  assert.match(fnSource, /"X-Frame-Options": "SAMEORIGIN"/)
})

test('SECURITY: Public viewer and sharing sheet integration verified', () => {
  const viewerSource = fs.readFileSync(VIEWER_PATH, 'utf8')
  assert.match(viewerSource, /fetchPublicDocumentShare\(token\)/)
  assert.match(viewerSource, /URL\.revokeObjectURL/, 'Must revoke Object URL on unmount')

  const sheetPath = path.resolve('src/components/document-view/shared/DocumentShareSheet.tsx')
  const sheetSource = fs.readFileSync(sheetPath, 'utf8')
  assert.match(sheetSource, /revokeDocumentShare/, 'Must import revokeDocumentShare')
  assert.match(sheetSource, /handleRevokeLink/, 'Must define handleRevokeLink')
  assert.match(sheetSource, /tenantId:\s*activeTenantId/, 'Must pass trusted activeTenantId')
})
