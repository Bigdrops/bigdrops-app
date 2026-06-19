import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ChevronRight,
  Eye,
  EyeOff,
  ImageOff,
  PenLine,
  Search,
  Signature as SignatureIcon,
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
import { supabase } from '@/supabase'
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

const emptySignature: SignatureEvidence = {
  image_url: '',
  drawn_data_url: '',
  present: null,
  confidence: '',
  description: '',
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

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      const { data } = await supabase
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
  }, [open])

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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or role…"
              className="w-full rounded-[var(--bd-radius-md)] border border-border bg-card pl-9 pr-3 py-2 text-sm outline-none focus:border-[var(--bd-indigo-border)] focus:ring-2 focus:ring-[var(--bd-indigo-bg)]"
            />
          </div>
        </div>

        <div className="mt-3 space-y-2 pb-4 max-h-[55vh] overflow-y-auto">
          {loading && (
            <p className="text-[13px] text-muted-foreground text-center py-6">Loading…</p>
          )}
          {!loading && filtered.length === 0 && (
            <p className="text-[13px] text-muted-foreground text-center py-6">
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
              className="w-full rounded-[var(--bd-radius-md)] border border-border bg-card p-3 text-left transition hover:bg-muted/40"
            >
              <div className="flex items-center gap-3">
                {sig.signature_url ? (
                  <img
                    src={sig.signature_url}
                    alt={sig.name ?? 'Signatory'}
                    className="h-10 w-16 rounded-[var(--bd-radius-md)] border border-border object-contain bg-[var(--bd-surface)]"
                  />
                ) : (
                  <div className="flex h-10 w-16 items-center justify-center rounded-[var(--bd-radius-md)] border border-border bg-muted">
                    <UserSearch className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold truncate">{sig.name || 'Unnamed'}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{sig.role || 'No role'}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0" />
              </div>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Inline draw pad (mouse + touch)                                           */
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

  return (
    <div className="rounded-[var(--bd-radius-md)] border border-dashed border-[var(--bd-border)] bg-[var(--bd-surface)] p-3 space-y-2">
      <canvas
        ref={canvasRef}
        className="block w-full h-[140px] rounded-[var(--bd-radius-md)] border border-[var(--bd-border)] bg-[var(--bd-surface)] touch-none"
        onMouseDown={(e) => start(e.nativeEvent.offsetX, e.nativeEvent.offsetY)}
        onMouseMove={(e) => move(e.nativeEvent.offsetX, e.nativeEvent.offsetY)}
        onMouseUp={stop}
        onMouseLeave={stop}
        onTouchStart={(e) => {
          e.preventDefault()
          e.stopPropagation()
          const t = e.touches[0]
          const p = pos(t.clientX, t.clientY)
          start(p.x, p.y)
        }}
        onTouchMove={(e) => {
          e.preventDefault()
          e.stopPropagation()
          const t = e.touches[0]
          const p = pos(t.clientX, t.clientY)
          move(p.x, p.y)
        }}
        onTouchEnd={(e) => {
          e.preventDefault()
          e.stopPropagation()
          stop()
        }}
      />
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
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

function SignatureCard({
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
  const [showDraw, setShowDraw] = useState(false)
  const [pickOpen, setPickOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [shown, setShown] = useState(true)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const previewUrl = value?.image_url || value?.drawn_data_url || ''
  const hasEvidence = !!(value?.image_url || value?.drawn_data_url)

  const handleUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
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

  const clear = () => onChange({ ...value, image_url: '', drawn_data_url: '', present: false })

  return (
    <div className="rounded-[var(--bd-radius-lg)] border border-[var(--bd-border)] bg-[var(--bd-surface)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--bd-border)]">
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] font-semibold text-[var(--bd-text)]">{title}</span>
          {hasEvidence ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--bd-emerald-bg)] text-[var(--bd-emerald)] border border-[var(--bd-emerald-border)] text-[10px] font-semibold uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--bd-emerald)]" />
              Captured
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--bd-bg2)] text-[var(--bd-text-muted)] border border-[var(--bd-border)] text-[10px] font-semibold uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--bd-text3)]" />
              Empty
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--bd-radius-md)] text-[11px] font-semibold border transition ${
            shown
              ? 'border-[var(--bd-indigo-border)] bg-[var(--bd-indigo-bg)] text-[var(--bd-indigo)]'
              : 'border-[var(--bd-border)] bg-[var(--bd-surface)] text-[var(--bd-text-muted)] hover:bg-[var(--bd-bg2)]'
          }`}
          title={shown ? 'Hide' : 'Show'}
        >
          {shown ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          {shown ? 'Shown' : 'Hidden'}
        </button>
      </div>

      {shown && (
        <div className="p-4 space-y-3">
          {hasEvidence ? (
            <div className="relative rounded-[var(--bd-radius-md)] border border-[var(--bd-border)] bg-[var(--bd-surface)] p-1.5">
              <img
                src={previewUrl}
                alt={`${title} signature`}
                className="h-24 w-full object-contain rounded-[var(--bd-radius-md)]"
              />
              <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--bd-text)]/70 text-[var(--bd-button-primary-text)] text-[10px] font-medium">
                <span className="w-1 h-1 rounded-full bg-[var(--bd-emerald)]" />
                Stored
              </span>
            </div>
          ) : (
            <div className="rounded-[var(--bd-radius-md)] border border-dashed border-[var(--bd-border)] bg-[var(--bd-surface)] p-5 text-center">
              <ImageOff className="h-5 w-5 mx-auto text-[var(--bd-text3)] mb-1" />
              <p className="text-xs text-[var(--bd-text-muted)]">No signature captured yet</p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[var(--bd-radius-md)] border border-[var(--bd-border)] bg-[var(--bd-surface)] text-[13px] font-semibold text-[var(--bd-text)] hover:bg-[var(--bd-bg2)] transition disabled:opacity-50"
            >
              <Upload className="h-3.5 w-3.5" />
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

            <button
              type="button"
              onClick={() => setShowDraw((v) => !v)}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[var(--bd-radius-md)] border border-[var(--bd-border)] bg-[var(--bd-surface)] text-[13px] font-semibold text-[var(--bd-text)] hover:bg-[var(--bd-bg2)] transition"
            >
              <PenLine className="h-3.5 w-3.5" />
              {showDraw ? 'Hide pad' : 'Draw'}
            </button>

            {showPickButton && (
              <button
                type="button"
                onClick={() => setPickOpen(true)}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[var(--bd-radius-md)] border border-[var(--bd-indigo-border)] bg-[var(--bd-indigo-bg)] text-[13px] font-semibold text-[var(--bd-indigo)] transition"
              >
                <UserSearch className="h-3.5 w-3.5" />
                Pick
              </button>
            )}

            {hasEvidence && (
              <button
                type="button"
                onClick={clear}
                className="ml-auto inline-flex items-center justify-center h-9 w-9 rounded-[var(--bd-radius-md)] text-[var(--bd-rose)] hover:bg-[var(--bd-rose-bg)] transition"
                title="Clear"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          {showDraw && (
            <DrawPad
              onCancel={() => setShowDraw(false)}
              onSave={(url) => {
                onChange({ ...value, drawn_data_url: url, image_url: '', present: true })
                setShowDraw(false)
              }}
            />
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
              }}
            />
          )}
        </div>
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

  const senderFilled = !!(sender.image_url || sender.drawn_data_url)
  const receiverFilled = !!(receiver.image_url || receiver.drawn_data_url)
  const totalCaptured = (senderFilled ? 1 : 0) + (receiverFilled ? 1 : 0)

  return (
    <section className="rounded-[var(--bd-radius-lg)] border border-[var(--bd-border)] bg-[var(--bd-surface)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--bd-border)] bg-[var(--bd-surface)]">
        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--bd-emerald-bg)] text-[var(--bd-emerald)] text-[11px] font-bold uppercase tracking-wider">
            <SignatureIcon className="h-3.5 w-3.5" />
            Signatures
          </div>
          <span className="text-xs text-[var(--bd-text-muted)]">
            {totalCaptured} of 2 captured
          </span>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <SignatureCard
          title="Delivered By"
          role="sender"
          value={sender}
          onChange={setSender}
          showPickButton
        />
        <SignatureCard
          title="Collected By"
          role="receiver"
          value={receiver}
          onChange={setReceiver}
        />
      </div>
    </section>
  )
}
