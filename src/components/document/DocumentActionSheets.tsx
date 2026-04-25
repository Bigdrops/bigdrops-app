import * as React from 'react'
import {
  Archive,
  ChevronRight,
  CircleDollarSign,
  Copy,
  Download as DownloadIcon,
  Ellipsis,
  FileText,
  FolderPlus,
  FolderOpen,
  GitBranchPlus,
  Trash2,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { DocumentTemplatePicker } from './DocumentDesignControls'

export type DocumentActionKey =
  | 'payment'
  | 'copy'
  | 'clone'
  | 'convert'
  | 'archive'
  | 'delete'
  | 'open'
  | 'export'
  | 'pdf'
  | 'projectLink'
  | 'projectView'
  | 'documentsLink'
  | 'documentsView'

export interface DocumentAction {
  label: string
  subtitle?: string
  iconKey: string
  icon?: LucideIcon
  onClick: () => void
  danger?: boolean
  disabled?: boolean
}

interface DocumentActionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subtitle?: string
  actions: DocumentAction[]
}

export function DocumentActionSheet({ open, onOpenChange, title, subtitle, actions }: DocumentActionSheetProps) {
  const iconMap: Record<DocumentActionKey, LucideIcon> = {
    payment: CircleDollarSign,
    copy: Copy,
    clone: Copy,
    convert: DownloadIcon,
    archive: Archive,
    delete: Trash2,
    open: FolderOpen,
    export: FileText,
    pdf: FileText,
    projectLink: FolderPlus,
    projectView: FolderOpen,
    documentsLink: GitBranchPlus,
    documentsView: Workflow,
  }
  const toneMap: Record<string, { tile: string; chevron: string; row: string }> = {
    payment: {
      tile: 'bg-emerald-600 text-white',
      chevron: 'text-emerald-300',
      row: 'hover:bg-emerald-50/60',
    },
    copy: {
      tile: 'bg-sky-600 text-white',
      chevron: 'text-blue-300',
      row: 'hover:bg-sky-50/60',
    },
    clone: {
      tile: 'bg-violet-600 text-white',
      chevron: 'text-violet-300',
      row: 'hover:bg-violet-50/60',
    },
    convert: {
      tile: 'bg-amber-500 text-slate-950',
      chevron: 'text-amber-300',
      row: 'hover:bg-amber-50/60',
    },
    archive: {
      tile: 'bg-slate-700 text-white',
      chevron: 'text-slate-300',
      row: 'hover:bg-slate-50/60',
    },
    open: {
      tile: 'bg-sky-600 text-white',
      chevron: 'text-blue-300',
      row: 'hover:bg-sky-50/60',
    },
    export: {
      tile: 'bg-sky-600 text-white',
      chevron: 'text-blue-300',
      row: 'hover:bg-sky-50/60',
    },
    pdf: {
      tile: 'bg-slate-700 text-white',
      chevron: 'text-slate-300',
      row: 'hover:bg-slate-50/60',
    },
    projectLink: {
      tile: 'bg-emerald-600 text-white',
      chevron: 'text-emerald-300',
      row: 'hover:bg-emerald-50/60',
    },
    projectView: {
      tile: 'bg-emerald-600 text-white',
      chevron: 'text-emerald-300',
      row: 'hover:bg-emerald-50/60',
    },
    documentsLink: {
      tile: 'bg-cyan-700 text-white',
      chevron: 'text-violet-300',
      row: 'hover:bg-cyan-50/60',
    },
    documentsView: {
      tile: 'bg-cyan-700 text-white',
      chevron: 'text-violet-300',
      row: 'hover:bg-cyan-50/60',
    },
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex h-[50vh] max-h-[50vh] flex-col overflow-hidden rounded-t-[26px] px-0 pb-4"
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-slate-200" />
        <SheetHeader className="border-b border-border px-4 pb-3 pt-3 text-left">
          <SheetTitle className="text-base font-extrabold text-foreground">{title}</SheetTitle>
          {subtitle ? <SheetDescription>{subtitle}</SheetDescription> : null}
        </SheetHeader>
        <div className="min-h-0 overflow-y-auto px-3 pt-2">
          <div className="space-y-0.5 pb-1">
            {actions.map((action, index) => {
              const danger = !!action.danger
              const Icon = action.icon || iconMap[action.iconKey as DocumentActionKey] || Ellipsis
              const tone = toneMap[action.iconKey] || toneMap.export
              const nextNeedsSeparator = !danger && actions[index + 1]?.danger

              return (
                <div key={action.label} className={cn(nextNeedsSeparator && 'pb-2')}>
                  <button
                    type="button"
                    disabled={action.disabled}
                    onClick={() => {
                      onOpenChange(false)
                      action.onClick()
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-[18px] px-3 py-2.5 text-left transition',
                      danger ? 'hover:bg-red-50' : tone.row,
                      action.disabled && 'opacity-60',
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-9 w-9 shrink-0 place-items-center rounded-[12px] shadow-sm',
                        danger ? 'bg-red-600 text-white' : tone.tile,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <div className={cn('text-sm font-bold', danger ? 'text-red-700' : 'text-foreground')}>{action.label}</div>
                      {action.subtitle ? <div className="mt-0.5 text-[10px] leading-4 text-muted-foreground">{action.subtitle}</div> : null}
                    </span>
                    <ChevronRight className={cn('h-4 w-4 shrink-0', danger ? 'text-red-300' : tone.chevron)} />
                  </button>
                  {nextNeedsSeparator ? <div className="mx-3 mt-1.5 border-t border-slate-100" /> : null}
                </div>
              )
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export interface PdfAction {
  label: string
  onClick: () => void
  variant?: 'outline' | 'default' | 'ghost' | 'link' | 'destructive' | 'secondary'
  className?: string
  disabled?: boolean
}

interface DocumentPdfSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subtitle?: string
  settingsNode?: React.ReactNode
  templateValue?: string
  onTemplateChange?: (templateId: string) => void
  templates?: Array<{ id: string; label?: string; description?: string; name?: string; thumbnail?: string }>
  actions?: PdfAction[]
}

export function DocumentPdfSheet({
  open,
  onOpenChange,
  title,
  subtitle,
  settingsNode,
  templateValue,
  onTemplateChange,
  templates,
  actions = [],
}: DocumentPdfSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[50vh] max-h-[50vh] overflow-hidden rounded-t-[30px] px-0 pb-6">
        <div className="mx-auto mt-3 h-1.5 w-11 rounded-full bg-slate-200" />
        <SheetHeader className="border-b border-border px-5 pb-4 pt-4 text-left">
          <SheetTitle className="text-base font-extrabold text-foreground">{title}</SheetTitle>
          {subtitle ? <SheetDescription>{subtitle}</SheetDescription> : null}
        </SheetHeader>
        <div className="min-h-0 space-y-5 overflow-y-auto px-5 py-5">
          {settingsNode ? settingsNode : null}
          {templateValue && onTemplateChange && templates?.length ? (
            <div className="space-y-2">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">Template</div>
              <DocumentTemplatePicker value={templateValue} onChange={onTemplateChange} templates={templates as any} />
            </div>
          ) : null}
          {actions.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {actions.map((action) => (
                <Button
                  key={action.label}
                  type="button"
                  variant={action.variant || 'outline'}
                  className={cn('h-12 rounded-2xl', action.className)}
                  disabled={action.disabled}
                  onClick={action.onClick}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
