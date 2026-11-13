import AssistantChatPreview from '@/components/design-lab/assistant-chat-preview'

/**
 * Design Lab route: Assistant Chat (`/design-lab/assistant-chat`).
 *
 * Scripted invoice conversation that exercises the PRD interaction model:
 * app-owned statuses, change cards, and explicit filing. Nothing touches the
 * database, the provider layer, or the production assistant.
 */
export default function AssistantChatExperiment() {
  return <AssistantChatPreview />
}
