import React, { useState, useEffect } from 'react'
import {
  Link as LinkIcon,
  Copy,
  ExternalLink,
  Mail,
  Send,
  Check,
  Eye,
  FileText,
  AlertCircle,
  Download,
  ShieldAlert,
  Loader2,
} from 'lucide-react'
import DocumentSheet from '@/components/document-view/shared/DocumentSheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { feedback } from '@/lib/feedback'
import { EntityContext } from '@/lib/tenant/entityContext'
import {
  createOrGetDocumentShare,
  revokeDocumentShare,
  shareViaWhatsApp,
  shareViaEmail,
  shareViaEmailClientFallback,
} from '@/domain/documentShare/documentShareService'
import type { DocumentSharePayload } from '@/domain/documentShare/types'
import { DocumentEmailTemplate } from '@/components/email/DocumentEmailTemplate'
import { copyToClipboard } from '@/lib/clipboard'
import {
  buildDefaultEmailSubject,
  buildDefaultEmailMessage,
} from '@/domain/documentShare/documentEmailHtml'

// WhatsApp custom icon
function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.888 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  )
}

interface DocumentShareSheetProps {
  open: boolean
  onClose: () => void
  payload: DocumentSharePayload
}

export default function DocumentShareSheet({
  open,
  onClose,
  payload,
}: DocumentShareSheetProps) {
  const entityContext = React.useContext(EntityContext)
  const activeTenantId = payload.tenantId || entityContext?.entity?.id || undefined

  const [activeTab, setActiveTab] = useState<'channels' | 'email' | 'preview'>('channels')
  const [loading, setLoading] = useState(false)
  const [preparingShare, setPreparingShare] = useState(false)
  const [shareUrl, setShareUrl] = useState<string>('')
  const [activeToken, setActiveToken] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [clipboardError, setClipboardError] = useState(false)
  const [cachedBlob, setCachedBlob] = useState<Blob | null>(null)

  // Email form state prefilled with rich contextual metadata
  const [recipientEmail, setRecipientEmail] = useState(payload.recipientEmail || '')
  const [subject, setSubject] = useState(() => buildDefaultEmailSubject(payload))
  const [message, setMessage] = useState(() => buildDefaultEmailMessage(payload))

  // Unsupported desktop state for WhatsApp
  const [desktopWhatsappNotice, setDesktopWhatsappNotice] = useState(false)
  const [deliveryError, setDeliveryError] = useState<string | null>(null)
  const [isAmbiguousOutcome, setIsAmbiguousOutcome] = useState(false)
  const [operationId, setOperationId] = useState<string>(() => `op_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`)

  // Synchronize form and reset cached state when target document changes
  useEffect(() => {
    setRecipientEmail(payload.recipientEmail || '')
    setSubject(buildDefaultEmailSubject(payload))
    setMessage(buildDefaultEmailMessage(payload))
    setShareUrl('')
    setActiveToken('')
    setCachedBlob(null)
    setDeliveryError(null)
    setClipboardError(false)
    setCopied(false)
  }, [payload.documentId, payload.documentNumber, payload.documentType])

  // Reset operation ID when email composition details change intentionally
  const resetOperationId = () => {
    setOperationId(`op_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`)
    setIsAmbiguousOutcome(false)
  }

  // Ensure authoritative PDF blob is available (cached within sheet lifecycle)
  const getOrFetchBlob = async (): Promise<Blob> => {
    if (cachedBlob) return cachedBlob
    const b = await payload.getPdfBlob()
    setCachedBlob(b)
    return b
  }

  // Eagerly resolve or prepare share link in the background when sheet opens
  useEffect(() => {
    if (!open) return
    let isMounted = true

    const prepareShare = async () => {
      if (shareUrl && activeToken) return
      setPreparingShare(true)
      try {
        const res = await createOrGetDocumentShare({
          ...payload,
          tenantId: activeTenantId,
          getPdfBlob: getOrFetchBlob,
        })
        if (!isMounted) return
        setActiveToken(res.token)
        setShareUrl(res.shareUrl)
      } catch (err) {
        console.warn('[DocumentShareSheet] Background share preparation notice:', err)
      } finally {
        if (isMounted) setPreparingShare(false)
      }
    }

    void prepareShare()

    return () => {
      isMounted = false
    }
  }, [open, payload.documentId, payload.documentType, activeTenantId])

  // Handle Direct Link Generation & Synchronous Copy
  const handleGenerateLink = async () => {
    setClipboardError(false)

    // 1. If share URL is already prepared, copy immediately in direct user gesture context
    if (shareUrl) {
      const ok = await copyToClipboard(shareUrl)
      if (ok) {
        setCopied(true)
        feedback.success('Link copied', { description: 'Direct link copied to clipboard.' })
        setTimeout(() => setCopied(false), 2000)
      } else {
        setClipboardError(true)
        feedback.info('Link ready', { description: 'Select and copy the link from the input field below.' })
      }
      return
    }

    // 2. Not prepared yet: perform full creation with loading feedback
    setLoading(true)
    try {
      const res = await createOrGetDocumentShare({
        ...payload,
        tenantId: activeTenantId,
        getPdfBlob: getOrFetchBlob,
      })
      setActiveToken(res.token)
      setShareUrl(res.shareUrl)

      const ok = await copyToClipboard(res.shareUrl)
      if (ok) {
        setCopied(true)
        feedback.success('Direct link ready', { description: 'Branded public link copied to clipboard.' })
        setTimeout(() => setCopied(false), 2000)
      } else {
        setClipboardError(true)
        feedback.info('Direct link ready', {
          description: 'Direct link generated. Tap Copy or copy from the box below.',
        })
      }
    } catch (err) {
      feedback.error('Link creation failed', {
        description: err instanceof Error ? err.message : 'Could not generate direct link.',
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle Share Link Revocation
  const handleRevokeLink = async () => {
    if (!activeToken) return
    setLoading(true)
    try {
      const res = await revokeDocumentShare(activeToken)
      if (res.success) {
        setShareUrl('')
        setActiveToken('')
        setCopied(false)
        feedback.success('Link revoked', {
          description: 'Public access to this document has been revoked immediately.',
        })
      } else {
        feedback.error('Revocation failed', {
          description: res.error || 'Could not revoke share link.',
        })
      }
    } catch (err) {
      feedback.error('Revocation failed', {
        description: err instanceof Error ? err.message : 'Could not revoke share link.',
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle WhatsApp Sharing
  const handleWhatsAppShare = async () => {
    setLoading(true)
    setDesktopWhatsappNotice(false)
    try {
      const blob = await getOrFetchBlob()

      // Ensure share URL exists for prefilling
      let currentShareUrl = shareUrl
      if (!currentShareUrl) {
        try {
          const res = await createOrGetDocumentShare({
            ...payload,
            tenantId: activeTenantId,
            getPdfBlob: () => Promise.resolve(blob),
          })
          currentShareUrl = res.shareUrl
          setActiveToken(res.token)
          setShareUrl(currentShareUrl)
        } catch {
          // Non-fatal; continue with document details
        }
      }

      const result = await shareViaWhatsApp({
        pdfBlob: blob,
        fileName: payload.fileName,
        title: payload.documentTitle || payload.documentType,
        documentNumber: payload.documentNumber,
        shareUrl: currentShareUrl,
      })

      if (result.success) {
        feedback.success('Shared', { description: 'Opening WhatsApp share...' })
      } else {
        if (result.method === 'unsupported-desktop') {
          setDesktopWhatsappNotice(true)
        } else if (result.error && result.error !== 'Share was cancelled.') {
          feedback.error('Share failed', { description: result.error })
        }
      }
    } catch (err) {
      feedback.error('Preparation failed', {
        description: err instanceof Error ? err.message : 'Could not prepare PDF for WhatsApp.',
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle Email Channel Click
  const handleOpenEmailComposer = async () => {
    setActiveTab('email')
    // Background-generate share URL if not already done
    if (!shareUrl && !loading) {
      try {
        const res = await createOrGetDocumentShare({
          ...payload,
          tenantId: activeTenantId,
          getPdfBlob: getOrFetchBlob,
        })
        setActiveToken(res.token)
        setShareUrl(res.shareUrl)
      } catch {
        // Non-blocking
      }
    }
  }

  // Handle Email Sending via Direct Resend Delivery (with Client Fallback)
  const handleSendEmail = async () => {
    if (!recipientEmail || !recipientEmail.trim()) {
      feedback.warning('Recipient required', {
        description: 'Please enter a recipient email address to send this document.',
      })
      return
    }

    setLoading(true)
    setDeliveryError(null)
    try {
      const blob = await getOrFetchBlob()

      let currentShareUrl = shareUrl
      let currentToken = activeToken
      if (!currentShareUrl || !currentToken) {
        try {
          const res = await createOrGetDocumentShare({
            ...payload,
            tenantId: activeTenantId,
            getPdfBlob: () => Promise.resolve(blob),
          })
          currentShareUrl = res.shareUrl
          currentToken = res.token
          setActiveToken(res.token)
          setShareUrl(currentShareUrl)
        } catch {
          currentShareUrl = 'https://bouxre.com'
        }
      }

      const result = await shareViaEmail({
        pdfBlob: blob,
        fileName: payload.fileName,
        title: payload.documentTitle || payload.documentType,
        documentNumber: payload.documentNumber,
        shareUrl: currentShareUrl,
        shareToken: currentToken,
        recipientEmail: recipientEmail.trim(),
        subject,
        message,
        operationId,
      })

      if (result.success && result.method === 'resend-edge') {
        feedback.success('Email accepted for delivery', {
          description: `Document submitted to Resend for ${recipientEmail.trim()} (Ref: ${result.messageId || 'sent'}).`,
        })
        onClose()
      } else if (result.success) {
        feedback.success('Email prepared', { description: 'Opening email client...' })
      } else {
        const errorDetail = result.error || 'Direct email delivery failed.'
        setDeliveryError(errorDetail)
        setIsAmbiguousOutcome(Boolean(result.ambiguous))
        feedback.error('Email delivery failed', {
          description: errorDetail,
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not prepare email.'
      setDeliveryError(msg)
      setIsAmbiguousOutcome(true)
      feedback.error('Email preparation failed', {
        description: msg,
      })
    } finally {
      setLoading(false)
    }
  }

  // Explicit Client Fallback (Native Share Sheet or Desktop Mailto)
  const handleClientEmailFallback = async () => {
    setLoading(true)
    try {
      const blob = await getOrFetchBlob()
      const result = await shareViaEmailClientFallback({
        pdfBlob: blob,
        fileName: payload.fileName,
        title: payload.documentTitle || payload.documentType,
        documentNumber: payload.documentNumber,
        shareUrl: shareUrl || 'https://bouxre.com',
        recipientEmail: recipientEmail.trim(),
        subject,
        message,
      })

      if (result.success) {
        feedback.success('Email app opened', { description: 'Complete sending via your email client.' })
      } else if (result.method === 'mailto-fallback' && result.mailtoUrl) {
        window.open(result.mailtoUrl, '_blank')
        feedback.info('Email client opened', {
          description: 'Recipient and message prefilled. Attach the downloaded PDF to send.',
        })
      } else if (result.error && result.error !== 'Share was cancelled.') {
        feedback.error('Fallback failed', { description: result.error })
      }
    } catch (err) {
      feedback.error('Fallback preparation failed', {
        description: err instanceof Error ? err.message : 'Could not open email client.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPdf = async () => {
    try {
      const blob = await getOrFetchBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = payload.fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      feedback.success('Downloaded', { description: `${payload.fileName} saved.` })
    } catch (err) {
      feedback.error('Download failed', {
        description: err instanceof Error ? err.message : 'Could not download PDF.',
      })
    }
  }

  return (
    <DocumentSheet
      open={open}
      title={activeTab === 'email' ? 'Compose Document Email' : activeTab === 'preview' ? 'Branded Email Preview' : 'Share Document'}
      subtitle={`${payload.documentType.toUpperCase()} ${payload.documentNumber}`}
      onClose={onClose}
    >
      <div className="space-y-4 p-4 text-bd-text">
        {/* VIEW 1: CHANNELS SELECTION */}
        {activeTab === 'channels' && (
          <div className="space-y-4">
            <p className="text-xs text-bd-text-muted">
              Share the official generated PDF through any of the three channels below.
            </p>

            <div className="space-y-2.5">
              {/* Channel 1: Direct Link */}
              <div className="rounded-xl border border-bd-border bg-bd-card-bg p-3.5 shadow-sm transition hover:border-bd-border-strong">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                      <LinkIcon size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-bd-text">Direct Link</div>
                      <div className="text-[11px] text-bd-text-muted">
                        Branded BOURXE page with live browser PDF viewer
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant={shareUrl ? 'secondary' : 'default'}
                    size="sm"
                    className="h-8 gap-1.5 text-xs font-semibold"
                    disabled={loading}
                    onClick={handleGenerateLink}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={13} className="animate-spin" /> Preparing...
                      </>
                    ) : copied ? (
                      <>
                        <Check size={14} className="text-emerald-500" /> Copied
                      </>
                    ) : shareUrl ? (
                      <>
                        <Copy size={13} /> Copy Link
                      </>
                    ) : preparingShare ? (
                      <>
                        <Loader2 size={13} className="animate-spin" /> Preparing Link...
                      </>
                    ) : (
                      'Get Link'
                    )}
                  </Button>
                </div>

                {shareUrl && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 rounded-lg border border-bd-border bg-bd-surface p-1.5">
                      <Input
                        readOnly
                        value={shareUrl}
                        onFocus={(e) => e.target.select()}
                        className="h-7 border-0 bg-transparent font-mono text-[11px] text-bd-text focus-visible:ring-0"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        title="Copy to clipboard"
                        onClick={async () => {
                          const ok = await copyToClipboard(shareUrl)
                          if (ok) {
                            setCopied(true)
                            feedback.success('Copied', { description: 'Link copied to clipboard.' })
                            setTimeout(() => setCopied(false), 2000)
                          }
                        }}
                      >
                        <Copy size={13} />
                      </Button>
                      <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs">
                          <ExternalLink size={13} />
                        </Button>
                      </a>
                    </div>
                    {clipboardError && (
                      <p className="text-[10px] text-amber-700 dark:text-amber-300">
                        Clipboard permission restricted by browser. Tap the copy icon or copy the selected text above.
                      </p>
                    )}
                    <div className="flex items-center justify-between px-0.5">
                      <span className="text-[10px] text-bd-text-muted">Active public link</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={loading}
                        className="h-6 gap-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/30"
                        onClick={handleRevokeLink}
                      >
                        <ShieldAlert size={12} /> Revoke Access
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Channel 2: WhatsApp */}
              <div className="rounded-xl border border-bd-border bg-bd-card-bg p-3.5 shadow-sm transition hover:border-bd-border-strong">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                      <WhatsAppIcon size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-bd-text">WhatsApp</div>
                      <div className="text-[11px] text-bd-text-muted">
                        Native share with authoritative PDF attached
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs font-semibold"
                    disabled={loading}
                    onClick={handleWhatsAppShare}
                  >
                    Share PDF
                  </Button>
                </div>

                {desktopWhatsappNotice && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/60 p-2.5 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <AlertCircle size={14} /> Desktop File Notice
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed">
                      Desktop browsers do not support injecting local files into WhatsApp Web. Download the PDF below to attach it, or use Direct Link:
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={handleDownloadPdf}
                      >
                        <Download size={13} /> Download PDF
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-7 text-xs"
                        onClick={handleGenerateLink}
                      >
                        <Copy size={13} /> Copy Direct Link
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Channel 3: Email */}
              <div className="rounded-xl border border-bd-border bg-bd-card-bg p-3.5 shadow-sm transition hover:border-bd-border-strong">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                      <Mail size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-bd-text">Email</div>
                      <div className="text-[11px] text-bd-text-muted">
                        Executive BOURXE email template with PDF attachment
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs font-semibold"
                    disabled={loading}
                    onClick={handleOpenEmailComposer}
                  >
                    Compose Email
                  </Button>
                </div>
              </div>
            </div>

            {/* Document metadata pill */}
            <div className="rounded-xl border border-bd-border bg-bd-surface p-3 text-[11px] text-bd-text-muted">
              <div className="flex items-center gap-1.5 font-semibold text-bd-text">
                <FileText size={13} /> Authoritative PDF Attachment
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span>{payload.fileName}</span>
                <span className="font-mono font-semibold">{payload.totalFormatted || 'Document'}</span>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: EMAIL COMPOSER */}
        {activeTab === 'email' && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab('channels')}
                className="text-xs font-semibold text-bd-text-muted hover:text-bd-text"
              >
                ← Back to channels
              </button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => setActiveTab('preview')}
              >
                <Eye size={13} /> Preview Layout
              </Button>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Recipient Email</Label>
              <Input
                type="email"
                placeholder="client@example.com"
                value={recipientEmail}
                onChange={(e) => {
                  setRecipientEmail(e.target.value)
                  resetOperationId()
                }}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Subject</Label>
              <Input
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value)
                  resetOperationId()
                }}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Personalized Message</Label>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value)
                  resetOperationId()
                }}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs text-bd-text shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {/* Attachment Badge */}
            <div className="flex items-center justify-between rounded-lg border border-bd-border bg-bd-surface p-2.5 text-xs">
              <div className="flex items-center gap-2">
                <FileText size={15} className="text-primary" />
                <span className="font-semibold text-bd-text">{payload.fileName}</span>
              </div>
              <span className="text-[11px] text-bd-text-muted">Attached</span>
            </div>

            {deliveryError && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertCircle size={14} /> {isAmbiguousOutcome ? 'Delivery Status Uncertain' : 'Direct Delivery Notice'}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed">
                  {deliveryError}
                </p>
                {isAmbiguousOutcome && (
                  <p className="mt-1 text-[10px] text-amber-800/80 dark:text-amber-300/80">
                    Retrying with the same operation identifier will not send duplicate emails if the provider already accepted the request.
                  </p>
                )}
                <div className="mt-2.5 flex items-center gap-2">
                  {isAmbiguousOutcome ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1.5 font-semibold"
                      disabled={loading}
                      onClick={handleSendEmail}
                    >
                      Retry Send (Same Operation)
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1.5 font-semibold"
                    disabled={loading}
                    onClick={handleClientEmailFallback}
                  >
                    <ExternalLink size={12} /> Open in Email App (Fallback)
                  </Button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-2 flex gap-2">
              <Button
                type="button"
                className="flex-1 gap-1.5 text-xs font-semibold"
                disabled={loading}
                onClick={handleSendEmail}
              >
                <Send size={14} /> {loading ? 'Sending...' : 'Send Email'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-xs"
                title="Download PDF"
                onClick={handleDownloadPdf}
              >
                <Download size={14} />
              </Button>
            </div>
          </div>
        )}

        {/* VIEW 3: LIVE EMAIL PREVIEW */}
        {activeTab === 'preview' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab('email')}
                className="text-xs font-semibold text-bd-text-muted hover:text-bd-text"
              >
                ← Back to editor
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-bd-border bg-white p-4 shadow-sm">
              <DocumentEmailTemplate
                documentType={payload.documentType}
                documentNumber={payload.documentNumber}
                documentTitle={payload.documentTitle}
                issuerName={payload.issuerName}
                recipientName={payload.recipientName}
                totalFormatted={payload.totalFormatted}
                issueDate={payload.issueDate}
                dueDate={payload.dueDate}
                validUntil={payload.validUntil}
                shareUrl={shareUrl || 'https://bouxre.com'}
                message={message}
                fileName={payload.fileName}
              />
            </div>
          </div>
        )}
      </div>
    </DocumentSheet>
  )
}
