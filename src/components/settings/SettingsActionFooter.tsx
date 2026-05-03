import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LoaderCircle } from "lucide-react"

interface SettingsActionFooterProps {
  onSave: () => void
  onCancel: () => void
  saving?: boolean
  disabled?: boolean
  saveLabel?: string
  cancelLabel?: string
  className?: string
}

export function SettingsActionFooter({
  onSave,
  onCancel,
  saving = false,
  disabled = false,
  saveLabel = "Save Changes",
  cancelLabel = "Cancel",
  className,
}: SettingsActionFooterProps) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 -mx-6 -mb-6 mt-8 border-t border-[hsl(var(--bd-border)/0.5)] bg-[hsl(var(--bd-card-bg)/0.95)] px-6 py-4 backdrop-blur-sm",
        "flex items-center justify-end gap-3",
        "pb-[max(1rem,env(safe-area-inset-bottom))]", // Safe area awareness
        className
      )}
    >
      <Button
        variant="ghost"
        onClick={onCancel}
        disabled={saving}
        className="text-[hsl(var(--bd-text-muted))] hover:text-[hsl(var(--bd-text))]"
      >
        {cancelLabel}
      </Button>
      <Button
        onClick={onSave}
        disabled={saving || disabled}
        className="min-w-[120px] bg-[hsl(var(--bd-button-primary-bg))] text-[hsl(var(--bd-button-primary-text))] hover:opacity-90"
      >
        {saving ? (
          <>
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          saveLabel
        )}
      </Button>
    </div>
  )
}
