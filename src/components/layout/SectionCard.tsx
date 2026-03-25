import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type SectionCardProps = {
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
  headerClassName?: string
}

export function SectionCard({
  title,
  description,
  children,
  className,
  contentClassName,
  headerClassName,
}: SectionCardProps) {
  return (
    <Card
      data-slot="section-card"
      className={cn('overflow-hidden rounded-2xl border-border bg-card shadow-sm', className)}
    >
      {title || description ? (
        <CardHeader className={cn('border-b border-border bg-muted/40 px-4 py-4 sm:px-5', headerClassName)}>
          {title ? <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle> : null}
          {description ? <p className="text-xs leading-5 text-muted-foreground">{description}</p> : null}
        </CardHeader>
      ) : null}
      <CardContent className={cn('p-4 sm:p-5', contentClassName)}>{children}</CardContent>
    </Card>
  )
}
