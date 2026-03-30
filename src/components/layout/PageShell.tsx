import type { CSSProperties, ReactNode } from 'react'

type PageShellProps = {
  children: ReactNode
  className?: string
  width?: 'default' | 'narrow' | 'wide' | 'full'
  padded?: boolean
}

const widthStyles: Record<NonNullable<PageShellProps['width']>, CSSProperties> = {
  default: { width: '100%', maxWidth: 520, margin: '0 auto' },
  narrow: { width: '100%', maxWidth: 440, margin: '0 auto' },
  wide: { width: '100%', maxWidth: 560, margin: '0 auto' },
  full: { width: '100%' },
}

export function PageShell({
  children,
  className,
  width = 'default',
  padded = true,
}: PageShellProps) {
  return (
    <div
      data-slot="page-shell"
      className={className}
      style={{
        ...widthStyles[width],
        minHeight: '100vh',
        padding: padded ? '20px 16px 120px' : undefined,
        background: 'radial-gradient(circle at top, rgba(59,130,246,.08), transparent 30%), hsl(220,20%,98%)',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {children}
    </div>
  )
}
