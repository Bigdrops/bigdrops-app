/**
 * bolu-export.ts — Chat Export Utility for Bolu Assistant Conversations
 *
 * Provides client-side export capabilities for active Bolu chat transcripts
 * into Markdown (.md) and JSON (.json) formats.
 *
 * Web uses the browser download path. Native Android uses the canonical
 * user-file persistence path (Documents/BigDrops/chat-exports) through the
 * MediaStore bridge, then offers an Open-with chooser. A synthetic
 * <a download> click on a Blob URL does not work in the Android WebView.
 */

import { downloadTextFile } from '@/lib/native/fileDownload'

import type { ProductionBoluMessage } from './hooks/types'

const EXPORT_SUBDIRECTORY = 'chat-exports'

function sanitizeFileName(title?: string): string {
  const base = (title || 'bolu-conversation')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40)
  const dateStr = new Date().toISOString().slice(0, 10)
  return `${base}-${dateStr}`
}

export async function exportChatAsMarkdown(
  messages: ProductionBoluMessage[],
  title?: string,
): Promise<void> {
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
      if (m.proposal.operationType !== 'advance-invoice-config' && m.proposal.computedTotals?.total) {
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

  await downloadTextFile({
    fileName: `${sanitizeFileName(title)}.md`,
    text: lines.join('\n'),
    subdirectory: EXPORT_SUBDIRECTORY,
  })
}

export async function exportChatAsJson(
  messages: ProductionBoluMessage[],
  title?: string,
): Promise<void> {
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

  await downloadTextFile({
    fileName: `${sanitizeFileName(title)}.json`,
    text: JSON.stringify(payload, null, 2),
    subdirectory: EXPORT_SUBDIRECTORY,
  })
}
