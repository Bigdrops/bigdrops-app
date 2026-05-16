interface DocumentBrandBlockProps {
  logoUrl: string | null
  companyName: string
  className?: string
  imgClassName?: string
  fallbackClassName?: string
}

function getCompanyInitials(companyName: string) {
  return companyName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

export default function DocumentBrandBlock({
  logoUrl,
  companyName,
  className,
  imgClassName,
  fallbackClassName,
}: DocumentBrandBlockProps) {
  const initials = getCompanyInitials(companyName)

  return (
    <div className={className}>
      {logoUrl ? (
        <img src={logoUrl} alt={companyName} className={imgClassName} />
      ) : (
        <span className={fallbackClassName}>{initials}</span>
      )}
    </div>
  )
}
