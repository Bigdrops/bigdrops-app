import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('send-document-email Edge Function exists and enforces strict HTTP method and CORS security', () => {
  const edgeFunctionPath = path.resolve('supabase/functions/send-document-email/index.ts')
  assert.ok(fs.existsSync(edgeFunctionPath), 'send-document-email Edge Function file must exist')
  const source = fs.readFileSync(edgeFunctionPath, 'utf8')

  assert.match(source, /req\.method !== "POST" && req\.method !== "OPTIONS"/, 'Must reject non-POST/OPTIONS methods')
  assert.match(source, /status:\s*405/, 'Must return 405 Method Not Allowed')
  assert.match(source, /req\.method === "OPTIONS"/, 'Must handle preflight CORS')
  assert.match(source, /Access-Control-Allow-Origin/, 'Must declare CORS headers')
})

test('send-document-email Edge Function enforces caller JWT authentication', () => {
  const source = fs.readFileSync(path.resolve('supabase/functions/send-document-email/index.ts'), 'utf8')

  assert.match(source, /authHeader\.startsWith\("Bearer "\)/, 'Must require Bearer authorization header')
  assert.match(source, /adminClient\.auth\.getUser\(jwt\)/, 'Must authenticate caller via Supabase auth.getUser')
  assert.match(source, /status:\s*401/, 'Must return 401 Unauthorized for invalid JWT')
})

test('send-document-email Edge Function enforces strict input validation and CRLF injection protection', () => {
  const source = fs.readFileSync(path.resolve('supabase/functions/send-document-email/index.ts'), 'utf8')

  assert.match(source, /SAFE_TOKEN_PATTERN\.test\(token\)/, 'Must validate token against safe pattern')
  assert.match(source, /EMAIL_REGEX\.test\(recipientEmail\)/, 'Must validate recipient email structure')
  assert.match(source, /\/\[\\r\\n\]\/\.test\(subject\)/, 'Must reject CRLF linebreaks in subject to prevent email header injection')
  assert.match(source, /escapeHtml/, 'Must HTML-escape user-provided message content')
})

test('send-document-email Edge Function validates share revocation, expiry, and tenant authorization', () => {
  const source = fs.readFileSync(path.resolve('supabase/functions/send-document-email/index.ts'), 'utf8')

  assert.match(source, /share\.is_revoked/, 'Must check revoked state')
  assert.match(source, /new Date\(share\.expires_at\)\.getTime\(\) <= Date\.now\(\)/, 'Must check expiry time')
  assert.match(source, /is_workspace_member/, 'Must verify caller workspace membership for the tenant')
  assert.match(source, /status:\s*403/, 'Must return 403 Forbidden for unauthorized senders')
  assert.match(source, /status:\s*410/, 'Must return 410 for revoked/expired shares')
})

test('send-document-email Edge Function validates storage path, PDF magic bytes, and attachment size', () => {
  const source = fs.readFileSync(path.resolve('supabase/functions/send-document-email/index.ts'), 'utf8')

  assert.match(source, /share\.pdf_path !== `\$\{token\}\.pdf`/, 'Must strictly derive storage path from database token')
  assert.match(source, /from\(["']document-shares["']\)[\s\S]*?\.download\(/, 'Must download from private document-shares bucket')
  assert.match(source, /PDF_MAGIC_BYTES/, 'Must verify standard %PDF- magic bytes')
  assert.match(source, /fileBlob\.size > MAX_ATTACHMENT_BYTES/, 'Must enforce 10MB maximum attachment limit')
  assert.match(source, /status:\s*413/, 'Must return 413 Payload Too Large when attachment exceeds limit')
})

test('send-document-email Edge Function configures Resend with attachments and BOURXE executive template', () => {
  const source = fs.readFileSync(path.resolve('supabase/functions/send-document-email/index.ts'), 'utf8')

  assert.match(source, /RESEND_API_KEY/, 'Must use RESEND_API_KEY from Edge Function secrets')
  assert.match(source, /DOCUMENT_EMAIL_FROM/, 'Must support configurable verified sender')
  assert.match(source, /uint8ArrayToBase64/, 'Must convert PDF binary to Base64 for Resend attachment')
  assert.match(source, /buildDocumentEmailHtml/, 'Must build BOURXE branded executive HTML')
  assert.match(source, /View Document Online/, 'Must include secure public viewer link in email HTML')
})

test('documentShareService wires direct Resend delivery with client fallback', () => {
  const serviceSource = fs.readFileSync(path.resolve('src/domain/documentShare/documentShareService.ts'), 'utf8')

  assert.match(serviceSource, /supabase\.functions\.invoke\(\s*'send-document-email'/, 'Must invoke send-document-email Edge Function')
  assert.match(serviceSource, /method:\s*'resend-edge'/, 'Must return resend-edge method upon success')
  assert.match(serviceSource, /shareViaEmailClientFallback/, 'Must export shareViaEmailClientFallback for explicit fallback')
  assert.match(serviceSource, /mailtoUrl/, 'Must provide mailtoUrl on error for fallback continuity')
})

test('DocumentShareSheet provides direct email sending and explicit fallback on error', () => {
  const sheetSource = fs.readFileSync(path.resolve('src/components/document-view/shared/DocumentShareSheet.tsx'), 'utf8')

  assert.match(sheetSource, /shareViaEmailClientFallback/, 'Must import client email fallback')
  assert.match(sheetSource, /deliveryError/, 'Must track delivery error state')
  assert.match(sheetSource, /handleClientEmailFallback/, 'Must provide explicit fallback handler')
  assert.match(sheetSource, /Open in Email App \(Fallback\)/, 'Must offer user fallback button when direct delivery fails')
  assert.match(sheetSource, /Send Email/, 'Must render direct Send Email button')
})
