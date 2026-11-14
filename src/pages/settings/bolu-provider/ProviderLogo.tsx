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
  return <Server size={size} className={cn('text-bd-text-muted', className)} />
}