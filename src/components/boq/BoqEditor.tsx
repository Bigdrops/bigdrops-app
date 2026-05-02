import React, { useState } from 'react'
import { Eye, EyeOff, Loader2, Save, X } from 'lucide-react'

import type { Boq } from '@/domain/boq/types'
import { BoqForm } from './BoqForm'
import { BoqPreview } from './BoqPreview'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function BoqEditor({
  initialBoq,
  onSave,
  onCancel,
  saving = false,
}: {
  initialBoq: Boq
  onSave: (boq: Boq) => Promise<void>
  onCancel?: () => void
  saving?: boolean
}) {
  const [boq, setBoq] = useState<Boq>(initialBoq)
  const [showPreview, setShowPreview] = useState(false)

  return (
    <div className="flex flex-col min-h-screen bg-[hsl(var(--bd-surface-muted))]">
      <header className="sticky top-0 z-20 bg-[hsl(var(--bd-surface))]/80 backdrop-blur-md border-b border-[hsl(var(--bd-border))]/50 px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button variant="ghost" size="icon" onClick={onCancel} className="h-9 w-9 rounded-xl">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowPreview((current) => !current)} className="h-9 gap-1.5 text-xs font-bold uppercase tracking-wider">
            {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </Button>
          <Button onClick={() => onSave(boq)} disabled={saving} size="sm" className="h-9 gap-1.5 bg-[hsl(var(--bd-button-primary-bg))] hover:bg-[hsl(var(--bd-button-primary-bg))]/90 text-[hsl(var(--bd-button-primary-text))] font-bold uppercase tracking-wider shadow-sm transition-all active:scale-[0.98]">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save BOQ
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row h-[calc(100vh-64px)] overflow-hidden">
        <div className={cn('flex-1 overflow-y-auto px-4 py-8 md:px-8', showPreview ? 'hidden md:block md:w-1/2' : 'w-full')}>
          <div className="max-w-xl mx-auto pb-24">
            <BoqForm boq={boq} onChange={(patch) => setBoq((current) => ({ ...current, ...patch }))} />
          </div>
        </div>
        <div className={cn('flex-1 overflow-y-auto bg-[hsl(var(--bd-surface-muted))] p-4 md:p-8 flex items-start justify-center', showPreview ? 'block md:w-1/2' : 'hidden')}>
          <div className="w-full max-w-sm sticky top-0 animate-in fade-in zoom-in-95 duration-300">
            <BoqPreview boq={boq} />
          </div>
        </div>
      </main>
    </div>
  )
}
