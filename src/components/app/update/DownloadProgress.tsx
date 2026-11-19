"use client"

import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress"

export interface DownloadProgressProps {
  percentage: number | null
  downloadedBytes?: number
  totalBytes?: number
  status: "idle" | "connecting" | "downloading" | "installing" | "error"
  errorMessage?: string
  /** Color surface: the update dialog, or a page-level card. */
  surface?: "overlay" | "page"
}

/**
 * Precision download readout. Every number comes from the native
 * apkDownloadProgress telemetry; nothing here advances on its own.
 */
export function DownloadProgress({
  percentage,
  downloadedBytes,
  totalBytes,
  status,
  errorMessage,
  surface = "overlay",
}: DownloadProgressProps) {
  const formatMB = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1)

  const labelClass = surface === "overlay" ? "text-bd-overlay-muted" : "text-bd-text-muted"
  const valueClass = surface === "overlay" ? "text-bd-overlay-text" : "text-bd-text"
  const statusClass =
    surface === "overlay" ? "text-bd-overlay-muted" : "text-bd-text-muted"

  const getStatusLabel = () => {
    if (status === "error") return errorMessage || "Download failed."
    if (status === "connecting") return "Connecting to BOUXRE release server..."
    if (status === "installing") return "Download complete. Launching installer..."
    if (status === "downloading" && downloadedBytes !== undefined && totalBytes) {
      return `Downloading: ${formatMB(downloadedBytes)} MB / ${formatMB(totalBytes)} MB`
    }
    if (status === "downloading") return "Downloading update..."
    return "Ready."
  }

  const isError = status === "error"

  return (
    <div className="w-full space-y-2">
      <Progress
        value={percentage}
        aria-label="Update download progress"
        aria-valuetext={getStatusLabel()}
      >
        <ProgressLabel className={labelClass}>Update Asset</ProgressLabel>
        {status === "downloading" && percentage !== null ? (
          <ProgressValue className={valueClass}>{Math.round(percentage)}%</ProgressValue>
        ) : null}
      </Progress>
      <div
        className={`font-mono text-xs tabular-nums ${
          isError ? "font-semibold text-destructive" : statusClass
        }`}
      >
        {getStatusLabel()}
      </div>
    </div>
  )
}
