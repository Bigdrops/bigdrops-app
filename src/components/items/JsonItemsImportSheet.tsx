import { useMemo, useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

type JsonItemsImportSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportText: (text: string) => boolean
  title?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  contentClassName?: string
}

const AI_PROMPT = `Convert this into invoice items JSON.
Return JSON only.
No explanations.

{
  "items": [
    {
      "description": "",
      "quantity": 0,
      "unit": "",
      "unit_price": 0
    }
  ]
}`

export default function JsonItemsImportSheet({
  open,
  onOpenChange,
  onImportText,
  title = 'Import Items',
  side = 'bottom',
  contentClassName = '',
}: JsonItemsImportSheetProps) {
  const [tab, setTab] = useState<'upload' | 'paste'>('upload')
  const [pastedText, setPastedText] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const { toast } = useToast()

  const tip = useMemo(
    () => 'Return JSON only\n{ "items": [ { "description": "", "quantity": 1, "unit_price": 0 } ] }',
    [],
  )

  const handleClose = (nextOpen: boolean) => {
    if (nextOpen) {
      setTab('upload')
      return onOpenChange(true)
    }

    setTab('upload')
    setPastedText('')
    onOpenChange(false)
  }

  const handleImport = (text: string) => {
    if (!text.trim()) {
      alert('Paste JSON before importing.')
      return
    }

    const success = onImportText(text)
    if (!success) return

    setPastedText('')
    onOpenChange(false)
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      handleImport(String(loadEvent.target?.result || ''))
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AI_PROMPT)
      toast({ title: 'Copied', description: 'AI prompt copied to clipboard' })
    } catch {
      alert('Could not copy prompt.')
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side={side}
        className={`rounded-t-[28px] bg-white p-0 [&>[data-slot=sheet-close]]:hidden ${contentClassName}`.trim()}
      >
        <SheetHeader className="border-b border-zinc-200 px-5 py-4 text-left">
          <SheetTitle className="text-base font-semibold text-zinc-900">{title}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 p-5">
          <div className="rounded-[20px] border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-600">
            <div className="font-medium whitespace-pre-line text-zinc-800">{tip}</div>
            <Button
              type="button"
              variant="link"
              className="mt-1 h-auto p-0 text-xs font-semibold text-zinc-900"
              onClick={copyPrompt}
            >
              Copy AI Prompt
            </Button>
          </div>

          <div className="flex rounded-2xl border border-zinc-200 bg-zinc-50 p-1">
            <button
              type="button"
              onClick={() => setTab('upload')}
              className={`flex-1 rounded-[14px] px-3 py-2 text-sm font-medium transition-colors ${
                tab === 'upload' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-white hover:text-zinc-900'
              }`}
            >
              Upload
            </button>
            <button
              type="button"
              onClick={() => setTab('paste')}
              className={`flex-1 rounded-[14px] px-3 py-2 text-sm font-medium transition-colors ${
                tab === 'paste' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-white hover:text-zinc-900'
              }`}
            >
              Paste
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleFileChange}
          />

          {tab === 'upload' ? (
            <div className="rounded-[24px] border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5">
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-2xl border-zinc-200 bg-white"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Choose JSON File
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Textarea
                value={pastedText}
                onChange={(event) => setPastedText(event.target.value)}
                placeholder={'{ "items": [ { "description": "", "quantity": 1, "unit_price": 0 } ] }'}
                className="min-h-48 rounded-[24px] border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900"
              />
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-2xl border-zinc-200 bg-white"
                  onClick={() => setPastedText('')}
                >
                  Clear
                </Button>
                <Button
                  type="button"
                  className="h-10 rounded-2xl bg-zinc-900 text-white hover:bg-zinc-800"
                  onClick={() => handleImport(pastedText)}
                >
                  Import
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
