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

export function DocumentActionSheet({ open, onOpenChange, title, subtitle, actions }) {
  const iconMap = {
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
  const toneMap = {
    payment: {
      tile: 'bg-emerald-50 text-emerald-700',
      chevron: 'text-emerald-300',
    },
    copy: {
      tile: 'bg-blue-50 text-blue-700',
      chevron: 'text-blue-300',
    },
    clone: {
      tile: 'bg-violet-50 text-violet-700',
      chevron: 'text-violet-300',
    },
    convert: {
      tile: 'bg-amber-50 text-amber-700',
      chevron: 'text-amber-300',
    },
    archive: {
      tile: 'bg-slate-100 text-slate-700',
      chevron: 'text-slate-300',
    },
    open: {
      tile: 'bg-blue-50 text-blue-700',
      chevron: 'text-blue-300',
    },
    export: {
      tile: 'bg-blue-50 text-blue-700',
      chevron: 'text-blue-300',
    },
    pdf: {
      tile: 'bg-slate-100 text-slate-700',
      chevron: 'text-slate-300',
    },
    projectLink: {
      tile: 'bg-emerald-50 text-emerald-700',
      chevron: 'text-emerald-300',
    },
    projectView: {
      tile: 'bg-emerald-50 text-emerald-700',
      chevron: 'text-emerald-300',
    },
    documentsLink: {
      tile: 'bg-violet-50 text-violet-700',
      chevron: 'text-violet-300',
    },
    documentsView: {
      tile: 'bg-violet-50 text-violet-700',
      chevron: 'text-violet-300',
    },
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex max-h-[min(72vh,620px)] flex-col rounded-t-[26px] px-0 pb-4"
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
              const Icon = action.icon || iconMap[action.iconKey] || Ellipsis
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
                      danger ? 'hover:bg-red-50' : 'hover:bg-slate-50',
                      action.disabled && 'opacity-60',
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-9 w-9 shrink-0 place-items-center rounded-[12px]',
                        danger ? 'bg-red-50 text-red-600' : tone.tile,
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
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-[30px] px-0 pb-6">
        <div className="mx-auto mt-3 h-1.5 w-11 rounded-full bg-slate-200" />
        <SheetHeader className="border-b border-border px-5 pb-4 pt-4 text-left">
          <SheetTitle className="text-base font-extrabold text-foreground">{title}</SheetTitle>
          {subtitle ? <SheetDescription>{subtitle}</SheetDescription> : null}
        </SheetHeader>
        <div className="space-y-5 px-5 py-5">
          {settingsNode ? settingsNode : null}
          {templateValue && onTemplateChange && templates?.length ? (
            <div className="space-y-2">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">Template</div>
              <DocumentTemplatePicker value={templateValue} onChange={onTemplateChange} templates={templates} />
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
