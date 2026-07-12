import { cn } from "@/lib/utils"
import { Separator } from "./separator"

export function ButtonGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex items-center -space-x-px",
        "[&>:first-child]:rounded-r-none",
        "[&>:last-child]:rounded-l-none",
        "[&>:not(:first-child):not(:last-child)]:rounded-none",
        className
      )}
      {...props}
    />
  )
}

export function ButtonGroupSeparator({ className, ...props }: React.ComponentProps<typeof Separator>) {
  return <Separator orientation="vertical" className={cn("h-4", className)} {...props} />
}
