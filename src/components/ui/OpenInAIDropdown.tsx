import * as React from 'react'
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

const PROVIDER_ICON_MAP: Record<string, typeof GoogleGeminiIcon> = {
  gemini: GoogleGeminiIcon,
  chatgpt: ChatGptIcon,
  claude: ClaudeIcon,
  deepseek: DeepseekIcon,
  qwen: QwenIcon,
  kimi: KimiAiIcon,
}

export function OpenInAIDropdown({
  prompt,
  onProviderSelect,
  onCloseAfterSelect,
  className,
  disabled = false,
}: OpenInAIDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const handleProviderClick = (providerName: string) => {
    const provider = AI_PROVIDERS.find(p => p.name === providerName)
    if (!provider) return

    void navigator.clipboard.writeText(prompt).catch(() => {})
    window.open(provider.buildUrl(prompt), '_blank', 'noopener,noreferrer')
    onProviderSelect?.(provider.name, provider.label)
    onCloseAfterSelect?.()
    setIsOpen(false)
  }

  return (
    <div className={cn("relative inline-flex items-center", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
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

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ type: "spring", duration: 0.25 }}
            className="absolute bottom-full mb-2 flex flex-row gap-1 rounded-lg border bg-white p-1.5 shadow-lg"
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
      </AnimatePresence>
    </div>
  )
}
