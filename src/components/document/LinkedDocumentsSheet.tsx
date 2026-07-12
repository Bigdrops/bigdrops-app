import * as React from 'react'
import { ArrowRight, FileText, FolderOpen, GitBranch, Layers3, LucideIcon } from 'lucide-react'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const sectionIcons: Record<string, LucideIcon> = {
  source: GitBranch,
  related: Layers3,
  generated: FileText,
  project: FolderOpen,
}

interface LinkedDocumentItem {
  key: string
  label: string
  subtitle?: string
  disabled?: boolean
  onClick?: () => void
}

interface LinkedDocumentSection {
  key: string
  title: string
  description?: string
  icon?: LucideIcon
  items: LinkedDocumentItem[]
}

interface LinkedDocumentsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subtitle?: string | null
  sections: LinkedDocumentSection[]
  emptyTitle?: string
  emptyDescription?: string
}

export default function LinkedDocumentsSheet({
  open,
  onOpenChange,
  title,
  subtitle,
  sections,
  emptyTitle = 'No linked documents yet',
  emptyDescription = 'This record is not connected to any source, generated, or related documents yet.',
}: LinkedDocumentsSheetProps) {
  const visibleSections = (sections || []).filter((section) => (section.items || []).length > 0)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[var(--bd-overlay-sheet-max-height)] rounded-t-[26px] px-0 pb-5">
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-slate-200" />
        <SheetHeader className="border-b border-border px-4 pb-3 pt-3 text-left">
          <SheetTitle className="text-base font-extrabold text-foreground">{title}</SheetTitle>
          {subtitle ? <SheetDescription>{subtitle}</SheetDescription> : null}
        </SheetHeader>

        <div className="max-h-[calc(var(--bd-overlay-sheet-max-height)-88px)] overflow-y-auto px-3 pt-3">
          {visibleSections.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
              <div className="text-sm font-semibold text-foreground">{emptyTitle}</div>
              <div className="mt-1 text-sm text-muted-foreground">{emptyDescription}</div>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleSections.map((section) => {
                const SectionIcon = (section.icon || sectionIcons[section.key] || FileText) as LucideIcon
                return (
                  <section key={section.key} className="rounded-[22px] border border-border bg-card p-3 shadow-sm">
                    <div className="mb-2 flex items-center gap-2 px-1">
                      <div className="grid h-9 w-9 place-items-center rounded-2xl bg-slate-100 text-slate-600">
                        <SectionIcon className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground">{section.title}</div>
                        {section.description ? <div className="text-xs text-muted-foreground">{section.description}</div> : null}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {section.items.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            onOpenChange(false)
                            item.onClick?.()
                          }}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-[18px] border border-border bg-background px-3 py-3 text-left transition hover:bg-muted/40',
                            item.disabled && 'cursor-default opacity-60 hover:bg-background',
                          )}
                          disabled={item.disabled}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-foreground">{item.label}</div>
                            {item.subtitle ? <div className="mt-0.5 text-xs text-muted-foreground">{item.subtitle}</div> : null}
                          </div>
                          {!item.disabled ? <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}
                        </button>
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
