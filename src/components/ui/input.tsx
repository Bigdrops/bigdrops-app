import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-7 w-full min-w-0 rounded-[var(--bd-radius-md)] border border-bd-input-border bg-bd-input-bg px-2 py-0.5 text-sm transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-xs/relaxed file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-bd-input-focus focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-bd-input-error aria-invalid:ring-2 aria-invalid:ring-destructive/20 md:text-xs/relaxed dark:aria-invalid:border-bd-input-error/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
