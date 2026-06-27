export type AIProvider = {
  id: string
  name: string
  url: string
  androidIntent: string
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'gemini',
    name: 'Gemini',
    url: 'https://gemini.google.com',
    androidIntent: 'intent://gemini.google.com/#Intent;scheme=https;package=com.google.android.apps.bard;end',
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    url: 'https://chatgpt.com',
    androidIntent: 'intent://chatgpt.com/#Intent;scheme=https;package=com.openai.chatgpt;end',
  },
  {
    id: 'claude',
    name: 'Claude',
    url: 'https://claude.ai',
    androidIntent: 'intent://claude.ai/#Intent;scheme=https;package=com.anthropic.claude;end',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    url: 'https://chat.deepseek.com',
    androidIntent: 'intent://chat.deepseek.com/#Intent;scheme=https;package=com.deepseek.chat;end',
  },
  {
    id: 'qwen',
    name: 'Qwen',
    url: 'https://chat.qwen.ai',
    androidIntent: 'intent://chat.qwen.ai/#Intent;scheme=https;package=com.tongyi.assistant;end',
  },
  {
    id: 'kimi',
    name: 'Kimi',
    url: 'https://kimi.moonshot.cn',
    androidIntent: 'intent://kimi.moonshot.cn/#Intent;scheme=https;package=com.moonshot.kimichat;end',
  },
]

export type AITarget = AIProvider['id']

export function openInAI(target: AITarget, prompt: string): void {
  const provider = AI_PROVIDERS.find(p => p.id === target)
  if (!provider) return

  try {
    navigator.clipboard.writeText(prompt)
  } catch {
    // clipboard unavailable — open tab anyway
  }

  window.open(provider.url, '_blank', 'noopener,noreferrer')
}
