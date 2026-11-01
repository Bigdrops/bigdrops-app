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
        <a
          href={logoUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Open full logo image"
          className="block cursor-pointer transition-opacity hover:opacity-80"
        >
          <div className="rounded-[var(--bd-radius-lg)] border border-bd-border bg-white dark:bg-slate-900 p-0.5">
            <img src={logoUrl} alt={companyName} className={imgClassName} />
          </div>
        </a>
      ) : (
        <span className={fallbackClassName}>{initials}</span>
      )}
    </div>
  )
}
