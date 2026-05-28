interface CsrPrimaryActionsProps {
  onComplete: () => void
  onEdit: () => void
  onDownload?: () => void
  downloading?: boolean
}

export default function CsrPrimaryActions({
  onComplete,
  onEdit,
  onDownload,
  downloading,
}: CsrPrimaryActionsProps) {
  return (
    <div className="flex flex-row items-center gap-2 w-full flex-nowrap bg-bd-surface px-4 py-3 border-b border-bd-border relative z-10">
      <button
        type="button"
        onClick={onComplete}
        className="flex flex-1 items-center justify-center gap-1.5 border-0 rounded-[var(--bd-radius-lg)] text-sm font-semibold cursor-pointer py-3.5 px-[18px] transition-all duration-150 ease-in-out whitespace-nowrap tracking-[-0.28px] font-[var(--bd-font-family)] bg-bd-button-primary-bg text-bd-button-primary-text shadow-[var(--bd-shadow-lg)] hover:bg-bd-button-primary-hover-bg hover:-translate-y-px active:scale-[0.98]"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>Mark as Completed</span>
      </button>

      <button
        type="button"
        onClick={onEdit}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-[var(--bd-radius-lg)] text-sm font-semibold cursor-pointer py-3.5 px-[18px] transition-all duration-150 ease-in-out whitespace-nowrap tracking-[-0.28px] font-[var(--bd-font-family)] bg-bd-surface text-bd-brand border border-bd-brand hover:bg-bd-surface-muted active:scale-[0.98]"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        <span>Edit</span>
      </button>

      {onDownload ? (
        <button
          type="button"
          onClick={onDownload}
          disabled={downloading}
          className="w-10 h-10 p-0 justify-center shrink-0 bg-bd-surface border border-bd-border rounded-[var(--bd-radius-lg)] cursor-pointer flex items-center text-bd-text transition-all duration-150 ease-in-out shadow-[var(--bd-shadow-sm)] hover:bg-bd-surface-muted hover:border-bd-text-muted disabled:opacity-50 disabled:cursor-not-allowed"
          title="Download"
        >
          {downloading ? (
            <svg className="animate-spin" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          )}
        </button>
      ) : null}
    </div>
  )
}
