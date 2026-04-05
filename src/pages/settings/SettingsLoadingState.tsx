import { Loader2 } from 'lucide-react'

export function SettingsLoadingState() {
  return (
    <div className="flex justify-center py-12">
      <Loader2 size={20} className="animate-spin text-slate-300" />
    </div>
  )
}
