function now() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now()
}

export function createSaveTimer(totalLabel: string, context: Record<string, unknown>) {
  const totalStart = now()

  return {
    phaseStart(label: string) {
      return now()
    },
    phaseEnd(label: string, start: number, details?: Record<string, unknown>) {
      const durationMs = Number((now() - start).toFixed(1))
      return durationMs
    },
    finish(details?: Record<string, unknown>) {
      const durationMs = Number((now() - totalStart).toFixed(1))
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
