import type { CSSProperties, ReactNode } from 'react'
import { Menu } from 'lucide-react'

const accentColors = {
  slate: '#0f172a',
  blue: '#3b82f6',
  violet: '#a855f7',
  emerald: '#22c55e',
  amber: '#f59e0b',
  cyan: '#06b6d4',
} as const

const SHELL_CARD: CSSProperties = {
  background: '#fff',
  border: '1px solid hsl(214,32%,91%)',
  borderRadius: 28,
  overflow: 'hidden',
  boxShadow: '0 1px 2px rgba(15,23,42,.05), 0 10px 30px rgba(15,23,42,.08)',
}

const ICON_BTN: CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 14,
  border: '1px solid hsl(214,32%,91%)',
  background: '#fff',
  boxShadow: '0 1px 2px rgba(15,23,42,.05)',
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
  color: '#0f172a',
}

const EYEBROW: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '.18em',
  color: 'hsl(215,16%,47%)',
}

const TITLE_H2: CSSProperties = {
  margin: '8px 0 0',
  fontSize: 28,
  lineHeight: 1.05,
  letterSpacing: '-0.045em',
  fontWeight: 900,
  color: '#0f172a',
}

const SUMMARY: CSSProperties = {
  marginTop: 4,
  color: 'hsl(215,16%,47%)',
  fontSize: 14,
}

type PageIntroProps = {
  eyebrow?: string
  title: string
  description?: string
  meta?: string
  actions?: ReactNode
  toolbar?: ReactNode
  className?: string
  tone?: keyof typeof accentColors
  compact?: boolean
}

export default function PageIntro({
  eyebrow,
  title,
  description,
  meta,
  actions,
  toolbar,
  className,
  tone = 'slate',
}: PageIntroProps) {
  const accent = accentColors[tone]

  return (
    <div style={SHELL_CARD} className={className}>
      <div style={{ height: 4, background: accent }} />
      <div style={{ padding: 16, background: 'linear-gradient(180deg,rgba(248,250,252,.9),#fff)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <button type="button" style={ICON_BTN} aria-label="Open navigation">
            <Menu size={18} />
          </button>
          {actions ? <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{actions}</div> : null}
        </div>

        {eyebrow ? <div style={{ marginTop: 16, ...EYEBROW }}>{eyebrow}</div> : null}
        <h2 style={TITLE_H2}>{title}</h2>
        {meta ? <div style={SUMMARY}>{meta}</div> : null}
        {description ? <div style={{ ...SUMMARY, marginTop: 10, lineHeight: 1.55 }}>{description}</div> : null}

        {toolbar ? <div style={{ marginTop: 16 }}>{toolbar}</div> : null}
      </div>
    </div>
  )
}
