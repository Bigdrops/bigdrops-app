/**
 * index.ts — Bolu Chat Production Components Barrel Export
 */

export * from './types'
export { BoluChatWorkspace } from './BoluChatWorkspace'
export { AssistantHeader, ViewportPicker } from './assistant-chat-chrome'
export { AssistantComposer } from './assistant-chat-composer'
export { AssistantThread } from './assistant-chat-thread'
export { AssistantRail } from './assistant-chat-rail'
export { InvoicePanel } from './assistant-chat-panel'
export { ModelPill } from './assistant-chat-model-pill'
export { ProviderSettings } from './assistant-chat-settings'
export { ClerkAvatar, ClerkDock, ClerkLauncher } from './assistant-chat-clerk'
export { BoluOrbIdentity, BoluOrbInline } from './bolu-thinking-orb'
export { AssistantMark, StatusRow, ProposalCardView, Segmented, proposalPlainText } from './assistant-chat-parts'
export {
  AssistantMarkdown,
  normalizeLanguage,
  parseAssistantMarkdown,
  parseInlineMarkdown,
  safeHref,
} from './assistant-chat-markdown'
export { AssistantCodeBlock } from './assistant-chat-code-block'
export { IconAction } from './assistant-chat-icon-action'
export { CopyButton, useCopyFeedback } from './assistant-chat-copy-button'
export {
  AssistantAttachments,
  formatAttachmentSize,
  readMessageAttachments,
} from './assistant-chat-attachments'
export * from './assistant-chat-providers'
