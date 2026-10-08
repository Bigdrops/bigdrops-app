import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ChevronRight,
  Eye,
  EyeOff,
  ImageOff,
  PenLine,
  Search,
  Trash2,
  Upload,
  UserSearch,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { feedback } from '@/lib/feedback'
import { processSignature, dataURItoFile } from '@/lib/processSignature'
import { IMAGE_ACCEPT_ATTRIBUTE, isSupportedImageFile, getUnsupportedImageErrorMessage } from '@/lib/documentImageUploadPolicy'
import { supabase } from '@/supabase'
import { useEntity } from '@/lib/tenant/contexts'
import type { WaybillCustomFields } from './waybillUtils'

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Signature data shape (matches waybillUtils.normalizeSignatureEvidence)    */
/* ─────────────────────────────────────────────────────────────────────────── */

type SignatureEvidence = {
  image_url?: string
  drawn_data_url?: string
  present?: boolean | null
  confidence?: string
  description?: string
}

type SignatureRole = 'sender' | 'receiver'
type CaptureMode = 'upload' | 'draw' | 'pick'

const emptySignature: SignatureEvidence = {
  image_url: '',
  drawn_data_url: '',
  present: null,
  confidence: '',
  description: '',
}

function signatureHasEvidence(signature: SignatureEvidence | undefined) {
  return Boolean(signature?.image_url || signature?.drawn_data_url)
}

export function countCapturedWaybillSignatures(signatures: WaybillCustomFields['signatures'] | undefined) {
  return (signatureHasEvidence(signatures?.sender) ? 1 : 0) + (signatureHasEvidence(signatures?.receiver) ? 1 : 0)
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Pick signatory sheet (SENDER ONLY — DB lookup of saved people)            */
/* ─────────────────────────────────────────────────────────────────────────── */

function PickSignatorySheet({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onPick: (sig: { name: string | null; role: string | null; signature_url: string | null }) => void
}) {
  const [rows, setRows] = useState<
    { id: string; name: string | null; role: string | null; signature_url: string | null }[]
  >([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const { tenantClient } = useEntity()

  useEffect(() => {
    if (!open || !tenantClient.isReady) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      const { data } = await tenantClient
        .from('signatories')
        .select('id, name, role, signature_url')
        .order('name')
      if (!cancelled) {
        setRows(data ?? [])
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, tenantClient.isReady, tenantClient.schemaName])

  const filtered = rows.filter((r) => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (r.name || '').toLowerCase().includes(q) || (r.role || '').toLowerCase().includes(q)
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[var(--bd-radius-lg)]">
        <SheetHeader className="text-left">
          <SheetTitle>Pick a signatory</SheetTitle>
          <SheetDescription>
            People who signed for you before. Tap to attach.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 px-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--bd-text-muted)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or role…"
              className="w-full rounded-[var(--bd-radius-md)] border border-[var(--bd-border)] bg-[var(--bd-surface)] pl-9 pr-3 py-2 text-sm outline-none focus:border-[var(--bd-indigo-border)] focus:ring-2 focus:ring-[var(--bd-indigo-bg)]"
            />
          </div>
        </div>

        <div className="mt-3 space-y-2 pb-4 max-h-[var(--bd-overlay-sheet-max-height)] overflow-y-auto">
          {loading && (
            <p className="text-[13px] text-[var(--bd-text-muted)] text-center py-6">Loading…</p>
          )}
          {!loading && filtered.length === 0 && (
            <p className="text-[13px] text-[var(--bd-text-muted)] text-center py-6">
              {rows.length === 0 ? 'No saved signatories yet.' : 'No matches.'}
            </p>
          )}
          {filtered.map((sig) => (
            <button
              key={sig.id}
              type="button"
              onClick={() => {
                onPick(sig)
                onOpenChange(false)
              }}
              className="w-full rounded-[var(--bd-radius-md)] border border-[var(--bd-border)] bg-[var(--bd-surface)] p-3 text-left transition hover:bg-[var(--bd-bg2)]"
            >
              <div className="flex items-center gap-3">
                {sig.signature_url ? (
                  <img
                    src={sig.signature_url}
                    alt={sig.name ?? 'Signatory'}
                    className="h-10 w-16 rounded-[var(--bd-radius-md)] border border-[var(--bd-border)] object-contain bg-[var(--bd-surface)]"
                  />
                ) : (
                  <div className="flex h-10 w-16 items-center justify-center rounded-[var(--bd-radius-md)] border border-[var(--bd-border)] bg-[var(--bd-bg2)]">
                    <UserSearch className="h-4 w-4 text-[var(--bd-text-muted)]" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold truncate">{sig.name || 'Unnamed'}</p>
                  <p className="text-[11px] text-[var(--bd-text-muted)] truncate">{sig.role || 'No role'}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--bd-text-muted)]/60 shrink-0" />
              </div>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Inline draw pad — Pointer Events (mouse, touch, pen unified)              */
/* ─────────────────────────────────────────────────────────────────────────── */

function DrawPad({
  onSave,
  onCancel,
}: {
  onSave: (dataUrl: string) => void
  onCancel: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const lastRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const fit = () => {
      const r = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = r.width * dpr
      canvas.height = r.height * dpr
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(dpr, dpr)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, r.width, r.height)
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#0F172A'
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  const pos = (clientX: number, clientY: number) => {
    const r = canvasRef.current!.getBoundingClientRect()
    return { x: clientX - r.left, y: clientY - r.top }
  }
  const start = (x: number, y: number) => {
    drawingRef.current = true
    lastRef.current = { x, y }
  }
  const move = (x: number, y: number) => {
    if (!drawingRef.current) return
    const ctx = canvasRef.current?.getContext('2d')
    const last = lastRef.current
    if (!ctx || !last) return
    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(x, y)
    ctx.stroke()
    lastRef.current = { x, y }
  }
  const stop = () => {
    drawingRef.current = false
    lastRef.current = null
  }
  const reset = () => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const r = c.getBoundingClientRect()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, r.width, r.height)
  }

  // Pointer Events unify mouse + touch + pen into a single, reliable gesture
  // model. setPointerCapture keeps delivering move/up events to this canvas
  // even if the finger drifts slightly outside its bounds mid-stroke.
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    canvasRef.current?.setPointerCapture(e.pointerId)
    const p = pos(e.clientX, e.clientY)
    start(p.x, p.y)
  }
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    e.preventDefault()
    const p = pos(e.clientX, e.clientY)
    move(p.x, p.y)
  }
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId)
    } catch {
      // pointer may already be released — safe to ignore
    }
    stop()
  }

  return (
    <div className="rounded-[var(--bd-radius-md)] border border-dashed border-[var(--bd-border)] bg-[var(--bd-surface)] p-3 space-y-2">
      <canvas
        ref={canvasRef}
        className="block w-full h-[140px] rounded-[var(--bd-radius-md)] border border-[var(--bd-border)] bg-[var(--bd-surface)] touch-none select-none"
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      <div className="flex items-center justify-between text-[11px] text-[var(--bd-text-muted)]">
        <span>Draw with mouse or finger</span>
        <div className="flex gap-1.5">
          <button type="button" onClick={reset} className="h-7 px-2.5 rounded-[var(--bd-radius-md)] text-xs font-medium text-[var(--bd-text-muted)] hover:bg-[var(--bd-bg2)]">
            Reset
          </button>
          <button type="button" onClick={onCancel} className="h-7 px-2.5 rounded-[var(--bd-radius-md)] text-xs font-medium border border-[var(--bd-border)] bg-[var(--bd-surface)] hover:bg-[var(--bd-bg2)]">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              const c = canvasRef.current
              if (!c) return
              onSave(c.toDataURL('image/png'))
            }}
            className="h-7 px-3 rounded-[var(--bd-radius-md)] text-xs font-semibold bg-[var(--bd-button-primary-bg)] text-[var(--bd-button-primary-text)]"
          >
            Save drawing
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Signature card (used for both sender and receiver)                        */
/* ─────────────────────────────────────────────────────────────────────────── */

function SignatureSurface({
  title,
  role,
  value,
  onChange,
  showPickButton,
}: {
  title: string
  role: SignatureRole
  value: SignatureEvidence
  onChange: (next: SignatureEvidence) => void
  showPickButton?: boolean
}) {
  const [captureMode, setCaptureMode] = useState<CaptureMode | null>(null)
  const [pickOpen, setPickOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [shown, setShown] = useState(true)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const previewUrl = value?.image_url || value?.drawn_data_url || ''
  const hasEvidence = signatureHasEvidence(value)
  const statusLabel = hasEvidence ? 'Captured' : 'No signature captured'

  const openMode = (mode: CaptureMode) => {
    if (mode === 'pick') {
      setPickOpen(true)
      return
    }
    if (mode === 'upload') {
      window.setTimeout(() => fileInputRef.current?.click(), 0)
      return
    }
    setCaptureMode(mode)
  }

  const handleUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!isSupportedImageFile(file)) {
      feedback.error('Unsupported file', { description: getUnsupportedImageErrorMessage(file.name) })
      event.target.value = ''
      return
    }
    setUploading(true)
    try {
      const processedDataURI = await processSignature(file)
      const processedFile = dataURItoFile(processedDataURI, `${role}_sig_${Date.now()}.png`)
      const ext = processedFile.name.split('.').pop()
      const path = `${role}_sig_${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('signatures').upload(path, processedFile, { upsert: true })
      if (error) {
        feedback.error('Upload failed', { description: error.message })
        return
      }
      const { data } = supabase.storage.from('signatures').getPublicUrl(path)
      onChange({ ...value, image_url: data.publicUrl, drawn_data_url: '', present: true })
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }, [role, value, onChange])

  const clear = () => {
    onChange({ ...value, image_url: '', drawn_data_url: '', present: false })
    setCaptureMode(null)
  }

  return (
    <div className={`bd-waybill-signature-surface${hasEvidence ? ' is-captured' : ''}`}>
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        className="bd-waybill-signature-eye"
        aria-pressed={shown}
        aria-label={shown ? `Hide ${title} signature` : `Show ${title} signature`}
      >
        {shown ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      </button>

      <div className="bd-waybill-signature-top">
        {shown && hasEvidence ? (
          <img
            src={previewUrl}
            alt={`${title} signature preview`}
            className="bd-waybill-signature-thumb"
          />
        ) : (
          <span className="bd-waybill-signature-empty" aria-hidden="true">
            <ImageOff className="h-4 w-4" />
          </span>
        )}

        <div className="bd-waybill-signature-copy">
          <h3>{title}</h3>
          <p>{statusLabel}</p>
          {value.description ? <small>{value.description}</small> : null}
        </div>
      </div>

      {shown && (
        <div className="bd-waybill-signature-actions" aria-label={`${title} signature actions`}>
          {showPickButton && (
            <button
              type="button"
              onClick={() => openMode('pick')}
              className="bd-waybill-signature-action primary"
            >
              <UserSearch className="h-3.5 w-3.5" />
              Pick
            </button>
          )}
          <button
            type="button"
            disabled={uploading}
            onClick={() => openMode('upload')}
            className="bd-waybill-signature-action"
          >
            <Upload className="h-3.5 w-3.5" />
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
          <button
            type="button"
            onClick={() => openMode('draw')}
            className="bd-waybill-signature-action"
          >
            <PenLine className="h-3.5 w-3.5" />
            Draw
          </button>
          {hasEvidence && (
            <button
              type="button"
              onClick={clear}
              className="bd-waybill-signature-action danger"
              aria-label={`Remove ${title} signature`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </button>
          )}
          <input ref={fileInputRef} type="file" accept={IMAGE_ACCEPT_ATTRIBUTE} className="hidden" onChange={handleUpload} />
        </div>
      )}

      {shown && captureMode === 'draw' && (
        <div className="bd-waybill-signature-draw">
          <DrawPad
            onCancel={() => setCaptureMode(null)}
            onSave={(url) => {
              onChange({ ...value, drawn_data_url: url, image_url: '', present: true })
              setCaptureMode(null)
            }}
          />
        </div>
      )}

      {showPickButton && (
        <PickSignatorySheet
          open={pickOpen}
          onOpenChange={setPickOpen}
          onPick={(sig) => {
            if (!sig.signature_url) {
              feedback.warning('No signature image', {
                description: `${sig.name || 'This signatory'} has no signature on file.`,
              })
              return
            }
            onChange({
              ...value,
              image_url: sig.signature_url,
              drawn_data_url: '',
              present: true,
              description: sig.name ? `Picked: ${sig.name}${sig.role ? ` · ${sig.role}` : ''}` : value.description,
            })
            setCaptureMode(null)
          }}
        />
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Signatures section                                                        */
/* ─────────────────────────────────────────────────────────────────────────── */

export function SignaturesSection({
  customFields,
  updateCustomFields,
}: {
  customFields: WaybillCustomFields
  updateCustomFields: (patch: Partial<WaybillCustomFields>) => void
}) {
  const sender = customFields.signatures?.sender ?? emptySignature
  const receiver = customFields.signatures?.receiver ?? emptySignature

  const setSender = (next: SignatureEvidence) =>
    updateCustomFields({ signatures: { ...customFields.signatures, sender: next } })
  const setReceiver = (next: SignatureEvidence) =>
    updateCustomFields({ signatures: { ...customFields.signatures, receiver: next } })

  return (
    <div className="bd-waybill-signatures">
        <SignatureSurface
          title="Delivered By"
          role="sender"
          value={sender}
          onChange={setSender}
          showPickButton
        />
        <SignatureSurface
          title="Collected By"
          role="receiver"
          value={receiver}
          onChange={setReceiver}
        />
    </div>
  )
}
