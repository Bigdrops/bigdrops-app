import * as React from 'react'
import { HiSparkles } from 'react-icons/hi2'
import { OpenAI, DeepSeek, Qwen, Moonshot, ModelIcon } from '@lobehub/icons'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface Provider {
  id: string
  name: string
  url: string
  androidIntent: string
}

const AI_PROVIDERS: Provider[] = [
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

function navigateToProvider(url: string, androidIntent: string) {
  const isAndroid = /Android/i.test(navigator.userAgent)
  if (isAndroid && androidIntent) {
    window.location.href = androidIntent
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

function ProviderIcon({ providerId }: { providerId: string }) {
  const size = 20

  switch (providerId) {
    case 'gemini':
      return <ModelIcon model="gemini" size={size} type="color" />
    case 'chatgpt':
      return <OpenAI size={size} style={{ color: OpenAI.colorPrimary }} />
    case 'claude':
      return <ModelIcon model="claude" size={size} type="color" />
    case 'deepseek':
      return <DeepSeek.Color size={size} />
    case 'qwen':
      return <Qwen.Color size={size} />
    case 'kimi':
      return <Moonshot size={size} style={{ color: Moonshot.colorPrimary }} />
    default:
      return null
  }
}

interface OpenInAIDropdownProps {
  prompt: string
  onProviderSelect?: (providerName: string, providerLabel: string) => void
  onCloseAfterSelect?: () => void
  className?: string
  disabled?: boolean
}

export function OpenInAIDropdown({
  prompt,
  onProviderSelect,
  onCloseAfterSelect,
  className,
  disabled = false,
}: OpenInAIDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const handleProviderClick = (providerId: string) => {
    const provider = AI_PROVIDERS.find(p => p.id === providerId)
    if (!provider) return

    navigateToProvider(provider.url, provider.androidIntent)

    navigator.clipboard?.writeText(prompt)?.catch(() => {})

    onProviderSelect?.(provider.id, provider.name)
    onCloseAfterSelect?.()
    setIsOpen(false)
  }

  return (
    <div className={cn("inline-flex items-center", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label="Open in AI provider picker"
            aria-expanded={isOpen}
            className="flex h-8 items-center gap-1 rounded-lg px-2 text-[9px] font-black uppercase tracking-[var(--bd-label-letter-spacing)] text-[#1e40af] bg-[hsl(217_91%_60%/0.15)] hover:bg-[hsl(217_91%_60%/0.25)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Open in AI</span>
            <HiSparkles size={14} className="text-[#1e40af]" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="center"
          sideOffset={8}
          className="w-auto flex flex-row gap-1 p-1.5"
        >
          {AI_PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              type="button"
              onClick={() => handleProviderClick(provider.id)}
              title={provider.name}
              className="flex h-10 w-10 items-center justify-center rounded-lg transition-all hover:bg-gray-100 active:scale-95"
            >
              <ProviderIcon providerId={provider.id} />
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  )
}
