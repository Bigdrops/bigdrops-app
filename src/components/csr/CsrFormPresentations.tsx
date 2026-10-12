import type { ReactNode } from 'react'
import { Hash, Loader2, MoreHorizontal, SaveAll } from 'lucide-react'

import { ThemeToggleButton } from '@/components/theme/ThemeToggleButton'

type PresentationProps = {
  mode: 'new' | 'edit'
  csrNumber: string
  isFoldable: boolean
  saving: boolean
  saveDisabled: boolean
  onSave: () => void
  onCancel: () => void
  onOpenOptions: () => void
  children: ReactNode
}

function CsrNumber({ csrNumber }: { csrNumber: string }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <Hash className="h-3 w-3 shrink-0 text-bd-text-muted" aria-hidden="true" />
      <span
        className="min-w-0 truncate font-mono text-[10px] font-bold text-bd-button-primary-bg"
        style={{ fontFamily: '"DM Mono", monospace' }}
      >
        {csrNumber || 'Pending number'}
      </span>
    </div>
  )
}

function CsrFormActions({
  mode,
  saving,
  saveDisabled,
  onSave,
  onCancel,
  compact,
}: Pick<PresentationProps, 'mode' | 'saving' | 'saveDisabled' | 'onSave' | 'onCancel'> & { compact: boolean }) {
  const saveLabel = mode === 'edit' ? 'Save Changes' : 'Save CSR'

  return (
    <footer className={`mt-6 border-t border-bd-border pt-4 ${compact ? 'pb-2' : 'pb-0'}`} aria-label="CSR form actions">
      <div className={compact ? 'grid grid-cols-2 gap-3' : 'flex justify-end gap-3'}>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className={`${compact ? 'min-h-11 w-full' : 'h-10 min-w-28'} rounded-[8px] border border-bd-border bg-bd-surface px-4 text-[10px] font-extrabold uppercase tracking-wide text-bd-text transition-colors hover:bg-bd-surface-muted active:scale-95 disabled:opacity-50`}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saveDisabled}
          className={`${compact ? 'min-h-11 w-full' : 'h-10 min-w-32'} inline-flex items-center justify-center rounded-[8px] bg-bd-button-primary-bg px-4 text-[10px] font-extrabold uppercase tracking-wide text-bd-button-primary-text transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50`}
        >
          {saving ? 'Saving...' : saveLabel}
        </button>
      </div>
    </footer>
  )
}

export function CsrMobileFoldPresentation({
  csrNumber,
  isFoldable,
  mode,
  saving,
  saveDisabled,
  onSave,
  onCancel,
  onOpenOptions,
  children,
}: PresentationProps) {
  return (
    <div className={`mx-auto min-h-screen w-full bg-bd-app-bg px-4 pb-28 pt-2 sm:px-5 ${isFoldable ? 'max-w-2xl' : 'max-w-md'}`}>
      <header className="mb-3 border-b border-bd-border pb-2">
        <h1
          className="!text-[20px] font-bold leading-6 tracking-tight text-bd-text text-balance"
          data-csr-mobile-header-title
        >
          Customer Service Report
        </h1>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <CsrNumber csrNumber={csrNumber} />
          <div className="flex shrink-0 items-center gap-1">
            <ThemeToggleButton className="h-10 w-10 rounded-[8px]" />
            <button
              type="button"
              onClick={onOpenOptions}
              className="flex h-10 w-10 items-center justify-center rounded-[8px] text-bd-text-muted transition-colors hover:text-bd-text active:scale-95"
              aria-label="CSR form options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>
      {children}
      <CsrFormActions
        mode={mode}
        saving={saving}
        saveDisabled={saveDisabled}
        onSave={onSave}
        onCancel={onCancel}
        compact
      />
    </div>
  )
}

export function CsrDesktopTabletPresentation({
  mode,
  csrNumber,
  saving,
  saveDisabled,
  onSave,
  onCancel,
  onOpenOptions,
  children,
}: PresentationProps) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl bg-bd-app-bg px-5 pb-12 pt-5 md:px-8 lg:px-10">
      <header className="mb-6 flex items-end justify-between gap-6 border-b border-bd-border pb-4">
        <div className="min-w-0">
          <div className="mb-1 text-[9px] font-bold uppercase tracking-[0.11em] text-bd-text-muted">
            {mode === 'new' ? 'Create CSR' : 'Edit CSR'}
          </div>
          <h1 className="text-[22px] font-extrabold leading-tight text-bd-text">Customer Service Report</h1>
          <div className="mt-2"><CsrNumber csrNumber={csrNumber} /></div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggleButton className="h-10 w-10 rounded-[8px]" />
          <button
            type="button"
            onClick={onOpenOptions}
            className="flex h-10 w-10 items-center justify-center rounded-[8px] text-bd-text-muted transition-colors hover:text-bd-text active:scale-95"
            aria-label="CSR form options"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saveDisabled}
            className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-bd-button-primary-bg px-4 text-[10px] font-extrabold uppercase tracking-wide text-bd-button-primary-text transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <SaveAll className="h-4 w-4" />}
            Save CSR
          </button>
        </div>
      </header>
      {children}
      <CsrFormActions
        mode={mode}
        saving={saving}
        saveDisabled={saveDisabled}
        onSave={onSave}
        onCancel={onCancel}
        compact={false}
      />
    </div>
  )
}
