export type AIProvider = {
  name: string
  label: string
  buildUrl: (prompt: string) => string
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    name: 'gemini',
    label: 'Gemini',
    buildUrl: (prompt: string) =>
      `https://gemini.google.com/?q=${encodeURIComponent(prompt)}`,
  },
  {
    name: 'chatgpt',
    label: 'ChatGPT',
    buildUrl: (prompt: string) =>
      `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`,
  },
  {
    name: 'claude',
    label: 'Claude',
    buildUrl: (prompt: string) =>
      `https://claude.ai/new?q=${encodeURIComponent(prompt)}`,
  },
  {
    name: 'deepseek',
    label: 'DeepSeek',
    buildUrl: (prompt: string) =>
      `https://chat.deepseek.com/?q=${encodeURIComponent(prompt)}`,
  },
  {
    name: 'qwen',
    label: 'Qwen',
    buildUrl: (prompt: string) =>
      `https://chat.qwen.ai/?q=${encodeURIComponent(prompt)}`,
  },
  {
    name: 'kimi',
    label: 'Kimi',
    buildUrl: (prompt: string) =>
      `https://kimi.moonshot.cn/?q=${encodeURIComponent(prompt)}`,
  },
]

export type AITarget = AIProvider['name']

export function openInAI(target: AITarget, prompt: string): void {
  const provider = AI_PROVIDERS.find(p => p.name === target)
  if (!provider) return

  try {
    navigator.clipboard.writeText(prompt)
  } catch {
    // clipboard unavailable — open tab anyway
  }

  window.open(provider.buildUrl(prompt), '_blank', 'noopener,noreferrer')
}
