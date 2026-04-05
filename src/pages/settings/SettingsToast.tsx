import { useEffect } from 'react'
import { Check } from 'lucide-react'

type SettingsToastProps = {
  message: string
  onDone: () => void
}

export function SettingsToast({ message, onDone }: SettingsToastProps) {
  useEffect(() => {
    const timeoutId = setTimeout(onDone, 2500)
    return () => clearTimeout(timeoutId)
  }, [onDone])

  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2 items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xl">
      <Check size={13} className="text-emerald-400" />
      {message}
    </div>
  )
}
