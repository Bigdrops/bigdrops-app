import * as React from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { HiSparkles } from 'react-icons/hi2'
import { motion, AnimatePresence } from 'motion/react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ChatGptIcon,
  ClaudeIcon,
  GoogleGeminiIcon,
  DeepseekIcon,
  QwenIcon,
  KimiAiIcon,
} from '@hugeicons/core-free-icons'
import { AI_PROVIDERS } from '@/lib/openInAI'
import { cn } from '@/lib/utils'

interface OpenInAIDropdownProps {
  prompt: string
  onProviderSelect?: (providerName: string, providerLabel: string) => void
  onCloseAfterSelect?: () => void
  className?: string
  disabled?: boolean
}

const ANDROID_CONFIG: Record<string, { packageName: string; playStoreUrl: string }> = {
  gemini: {
    packageName: 'com.google.android.apps.bard',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.google.android.apps.bard',
  },
  chatgpt: {
    packageName: 'com.openai.chatgpt',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.openai.chatgpt',
  },
  claude: {
    packageName: 'com.anthropic.claude',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.anthropic.claude',
  },
  deepseek: {
    packageName: 'com.deepseek.chat',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.deepseek.chat',
  },
  qwen: {
    packageName: 'com.tongyi.assistant',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.tongyi.assistant',
  },
  kimi: {
    packageName: 'com.moonshot.kimichat',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.moonshot.kimichat',
  },
}

const PROVIDER_ICON_MAP: Record<string, typeof GoogleGeminiIcon> = {
  gemini: GoogleGeminiIcon,
  chatgpt: ChatGptIcon,
  claude: ClaudeIcon,
  deepseek: DeepseekIcon,
  qwen: QwenIcon,
  kimi: KimiAiIcon,
}

function openApp(url: string, androidPkg: string, playStoreUrl: string) {
  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
  if (isAndroid) {
    const clean = url.replace(/^https?:\/\//, '')
    window.location.href = `intent://${clean}#Intent;scheme=https;package=${androidPkg};S.browser_fallback_url=${encodeURIComponent(playStoreUrl)};end;`
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
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
    document.addEventListener('mousedown', handle)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handle)
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

  const handleProviderClick = (providerName: string) => {
    const provider = AI_PROVIDERS.find(p => p.name === providerName)
    if (!provider) return

    void navigator.clipboard.writeText(prompt).catch(() => {})

    const android = ANDROID_CONFIG[provider.name]
    const url = provider.buildUrl(prompt)
    if (android) {
      openApp(url, android.packageName, android.playStoreUrl)
    } else {
      window.open(url, '_blank', 'noopener,noreferrer')
    }

    onProviderSelect?.(provider.name, provider.label)
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
              {AI_PROVIDERS.map((provider) => {
                const Icon = PROVIDER_ICON_MAP[provider.name]
                if (!Icon) return null
                return (
                  <button
                    key={provider.name}
                    type="button"
                    onClick={() => handleProviderClick(provider.name)}
                    title={provider.label}
                    className="flex h-10 w-10 items-center justify-center rounded-lg transition-all hover:bg-gray-100 active:scale-95"
                  >
                    <HugeiconsIcon icon={Icon} size={20} strokeWidth={1.5} />
                  </button>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}
