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
  saveLabel?: string
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
  saveLabel = 'Save Record',
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
    <div className="flex flex-col h-full bg-[hsl(var(--bd-overlay-bg))] select-none">
      <div className="sticky top-0 z-30 border-b border-[hsl(var(--bd-overlay-border))] bg-[hsl(var(--bd-overlay-section-bg))] shadow-sm shrink-0">
        <div className="flex flex-row items-center justify-between p-4 text-left">
          <div className="space-y-0.5">
            <h3 className="text-base font-black text-[hsl(var(--bd-overlay-text))] flex items-center gap-1.5 leading-tight">
              <Wand2 className="h-4 w-4 text-[hsl(var(--bd-feedback-success))]" />
              {title}
            </h3>
            <p className="text-[11px] font-medium text-[hsl(var(--bd-overlay-muted))] leading-tight">
              {description}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyPrompt}
              className="h-8 rounded-lg text-[9px] font-black uppercase tracking-widest text-[hsl(var(--bd-feedback-success))] bg-[hsl(var(--bd-status-success-bg))] hover:brightness-95 px-2.5 transition-colors"
            >
              {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
              {copied ? 'Copied' : 'AI Prompt'}
            </Button>
            {isParsed ? (
              <Button
                onClick={onSave}
                disabled={isSaving}
                size="sm"
                className="h-10 bg-[hsl(var(--bd-button-primary-bg))] hover:brightness-95 text-[hsl(var(--bd-button-primary-text))] font-black text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all active:scale-[0.98] px-5"
              >
                {isSaving ? 'Saving...' : saveLabel}
              </Button>
            ) : null}
          </div>
        </div>
        {isParsed ? (
          <div className="border-t border-[hsl(var(--bd-overlay-border))] px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-widest text-[hsl(var(--bd-overlay-muted))]">Review Extraction</span>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--bd-feedback-success))] animate-pulse" />
                  <span className="text-[10px] font-bold text-[hsl(var(--bd-feedback-success))]">Validated JSON</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onEditJson || onPreview}
                className="h-8 rounded-lg px-0 text-[9px] font-black uppercase tracking-widest text-[hsl(var(--bd-overlay-muted))] hover:bg-transparent hover:text-[hsl(var(--bd-overlay-text))]"
              >
                Edit JSON
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="p-4 space-y-4 overflow-y-auto">
        {/* Help / Tips Section */}
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[hsl(var(--bd-status-info-bg))] border border-[hsl(var(--bd-status-info-border))]">
          <Info className="h-3.5 w-3.5 text-[hsl(var(--bd-status-info-text))] mt-0.5" />
          <p className="text-[11px] font-medium text-[hsl(var(--bd-status-info-text))] leading-relaxed">
            {helpText}
          </p>
        </div>

        {!isParsed ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-[hsl(var(--bd-overlay-muted))]">Step 1: Paste JSON</span>
              <span className="text-[9px] text-[hsl(var(--bd-overlay-muted))] italic">one object only</span>
            </div>
            <Textarea
              value={rawInput}
              onChange={(e) => onRawInputChange(e.target.value)}
              placeholder='{ "key": "value" }'
              className="min-h-[160px] rounded-xl border-[hsl(var(--bd-overlay-border))] bg-[hsl(var(--bd-overlay-input-bg))] font-mono text-[hsl(var(--bd-overlay-text))] text-xs p-3 focus-visible:ring-[hsl(var(--bd-focus-ring))] shadow-inner"
            />
            {error && (
              <div className="p-2.5 rounded-lg bg-[hsl(var(--bd-status-danger-bg))] border border-[hsl(var(--bd-status-danger-border))] text-[11px] text-[hsl(var(--bd-status-danger-text))] font-bold">
                {error}
              </div>
            )}
            <Button
              onClick={onPreview}
              disabled={!rawInput.trim()}
              className="w-full h-11 bg-[hsl(var(--bd-text))] hover:brightness-90 text-[hsl(var(--bd-app-bg))] font-bold rounded-xl shadow-md transition-all active:scale-[0.98]"
            >
              Preview Extraction
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pb-6">
            <div className="flex items-center justify-between px-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-[hsl(var(--bd-overlay-muted))]">Step 2: Verify Data</span>
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

            {additionalActions && (
              <div className="pt-2 space-y-2">
                {additionalActions}
              </div>
            )}
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
          "max-h-[94vh] rounded-t-[var(--bd-overlay-radius)] bg-[hsl(var(--bd-overlay-bg))] p-0 border-none sm:max-w-2xl sm:mx-auto select-none overflow-y-auto",
          className
        )}
      >
        <JsonImportUI {...props} />
      </SheetContent>
    </Sheet>
  )
}
