import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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
  const { toast } = useToast()

  React.useEffect(() => {
    if (!open) {
      setPastedText('')
    }
  }, [open])

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(CSR_IMPORT_PROMPT)
      toast({ title: 'Copied', description: 'CSR import prompt copied.' })
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
      <SheetContent side="bottom" className="rounded-t-[24px] p-0 sm:mx-auto sm:max-w-2xl">
        <SheetHeader className="border-b border-border px-5 py-4 text-left">
          <SheetTitle className="text-base font-semibold">Import CSR JSON</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 p-5">
          <div className="rounded-[18px] border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            Paste JSON for approved CSR technical and service fields only.
          </div>

          <Textarea
            value={pastedText}
            onChange={(event) => setPastedText(event.target.value)}
            placeholder={`{ "problem_reported": "", "materials": [{ "item": "", "quantity": "", "unit": "" }] }`}
            className="min-h-64 rounded-[20px] bg-muted/20 px-4 py-3 text-sm"
          />

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" className="rounded-2xl" onClick={handleCopyPrompt}>
              Copy Prompt
            </Button>
            <Button type="button" className="rounded-2xl" onClick={handleImport}>
              Import
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
