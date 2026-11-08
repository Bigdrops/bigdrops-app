import { supabase } from '@/supabase'
import { toPublicShareUrl } from '@/lib/publicUrl'
import { isNativePlatform } from '@/lib/native/capacitor'
import { saveUserFile, blobToBase64 } from '@/lib/native/fileDownload'
import { Share } from '@capacitor/share'
import type {
  DocumentSharePayload,
  DocumentShareRecord,
  ShareActionResult,
} from './types'

const SHARES_BUCKET = 'document-shares'
const SAFE_TOKEN_PATTERN = /^[a-zA-Z0-9_-]{16,64}$/

/**
 * Generates a cryptographically strong, unguessable security token.
 * Fails closed if secure cryptographic randomness is unavailable.
 */
export function generateCryptoToken(): string {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(24) // 192 bits of entropy
      crypto.getRandomValues(bytes)
      return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    }
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID().replace(/-/g, '')
    }
  }
  throw new Error('Secure cryptographic randomness is unavailable in this environment.')
}

/**
 * Creates or retrieves a scoped public share record and uploads the authoritative PDF to Supabase storage.
 * Enforces trusted tenant_id and created_by attribution.
 */
export async function createOrGetDocumentShare(
  payload: DocumentSharePayload,
): Promise<{
  token: string
  shareUrl: string
  pdfUrl: string
  blob: Blob
  record?: DocumentShareRecord
}> {
  // 1. Generate or obtain the authoritative PDF blob first
  const blob = await payload.getPdfBlob()

  // 2. Resolve trusted authenticated creator and tenant identity
  let currentUserId: string | null = null
  try {
    const { data: authData } = await supabase.auth.getUser()
    currentUserId = authData?.user?.id || null
  } catch {
    // Non-fatal if session query fails, RLS will enforce auth.uid()
  }

  // 3. Check for an active, existing share record for this document within this tenant
  try {
    let query = supabase
      .from('document_shares')
      .select('*')
      .eq('document_type', payload.documentType)
      .eq('document_id', payload.documentId)
      .eq('is_revoked', false)

    if (payload.tenantId) {
      query = query.eq('tenant_id', payload.tenantId)
    }

    const { data: existing } = await query
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing && existing.token) {
      // Check expiry if set
      const notExpired = !existing.expires_at || new Date(existing.expires_at).getTime() > Date.now()
      if (notExpired) {
        return {
          token: existing.token,
          shareUrl: toPublicShareUrl(`/shared/${existing.token}`),
          pdfUrl: existing.pdf_url || '',
          blob,
          record: existing as DocumentShareRecord,
        }
      }
    }
  } catch (err) {
    // Non-fatal if query fails; proceed to generate a fresh share token
    console.warn('[documentShare] Could not query existing share, creating fresh one:', err)
  }

  // 4. Create fresh cryptographically secure share token & storage path
  const token = generateCryptoToken()
  const storagePath = `${token}.pdf`

  // 5. Insert record into public.document_shares FIRST to authorize storage upload
  const metadata = {
    issuerName: payload.issuerName || '',
    issuerLogoUrl: payload.issuerLogoUrl || '',
    recipientName: payload.recipientName || '',
    recipientEmail: payload.recipientEmail || '',
    issueDate: payload.issueDate || '',
    dueDate: payload.dueDate || '',
    validUntil: payload.validUntil || '',
    totalFormatted: payload.totalFormatted || '',
    fileName: payload.fileName,
    notes: payload.notes || '',
  }

  const { data: record, error: insertError } = await supabase
    .from('document_shares')
    .insert({
      token,
      document_type: payload.documentType,
      document_id: payload.documentId,
      document_number: payload.documentNumber,
      document_title: payload.documentTitle || null,
      pdf_path: storagePath,
      pdf_url: '', // Avoid public URL leakage; PDF access is gated via authenticated/token RPC
      tenant_id: payload.tenantId || null,
      created_by: currentUserId,
      metadata,
      is_revoked: false,
    })
    .select()
    .single()

  if (insertError) {
    console.error('[documentShare] Database insert failed:', insertError)
    throw new Error(`Failed to create document share record: ${insertError.message}`)
  }

  // 6. Upload PDF blob to private 'document-shares' bucket (authorized by the share record)
  const { error: uploadError } = await supabase.storage
    .from(SHARES_BUCKET)
    .upload(storagePath, blob, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (uploadError) {
    console.error('[documentShare] Storage upload failed, rolling back share record:', uploadError)
    // Roll back created share record to prevent orphaned un-backed shares
    if (record?.id) {
      await supabase.from('document_shares').delete().eq('id', record.id)
    }
    throw new Error(`Failed to upload document PDF for sharing: ${uploadError.message}`)
  }

  const shareUrl = toPublicShareUrl(`/shared/${token}`)

  return {
    token,
    shareUrl,
    pdfUrl: '',
    blob,
    record: (record as DocumentShareRecord) || undefined,
  }
}

/**
 * Revokes a document share by token.
 * Enforces server-side authorization check (creator or authorized tenant member).
 */
export async function revokeDocumentShare(token: string): Promise<{ success: boolean; error?: string }> {
  if (!token || typeof token !== 'string' || !SAFE_TOKEN_PATTERN.test(token.trim())) {
    return { success: false, error: 'Invalid document share token.' }
  }
  const sanitized = token.trim()

  try {
    // 1. Attempt secure RPC revocation
    const { data: rpcSuccess, error: rpcError } = await supabase.rpc('revoke_document_share', {
      p_token: sanitized,
    })

    if (!rpcError && typeof rpcSuccess === 'boolean') {
      if (rpcSuccess) {
        return { success: true }
      }
      return { success: false, error: 'Unauthorized to revoke this document share.' }
    }

    // 2. Fallback to direct table UPDATE under RLS if RPC is not present
    const { error: updateError } = await supabase
      .from('document_shares')
      .update({ is_revoked: true, updated_at: new Date().toISOString() })
      .eq('token', sanitized)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Could not revoke document share.',
    }
  }
}

/**
 * Fetches a public document share by token.
 * Validates revocation and expiry via hardened RPC (omits internal storage paths and token-state leakage),
 * then retrieves the PDF binary via the trusted server-side streaming endpoint.
 */
export async function fetchPublicDocumentShare(token: string): Promise<{
  record: DocumentShareRecord | null
  blob?: Blob
  error?: string
}> {
  if (!token || typeof token !== 'string' || !SAFE_TOKEN_PATTERN.test(token.trim())) {
    return { record: null, error: 'This document is unavailable or the link has expired.' }
  }
  const sanitized = token.trim()

  try {
    // 1. Attempt secure RPC retrieval (sanitized public output, uniform failure, no enumeration risk)
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_public_document_share', {
      p_token: sanitized,
    })

    let shareData: any = null

    if (!rpcError && rpcData && rpcData.available) {
      shareData = rpcData
    } else {
      // Uniform failure response prevents token-state discovery
      return {
        record: null,
        error: 'This document is unavailable or the link has expired.',
      }
    }

    // 2. Retrieve the PDF binary from the trusted server-side streaming endpoint
    // This strictly binds retrieval to token possession without exposing storage URLs
    let fileBlob: Blob | null = null
    try {
      const supabaseAny = supabase as any
      const functionsBase =
        supabaseAny.functionsUrl ||
        (supabaseAny.supabaseUrl ? `${supabaseAny.supabaseUrl}/functions/v1` : '')

      if (functionsBase) {
        const endpointUrl = `${functionsBase}/public-document-pdf?token=${encodeURIComponent(sanitized)}`
        const res = await fetch(endpointUrl)
        if (res.ok) {
          fileBlob = await res.blob()
        }
      }
    } catch (fetchErr) {
      console.warn('[documentShare] Server-side retrieval fetch error:', fetchErr)
    }

    if (!fileBlob) {
      return {
        record: null,
        error: 'This document is unavailable or access was revoked.',
      }
    }

    // 3. Construct ephemeral in-memory Blob URL for safe browser rendering
    const blobUrl = URL.createObjectURL(fileBlob)

    const finalRecord: DocumentShareRecord = {
      id: shareData.token,
      token: shareData.token,
      document_type: shareData.document_type,
      document_id: '',
      document_number: shareData.document_number,
      document_title: shareData.document_title,
      pdf_path: '', // Strictly omitted to hide internal storage structure
      pdf_url: blobUrl,
      created_at: shareData.created_at || new Date().toISOString(),
      expires_at: shareData.expires_at,
      is_revoked: false,
      metadata: shareData.metadata || {},
    }

    return { record: finalRecord, blob: fileBlob }
  } catch (err) {
    return {
      record: null,
      error: 'This document is unavailable or the link has expired.',
    }
  }
}

/**
 * Native file sharing to WhatsApp with the authoritative PDF attached.
 */
export async function shareViaWhatsApp(input: {
  pdfBlob: Blob
  fileName: string
  title: string
  documentNumber: string
  shareUrl: string
}): Promise<ShareActionResult> {
  const prefilledText = `${input.title} ${input.documentNumber}\nOfficial document link: ${input.shareUrl}`

  // 1. Native Capacitor on Android/iOS
  if (isNativePlatform()) {
    try {
      const base64Data = await blobToBase64(input.pdfBlob)
      const saved = await saveUserFile({
        fileName: input.fileName,
        base64Data,
        subdirectory: 'exports',
      })

      await Share.share({
        title: input.fileName,
        text: prefilledText,
        files: [saved.uri],
        dialogTitle: 'Share via WhatsApp',
      })

      return { success: true, method: 'native' }
    } catch (err) {
      return {
        success: false,
        method: 'error',
        error: err instanceof Error ? err.message : 'Sharing failed.',
      }
    }
  }

  // 2. Web Share API with file support (Mobile browsers & supported desktop OS)
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    typeof File !== 'undefined'
  ) {
    try {
      const file = new File([input.pdfBlob], input.fileName, { type: 'application/pdf' })
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: input.fileName,
          text: prefilledText,
          files: [file],
        })
        return { success: true, method: 'web-share-file' }
      }
    } catch (err) {
      // User cancelled or share error
      if (err instanceof Error && err.name === 'AbortError') {
        return { success: false, method: 'error', error: 'Share was cancelled.' }
      }
    }
  }

  // 3. Desktop browser without native file injection support
  return {
    success: false,
    method: 'unsupported-desktop',
    prefilledText,
  }
}

/**
 * Native file sharing to Email with the authoritative PDF attached and prefilled metadata.
 */
export async function shareViaEmail(input: {
  pdfBlob: Blob
  fileName: string
  title: string
  documentNumber: string
  shareUrl: string
  recipientEmail?: string
  subject: string
  message: string
}): Promise<ShareActionResult> {
  const fullBody = `${input.message}\n\nView document online: ${input.shareUrl}`

  // 1. Native Capacitor
  if (isNativePlatform()) {
    try {
      const base64Data = await blobToBase64(input.pdfBlob)
      const saved = await saveUserFile({
        fileName: input.fileName,
        base64Data,
        subdirectory: 'exports',
      })

      await Share.share({
        title: input.subject,
        text: fullBody,
        files: [saved.uri],
        dialogTitle: 'Send via Email',
      })

      return { success: true, method: 'native' }
    } catch (err) {
      return {
        success: false,
        method: 'error',
        error: err instanceof Error ? err.message : 'Email sharing failed.',
      }
    }
  }

  // 2. Web Share API with file support
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    typeof File !== 'undefined'
  ) {
    try {
      const file = new File([input.pdfBlob], input.fileName, { type: 'application/pdf' })
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: input.subject,
          text: fullBody,
          files: [file],
        })
        return { success: true, method: 'web-share-file' }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { success: false, method: 'error', error: 'Share was cancelled.' }
      }
    }
  }

  // 3. Desktop mailto fallback
  const mailtoUrl = `mailto:${encodeURIComponent(input.recipientEmail || '')}?subject=${encodeURIComponent(
    input.subject,
  )}&body=${encodeURIComponent(fullBody)}`

  return {
    success: false,
    method: 'mailto-fallback',
    mailtoUrl,
  }
}
