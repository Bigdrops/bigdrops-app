export type AITarget = 'chatgpt' | 'gemini' | 'claude'

const URLS: Record<AITarget, string> = {
  chatgpt: 'https://chatgpt.com/',
  gemini: 'https://gemini.google.com/',
  claude: 'https://claude.ai/new',
}

export function openInAI(target: AITarget, prompt: string): void {
  const url = URLS[target]
  if (!url) return

  try {
    navigator.clipboard.writeText(prompt)
  } catch {
    // clipboard unavailable — open tab anyway
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}
