/**
 * bolu-export.ts — Chat Export Utility for Bolu Assistant Conversations
 *
 * Provides client-side export capabilities for active Bolu chat transcripts
 * into Markdown (.md) and JSON (.json) formats.
 */

import type { ProductionBoluMessage } from './hooks/types'

function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  setTimeout(() => {
    if (typeof document !== 'undefined' && document?.body && anchor.parentNode) {
      try {
        document.body.removeChild(anchor)
      } catch {}
    }
    if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      try {
        URL.revokeObjectURL(url)
      } catch {}
    }
  }, 100)
}

function sanitizeFileName(title?: string): string {
  const base = (title || 'bolu-conversation')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40)
  const dateStr = new Date().toISOString().slice(0, 10)
  return `${base}-${dateStr}`
}

export function exportChatAsMarkdown(messages: ProductionBoluMessage[], title?: string): void {
  const lines: string[] = []
  lines.push(`# ${title || 'Bolu Conversation'}`)
  lines.push(`*Exported on ${new Date().toLocaleString('en-NG')}*`)
  lines.push('')
  lines.push('---')
  lines.push('')

  for (const m of messages) {
    const roleName = m.role === 'user' ? 'User' : 'Bolu'
    const time = m.createdAt
      ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : ''
    lines.push(`### ${roleName} ${time ? `(${time})` : ''}`)
    lines.push('')
    lines.push(m.content || '*(empty message)*')
    lines.push('')

    if (m.proposal) {
      lines.push('```yaml')
      lines.push(`proposal: ${m.proposal.operationType}`)
      lines.push(`status: ${m.proposal.status}`)
      if (m.proposal.computedTotals?.total) {
        lines.push(`total: ₦${m.proposal.computedTotals.total.toLocaleString('en-NG')}`)
      }
      lines.push('```')
      lines.push('')
    }

    if (m.records && m.records.kind === 'records' && m.records.records.length > 0) {
      lines.push('**Referenced Records:**')
      for (const r of m.records.records) {
        lines.push(`- ${r.number}: ${r.clientName || 'Client'} (${r.kind})`)
      }
      lines.push('')
    }

    lines.push('---')
    lines.push('')
  }

  const content = lines.join('\n')
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const fileName = `${sanitizeFileName(title)}.md`
  triggerDownload(blob, fileName)
}

export function exportChatAsJson(messages: ProductionBoluMessage[], title?: string): void {
  const payload = {
    title: title || 'Bolu Conversation',
    exportedAt: new Date().toISOString(),
    messageCount: messages.length,
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      status: m.status,
      createdAt: m.createdAt,
      proposal: m.proposal ?? null,
      records: m.records ?? null,
    })),
  }

  const content = JSON.stringify(payload, null, 2)
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
  const fileName = `${sanitizeFileName(title)}.json`
  triggerDownload(blob, fileName)
}
