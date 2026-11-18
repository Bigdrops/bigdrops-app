import type { ComponentType } from 'react'
import {
  Anthropic,
  Cerebras,
  Cohere,
  DeepSeek,
  Fireworks,
  Gemini,
  Grok,
  Groq,
  Mistral,
  Moonshot,
  Nvidia,
  OpenAI,
  OpenRouter,
  Qiniu,
  Qwen,
  Together,
  Zhipu,
} from '@lobehub/icons'
import { Cpu, Server } from 'lucide-react'
import { cn } from '@/lib/utils'
import zroMark from '@/assets/providers/zro-mark-black.png'
import plamoIcon from '@/assets/providers/plamo-icon.png'
import apinexMark from '@/assets/providers/apinex-mark.png'
import runcrateIcon from '@/assets/providers/runcrate-icon.png'

type IconComponent = ComponentType<{ size?: number | string; className?: string }>

const PROVIDER_ICONS: Record<string, IconComponent> = {
  openai: OpenAI as IconComponent,
  anthropic: Anthropic as IconComponent,
  gemini: Gemini as IconComponent,
  groq: Groq as IconComponent,
  deepseek: DeepSeek as IconComponent,
  qwen: Qwen as IconComponent,
  mistral: Mistral as IconComponent,
  together: Together as IconComponent,
  fireworks: Fireworks as IconComponent,
  cerebras: Cerebras as IconComponent,
  xai: Grok as IconComponent,
  cohere: Cohere as IconComponent,
  nvidia: Nvidia as IconComponent,
  openrouter: OpenRouter as IconComponent,
  zhipu: Zhipu as IconComponent,
  qiniu: Qiniu as IconComponent,
}

export function ProviderLogo({
  providerId,
  size = 20,
  className,
}: {
  providerId: string
  size?: number
  className?: string
}) {
  const Icon = PROVIDER_ICONS[providerId]
  if (Icon) return <Icon size={size} className={className} />
  if (providerId === 'amd') return <Cpu size={size} className={cn('text-bd-text-muted', className)} />
  if (providerId === 'zro') {
    // Zro has no icon set entry. Use the official mark and invert it for dark surfaces.
    return (
      <img
        src={zroMark}
        alt="Zro"
        width={size}
        height={size}
        className={cn('object-contain dark:invert', className)}
      />
    )
  }
  if (providerId === 'plamo') {
    // Official PLaMo mark. Full colour on a transparent background, so it needs no dark-mode filter.
    return (
      <img
        src={plamoIcon}
        alt="PLaMo"
        width={size}
        height={size}
        className={cn('object-contain', className)}
      />
    )
  }
  if (providerId === 'apinex') {
    // Official APInex mark. Gold x on an opaque black tile; the tile is the brand, keep it as is.
    return (
      <img
        src={apinexMark}
        alt="APInex"
        width={size}
        height={size}
        className={cn('rounded-sm object-contain', className)}
      />
    )
  }
  if (providerId === 'runcrate') {
    // Official Runcrate mark. Blue rounded square with a terminal prompt.
    return (
      <img
        src={runcrateIcon}
        alt="Runcrate"
        width={size}
        height={size}
        className={cn('rounded-sm object-contain', className)}
      />
    )
  }
  return <Server size={size} className={cn('text-bd-text-muted', className)} />
}