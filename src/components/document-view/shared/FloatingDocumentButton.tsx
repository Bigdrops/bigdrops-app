import type { ReactNode } from 'react'

interface FloatingDocumentButtonProps {
  onClick: () => void
  icon: ReactNode
  label: string
  className?: string
  disabled?: boolean
}

export default function FloatingDocumentButton({
  onClick,
  icon,
  label,
  className,
  disabled = false,
}: FloatingDocumentButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={className}
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  )
}
