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
import { copyToClipboard } from '@/lib/clipboard'

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

/**
 * Android Binder transaction buffer threshold (250 KB).
 * Android's IPC transaction buffer (/dev/binder) is shared across the entire process
 * and capped at 1 MB. Transactions approaching or exceeding ~500 KB to 1 MB throw
 * android.os.TransactionTooLargeException. 250 KB is a safe operational ceiling for
 * clipboard operations on Android devices.
 */
export const ANDROID_BINDER_CLIPBOARD_BYTE_LIMIT = 250 * 1024

/**
 * Formats conversation turns into clean, readable plain text suitable for copying
 * and pasting into WhatsApp, email, or other messaging channels.
 * Excludes internal tool payloads, raw JSON envelopes, and private metadata.
 */
export function formatConversationAsPlainText(
  messages: ProductionBoluMessage[],
  title?: string,
): string {
  const dialogueTurns = messages.filter((m) => m.role === 'user' || m.role === 'assistant')
  if (dialogueTurns.length === 0) {
    return ''
  }

  const lines: string[] = []
  lines.push(title || 'Bolu Conversation')
  lines.push(`Exported: ${new Date().toLocaleString('en-NG')}`)
  lines.push('')

  for (const m of dialogueTurns) {
    const speaker = m.role === 'user' ? 'User' : 'Bolu'
    const time = m.createdAt
      ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      : ''
    const header = time ? `${speaker} (${time}):` : `${speaker}:`
    lines.push(header)

    const content = (m.content || '').trim()
    if (content) {
      lines.push(content)
    }

    if (m.proposal) {
      const family = m.proposal.documentFamily || 'document'
      const op = m.proposal.operationType === 'create-document'
        ? `Draft ${family}`
        : `Modify ${family}`
      const total =
        m.proposal.operationType !== 'advance-invoice-config' && m.proposal.computedTotals?.total
          ? ` (Total: ₦${m.proposal.computedTotals.total.toLocaleString('en-NG')})`
          : ''
      lines.push(`[${op} · ${m.proposal.status}${total}]`)
    }

    lines.push('')
  }

  return lines.join('\n').trim()
}

export interface CopyConversationResult {
  success: boolean
  byteLength: number
  fallbackToExport?: boolean
  error?: string
}

/**
 * Copies the active conversation transcript to the cross-platform clipboard.
 * Checks against the 250 KB Android Binder limit; if the transcript exceeds
 * the threshold or clipboard write fails, flags fallbackToExport so caller can
 * trigger an unclipped file download.
 */
export async function copyConversationToClipboard(
  messages: ProductionBoluMessage[],
  title?: string,
): Promise<CopyConversationResult> {
  const plainText = formatConversationAsPlainText(messages, title)
  if (!plainText) {
    return { success: false, byteLength: 0, error: 'Conversation has no message content to copy.' }
  }

  const byteLength = new TextEncoder().encode(plainText).length

  if (byteLength > ANDROID_BINDER_CLIPBOARD_BYTE_LIMIT) {
    return {
      success: false,
      fallbackToExport: true,
      byteLength,
      error: `Conversation size (${Math.round(byteLength / 1024)} KB) exceeds device clipboard safe limit (250 KB).`,
    }
  }

  const copied = await copyToClipboard(plainText)
  if (!copied) {
    return {
      success: false,
      fallbackToExport: true,
      byteLength,
      error: 'Clipboard copy failed or permission was denied.',
    }
  }

  return { success: true, byteLength }
}
