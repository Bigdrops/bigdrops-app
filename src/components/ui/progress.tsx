"use client"

import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Progress primitive aligned with the bigdrops-free Nova style:
 * 4px track, muted rail, solid primary indicator, label and value on one
 * row above the bar. Composition follows the reference:
 *
 *   <Progress value={n}>
 *     <ProgressLabel>Update Asset</ProgressLabel>
 *     <ProgressValue />
 *   </Progress>
 */
function Progress({
  className,
  value,
  children,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  const percent =
    typeof value === "number" && Number.isFinite(value)
      ? Math.min(100, Math.max(0, value))
      : 0

  return (
    <div data-slot="progress" className={cn("w-full space-y-2", className)}>
      {children ? (
        <div className="flex w-full items-center justify-between gap-3">
          {children}
        </div>
      ) : null}
      <ProgressPrimitive.Root
        value={percent}
        className="relative h-1 w-full overflow-x-hidden rounded-full bg-muted"
        {...props}
      >
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className="h-full w-full flex-1 rounded-full bg-bd-button-primary-bg transition-transform duration-150 ease-linear"
          style={{ transform: `translateX(-${100 - percent}%)` }}
        />
      </ProgressPrimitive.Root>
    </div>
  )
}

function ProgressLabel({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="progress-label"
      className={cn("text-[11px] font-medium text-bd-overlay-muted", className)}
      {...props}
    />
  )
}

function ProgressValue({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="progress-value"
      className={cn("ml-auto font-mono text-xs tabular-nums text-bd-overlay-text", className)}
      {...props}
    />
  )
}

export { Progress, ProgressLabel, ProgressValue }
