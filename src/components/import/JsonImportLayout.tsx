import * as React from 'react'
import {
  Sheet,
  SheetContent,
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
  tutorial?: {
    title?: string
    description?: string
    steps?: string[]
    videoUrl?: string
  }
}

const DEFAULT_TUTORIAL = {
  title: 'How JSON import works',
  description: 'Copy the AI prompt, run it on your document using any AI, and paste the JSON result here.',
  steps: [
    'Copy the AI Prompt provided in this window',
    'Extract your document data into JSON using any AI tool',
    'Paste the resulting JSON object into the input area',
    'Review the extracted values and save'
  ],
  videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
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
  helpText,
  tutorial,
  previewContent,
  additionalActions,
  whtNotice = false,
  whtHasPayments = true,
  onEditJson,
  saveLabel = 'Save Record',
}: JsonImportUIProps) {
  const [copied, setCopied] = React.useState(false)
  const [showTutorial, setShowTutorial] = React.useState(false)

  const activeTutorial = tutorial || DEFAULT_TUTORIAL



  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(promptText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // toast is handled in parent
    }
  }

  const footerPrimaryLabel = isParsed ? saveLabel : 'Preview Extraction'
  const footerPrimaryAction = isParsed ? onSave : onPreview
  const footerPrimaryDisabled = isParsed ? isSaving : !rawInput.trim()
  const footerSecondaryLabel = isParsed ? 'Edit JSON' : null
  const footerSecondaryAction = isParsed ? (onEditJson || onPreview) : null

  return (
    <div className="flex flex-col h-full bg-[hsl(var(--bd-overlay-bg))] select-none">
      <div className="sticky top-0 z-30 border-b border-[hsl(var(--bd-overlay-border))] bg-[hsl(var(--bd-overlay-section-bg))] shadow-sm shrink-0">
        <div className="flex flex-row items-center justify-between p-[var(--bd-sheet-padding)] text-left">
          <div className="space-y-0.5">
            <h3 className="flex items-center gap-1.5 text-base font-black tracking-tight text-[hsl(var(--bd-overlay-text))]">
              <Wand2 className="h-4 w-4 text-[hsl(var(--bd-feedback-success))]" />
              {title}
            </h3>
            <p className="text-xs leading-tight text-[hsl(var(--bd-overlay-muted))]">
              {description}
            </p>
          </div>
          <div className="flex items-center gap-[var(--bd-row-gap)]">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyPrompt}
              className="h-8 rounded-lg text-[9px] font-black uppercase tracking-[var(--bd-label-letter-spacing)] text-[hsl(var(--bd-feedback-success))] bg-[hsl(var(--bd-status-success-bg))] hover:brightness-95 px-[var(--bd-space-md)] transition-colors"
            >
              {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
              {copied ? 'Copied' : 'AI Prompt'}
            </Button>
          </div>
        </div>
        {isParsed ? (
          <div className="border-t border-[hsl(var(--bd-overlay-border))] px-[var(--bd-sheet-padding)] py-[var(--bd-space-sm)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-[var(--bd-label-letter-spacing)] text-[hsl(var(--bd-overlay-muted))]">Review Extraction</span>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--bd-feedback-success))] animate-pulse" />
                  <span className="text-[10px] font-bold text-[hsl(var(--bd-feedback-success))]">Validated JSON</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onEditJson || onPreview}
                className="h-8 rounded-lg px-0 text-[9px] font-black uppercase tracking-[var(--bd-label-letter-spacing)] text-[hsl(var(--bd-overlay-muted))] hover:bg-transparent hover:text-[hsl(var(--bd-overlay-text))]"
              >
                Edit JSON
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="p-[var(--bd-sheet-padding)] space-y-[var(--bd-section-gap)] overflow-y-auto">
        {/* Tutorial / Help Section */}
        <div className="space-y-[var(--bd-space-sm)]">
          <button
            type="button"
            onClick={() => setShowTutorial(!showTutorial)}
            className="flex w-full items-center justify-between rounded-xl border border-[hsl(var(--bd-status-info-border))] bg-[hsl(var(--bd-status-info-bg))] p-[var(--bd-space-sm)] text-left transition-colors hover:brightness-95"
          >
            <div className="flex items-center gap-[var(--bd-space-sm)]">
              <Info className="h-4 w-4 text-[hsl(var(--bd-status-info-text))]" />
              <span className="text-xs font-bold text-[hsl(var(--bd-status-info-text))]">
                {activeTutorial.title}
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[var(--bd-label-letter-spacing)] text-[hsl(var(--bd-status-info-text))] opacity-60">
              {showTutorial ? 'Hide Guide' : 'How it works'}
            </span>
          </button>

          {showTutorial && (
            <div className="space-y-[var(--bd-space-md)] rounded-2xl border border-[hsl(var(--bd-overlay-section-border))] bg-[hsl(var(--bd-overlay-section-bg))] p-[var(--bd-space-md)] shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="space-y-1">
                <p className="text-xs font-medium text-[hsl(var(--bd-overlay-text))] leading-relaxed">
                  {activeTutorial.description}
                </p>
              </div>

              {activeTutorial.steps && activeTutorial.steps.length > 0 && (
                <div className="space-y-[var(--bd-space-sm)]">
                  {activeTutorial.steps.map((step, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--bd-action-icon-bg))] text-[9px] font-black text-[hsl(var(--bd-action-icon-text))]">
                        {idx + 1}
                      </div>
                      <p className="text-[11px] font-medium text-[hsl(var(--bd-overlay-muted))] leading-snug pt-0.5">
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {activeTutorial.videoUrl && (
                <div className="aspect-video overflow-hidden rounded-xl border border-[hsl(var(--bd-overlay-section-border))] bg-[hsl(var(--bd-overlay-section-bg))] shadow-inner">
                  <iframe
                    src={activeTutorial.videoUrl}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
            </div>
          )}
        </div>


        {!isParsed ? (
          <div className="space-y-[var(--bd-space-sm)]">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-[var(--bd-label-letter-spacing)] text-[hsl(var(--bd-overlay-muted))]">Step 1: Paste JSON</span>
              <span className="text-[9px] text-[hsl(var(--bd-overlay-muted))] italic">one object only</span>
            </div>
            <Textarea
              value={rawInput}
              onChange={(e) => onRawInputChange(e.target.value)}
              placeholder='{ "key": "value" }'
              className="min-h-[160px] rounded-xl border-[hsl(var(--bd-overlay-border))] bg-[hsl(var(--bd-overlay-input-bg))] font-mono text-[hsl(var(--bd-overlay-text))] text-xs p-[var(--bd-space-sm)] focus-visible:ring-[hsl(var(--bd-focus-ring))] shadow-inner"
            />
            {error && (
              <div className="p-2.5 rounded-lg bg-[hsl(var(--bd-status-danger-bg))] border border-[hsl(var(--bd-status-danger-border))] text-[11px] text-[hsl(var(--bd-status-danger-text))] font-bold">
                {error}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-[var(--bd-space-md)] pb-[var(--bd-space-lg)]">
            <div className="flex items-center justify-between px-1">
              <span className="text-[9px] font-black uppercase tracking-[var(--bd-label-letter-spacing)] text-[hsl(var(--bd-overlay-muted))]">Step 2: Verify Data</span>
            </div>

            {whtNotice && (
              <div className={cn(
                "rounded-xl border p-3 text-[11px] font-medium",
                whtHasPayments
                  ? "border-[hsl(var(--bd-status-warning-border))] bg-[hsl(var(--bd-status-warning-bg))] text-[hsl(var(--bd-status-warning-text))]"
                  : "border-[hsl(var(--bd-status-danger-border))] bg-[hsl(var(--bd-status-danger-bg))] text-[hsl(var(--bd-status-danger-text))]"
              )}>
                {whtHasPayments 
                  ? "Before saving, choose the payment this receipt belongs to."
                  : "No WHT payments are available to link this receipt to yet."
                }
              </div>
            )}

            {previewContent}

            {additionalActions && (
              <div className="pt-[var(--bd-space-sm)] space-y-[var(--bd-space-sm)]">
                {additionalActions}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-[hsl(var(--bd-overlay-border))] bg-[hsl(var(--bd-overlay-bg))] p-[var(--bd-sheet-padding)] pb-[calc(var(--bd-sheet-padding)+env(safe-area-inset-bottom))]">
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          {footerSecondaryLabel && footerSecondaryAction ? (
            <Button
              variant="outline"
              onClick={footerSecondaryAction}
              className="h-10 sm:min-w-28"
            >
              {footerSecondaryLabel}
            </Button>
          ) : null}
          <Button
            onClick={footerPrimaryAction}
            disabled={footerPrimaryDisabled}
            className="h-10 sm:min-w-36"
          >
            {isParsed && isSaving ? 'Saving...' : footerPrimaryLabel}
          </Button>
        </div>
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
  const [isMobile, setIsMobile] = React.useState(() =>
    typeof window === 'undefined' ? false : window.innerWidth < 768
  )

  React.useEffect(() => {
    if (typeof window === 'undefined') return

    const lastWidth = { current: window.innerWidth }

    const handleResize = () => {
      const currentWidth = window.innerWidth
      if (currentWidth === lastWidth.current) return
      lastWidth.current = currentWidth
      setIsMobile(currentWidth < 768)
    }
    handleResize()
    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={cn(
          isMobile
            ? "max-h-[94vh] rounded-t-[var(--bd-overlay-radius)] bg-[hsl(var(--bd-overlay-bg))] p-0 border-none select-none overflow-y-auto"
            : "w-full max-w-2xl rounded-none bg-[hsl(var(--bd-overlay-bg))] p-0 select-none overflow-y-auto",
          className
        )}
      >
        <JsonImportUI {...props} />
      </SheetContent>
    </Sheet>
  )
}
