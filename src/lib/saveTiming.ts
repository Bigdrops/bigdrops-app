function now() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now()
}

export function createSaveTimer(totalLabel: string, context: Record<string, unknown>) {
  const totalStart = now()
  console.log(`[save-timing] ${totalLabel}:start`, context)

  return {
    phaseStart(label: string) {
      return now()
    },
    phaseEnd(label: string, start: number, details?: Record<string, unknown>) {
      const durationMs = Number((now() - start).toFixed(1))
      if (details) console.log(`[save-timing] ${label}`, { durationMs, ...details })
      else console.log(`[save-timing] ${label}`, { durationMs })
      return durationMs
    },
    finish(details?: Record<string, unknown>) {
      const durationMs = Number((now() - totalStart).toFixed(1))
      if (details) console.log(`[save-timing] ${totalLabel}`, { durationMs, ...details })
      else console.log(`[save-timing] ${totalLabel}`, { durationMs })
      return durationMs
    },
  }
}

export function getJsonSizeBytes(value: unknown) {
  try {
    return new TextEncoder().encode(JSON.stringify(value ?? null)).length
  } catch {
    return -1
  }
}
