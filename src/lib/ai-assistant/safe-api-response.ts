/**
 * Defensive API response parsing for browser clients.
 *
 * Client-safe: no Node imports. Prevents "Unexpected end of JSON input" on
 * empty bodies and non-JSON gateway responses, and normalizes server error
 * envelopes into a single actionable message.
 */

export type SafeApiResponse<T = Record<string, unknown>> = {
  ok: boolean
  status: number
  data: T | null
  errorMessage: string | null
}

export async function safeParseApiResponse<T = Record<string, unknown>>(
  res: Response,
  actionLabel = 'Operation',
): Promise<SafeApiResponse<T>> {
  const status = res.status
  let rawText = ''
  try {
    rawText = await res.text()
  } catch {
    return {
      ok: false,
      status,
      data: null,
      errorMessage: `${actionLabel} failed: Network connection interrupted while reading server response.`,
    }
  }

  const trimmed = rawText.trim()

  if (!trimmed) {
    if (status === 404) {
      return {
        ok: false,
        status,
        data: null,
        errorMessage: `${actionLabel} endpoint was not found (HTTP 404). In local development, verify that Vite dev API middleware is active.`,
      }
    }
    if (res.ok) {
      return { ok: true, status, data: null, errorMessage: null }
    }
    return {
      ok: false,
      status,
      data: null,
      errorMessage: `${actionLabel} returned empty response with HTTP status ${status}.`,
    }
  }

  try {
    const parsed = JSON.parse(trimmed) as T
    const dataObj = parsed as Record<string, unknown>
    const serverError = typeof dataObj?.error === 'string'
      ? dataObj.error
      : typeof dataObj?.message === 'string' && (!res.ok || dataObj?.ok === false)
        ? dataObj.message
        : null

    // A provider operation that fails at the provider (not the transport) answers
    // HTTP 200 with ok:false plus diagnostics. Without this the UI shows a
    // generic failure and the actionable reason is lost.
    const diagnostics = dataObj?.diagnostics as Record<string, unknown> | undefined
    const diagnosticError = diagnostics && typeof diagnostics.message === 'string'
      ? `${diagnostics.message}${typeof diagnostics.suggestedAction === 'string' ? ` ${diagnostics.suggestedAction}` : ''}`
      : null

    const isOk = res.ok && dataObj?.ok !== false && !serverError
    return {
      ok: isOk,
      status,
      data: parsed,
      errorMessage: serverError || diagnosticError || (res.ok ? null : `Server returned HTTP ${status}`),
    }
  } catch {
    const cleanSnippet = trimmed
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160)

    let fallbackMsg = `${actionLabel} received non-JSON response (HTTP ${status})`
    if (status === 404) {
      fallbackMsg = `API route not found (HTTP 404). Ensure the API serverless environment or dev proxy is running.`
    } else if (cleanSnippet) {
      fallbackMsg += `: ${cleanSnippet}`
    }

    return { ok: false, status, data: null, errorMessage: fallbackMsg }
  }
}