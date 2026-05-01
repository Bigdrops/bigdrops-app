import * as React from 'react'
import { useRef, useState, useEffect } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { feedback } from '@/lib/feedback'
import { supabase } from '@/supabase'
import { SignatureRole, normalizeSignatureEvidence } from './waybillUtils'

function Field({ label, help, required, children }: { label: string; help?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-foreground">
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </Label>
      {children}
      {help ? <div className="text-xs text-muted-foreground">{help}</div> : null}
    </div>
  )
}

export function WaybillSignatureField({
  role,
  label,
  value,
  onChange,
}: {
  role: SignatureRole
  label: string
  value: ReturnType<typeof normalizeSignatureEvidence>
  onChange: (next: ReturnType<typeof normalizeSignatureEvidence>) => void
}) {
  const [showDraw, setShowDraw] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!showDraw || !canvasRef.current) return
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    if (!context) return
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.lineWidth = 2
    context.lineCap = 'round'
    context.strokeStyle = '#0f172a'
  }, [showDraw])

  const start = (x: number, y: number) => {
    const context = canvasRef.current?.getContext('2d')
    if (!context) return
    drawingRef.current = true
    context.beginPath()
    context.moveTo(x, y)
  }

  const move = (x: number, y: number) => {
    if (!drawingRef.current) return
    const context = canvasRef.current?.getContext('2d')
    if (!context) return
    context.lineTo(x, y)
    context.stroke()
  }

  const stop = () => {
    drawingRef.current = false
  }

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${role}_sig_${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('signatures').upload(path, file, { upsert: true })
    if (error) {
      feedback.error('Upload failed', { description: `Upload failed: ${error.message}` })
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from('signatures').getPublicUrl(path)
    onChange({ ...value, image_url: data.publicUrl, present: true })
    setUploading(false)
    event.target.value = ''
  }

  const saveDrawing = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    onChange({ ...value, drawn_data_url: canvas.toDataURL('image/png'), present: true })
    setShowDraw(false)
  }

  const previewUrl = value.image_url || value.drawn_data_url

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
      <div className="text-sm font-semibold text-foreground">{label}</div>
      <div className="flex flex-wrap items-center gap-3">
        {previewUrl ? <img src={previewUrl} alt={`${role} signature`} className="h-20 rounded-xl border border-border bg-white object-contain" /> : null}
        <Button type="button" variant="outline" className="rounded-xl" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" />
          {uploading ? 'Uploading…' : 'Upload'}
        </Button>
        <Button type="button" variant="outline" className="rounded-xl" onClick={() => setShowDraw(true)}>
          Draw
        </Button>
        {previewUrl ? (
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => onChange({ ...value, image_url: '', drawn_data_url: '', present: false })}>
            Clear
          </Button>
        ) : null}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Signature Status">
          <Select
            value={value.present === true ? 'present' : value.present === false ? 'missing' : 'unknown'}
            onValueChange={(next) => onChange({ ...value, present: next === 'unknown' ? null : next === 'present' })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unknown">Unknown</SelectItem>
              <SelectItem value="present">Present</SelectItem>
              <SelectItem value="missing">Missing / pending</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label="Confidence">
          <Select value={value.confidence || 'unspecified'} onValueChange={(next) => onChange({ ...value, confidence: next === 'unspecified' ? '' : next })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unspecified">Unspecified</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label="Evidence Description">
          <Input value={value.description || ''} onChange={(event) => onChange({ ...value, description: event.target.value })} placeholder="Signature note" />
        </Field>
      </div>

      {showDraw ? (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <canvas
            ref={canvasRef}
            width={500}
            height={180}
            className="w-full rounded-xl border border-border bg-white"
            onMouseDown={(event) => start(event.nativeEvent.offsetX, event.nativeEvent.offsetY)}
            onMouseMove={(event) => move(event.nativeEvent.offsetX, event.nativeEvent.offsetY)}
            onMouseUp={stop}
            onMouseLeave={stop}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setShowDraw(false)}>
              Cancel
            </Button>
            <Button type="button" className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700" onClick={saveDrawing}>
              Save Drawing
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
