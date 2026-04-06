import * as React from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Wand2, Copy, Check, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface JsonImportUIProps {
  title: string
  description: string
  promptText: string
  rawInput: string
  onRawInputChange: (value: string) => void
  onPreview: () => void
  onSave: () => void
  isSaving?: boolean
  isParsed?: boolean
  error?: string | null
  helpText?: string
  previewContent?: React.ReactNode
  additionalActions?: React.ReactNode
  whtNotice?: boolean
  whtHasPayments?: boolean
  onEditJson?: () => void
}

interface JsonImportLayoutProps extends JsonImportUIProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  className?: string
}

export function JsonImportUI({
  title,
  description,
  promptText,
  rawInput,
  onRawInputChange,
  onPreview,
  onSave,
  isSaving = false,
  isParsed = false,
  error = null,
  helpText = 'How it works: Copy the AI prompt, extract the document into JSON, paste it here, review the values, then save.',
  previewContent,
  additionalActions,
  whtNotice = false,
  whtHasPayments = true,
  onEditJson,
}: JsonImportUIProps) {
  const [copied, setCopied] = React.useState(false)

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(promptText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // toast is handled in parent
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 select-none">
      <div className="p-4 border-b bg-white flex flex-row items-center justify-between text-left shrink-0">
        <div className="space-y-0.5">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5 leading-tight">
            <Wand2 className="h-4 w-4 text-emerald-600" />
            {title}
          </h3>
          <p className="text-[11px] font-medium text-slate-500 leading-tight">
            {description}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopyPrompt}
          className="h-8 rounded-lg text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2.5 transition-colors"
        >
          {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
          {copied ? 'Copied' : 'AI Prompt'}
        </Button>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto">
        {/* Help / Tips Section */}
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-blue-50/50 border border-blue-100/50">
          <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5" />
          <p className="text-[11px] font-medium text-blue-700 leading-relaxed">
            {helpText}
          </p>
        </div>

        {!isParsed ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Step 1: Paste JSON</span>
              <span className="text-[9px] text-slate-400 italic">one object only</span>
            </div>
            <Textarea
              value={rawInput}
              onChange={(e) => onRawInputChange(e.target.value)}
              placeholder='{ "key": "value" }'
              className="min-h-[160px] rounded-xl border-slate-200 bg-white font-mono text-xs p-3 focus-visible:ring-emerald-500 shadow-inner"
            />
            {error && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-100 text-[11px] text-red-600 font-bold">
                {error}
              </div>
            )}
            <Button
              onClick={onPreview}
              disabled={!rawInput.trim()}
              className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98]"
            >
              Preview Extraction
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pb-6">
            <div className="flex items-center justify-between px-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Step 2: Verify & Save</span>
              <Button
                variant="ghost"
                onClick={onEditJson || onPreview}
                className="h-6 text-[9px] font-bold text-slate-500 hover:text-slate-900 p-0"
              >
                Edit JSON
              </Button>
            </div>

            {whtNotice && (
              <div className={cn(
                "p-3 rounded-xl border-2 text-[11px] font-bold",
                whtHasPayments ? "bg-amber-50/50 border-amber-100 text-amber-800" : "bg-red-50 border-red-100 text-red-600"
              )}>
                {whtHasPayments 
                  ? "Before saving, choose the payment this receipt belongs to."
                  : "No WHT payments are available to link this receipt to yet."
                }
              </div>
            )}

            {previewContent}

            <div className="pt-2 space-y-2">
              <Button
                onClick={onSave}
                disabled={isSaving}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-[0.98]"
              >
                {isSaving ? 'Saving...' : 'Save Record'}
              </Button>
              {additionalActions}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function JsonImportLayout({
  open,
  onOpenChange,
  className,
  ...props
}: JsonImportLayoutProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "max-h-[94vh] rounded-t-[28px] bg-slate-50 p-0 border-none sm:max-w-2xl sm:mx-auto select-none overflow-y-auto",
          className
        )}
      >
        <JsonImportUI {...props} />
      </SheetContent>
    </Sheet>
  )
}

