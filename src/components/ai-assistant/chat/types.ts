/**
 * types.ts — Production Types for Bolu Assistant Chat Components
 */

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { BoluProposal } from '@/lib/ai-assistant/bolu-operations'
import type { ClerkState, ProductionBoluMessage } from '@/lib/ai-assistant/hooks/types'
import type { BoluNarrationStatus } from '@/lib/ai-assistant/bolu-narration'
import type { BoluConversationSummary } from '@/lib/ai-assistant/hooks/useBoluConversations'
import type { BoluPageContext } from '@/lib/ai-assistant/bolu-context'

export type ViewportId = 'fold-closed' | 'fold-open' | 'tablet' | 'desktop'

export interface ViewportPreset {
  id: ViewportId
  label: string
  short: string
  width: number
  height: number
  icon: LucideIcon
  hint: string
}

export interface BoluChatWorkspaceProps {
  open: boolean
  onClose: () => void
  tenantId?: string | null
  pageContext?: BoluPageContext
  initialViewport?: ViewportId
}

export interface WorkspaceShellProps {
  viewport: ViewportId
  modelPill: ReactNode
  thread: ReactNode
  composer: ReactNode
  panel: ReactNode
  settings: ReactNode
  clerk: ReactNode
  clerkDock: ReactNode | null
  clerkOpen: boolean
  onCloseClerk: () => void
  panelOpen: boolean
  settingsOpen: boolean
  onOpenPanel: () => void
  onClosePanel: () => void
  onOpenSettings: () => void
  onCloseSettings: () => void
  railCollapsed: boolean
  onToggleRail: () => void
  activeThreadId: string | null
  conversations: BoluConversationSummary[]
  onSelectThread: (id: string) => void
  onNewThread: () => void
  onCloseWorkspace: () => void
}

/** Narration controls handed to the thread so it stays free of speech logic. */
export interface ThreadNarrationControls {
  supported: boolean
  enabled: boolean
  messageId: string | null
  status: BoluNarrationStatus
  error: string | null
  onSpeak: (message: ProductionBoluMessage, text: string) => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
}

export type { ClerkState, ProductionBoluMessage, BoluConversationSummary, BoluProposal }
