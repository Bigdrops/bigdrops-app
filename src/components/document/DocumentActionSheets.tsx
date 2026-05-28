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
      tile: 'bg-bd-status-success-bg text-bd-status-success-text',
      chevron: 'text-bd-status-success-text/60',
      row: 'hover:bg-bd-status-success-bg/30',
    },
    copy: {
      tile: 'bg-bd-status-info-bg text-bd-status-info-text',
      chevron: 'text-bd-status-info-text/60',
      row: 'hover:bg-bd-status-info-bg/30',
    },
    clone: {
      tile: 'bg-bd-button-primary-bg/10 text-bd-button-primary-bg',
      chevron: 'text-bd-button-primary-bg/60',
      row: 'hover:bg-bd-button-primary-bg/5',
    },
    convert: {
      tile: 'bg-bd-status-warning-bg text-bd-status-warning-text',
      chevron: 'text-bd-status-warning-text/60',
      row: 'hover:bg-bd-status-warning-bg/30',
    },
    archive: {
      tile: 'bg-bd-surface-muted text-bd-text-muted',
      chevron: 'text-bd-text-muted/60',
      row: 'hover:bg-bd-surface-muted/30',
    },
    open: {
      tile: 'bg-bd-status-info-bg text-bd-status-info-text',
      chevron: 'text-bd-status-info-text/60',
      row: 'hover:bg-bd-status-info-bg/30',
    },
    export: {
      tile: 'bg-bd-status-info-bg text-bd-status-info-text',
      chevron: 'text-bd-status-info-text/60',
      row: 'hover:bg-bd-status-info-bg/30',
    },
    pdf: {
      tile: 'bg-bd-surface-muted text-bd-text-muted',
      chevron: 'text-bd-text-muted/60',
      row: 'hover:bg-bd-surface-muted/30',
    },
    projectLink: {
      tile: 'bg-bd-status-success-bg text-bd-status-success-text',
      chevron: 'text-bd-status-success-text/60',
      row: 'hover:bg-bd-status-success-bg/30',
    },
    projectView: {
      tile: 'bg-bd-status-success-bg text-bd-status-success-text',
      chevron: 'text-bd-status-success-text/60',
      row: 'hover:bg-bd-status-success-bg/30',
    },
    documentsLink: {
      tile: 'bg-bd-status-info-bg text-bd-status-info-text',
      chevron: 'text-bd-status-info-text/60',
      row: 'hover:bg-bd-status-info-bg/30',
    },
    documentsView: {
      tile: 'bg-bd-status-info-bg text-bd-status-info-text',
      chevron: 'text-bd-status-info-text/60',
      row: 'hover:bg-bd-status-info-bg/30',
    },
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex h-[50vh] max-h-[50vh] flex-col overflow-hidden rounded-t-[var(--bd-overlay-radius)] px-0 pb-4"
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-bd-border" />
        <SheetHeader className="border-b border-bd-border px-4 pb-3 pt-3 text-left">
          <SheetTitle className="text-base font-extrabold text-bd-text">{title}</SheetTitle>
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
                      danger ? 'hover:bg-bd-status-danger-bg/30' : tone.row,
                      action.disabled && 'opacity-60',
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-9 w-9 shrink-0 place-items-center rounded-[12px] shadow-sm',
                        danger ? 'bg-bd-status-danger-bg text-bd-status-danger-text' : tone.tile,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <div className={cn('text-sm font-bold', danger ? 'text-bd-status-danger-text' : 'text-bd-text')}>{action.label}</div>
                      {action.subtitle ? <div className="mt-0.5 text-[10px] leading-4 text-bd-text-muted">{action.subtitle}</div> : null}
                    </span>
                    <ChevronRight className={cn('h-4 w-4 shrink-0', danger ? 'text-bd-status-danger-text/60' : tone.chevron)} />
                  </button>
                  {nextNeedsSeparator ? <div className="mx-3 mt-1.5 border-t border-bd-border" /> : null}
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
      <SheetContent side="bottom" className="h-[50vh] max-h-[50vh] overflow-hidden rounded-t-[var(--bd-overlay-radius)] px-0 pb-6">
        <div className="mx-auto mt-3 h-1.5 w-11 rounded-full bg-bd-border" />
        <SheetHeader className="border-b border-bd-border px-5 pb-4 pt-4 text-left">
          <SheetTitle className="text-base font-extrabold text-bd-text">{title}</SheetTitle>
          {subtitle ? <SheetDescription>{subtitle}</SheetDescription> : null}
        </SheetHeader>
        <div className="min-h-0 space-y-5 overflow-y-auto px-5 py-5">
          {settingsNode ? settingsNode : null}
          {templateValue && onTemplateChange && templates?.length ? (
            <div className="space-y-2">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-bd-text-muted">Template</div>
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
