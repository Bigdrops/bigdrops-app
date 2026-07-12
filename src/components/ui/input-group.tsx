import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Textarea } from "./textarea"

export function InputGroup({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col", className)} {...props} />
}

export function InputGroupAddon({ className, align, ...props }: React.HTMLAttributes<HTMLDivElement> & { align?: "block-start" | "block-end" }) {
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 border bg-muted/50 px-2 py-1.5",
        align === "block-start" && "rounded-t-lg border-b-0",
        align === "block-end" && "rounded-b-lg border-t-0",
        className
      )}
      {...props}
    />
  )
}

export function InputGroupButton({ className, size = "icon-xs", variant = "ghost", ...props }: React.ComponentProps<typeof Button>) {
  return <Button size={size} variant={variant} className={cn("size-7", className)} {...props} />
}

export function InputGroupTextarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Textarea
      className={cn(
        "min-h-[100px] resize-y rounded-b-none border-b-0 focus-visible:ring-0 focus-visible:ring-offset-0",
        className
      )}
      {...props}
    />
  )
}
