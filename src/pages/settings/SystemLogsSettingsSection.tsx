import { useEffect, useMemo, useState } from 'react'
import {
  Copy,
  Download,
  Mail,
  MessageCircle,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Terminal,
} from 'lucide-react'
import { errorRegistry, type ErrorRegistryEntry } from '@/lib/errorRegistry'
import { feedback } from '@/lib/feedback'

const DEVELOPER_EMAIL = 'jaiyewisdom@gmail.com'
const DEVELOPER_WHATSAPP = 'https://wa.me/2348150240192'

export default function SystemLogsSettingsSection() {
  const [logs, setLogs] = useState<ErrorRegistryEntry[]>([])
  const [query, setQuery] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    return errorRegistry.subscribe((entries) => {
      setLogs(entries)
    })
  }, [])

  const filteredLogs = useMemo(() => {
    if (!query.trim()) return logs
    const q = query.toLowerCase()
    return logs.filter(
      (entry) =>
        entry.title.toLowerCase().includes(q) ||
        entry.diagnostic.toLowerCase().includes(q) ||
        entry.route.toLowerCase().includes(q) ||
        entry.id.toLowerCase().includes(q),
    )
  }, [logs, query])

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const handleCopyAll = async () => {
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
        totalErrors: logs.length,
        logs,
      }
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
      feedback.success('Diagnostic logs copied to clipboard')
    } catch {
      feedback.error('Could not copy logs to clipboard')
    }
  }

  const handleCopyEntry = async (entry: ErrorRegistryEntry) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(entry, null, 2))
      setCopiedId(entry.id)
      feedback.success(`Copied entry ${entry.id}`)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      feedback.error('Could not copy log entry')
    }
  }

  const handleDownload = () => {
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        platform: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
        totalErrors: logs.length,
        logs,
      }
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2))
      const downloadAnchor = document.createElement('a')
      const dateStr = new Date().toISOString().slice(0, 10)
      downloadAnchor.setAttribute('href', dataStr)
      downloadAnchor.setAttribute('download', `bourxe-diagnostic-logs-${dateStr}.json`)
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()
      feedback.success('Log file downloaded')
    } catch {
      feedback.error('Failed to download log file')
    }
  }

  const buildDiagnosticSummary = () => {
    const recent = logs.slice(0, 5)
    let summary = `BOURXE Diagnostic Report (${new Date().toLocaleString()})\n`
    summary += `Total logged events: ${logs.length}\n`
    summary += `Platform: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}\n\n`
    summary += 'Recent Events:\n'
    recent.forEach((item, idx) => {
      summary += `${idx + 1}. [${item.id}] ${item.title}\n`
      summary += `   Route: ${item.route}\n`
      summary += `   Time: ${new Date(item.timestamp).toISOString()}\n`
      if (item.diagnostic) {
        summary += `   Diagnostic: ${item.diagnostic.slice(0, 250)}...\n`
      }
      summary += '\n'
    })
    return summary
  }

  const handleEmailSupport = () => {
    const subject = encodeURIComponent(`BOURXE Diagnostic Report [${new Date().toISOString().slice(0, 10)}]`)
    const body = encodeURIComponent(buildDiagnosticSummary())
    window.location.href = `mailto:${DEVELOPER_EMAIL}?subject=${subject}&body=${body}`
  }

  const handleWhatsAppSupport = () => {
    const text = encodeURIComponent(
      `Hello BOURXE Support, here is my diagnostic report:\n\n${buildDiagnosticSummary()}`,
    )
    window.open(`${DEVELOPER_WHATSAPP}?text=${text}`, '_blank')
  }

  const handleClear = () => {
    errorRegistry.clear()
    feedback.success('Diagnostic logs cleared')
  }

  return (
    <div className="space-y-6">
      {/* Header & Metric Strip */}
      <div className="flex flex-col gap-4 rounded-xl border border-bd-border bg-bd-surface p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Terminal className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-bd-text">System Diagnostic Logs</h2>
            <p className="text-xs text-bd-text-muted">
              {logs.length === 0
                ? 'No errors recorded. Your system is running smoothly.'
                : `${logs.length} error event${logs.length === 1 ? '' : 's'} recorded in this browser session.`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyAll}
            disabled={logs.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-bd-border bg-bd-surface px-3 py-1.5 text-xs font-semibold text-bd-text shadow-sm transition hover:bg-muted active:scale-95 disabled:pointer-events-none disabled:opacity-40"
          >
            <Copy className="size-3.5" />
            Copy All
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={logs.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-bd-border bg-bd-surface px-3 py-1.5 text-xs font-semibold text-bd-text shadow-sm transition hover:bg-muted active:scale-95 disabled:pointer-events-none disabled:opacity-40"
          >
            <Download className="size-3.5" />
            Download
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={logs.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive transition hover:bg-destructive/20 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
          >
            <Trash2 className="size-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* Developer Export Quick Actions */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleEmailSupport}
          disabled={logs.length === 0}
          className="flex items-center justify-between rounded-xl border border-bd-border bg-bd-surface p-4 text-left transition hover:border-primary/50 hover:bg-muted/40 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40"
        >
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Mail className="size-4.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-bd-text">Email Support Report</div>
              <div className="text-[11px] text-bd-text-muted">{DEVELOPER_EMAIL}</div>
            </div>
          </div>
          <span className="text-xs font-semibold text-primary">Send &rarr;</span>
        </button>

        <button
          type="button"
          onClick={handleWhatsAppSupport}
          disabled={logs.length === 0}
          className="flex items-center justify-between rounded-xl border border-bd-border bg-bd-surface p-4 text-left transition hover:border-emerald-500/50 hover:bg-muted/40 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40"
        >
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <MessageCircle className="size-4.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-bd-text">WhatsApp Developer Support</div>
              <div className="text-[11px] text-bd-text-muted">+234 815 024 0192</div>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Chat &rarr;</span>
        </button>
      </div>

      {/* Search Bar */}
      {logs.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-bd-text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search logs by error title, diagnostic message, or route..."
            className="w-full rounded-xl border border-bd-border bg-bd-surface py-2.5 pl-10 pr-4 text-xs text-bd-text placeholder:text-bd-text-muted/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      )}

      {/* Log Feed */}
      {filteredLogs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-bd-border p-8 text-center">
          <CheckCircle2 className="mx-auto size-8 text-emerald-500/70" />
          <p className="mt-2 text-xs font-semibold text-bd-text">
            {logs.length === 0 ? 'No diagnostic issues logged' : 'No logs match your search'}
          </p>
          <p className="mt-1 text-[11px] text-bd-text-muted">
            {logs.length === 0
              ? 'When validation errors or network failures happen, detailed traces will appear here.'
              : 'Try clearing your search query to see all logged records.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((entry) => {
            const isExpanded = expandedId === entry.id
            const isCopied = copiedId === entry.id

            return (
              <div
                key={entry.id}
                className="overflow-hidden rounded-xl border border-bd-border bg-bd-surface transition hover:border-bd-border/80"
              >
                <div className="flex items-start justify-between gap-3 p-3.5 sm:p-4">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                      <AlertCircle className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-bd-text-muted bg-muted/60 px-1.5 py-0.5 rounded">
                          {entry.id}
                        </span>
                        <span className="text-[11px] font-semibold text-bd-text-muted">
                          {entry.route}
                        </span>
                        <span className="text-[10px] text-bd-text-muted/70">
                          {formatTimestamp(entry.timestamp)}
                        </span>
                      </div>
                      <h4 className="mt-1 text-xs font-bold text-bd-text">{entry.title}</h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyEntry(entry)}
                      title="Copy error details"
                      className="rounded-lg p-1.5 text-bd-text-muted hover:bg-muted hover:text-bd-text transition active:scale-95"
                    >
                      {isCopied ? <CheckCircle2 className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      className="rounded-lg px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10 transition"
                    >
                      {isExpanded ? 'Hide' : 'Details'}
                    </button>
                  </div>
                </div>

                {isExpanded && entry.diagnostic && (
                  <div className="border-t border-bd-border bg-muted/30 p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-bd-text-muted">
                        Diagnostic Trace
                      </span>
                    </div>
                    <pre className="overflow-x-auto rounded-lg bg-black/80 p-3 font-mono text-[11px] leading-relaxed text-zinc-100">
                      {entry.diagnostic}
                    </pre>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
