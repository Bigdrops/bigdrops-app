import type { ReactNode } from 'react'
import PageIntro from './PageIntro'
import { PageShell } from './PageShell'

type MobileListPageShellProps = {
  eyebrow: string
  title: string
  summary: string
  tone: 'blue' | 'emerald' | 'amber' | 'cyan' | 'violet'
  controls: ReactNode
  children: ReactNode
}

export default function MobileListPageShell({
  eyebrow,
  title,
  summary,
  tone,
  controls,
  children,
}: MobileListPageShellProps) {
  return (
    <PageShell width="wide" className="pb-32">
      <PageIntro eyebrow={eyebrow} title={title} meta={summary} tone={tone} toolbar={controls} />
      <div className="mt-3">{children}</div>
    </PageShell>
  )
}
