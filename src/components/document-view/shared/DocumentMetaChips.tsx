import type { LucideIcon } from 'lucide-react'

interface DocumentMetaChipItem {
  icon: LucideIcon
  label: string
  value: string
}

interface DocumentMetaChipsProps {
  items: DocumentMetaChipItem[]
  className?: string
  itemClassName?: string
}

export default function DocumentMetaChips({
  items,
  className,
  itemClassName,
}: DocumentMetaChipsProps) {
  return (
    <div className={className}>
      {items.map(({ icon: Icon, label, value }) => (
        <div className={itemClassName} key={`${label}:${value}`} title={label}>
          <Icon size={12} />
          <span>{value}</span>
        </div>
      ))}
    </div>
  )
}
