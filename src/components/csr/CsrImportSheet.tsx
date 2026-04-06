import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Wand2, Copy, Check, ClipboardCheck } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { CSR_IMPORT_PROMPT, parseCsrImportText, type ParsedCsrImport } from '@/components/csr/csrImport'

type CsrImportSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApplyImport: (result: ParsedCsrImport) => void
}

export default function CsrImportSheet({ open, onOpenChange, onApplyImport }: CsrImportSheetProps) {
  const [pastedText, setPastedText] = React.useState('')
  const [copied, setCopied] = React.useState(false)
  const { toast } = useToast()

  React.useEffect(() => {
    if (!open) {
      setPastedText('')
    }
  }, [open])

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(CSR_IMPORT_PROMPT)
      setCopied(true)
      toast({ title: 'Prompt Copied', description: 'AI prompt is ready in your clipboard.' })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ title: 'Copy failed', description: 'Could not copy the prompt.', variant: 'destructive' })
    }
  }

  const handleImport = () => {
    try {
      const result = parseCsrImportText(pastedText)
      onApplyImport(result)
      toast({ title: 'Import applied', description: 'CSR fields were imported.' })
      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Invalid import payload.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[94vh] rounded-t-[28px] bg-slate-50 p-0 border-none sm:max-w-2xl sm:mx-auto select-none overflow-y-auto">
        <SheetHeader className="p-5 border-b bg-white rounded-t-[28px] flex flex-row items-center justify-between text-left">
          <div className="space-y-1">
            <SheetTitle className="text-lg font-black text-slate-00 flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-emerald-600" />
              Import CSR JSON
            </SheetTitle>
            <SheetDescription className="text-xs font-medium text-slate-500 italic">
              Paste JSON extraction for CSR fields.
            </SheetDescription>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleCopyPrompt}
            className="h-9 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3"
          >
            {copied ? <Check className="h-3 w-3 mr-1.5" /> : <Copy className="h-3 w-3 mr-1.5" />}
            {copied ? 'Copied' : 'AI Prompt'}
          </Button>
        </SheetHeader>

        <div className="space-y-4 p-5">
           <div className="flex items-center justify-between">
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-bold">Step 1: Paste JSON</span>
             <span className="text-[9px] text-slate-400 italic">No markdown fences</span>
           </div>

          <Textarea
            value={pastedText}
            onChange={(event) => setPastedText(event.target.value)}
            placeholder={`{ "problem_reported": "", "materials": [{ "item": "", "quantity": "", "unit": "" }] }`}
            className="min-h-64 rounded-2xl border-slate-200 bg-white font-mono text-sm p-4 focus-visible:ring-emerald-500 shadow-inner"
          />

          <Button 
            onClick={handleImport}
            className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg rounded-2xl shadow-lg shadow-emerald-200 mt-2 transition-all active:scale-[0.98]"
          >
            <ClipboardCheck className="h-5 w-5 mr-2" />
            Apply Import
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
