import * as React from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { HiSparkles } from 'react-icons/hi2'
import { motion, AnimatePresence } from 'motion/react'
import { ModelIcon } from '@lobehub/icons'
import { cn } from '@/lib/utils'

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
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10" cy="10" r="10" fill="#10A37F" />
          <text x="10" y="10" textAnchor="middle" dominantBaseline="central" fill="#fff" fontWeight="700" fontSize="12" fontFamily="system-ui, sans-serif">C</text>
        </svg>
      )
    case 'claude':
      return <ModelIcon model="claude" size={size} type="color" />
    case 'deepseek':
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10" cy="10" r="10" fill="#2B5BED" />
          <text x="10" y="10" textAnchor="middle" dominantBaseline="central" fill="#fff" fontWeight="700" fontSize="12" fontFamily="system-ui, sans-serif">D</text>
        </svg>
      )
    case 'qwen':
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10" cy="10" r="10" fill="#615CED" />
          <text x="10" y="10" textAnchor="middle" dominantBaseline="central" fill="#fff" fontWeight="700" fontSize="12" fontFamily="system-ui, sans-serif">Q</text>
        </svg>
      )
    case 'kimi':
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10" cy="10" r="10" fill="#000000" />
          <text x="10" y="10" textAnchor="middle" dominantBaseline="central" fill="#fff" fontWeight="700" fontSize="12" fontFamily="system-ui, sans-serif">K</text>
        </svg>
      )
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
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const popupRef = React.useRef<HTMLDivElement>(null)
  const [popupStyle, setPopupStyle] = React.useState<React.CSSProperties>({})

  React.useEffect(() => {
    if (!isOpen) return
    const handle = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        popupRef.current &&
        !popupRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('click', handle)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('click', handle)
      document.removeEventListener('keydown', handleKey)
    }
  }, [isOpen])

  const handleToggle = () => {
    if (!isOpen && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      setPopupStyle({
        position: 'fixed',
        bottom: window.innerHeight - r.top + 8,
        right: window.innerWidth - r.right,
        zIndex: 9999,
      })
    }
    setIsOpen(prev => !prev)
  }

  const handleProviderClick = (providerId: string) => {
    const provider = AI_PROVIDERS.find(p => p.id === providerId)
    if (!provider) return

    navigator.clipboard.writeText(prompt).catch(() => {})

    navigateToProvider(provider.url, provider.androidIntent)

    onProviderSelect?.(provider.id, provider.name)
    onCloseAfterSelect?.()
    setIsOpen(false)
  }

  return (
    <div className={cn("inline-flex items-center", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        aria-label="Open in AI provider picker"
        aria-expanded={isOpen}
        className="flex h-8 items-center gap-1 rounded-lg px-2 text-[9px] font-black uppercase tracking-[var(--bd-label-letter-spacing)] text-[#1e40af] bg-[hsl(217_91%_60%/0.15)] hover:bg-[hsl(217_91%_60%/0.25)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span>Open in AI</span>
        <HiSparkles size={14} className="text-[#1e40af]" />
        {isOpen ? (
          <ChevronUp className="h-3 w-3 opacity-60" />
        ) : (
          <ChevronDown className="h-3 w-3 opacity-60" />
        )}
      </button>

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={popupRef}
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ type: "spring", duration: 0.25 }}
              style={popupStyle}
              className="flex flex-row gap-1 rounded-lg border bg-white p-1.5 shadow-lg"
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
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}
