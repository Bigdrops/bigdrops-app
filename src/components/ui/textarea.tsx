import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full resize-none rounded-[var(--bd-radius-md)] border border-bd-input-border bg-bd-input-bg px-2 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-bd-input-focus focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-bd-input-error aria-invalid:ring-2 aria-invalid:ring-destructive/20 md:text-xs/relaxed dark:aria-invalid:border-bd-input-error/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
