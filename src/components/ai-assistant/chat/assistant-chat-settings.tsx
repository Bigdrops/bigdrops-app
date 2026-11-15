import { Settings2, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

/**
 * ProviderSettings — Deprecated inline provider settings panel.
 * Per DEC-37, all AI provider administration is conducted centrally in /settings.
 */
export function ProviderSettings({
  onClose,
}: {
  entries?: unknown
  activeId?: string
  focusId?: string
  variant?: 'sheet' | 'panel'
  onClose: () => void
  onKeyChange?: (id: string, key: string) => void
  onModelChange?: (id: string, model: string) => void
  onActivate?: (id: string) => void
  onTest?: (entry: unknown) => void
  onFetchModels?: (entry: unknown) => void
  onAddCustom?: (provider: unknown, key: string) => void
  onRemoveCustom?: (id: string) => void
}) {
  const navigate = useNavigate()
  return (
    <div className="p-6 text-center space-y-4">
      <div className="size-12 rounded-2xl bg-[var(--ac-muted-surface)] border border-[var(--ac-line)] flex items-center justify-center mx-auto text-[var(--ac-ink)]">
        <Settings2 className="size-6" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-[var(--ac-ink)]">AI Infrastructure Settings</h3>
        <p className="text-xs text-[var(--ac-muted)] mt-1 max-w-xs mx-auto">
          AI credentials, multi-account routing, and model configuration are managed centrally in the main settings area.
        </p>
      </div>
      <button
        type="button"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--ac-accent)] text-white text-xs font-semibold shadow-sm hover:opacity-90 transition"
        onClick={() => {
          onClose()
          navigate('/settings')
        }}
      >
        <span>Open Settings</span>
        <ArrowRight className="size-3.5" />
      </button>
    </div>
  )
}
