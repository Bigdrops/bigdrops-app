import React from 'react'
import { cardClassName } from '@/domain/projectDetailUtils'

export default function ProjectDetailStats({ summaryCards }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {summaryCards.map((card) => (
        <div key={card.label} className={`${cardClassName} border-l-4 ${card.accentClassName} p-4`}>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {card.label}
          </div>
          <div className={`text-2xl font-extrabold tracking-tight ${card.valueClassName}`}>{card.value}</div>
        </div>
      ))}
    </div>
  )
}
