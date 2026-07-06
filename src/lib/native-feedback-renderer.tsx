import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { subscribe, dismiss, type UIIntent } from './native-feedback-reducer'

const ICONS: Record<UIIntent['variant'], string> = {
  success: '\u2713',
  error: '\u2717',
  warning: '\u26A0',
  info: '\u2139',
  loading: '\u25E0',
}

const VARIANTS: Record<UIIntent['variant'], string> = {
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  warning: 'bg-amber-500 text-white',
  info: 'bg-blue-600 text-white',
  loading: 'bg-gray-800 text-white',
}

function IntentCard({ intent, onDismiss }: { intent: UIIntent; onDismiss: (id: string) => void }) {
  const [exiting, setExiting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (intent.duration > 0) {
      timerRef.current = setTimeout(() => setExiting(true), intent.duration - 300)
    }
    return () => clearTimeout(timerRef.current)
  }, [intent.duration])

  useEffect(() => {
    if (exiting) {
      const t = setTimeout(() => onDismiss(intent.id), 300)
      return () => clearTimeout(t)
    }
  }, [exiting, intent.id, onDismiss])

  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm shadow-lg transition-all duration-300 ${VARIANTS[intent.variant]} ${exiting ? 'translate-y-1 opacity-0' : 'translate-y-0 opacity-100'}`}
    >
      <span className="mt-0.5 shrink-0 text-base leading-none">{ICONS[intent.variant]}</span>
      <div className="min-w-0 flex-1">
        <div className="font-medium leading-tight">{intent.title}</div>
        {intent.description && <div className="mt-0.5 text-xs opacity-80">{intent.description}</div>}
      </div>
      <button
        type="button"
        onClick={() => setExiting(true)}
        className="ml-1 shrink-0 self-start text-sm leading-none opacity-60 hover:opacity-100"
        aria-label="Dismiss"
      >
        \u2715
      </button>
    </div>
  )
}

function sorted(intents: UIIntent[]): UIIntent[] {
  return [...intents].sort((a, b) => {
    const pa = a.variant === 'error' ? 0 : a.variant === 'warning' ? 1 : a.variant === 'loading' ? 2 : 3
    const pb = b.variant === 'error' ? 0 : b.variant === 'warning' ? 1 : b.variant === 'loading' ? 2 : 3
    return pa - pb || a.createdAt - b.createdAt
  })
}

export function NativeFeedbackRenderer() {
  const [intents, setIntents] = useState<UIIntent[]>([])

  useEffect(() => subscribe(setIntents), [])

  const visible = sorted(intents)

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[99999] flex flex-col items-center gap-2 p-4"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
    >
      {visible.slice(0, 3).map((intent) => (
        <div key={intent.id} className="pointer-events-auto w-full max-w-sm">
          <IntentCard intent={intent} onDismiss={dismiss} />
        </div>
      ))}
    </div>,
    document.body,
  )
}
