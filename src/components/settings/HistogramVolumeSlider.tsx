"use client"

import { useState } from "react"

import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

const TOTAL_BARS = 20
const MIN = 0
const MAX = 100

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 80
  return Math.min(MAX, Math.max(MIN, Math.round(value)))
}

export function HistogramVolumeSlider({
  value: controlledValue,
  onChange,
  disabled = false,
}: {
  /** Controlled percentage (0–100). Omit to use the internal 80 default. */
  value?: number
  onChange?: (value: number) => void
  disabled?: boolean
} = {}) {
  const [internalValue, setInternalValue] = useState(80)
  const value = clampPercent(controlledValue ?? internalValue)

  const setValue = (next: number) => {
    const clamped = clampPercent(next)
    if (controlledValue === undefined) setInternalValue(clamped)
    onChange?.(clamped)
  }

  const activeBars = Math.round((value / MAX) * TOTAL_BARS)

  return (
    <div className="w-full space-y-6 rounded-md border border-[hsl(var(--bd-border)/0.3)] p-5">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-[13px] font-semibold text-bd-text">Volume</Label>
          <p className="mt-1 text-[12px] text-muted-foreground">Interface feedback level</p>
        </div>
        <span className="font-mono text-sm font-semibold tabular-nums">{value}%</span>
      </div>

      <div className="relative pb-2 pt-6 focus-within:rounded-sm focus-within:ring-1 focus-within:ring-primary/40">
        {/* Floating tooltip */}
        <div
          aria-hidden="true"
          className="absolute top-0 z-10 rounded bg-foreground px-2 py-0.5 text-[11px] font-bold tabular-nums text-background transition-all duration-100"
          style={{
            left: `${value}%`,
            transform: "translateX(-50%)",
          }}
        >
          {value}
          <div className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 bg-foreground" />
        </div>

        {/* Histogram visualizer */}
        <div
          className={`flex h-8 w-full items-end justify-between gap-[2px] ${
            disabled ? "opacity-40" : ""
          }`}
          aria-hidden="true"
        >
          {Array.from({ length: TOTAL_BARS }).map((_, i) => {
            const isActive = i < activeBars
            const heightPercent = 20 + 80 * (i / (TOTAL_BARS - 1))
            return (
              <div
                key={i}
                className={`w-full rounded-sm transition-colors duration-150 ${
                  isActive ? "bg-primary" : "bg-muted"
                }`}
                style={{ height: `${heightPercent}%` }}
              />
            )
          })}
        </div>

        {/* Invisible interactive overlay: keeps drag, click and keyboard. */}
        <Slider
          value={[value]}
          onValueChange={(val) => setValue(Array.isArray(val) ? (val[0] ?? 80) : val)}
          min={MIN}
          max={MAX}
          step={1}
          disabled={disabled}
          aria-label="Sound volume"
          aria-valuetext={`${value}%`}
          className="absolute inset-x-0 bottom-2 top-6 h-8 cursor-ew-resize opacity-0"
        />
      </div>
    </div>
  )
}
